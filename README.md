> [!IMPORTANT]
> **📁 Submission Documents & Templates**
>
> All required submission templates are in the official Google Drive folder:
> https://drive.google.com/drive/folders/1xw7c2aN8N-at8hPEULzkcU76e_FFb0Ef

# Future Skills

Future Skills helps IT students find the part of IT that suits them. An interest questionnaire, an IT skills test and the student's CV score 6 IT areas (software engineering, data & AI, cybersecurity, cloud & networking, web & interface design, IT management), then 26 IT roles are ranked with an explained score, the skills still missing, a free-course pathway, Malaysian demand and AI-trend signals, and SDG links.

## Team Information

| Field | Details |
|---|---|
| Team Name | Hands Off Our Rights |
| Team Domain | Domain 1 — Aiversecity Future-Ready Workforce |
| SDG Track (1–17) | SDG 4 — Quality Education (targets 4.3, 4.4); SDG 8 — Decent Work (targets 8.2, 8.5) |
| Team Leader | [Hong Zhi Yang] |
| University | [Universiti Tunku Abdul Rahman] |
| Number of Members | 3 |

## Links

| Resource | Link |
|---|---|
| GitHub Repository | https://github.com/pekoremon/future-skills |
| Replit Project | [REPLIT PROJECT URL] |
| Live Demo | https://future-skills.replit.app |
| Slide Deck | [SLIDES URL] |
| Demo Video | [YOUTUBE URL] |

## Overview

### Problem

[2–4 sentences: who is affected and why it matters.]

### Solution

The core pipeline:

```
trend data → domain outlook → role matching (skills + RIASEC interests + trends) → reskilling pathway → SDG contribution
```

Every number shown to the user carries its source and date. The system never invents jobs, courses or statistics, and the student makes the final decision.

### Key Features

Domain 1 requires all six:

1. **Skills profile intake** — 36-item IT interest questionnaire (RIASEC + IT area), a 24-item IT skills test graded in the browser, CV reading, plus 1–5 skill ratings and technologies
2. **AI-trend signal layer** — updatable, dated sources (MyCOL, DOSM, OpenDOSM, arXiv) with direction and confidence per IT area and role
3. **Future-role matching** — which IT area fits (test + interests + CV, with agreements and mismatches spelled out), then an explainable role score and skills gap
4. **Personalised reskilling pathway** — ordered plan with estimated time, free / low-cost courses
5. **SDG mapping** — every role and skill tagged to at least one SDG target
6. **Handling uncertainty** — three future scenarios (current trends, fast AI adoption, Malaysian demand leads)

Plus **"Explain this for me"**: a GenAI explanation of each match, written by an open model on Fireworks AI from that match's computed facts only. A reply containing any number not in those facts is rejected and a plain summary is shown instead. *GenAI explains, our data decides.*

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS and plain JavaScript (`src/static/`), no build step |
| Backend | Python 3.12 standard library only (`http.server` JSON API in `src/main.py`); no packages to install |
| Data | CSV tables in `data/`, validated by `scripts/validate_data.py` |
| Hosting / Dev | Replit |

## Project Structure

```
.
├── data/                    # Curated tables; every row has source_name, source_url, source_date
│   ├── roles.csv
│   ├── skills.csv
│   ├── role_skills.csv
│   ├── trends.csv           # Trend inputs with release and fetch dates (generated)
│   ├── trend_signals.csv    # Direction + confidence per IT area and role (generated)
│   ├── trend_scores.csv     # 0–100 trend score per IT area and role (generated)
│   ├── subdomains.csv       # IT areas -> arXiv categories and DOSM series
│   ├── it_assessment.json   # IT skills test: 90 questions in 6 areas
│   ├── certifications.csv
│   ├── sdg_map.csv
│   ├── courses.csv
│   ├── interest_items.json  # 36 team-written RIASEC items, 24 tagged with an IT area
│   └── sample_profiles.json # Fictional demo profiles only
├── docs/                    # Screenshots, diagrams
├── raw/                     # Raw downloads (git-ignored; listed in SOURCES.md)
├── scripts/
│   ├── onet_extract.py      # Extract role skills and RIASEC codes from O*NET
│   ├── build_role_skills.py # Build role_skills.csv from O*NET
│   ├── interest.py          # Score the interest questionnaire
│   ├── assessment.py        # IT skills test: pick, grade, report
│   ├── matching.py          # IT area fit, then explainable role score + skills gap
│   ├── update_trends.py     # Refresh trends.csv, then trend_signals.py ("Update data" button)
│   ├── trend_signals.py     # Direction + confidence per signal
│   ├── trend_score.py       # Signals -> 0-100 trend score per IT area and role
│   └── validate_data.py     # Check every row has a source and date
├── src/
│   ├── main.py              # Web server and JSON API (Replit entry point)
│   └── static/              # Web app: index.html, app.js, style.css
├── submission/              # Required submission PDFs
├── tests/
├── .env.example
├── .replit
├── LICENSE
├── SOURCES.md               # All data sources and their licences
```

