from flask import Flask, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import os
import logging
from pythonjsonlogger import jsonlogger
from dotenv import load_dotenv
from models import db

def create_app():
    load_dotenv()
    app = Flask(__name__)

    # ---- Config ----
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "change-this-in-prod")
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", "sqlite:///aura.db")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # CORS: tighten to specific origins if provided
    allowed_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]
    cors_kwargs = {"supports_credentials": True}
    if allowed_origins:
        cors_kwargs["origins"] = allowed_origins
    CORS(app, **cors_kwargs)

    # Rate limiting: default + specific overrides
    limiter = Limiter(get_remote_address, app=app, default_limits=["200 per hour", "50 per minute"])

    # DB
    db.init_app(app)
    with app.app_context():
        db.create_all()

    # Logging: JSON formatter to stdout
    if not app.testing:
        handler = logging.StreamHandler()
        formatter = jsonlogger.JsonFormatter("%(asctime)s %(name)s %(levelname)s %(message)s", timestamp=True)
        handler.setFormatter(formatter)
        root = logging.getLogger()
        if root.hasHandlers():
            root.handlers.clear()
        root.addHandler(handler)
        root.setLevel(logging.INFO)

    # Blueprints
    from api_routes import api_bp as core_bp
    from api_routes_ai import ai_bp as ai_bp
    app.register_blueprint(core_bp, url_prefix="/api")
    app.register_blueprint(ai_bp, url_prefix="/api/ai")

    # Health check
    @app.get("/health")
    @limiter.exempt
    def health():
        return jsonify(status="ok"), 200

    # Error normalization
    @app.errorhandler(429)
    def too_many_requests(e):
        return jsonify(error="rate_limited", detail=str(e)), 429

    @app.errorhandler(Exception)
    def handle_ex(e):
        code = getattr(e, "code", 500)
        return jsonify(error="server_error", detail=str(e)), code

    return app

app = create_app()

if __name__ == "__main__":
    app.run(host=os.getenv("HOST", "0.0.0.0"), port=int(os.getenv("PORT", 5000)))
