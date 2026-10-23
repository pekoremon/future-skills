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

Publishing skips Replit's automatic package-install step via `[packager.features] enabledForHosting = false`. The explicit deployment build command installs `requirements.txt` with `PIP_USER=false` and a project-local `--target`. This avoids the automatic installer that continued to fail despite environment overrides.

Shared environment variables also retain the same pip defaults for development:

- `PIP_USER=false`
- `PIP_TARGET=.pythonlibs/lib/python3.12/site-packages`

If the Python runtime version changes, update both the deployment build command's target path and `PIP_TARGET` to match. Neither production-only nor shared environment overrides alone resolved the automatic install failure.

The exact configured build command passed a dry run with user site-packages disabled and a conflicting inherited `PIP_USER=true`; its inline override took precedence. A new publish is required to confirm that the automatic install is skipped and the explicit build completes.