## How to Run

### Option 1 — Run on Replit (Recommended)

1. Open the Replit Project, or import this repository via **Create Repl → Import from GitHub**.
2. Add any variables from `.env.example` in the **Secrets** tab.
3. Click **Run**. Replit starts `python src/main.py` (the Run button uses port 5000). There is nothing to install.
4. To publish the live demo, use **Deploy**; `.replit` sets the build and run commands.

### Option 2 — Run Locally

```bash
git clone https://github.com/pekoremon/future-skills.git
cd future-skills
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
cp .env.example .env            # then fill in your values
python src/main.py
```

### API

| Method | Path | What it does |
|---|---|---|
| GET | `/` | The web app (`src/static/`) |
| GET | `/api` | List of endpoints |
| GET | `/api/health` | Health check |
| GET | `/api/questionnaire` | The 36 interest items (RIASEC type + IT area), answer scale and attribution |
| GET / POST | `/api/assessment/start`, `/next`, `/sql`, `/result` | IT skills test: questions, the 2 strongest areas, read-only SQL runs, graded report |
| GET | `/api/skills?type=` | Skills for the intake form (`general`, `domain_knowledge`, `technology`) |
| GET | `/api/roles`, `/api/roles/<role_id>` | Roles; one role's skills, technologies, SDG targets and certifications |
| GET | `/api/profiles` | Fictional demo profiles |
| POST | `/api/questionnaire/score` | `{"answers": [36 numbers 1–5]}` → RIASEC totals (6–30), code, IT-area scores (0–100), warnings |
| POST | `/api/match` | `{"interest_answers": [...36], "test": {"seed", "responses"}, "cv_areas": {...}, "skill_ratings": {"SK020": 4}, "technologies": ["SK145"], "education_job_zone": 4, "scenario": "baseline", "hours_per_week": 5, "top": 10}` (every part optional) or `{"profile_id": "P01", ...}` → IT area fit with insights, then ranked roles with score breakdown, gaps, learning path, SDG and the rank under current trends |
| POST | `/api/explain` | Same body as `/api/match` plus `role_id` → a plain-language explanation (`source`: `llm` or `fallback`) |
| GET | `/api/explain/status` | Whether the LLM is configured, and which model |
| GET | `/api/scenarios` | Future scenarios (`baseline`, `fast_ai`, `local_demand`) and each area's and role's trend score under them |
| GET | `/api/trends?area=` | Trend scores, the signals behind them and the dated inputs |
| POST / GET | `/api/trends/update` | Start the "Update data" job (`{"arxiv": true}` also refreshes arXiv, ~2 min) / check its status |

`skill_ratings` are 1–5 self-ratings; `skills` takes O*NET levels (0–7) directly. On a Replit deployment, data written by the update job lasts until the next restart.

### Check the data and run tests

```bash
python scripts/validate_data.py
python -m unittest discover tests
```

## Data Rules

- Run `python scripts/validate_data.py` before committing any data change; do not commit if it fails.
- Every row needs `source_name`, `source_url` and `source_date` (YYYY-MM-DD).
- If a role has no data of its own, note "uses major occupation group data"; never estimate numbers.
- Malaysian demand comes from DOSM / MyCOL; O*NET (US) is used only for skill structure.
- Fictional profiles only — no real CVs or personal data.

## How We Use Replit (Required)

[Development / hosting / secrets — fill in.]

📄 Proof of use: `submission/SDC2026_TeamName_Replit_POU.pdf`

## AI Disclosure

- **In the product:** `gpt-oss-120b` (open-weight model, Apache 2.0) served by **Fireworks AI**, used only for the "Explain this for me" text (`scripts/explain.py`). It receives one match's computed facts, never personal data; the match scores, skill gaps, trends and courses are computed by our own code, not by the model. The model can be changed with the `FIREWORKS_MODEL` secret.
- **In development:** [TO FILL: AI tools the team used, e.g. Claude for code, data research and documents; Replit Agent for deployment configuration.]

## Challenges & Learnings

- [ ]

## Future Improvements

- [ ]

## Team

| Name | Role | GitHub |
|---|---|---|
| [MEMBER A] | Trend data | @username |
| [MEMBER B] | Roles, skills, SDG mapping | @username |
| [MEMBER C] | Courses, repo | @username |

## Submission Checklist

- [ ] Team name, domain and SDG track filled in
- [ ] Slide deck link added
- [ ] Demo video link added (5–7 min)
- [ ] Replit used, with proof of use in `submission/`
- [ ] Preliminary submission completed (`SDC2026_TeamName_Preliminary.pdf`)
- [ ] Technology declaration completed (`SDC2026_TeamName_TechDeclaration.pdf`)
- [ ] Submission files renamed with your team name
- [ ] Committee GitHub accounts added as collaborators
- [ ] Repository set to public before the deadline
- [ ] "How to Run" steps verified
- [ ] No API keys or secrets committed

## License

This project is licensed under the [Apache License 2.0](LICENSE). Third-party data licences are listed in [SOURCES.md](SOURCES.md).
