import re
from datetime import datetime, timezone
from functools import wraps

import jwt
from flask import Blueprint, current_app, g, jsonify, request
from werkzeug.security import check_password_hash, generate_password_hash

from .db import get_db

bp = Blueprint("auth", __name__, url_prefix="/auth")

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def make_token(user_id):
    now = datetime.now(timezone.utc)
    payload = {"sub": str(user_id), "iat": now, "exp": now + current_app.config["TOKEN_TTL"]}
    return jwt.encode(payload, current_app.config["SECRET_KEY"], algorithm="HS256")


def _user_from_request():
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        return None
    try:
        payload = jwt.decode(header[7:], current_app.config["SECRET_KEY"], algorithms=["HS256"])
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        return None
    return get_db().execute(
        "SELECT id, email, name FROM users WHERE id = ?", (user_id,)
    ).fetchone()


def optional_user(f):
    """Attach g.user if a valid token is present, otherwise g.user = None."""

    @wraps(f)
    def wrapper(*args, **kwargs):
        g.user = _user_from_request()
        return f(*args, **kwargs)

    return wrapper


def login_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        g.user = _user_from_request()
        if g.user is None:
            return jsonify({"error": "Authentication required"}), 401
        return f(*args, **kwargs)

    return wrapper


def _public(user):
    return {"id": user["id"], "email": user["email"], "name": user["name"]}


@bp.post("/signup")
def signup():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    name = (data.get("name") or "").strip()[:80]

    if not EMAIL_RE.match(email):
        return jsonify({"error": "Enter a valid email address"}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    db = get_db()
    if db.execute("SELECT 1 FROM users WHERE email = ?", (email,)).fetchone():
        return jsonify({"error": "An account with this email already exists"}), 409

    cur = db.execute(
        "INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)",
        (email, name, generate_password_hash(password)),
    )
    db.commit()
    user = db.execute("SELECT id, email, name FROM users WHERE id = ?", (cur.lastrowid,)).fetchone()
    return jsonify({"token": make_token(user["id"]), "user": _public(user)}), 201


@bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    row = get_db().execute(
        "SELECT id, email, name, password_hash FROM users WHERE email = ?", (email,)
    ).fetchone()
    if row is None or not check_password_hash(row["password_hash"], password):
        return jsonify({"error": "Incorrect email or password"}), 401
    return jsonify({"token": make_token(row["id"]), "user": _public(row)})


@bp.get("/me")
@login_required
def me():
    return jsonify({"user": _public(g.user)})