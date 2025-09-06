import os
os.environ["FLASK_ENV"] = "testing"
os.environ["DEMO_MODE"] = "true"

from backend.app import create_app
from backend.auth import generate_token, verify_token

def test_local_jwt_roundtrip():
    app = create_app('testing')
    with app.app_context():
        token = generate_token("user-1", 1)
        assert verify_token(token) == "user-1"

def test_demo_token_allowed_in_dev():
    assert verify_token("demo-token-any") == "demo-user-123"
