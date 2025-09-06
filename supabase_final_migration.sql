-- AURA AI-Powered Cross-Border Payments Platform
-- Final Supabase Database Schema
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table for authentication and profiles
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    phone VARCHAR(20),
    country VARCHAR(3),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wallets for multi-currency support
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    currency VARCHAR(3) NOT NULL,
    balance DECIMAL(15,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, currency)
);

-- Transactions for payment tracking
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    exchange_rate DECIMAL(10,6),
    fee DECIMAL(10,2),
    total_cost DECIMAL(15,2),
    provider VARCHAR(50),
    recipient TEXT,
    status VARCHAR(20) DEFAULT 'initiated',
    provider_reference VARCHAR(255),
    completed_at TIMESTAMP WITH TIME ZONE,
    failure_reason TEXT,
    notes TEXT,
    fraud_score FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fraud detection logs
CREATE TABLE IF NOT EXISTS fraud_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB,
    risk_score FLOAT,
    is_fraud BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- FX rates cache for historical data
CREATE TABLE IF NOT EXISTS fx_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    rate DECIMAL(10,6) NOT NULL,
    source VARCHAR(50) DEFAULT 'exchangerate.host',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(from_currency, to_currency, created_at)
);

-- Recurring payments for scheduled transfers
CREATE TABLE IF NOT EXISTS recurring_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    recipient TEXT NOT NULL,
    frequency VARCHAR(20) NOT NULL, -- daily, weekly, monthly, yearly
    next_execution TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_currency ON wallets(currency);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_fraud_logs_user_id ON fraud_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_logs_transaction_id ON fraud_logs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_fx_rates_currencies ON fx_rates(from_currency, to_currency);
CREATE INDEX IF NOT EXISTS idx_fx_rates_created_at ON fx_rates(created_at);
CREATE INDEX IF NOT EXISTS idx_recurring_payments_user_id ON recurring_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_payments_next_execution ON recurring_payments(next_execution);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recurring_payments_updated_at BEFORE UPDATE ON recurring_payments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_payments ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Wallets policies
CREATE POLICY "Users can view own wallets" ON wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own wallets" ON wallets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own wallets" ON wallets FOR UPDATE USING (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own transactions" ON transactions FOR UPDATE USING (auth.uid() = user_id);

-- Fraud logs policies (read-only for users)
CREATE POLICY "Users can view own fraud logs" ON fraud_logs FOR SELECT USING (auth.uid() = user_id);

-- Recurring payments policies
CREATE POLICY "Users can view own recurring payments" ON recurring_payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own recurring payments" ON recurring_payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own recurring payments" ON recurring_payments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own recurring payments" ON recurring_payments FOR DELETE USING (auth.uid() = user_id);

-- FX rates are public (read-only)
CREATE POLICY "FX rates are public" ON fx_rates FOR SELECT TO public USING (true);

-- Insert some sample FX rates
INSERT INTO fx_rates (from_currency, to_currency, rate, source) VALUES
('USD', 'EUR', 0.85, 'exchangerate.host'),
('USD', 'GBP', 0.73, 'exchangerate.host'),
('USD', 'INR', 83.0, 'exchangerate.host'),
('USD', 'MXN', 17.5, 'exchangerate.host'),
('USD', 'PHP', 56.0, 'exchangerate.host'),
('USD', 'CAD', 1.35, 'exchangerate.host'),
('USD', 'AUD', 1.52, 'exchangerate.host'),
('EUR', 'USD', 1.18, 'exchangerate.host'),
('GBP', 'USD', 1.37, 'exchangerate.host'),
('EUR', 'INR', 97.6, 'exchangerate.host'),
('GBP', 'INR', 113.7, 'exchangerate.host')
ON CONFLICT (from_currency, to_currency, created_at) DO NOTHING;

-- Create a function to get user by email (for authentication)
CREATE OR REPLACE FUNCTION get_user_by_email(user_email TEXT)
RETURNS TABLE(
    id UUID,
    email VARCHAR(120),
    password_hash VARCHAR(255),
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    phone VARCHAR(20),
    country VARCHAR(3),
    is_active BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
) 
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.email, u.password_hash, u.first_name, u.last_name, 
           u.phone, u.country, u.is_active, u.created_at
    FROM users u
    WHERE u.email = user_email AND u.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Create a function to log fraud events
CREATE OR REPLACE FUNCTION log_fraud_event(
    p_user_id UUID,
    p_transaction_id UUID,
    p_event_type TEXT,
    p_event_data JSONB,
    p_risk_score FLOAT,
    p_is_fraud BOOLEAN
)
RETURNS UUID
SECURITY DEFINER
AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO fraud_logs (user_id, transaction_id, event_type, event_data, risk_score, is_fraud)
    VALUES (p_user_id, p_transaction_id, p_event_type, p_event_data, p_risk_score, p_is_fraud)
    RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'AURA database schema created successfully!';
    RAISE NOTICE 'Tables created: users, wallets, transactions, fraud_logs, fx_rates, recurring_payments';
    RAISE NOTICE 'RLS policies enabled for data security';
    RAISE NOTICE 'Sample FX rates inserted';
    RAISE NOTICE 'Ready for AURA AI-powered payments platform!';
END $$;
