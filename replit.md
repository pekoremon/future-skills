# Future Skills

## Run on Replit

- The existing app uses Flask and plain HTML, CSS, and JavaScript. Keep this structure; no frontend build is needed.
- Install the dependencies listed in `requirements.txt` using Replit's package tools.
- Click **Run** to start the **Start application** workflow (`PORT=5000 python src/main.py`).
- The development server listens on `0.0.0.0:5000`; open Preview to use the app.
- No API keys or external services are needed to use the bundled CSV data. `PROJECT_NAME` in `.env.example` is optional.
- Outside the workflow, `python src/main.py` defaults to port 8080; `PORT` overrides it.

## Checks

```sh
python scripts/validate_data.py
python -m unittest discover tests
```

The health endpoint is `GET /api/health`. Data refreshes use public external sources and require network access; they are not required for startup.

## Publishing dependency settings

Production environment variables:

- `PIP_USER=false`
- `PIP_TARGET=.pythonlibs/lib/python3.12/site-packages`

These make the automatic dependency-install step write into the project's Python dependency folder rather than attempting a disabled user-site install or writing to the immutable system Python. If the Python runtime version changes, update the target path to match.

Verification used a pip install dry run with user site-packages disabled and checked Flask imports plus the root and health routes. A new publish is required to verify the deployment itself.
