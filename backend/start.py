#!/usr/bin/env python3
"""
Production entry point for AURA backend.
Used by deployment platforms like Render, Railway, etc.
"""
import os
from app import create_app

# Create the Flask app
app = create_app('production')

if __name__ == "__main__":
    # Get port from environment (Render uses PORT env var)
    port = int(os.environ.get('PORT', 5000))
    host = os.environ.get('HOST', '0.0.0.0')
    
    print(f"Starting AURA backend on {host}:{port}")
    app.run(host=host, port=port, debug=False)
