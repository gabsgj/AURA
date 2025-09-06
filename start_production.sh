#!/bin/bash

echo "🚀 Starting AURA Production Environment"
echo "=================================="

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

# Install and build frontend for production
echo "📦 Installing and building frontend..."
cd frontend
npm install
npm run build
cd ..

# Install backend dependencies
echo "🐍 Installing backend dependencies..."
cd backend
pip install -r requirements.txt
cd ..

echo "✅ AURA build complete!"
echo ""
echo "To start the services:"
echo "Backend: cd backend && python app.py"
echo "Frontend: Serve the frontend/dist folder with a web server"
echo ""
echo "For development:"
echo "Backend: cd backend && python app.py"
echo "Frontend: cd frontend && npm run dev"
echo ""
echo "📊 Health Check: http://localhost:5000/api/health"