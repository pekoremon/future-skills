# Future Skills

## Run on Replit

- The app uses only the Python standard library plus plain HTML, CSS and JavaScript. There are no packages to install and no frontend build.
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

Publishing kept failing in Replit's automatic "Installing packages" step (`pip install -r requirements.txt` ended with "Can not perform a '--user' install"), and `[packager.features] enabledForHosting = false` did not skip it. The fix was to remove the only dependency: `src/main.py` now uses Python's built-in `http.server`, and the repository has no `requirements.txt`. The deployment has no build step and runs `python src/main.py`.

Do not add a `requirements.txt` back without checking that publishing still works. Do not let "Fix with Agent" rewrite `.replit` without checking the result into GitHub.
