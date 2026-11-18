"""Thin wrapper around Gemini; the SDK is imported lazily."""
import json
import os
import time

from flask import current_app

_client = None


def _get_client():
    global _client
    if _client is None:
        from google import genai

        _client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
    return _client


def _generate(contents, config=None, max_attempts=3, delay_seconds=2):
    model = current_app.config["GEMINI_MODEL"]
    last_error = None
    for attempt in range(1, max_attempts + 1):
        try:
            kwargs = {"model": model, "contents": contents}
            if config:
                kwargs["config"] = config
            return _get_client().models.generate_content(**kwargs).text
        except Exception as e:
            last_error = e
            overloaded = "503" in str(e) or "UNAVAILABLE" in str(e)
            if overloaded and attempt < max_attempts:
                time.sleep(delay_seconds)
                continue
            raise last_error


def generate_text(prompt):
    return _generate(prompt)


def generate_json(prompt):
    raw = _generate(prompt, config={"response_mime_type": "application/json"}).strip()
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
    return json.loads(raw)