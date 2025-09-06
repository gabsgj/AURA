export interface Provider {
  name: string;
  logo: React.ReactNode;
  exchangeRate: number;
  fee: number;
  deliveryTime: string;
  recipientGets: number;
}

export interface TransactionDetails {
  amount: number;
  sourceCurrency: string;
  targetCurrency: string;
  recipient?: string;
  purpose?: string;
}

export interface ForecastData {
  currentRate: number;
  predictedRate: number;
  trend: 'up' | 'down' | 'stable';
  confidence: number;
  recommendation: string;
}

export interface Wallet {
  balance: number;
  currency: string;
}

export type AppStep = 'voice' | 'providers' | 'confirm' | 'complete';
