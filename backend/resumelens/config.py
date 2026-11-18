import os
import secrets
from datetime import timedelta

from dotenv import load_dotenv

load_dotenv()


class Config:
    # If SECRET_KEY is not set we generate a random one at startup. That is safe
    # (no known default) but logs everyone out on each restart, so set it in prod.
    SECRET_KEY = os.environ.get("SECRET_KEY") or secrets.token_hex(32)
    TOKEN_TTL = timedelta(days=int(os.environ.get("TOKEN_TTL_DAYS", "7")))

    FRONTEND_URLS = [
        u.strip()
        for u in os.environ.get("FRONTEND_URL", "http://localhost:5173").split(",")
        if u.strip()
    ]

    DATABASE_PATH = os.environ.get(
        "DATABASE_PATH",
        os.path.join(os.path.dirname(os.path.dirname(__file__)), "resumelens.db"),
    )

    MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5 MB uploads
    GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

    AI_RATE_LIMIT = int(os.environ.get("AI_RATE_LIMIT", "10"))
    AI_RATE_WINDOW = int(os.environ.get("AI_RATE_WINDOW", "60"))

    TRUST_PROXY = os.environ.get("TRUST_PROXY", "0") == "1"
    TESTING = False