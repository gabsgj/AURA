# AURA Deployment Guide

## Production Setup

### 1. Required API Keys

For full functionality, you need the following API keys:

#### Essential (Required for Core Features):
- **ElevenLabs API Key** - For voice synthesis (Text-to-Speech)
  - Get from: https://elevenlabs.io/app/settings/api-keys
  - Required for: Voice confirmations and alerts

#### AI & NLP (Recommended):
- **Google Gemini API Key** - For natural language processing
  - Get from: https://aistudio.google.com/app/apikey
  - Required for: Voice command understanding

#### Payment Providers (For Real Routing):
- **Wise API Key** - For competitive FX rates and transfers
  - Get from: https://api-docs.wise.com/
  - Supports: Major currency corridors with real-time rates

#### FX Data (For Rate Prediction):
- **Alpha Vantage API Key** - For historical FX data and prediction
  - Get from: https://www.alphavantage.co/support/#api-key
  - Required for: FX rate forecasting and timing recommendations

#### Payment Processing:
- **Stripe API Key** - For payment processing and card payments
  - Get from: https://dashboard.stripe.com/apikeys
  - Required for: Credit/debit card payments

### 2. Environment Configuration

1. Copy `.env.production` to `.env`:
   ```bash
   cp .env.production .env
   ```

2. Fill in your API keys in the `.env` file:
   ```bash
   # At minimum, set these for basic functionality:
   ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
   GEMINI_API_KEY=your_gemini_api_key_here
   WISE_API_KEY=your_wise_api_key_here
   ALPHA_VANTAGE_API_KEY=your_alpha_vantage_api_key_here
   ```

### 3. Database Setup

#### Option A: SQLite (Development/Demo)
```bash
# No additional setup needed - SQLite will be created automatically
```

#### Option B: PostgreSQL (Production)
```bash
# Update DATABASE_URL in .env:
DATABASE_URL=postgresql://username:password@localhost:5432/aura_db
```

#### Option C: Supabase (Cloud)
```bash
# Set Supabase credentials in .env:
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
DATABASE_URL=your_supabase_postgres_url
```

### 4. Installation & Deployment

#### Local Development:
```bash
# Backend
cd backend
pip install -r requirements.txt
python app.py

# Frontend
cd frontend
npm install
npm run dev
```

#### Production (Native):
```bash
# Build and prepare
./start_production.sh

# Start backend 
cd backend
python app.py
# Or with gunicorn: gunicorn app:app --bind 0.0.0.0:5000

# Serve frontend (in another terminal)
cd frontend
# Option 1: Python built-in server
python -m http.server 3000 -d dist

# Option 2: Using a proper web server like nginx
# nginx -c /path/to/nginx.conf
```

### 5. Verification

Test core functionality:

1. **Voice Recognition**: Click microphone and say "Send 100 USD to EUR"
2. **Provider Comparison**: Should show real rates from multiple providers
3. **FX Forecast**: Should display rate predictions and timing recommendations
4. **Voice Confirmation**: Should play audio confirmation via ElevenLabs

### 6. Supported Currency Corridors

Current supported corridors with real provider data:
- USD → EUR, GBP, INR, MXN, PHP, CAD, AUD
- EUR → USD, INR
- GBP → USD, INR

For other corridors, the system will fall back to mock data until additional provider APIs are configured.

### 7. Performance Optimization

#### For High Traffic:
1. Use Redis for caching FX rates and provider quotes
2. Implement rate limiting per user/IP
3. Use CDN for frontend assets
4. Scale backend with multiple instances behind load balancer

#### For ML Performance:
1. Pre-trained fraud detection models are included
2. FX prediction models update daily with new rate data
3. Consider GPU instances for faster ML inference at scale

### 8. Security Considerations

1. **Disable Demo Mode**: Ensure `DEMO_MODE=false` in production. Demo tokens are rejected automatically when production env is detected.
2. **Restrict CORS**: Set `ALLOWED_ORIGINS=https://your-frontend-domain` (comma-separated if multiple) so only trusted origins can call the backend.
3. **Supabase JWT Validation**: Provide `SUPABASE_JWT_SECRET` to validate Supabase-issued access tokens. Without it, Supabase tokens are rejected in production.
4. **API Keys**: Store in environment variables, never in code or client bundles.
5. **Database**: Use connection pooling, SSL, and least-privilege credentials.
6. **Rate Limiting**: Default limits enabled (50/min, 200/hr). Adjust via `FLASK_LIMITER_DEFAULTS` if needed.
7. **HTTPS**: Terminate TLS at load balancer or reverse proxy; never serve plain HTTP externally.

### 9. Monitoring & Logging

- Application logs: `logs/aura.log`
- Error tracking: Integrated with structured JSON logging
- Health checks: Available at `/api/health`
- Metrics: Transaction success rates, provider performance, fraud detection accuracy

### 10. Scaling

The architecture supports horizontal scaling:
- **Frontend**: Deploy to CDN (Vercel, Netlify, CloudFlare) or serve static files
- **Backend**: Scale with load balancers and multiple instances  
- **Database**: Use read replicas for heavy query workloads
- **ML Models**: Can be moved to separate ML service for better scaling