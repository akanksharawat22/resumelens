from flask import Flask, jsonify, request

from . import auth, routes
from .config import Config
from .db import init_db


def create_app(overrides=None):
    app = Flask(__name__)
    app.config.from_object(Config)
    if overrides:
        app.config.update(overrides)

    if app.config["TRUST_PROXY"]:
        from werkzeug.middleware.proxy_fix import ProxyFix

        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1)

    init_db(app)

    @app.after_request
    def add_cors_headers(resp):
        origin = request.headers.get("Origin")
        if origin and origin in app.config["FRONTEND_URLS"]:
            resp.headers["Access-Control-Allow-Origin"] = origin
            resp.headers["Vary"] = "Origin"
            resp.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type"
            resp.headers["Access-Control-Allow-Methods"] = "GET, POST, DELETE, OPTIONS"
        return resp

    @app.errorhandler(413)
    def too_large(_e):
        return jsonify({"error": "File is too large (max 5 MB)"}), 413

    app.register_blueprint(auth.bp)
    app.register_blueprint(routes.bp)
    return app