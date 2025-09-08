# AURA Deployment Guide

## Deployment Fixes Applied

### Issue: SQLAlchemy Configuration Error
**Problem:** `RuntimeError: Either 'SQLALCHEMY_DATABASE_URI' or 'SQLALCHEMY_BINDS' must be set.`

**Solution:** Added `SQLALCHEMY_DATABASE_URI` configuration key to all config classes in `config.py`:
- Base Config: Uses `DATABASE_URL` environment variable
- Testing Config: Uses in-memory SQLite database
- Production Config: Validates required environment variables

### Issue: Missing Environment Variables
**Problem:** Production deployment failed due to missing required environment variables.

**Solution:** Updated `render.yaml` with essential environment variables:
- `SECRET_KEY`: Auto-generated secure key
- `DATABASE_URL`: SQLite database path
- `SUPABASE_URL` & `SUPABASE_KEY`: Placeholder values (update with real credentials)
- `FLASK_ENV`: Set to production
- `ALLOWED_ORIGINS`: Auto-configured from frontend service

### Issue: Health Check Path
**Problem:** Health check endpoint mismatch in render.yaml.

**Solution:** Corrected health check path from `/api/health` to `/health` to match the actual endpoint.

## Environment Variables Setup

### Required for Production
```bash
# Core Application
SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite:///aura.db
FLASK_ENV=production

# Database (Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key

# External APIs (Optional but recommended)
ALPHA_VANTAGE_API_KEY=your-alpha-vantage-key
ELEVENLABS_API_KEY=your-elevenlabs-key
GEMINI_API_KEY=your-gemini-key
STRIPE_SECRET_KEY=your-stripe-key
WISE_API_KEY=your-wise-key
```

### Development Setup
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your values
# Use sqlite:///aura.db for local development
DATABASE_URL=sqlite:///aura.db
```

## Deployment Platforms

### Render.com
1. Connect your GitHub repository
2. Use the provided `render.yaml` configuration
3. Update environment variables in Render dashboard:
   - Set real `SUPABASE_URL` and `SUPABASE_KEY`
   - Add API keys for external services
4. Deploy automatically triggers on git push

### Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### Heroku
```bash
# Create Heroku app
heroku create your-app-name

# Set environment variables
heroku config:set SECRET_KEY=your-secret-key
heroku config:set DATABASE_URL=sqlite:///aura.db
heroku config:set SUPABASE_URL=https://your-project.supabase.co
heroku config:set SUPABASE_KEY=your-supabase-key

# Deploy
git push heroku main
```

## Database Setup

### SQLite (Default)
- Automatically created on first run
- File stored at `aura.db` in backend directory
- Suitable for development and small deployments

### PostgreSQL (Production Recommended)
```bash
# Update DATABASE_URL for PostgreSQL
DATABASE_URL=postgresql://user:password@host:port/database
```

### Supabase (Recommended)
1. Create project at [supabase.com](https://supabase.com)
2. Run the migration script: `supabase_final_migration.sql`
3. Get URL and anon key from project settings
4. Update environment variables

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify `DATABASE_URL` is correctly set
   - Ensure database directory exists (for SQLite)
   - Check database permissions

2. **Missing Dependencies**
   - Run `pip install -r requirements.txt`
   - Ensure Python 3.8+ is installed

3. **CORS Issues**
   - Update `ALLOWED_ORIGINS` environment variable
   - Add frontend domain to allowed origins

4. **API Key Errors**
   - Verify all required API keys are set
   - Check API key permissions and quotas

### Health Check
Test deployment health at: `https://your-domain.com/health`

Expected response:
```json
{
  "status": "ok",
  "version": "1.0.0"
}
```

## Security Considerations

1. **Environment Variables**
   - Never commit `.env` files to version control
   - Use secure, randomly generated `SECRET_KEY`
   - Rotate API keys regularly

2. **Database Security**
   - Use PostgreSQL for production (not SQLite)
   - Enable SSL connections
   - Implement proper backup strategy

3. **CORS Configuration**
   - Restrict `ALLOWED_ORIGINS` to known domains
   - Avoid using wildcards in production

## Performance Optimization

1. **Database**
   - Use connection pooling for PostgreSQL
   - Implement database indexing
   - Consider read replicas for high traffic

2. **Caching**
   - Implement Redis for session storage
   - Cache frequently accessed data
   - Use CDN for static assets

3. **Monitoring**
   - Set up application logging
   - Monitor API response times
   - Track error rates and patterns
