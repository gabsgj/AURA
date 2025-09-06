"""
Smoke tests for AURA backend application
"""
import os
import pytest
from backend.app import create_app

def test_app_creation():
    """Test that the app can be created successfully"""
    app = create_app('testing')
    assert app is not None
    assert app.config['TESTING'] is True

def test_health_endpoint():
    """Test the health check endpoint"""
    app = create_app('testing')
    client = app.test_client()
    
    response = client.get('/health')
    assert response.status_code == 200
    
    data = response.get_json()
    assert data['status'] == 'ok'
    assert data['version'] == '1.0.0'

def test_api_blueprint_registration():
    """Test that API blueprints are properly registered"""
    app = create_app('testing')
    
    # Check that blueprints are registered
    blueprint_names = [bp.name for bp in app.blueprints.values()]
    assert 'api' in blueprint_names
    assert 'ai' in blueprint_names

def test_cors_configuration():
    """Test CORS configuration"""
    app = create_app('testing')
    client = app.test_client()
    
    response = client.options('/health')
    assert response.status_code == 200

def test_database_initialization():
    """Test that database tables are created"""
    app = create_app('testing')
    
    with app.app_context():
        from backend.models import db, User, Wallet, Transaction
        
        # Check that tables exist by attempting to query them
        try:
            User.query.count()
            Wallet.query.count()
            Transaction.query.count()
        except Exception as e:
            pytest.fail(f"Database tables not properly initialized: {e}")
