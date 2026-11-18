"""Tiny SQLite layer using only the standard library."""
import json
import sqlite3

from flask import current_app, g

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT NOT NULL UNIQUE,
    name          TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS analyses (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename        TEXT NOT NULL DEFAULT '',
    job_description TEXT NOT NULL DEFAULT '',
    resume_text     TEXT NOT NULL DEFAULT '',
    score           INTEGER,
    analysis_json   TEXT,
    xray_json       TEXT,
    improved_text   TEXT,
    guard_json      TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_analyses_user ON analyses(user_id, id DESC);
"""


def get_db():
    if "db" not in g:
        conn = sqlite3.connect(current_app.config["DATABASE_PATH"])
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        g.db = conn
    return g.db


def close_db(_exc=None):
    conn = g.pop("db", None)
    if conn is not None:
        conn.close()


def init_db(app):
    app.teardown_appcontext(close_db)
    with app.app_context():
        get_db().executescript(SCHEMA)
        get_db().commit()


def dumps(value):
    return json.dumps(value) if value is not None else None


def loads(value):
    return json.loads(value) if value else None