import os, sys
os.environ["FLASK_ENV"] = "development"
os.environ["DEMO_MODE"] = "true"

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app import app  # type: ignore
from auth import generate_token, verify_token  # type: ignore

def test_local_jwt_roundtrip():
    with app.app_context():
        token = generate_token("user-1", 1)
        assert verify_token(token) == "user-1"

def test_demo_token_allowed_in_dev():
    assert verify_token("demo-token-any") == "demo-user-123"
