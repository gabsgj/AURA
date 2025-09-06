#!/bin/bash
# Frontend build script for Render

echo "Installing frontend dependencies..."
npm install

echo "Building frontend..."
npm run build

echo "Frontend build complete!"
