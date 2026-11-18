import os

from resumelens import create_app

# `app` is what gunicorn imports (gunicorn app:app), so the Render start command
# does not need to change.
app = create_app()

if __name__ == "__main__":
    debug_mode = os.environ.get("FLASK_DEBUG", "False") == "True"
    app.run(debug=debug_mode, port=int(os.environ.get("PORT", 5000)))