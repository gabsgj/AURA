#!/bin/bash

echo "🚀 Starting AURA Development Environment"
echo "======================================="

# Check if required environment files exist
if [ ! -f "backend/.env" ]; then
    echo "⚠️  Backend .env file not found. Creating from example..."
    cp backend/.env.example backend/.env
    echo "Please edit backend/.env with your API keys"
fi

if [ ! -f "frontend/.env" ]; then
    echo "⚠️  Frontend .env file not found. Creating from example..."
    cp frontend/.env.example frontend/.env
fi

# Install dependencies
echo "🐍 Installing backend dependencies..."
cd backend
pip install --user -r requirements.txt
cd ..

echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo "✅ AURA development environment ready!"
echo ""
echo "To start development servers:"
echo "Backend:  cd backend && python app.py"
echo "Frontend: cd frontend && npm run dev"
echo ""
echo "For production build:"
echo "./start_production.sh"
echo ""
echo "📊 Health Check: http://localhost:5000/api/health"