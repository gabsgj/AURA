"""
Authentication module for AURA application (hardened).
- No unsigned or demo tokens in production.
- Supports:
  1) Local JWT signed with SECRET_KEY
  2) Supabase JWT signed with SUPABASE_JWT_SECRET
"""

import os
import jwt
import logging
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify, current_app
from models import User, db

logger = logging.getLogger(__name__)

def _is_production() -> bool:
    # Treat anything not explicitly "development" as production
    env = os.getenv("FLASK_ENV") or os.getenv("ENV") or os.getenv("APP_ENV") or "production"
    return env.lower() not in ("dev", "development", "local")

def _demo_mode_enabled() -> bool:
    # demo mode allowed only outside production
    val = os.getenv("DEMO_MODE", "false").lower() == "true"
    return val and not _is_production()

def generate_token(user_id: str, expires_minutes: int = 60) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(minutes=expires_minutes),
        "iat": datetime.utcnow()
    }
    token = jwt.encode(payload, current_app.config["SECRET_KEY"], algorithm="HS256")
    return token

def verify_token(token: str):
    """
    Verification priority:
      1) Local JWT via SECRET_KEY
      2) Supabase JWT via SUPABASE_JWT_SECRET (must be set in production)
      3) Demo tokens ONLY if DEMO_MODE=true AND not production (token starts with demo-token-)
    """
    if not token:
        return None

    # 1) Local JWT
    try:
        payload = jwt.decode(token, current_app.config["SECRET_KEY"], algorithms=["HS256"])
        return payload.get("user_id")
    except Exception:
        pass

    # 2) Supabase JWT
    supabase_secret = os.getenv("SUPABASE_JWT_SECRET")
    if _is_production():
        # In production, Supabase secret must be present to accept Supabase tokens.
        if supabase_secret:
            try:
                payload = jwt.decode(token, supabase_secret, algorithms=["HS256"], options={"verify_aud": False})
                return payload.get("sub") or payload.get("user_id")
            except Exception:
                pass
        # If secret missing or decode failed, deny.
    else:
        # Dev: allow Supabase token without signature ONLY if DEMO_MODE=true (explicit)
        if _demo_mode_enabled():
            try:
                payload = jwt.decode(token, options={"verify_signature": False, "verify_aud": False})
                return payload.get("sub") or payload.get("user_id")
            except Exception:
                pass

    # 3) Demo token (dev-only)
    if _demo_mode_enabled() and token.startswith("demo-token-"):
        logger.info("Development DEMO_MODE enabled: accepting demo token")
        return "demo-user-123"

    return None

def token_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        token = auth_header.replace("Bearer ", "").strip() if auth_header else None
        user_id = verify_token(token)
        if not user_id:
            return jsonify({"error": "Unauthorized"}), 401
        request.user_id = user_id  # attach for handlers
        return f(*args, **kwargs)
    return wrapper