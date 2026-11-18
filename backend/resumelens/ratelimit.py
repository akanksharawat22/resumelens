"""Minimal in-memory sliding-window rate limiter (single worker)."""
import time
from collections import defaultdict, deque
from functools import wraps

from flask import current_app, jsonify, request

_hits = defaultdict(deque)


def reset():
    _hits.clear()


def rate_limited(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        limit = current_app.config["AI_RATE_LIMIT"]
        window = current_app.config["AI_RATE_WINDOW"]
        now = time.monotonic()
        q = _hits[request.remote_addr or "unknown"]
        while q and now - q[0] > window:
            q.popleft()
        if len(q) >= limit:
            resp = jsonify({"error": "Too many requests. Please slow down."})
            resp.status_code = 429
            resp.headers["Retry-After"] = str(max(1, int(window - (now - q[0]))))
            return resp
        q.append(now)
        return f(*args, **kwargs)

    return wrapper