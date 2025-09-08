from flask import Flask, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import os
import logging
from pythonjsonlogger import jsonlogger
from config import config
from models import db

def create_app(config_name=None):
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')
    
    app = Flask(__name__)
    
    # Load configuration
    app_config = config.get(config_name, config['default'])
    app.config.from_object(app_config)
    
    # Validate required environment variables
    try:
        app_config.validate_required_env_vars()
    except ValueError as e:
        app.logger.error(f"Configuration error: {e}")
        if config_name == 'production':
            raise

    # CORS: tighten to specific origins if provided
    cors_kwargs = {"supports_credentials": True}
    if app.config.get('ALLOWED_ORIGINS'):
        cors_kwargs["origins"] = app.config['ALLOWED_ORIGINS']
    CORS(app, **cors_kwargs)

    # Rate limiting: default + specific overrides
    limiter = Limiter(
        get_remote_address, 
        app=app, 
        default_limits=[app.config.get('RATELIMIT_DEFAULT', '200 per hour')]
    )

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
        log_level = getattr(logging, app.config.get('LOG_LEVEL', 'INFO').upper())
        root.setLevel(log_level)

    # Blueprints
    from api_routes import api_bp as core_bp
    from api_routes_ai import ai_bp as ai_bp
    app.register_blueprint(core_bp, url_prefix="/api")
    app.register_blueprint(ai_bp, url_prefix="/api/ai")

    # Health check
    @app.get("/health")
    @limiter.exempt
    def health():
        return jsonify(status="ok", version="1.0.0"), 200

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
    from config import Config
    app.run(host=Config.HOST, port=Config.PORT)
