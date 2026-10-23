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

Publishing skips Replit's automatic package-install step with `[packager.features] enabledForHosting = false`, because that step runs `pip install --user` and fails where user site-packages are disabled.

The deployment build then creates a project virtualenv and installs `requirements.txt` into it: `unset PIP_TARGET PIP_USER; python -m venv .venv && .venv/bin/pip install --no-user -r requirements.txt`. The deployment runs `.venv/bin/python src/main.py`. The `unset` matters: the shared `PIP_TARGET` below would otherwise send packages to `.pythonlibs` instead of the venv.

Shared environment variables keep pip working in the workspace (the Run button):

- `PIP_USER=false`
- `PIP_TARGET=.pythonlibs/lib/python3.12/site-packages`

Do not use "Fix with Agent" to change `.replit` without checking the result into GitHub: merges that replace the whole file have dropped these settings before.
