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
| Team Leader | Hong Zhi Yang |
| University | Universiti Tunku Abdul Rahman |
| Number of Members | 3 |

## Links

| Resource | Link |
|---|---|
| GitHub Repository | https://github.com/pekoremon/future-skills |
| Replit Project | https://future-skills.replit.app (published from Replit) |
| Live Demo | https://future-skills.replit.app |
| Slide Deck | [SLIDES URL] |
| Demo Video | [YOUTUBE URL] |

## Overview

### Problem

A Malaysian IT student about to graduate has to pick one part of IT (software, data and AI, cybersecurity, cloud and networking, web and interface design, or IT management) while AI changes which of those jobs are needed, and mostly picks by guesswork. AI is spreading faster than training: 56% of Malaysian professionals use AI tools at work but only 26% have had formal training (Hays Asia Salary Guide 2025), and MOSTI expects more than 600,000 workers to need reskilling within three to five years (both quoted in the Domain 1 brief). Generic career tests do not look at Malaysian demand or at how fast AI is entering each field, and course lists do not say which skills matter for which job. A wrong choice costs a graduate months of learning for a role they do not fit or that the market needs less.

### Solution

The core pipeline:

```
student (CV or skill ratings → interests → skills test focused on the areas they point to) → IT areas grouped by interest × skill → role matching (area fit + interest + skills + AI-era trend from MyCOL, DOSM and arXiv) → three future scenarios → reskilling pathway → SDG contribution
```

Every number shown to the user carries its source and date. The system never invents jobs, courses or statistics, and the student makes the final decision.

### Key Features

Domain 1 requires all six:

1. **Skills profile intake** — in this order: CV (optional; or rate your skills instead), a 36-item IT interest questionnaire (RIASEC + IT area), then a focused IT skills test graded in the browser that checks only the 3–6 IT areas the CV and interests point to (15–24 questions, and the page says why these areas; afterwards any left-out area can be added with its own 3-question quick check), CV reading (an AI summary, and evidence per IT area: the AI quotes the CV, our code keeps only quotes really in the CV and scores them, or uses the technologies the CV names when AI is off), plus 1–5 skill ratings and technologies
2. **AI-trend signal layer** — updatable, dated sources (MyCOL, DOSM, OpenDOSM, arXiv) with direction and confidence per IT area and role
3. **Future-role matching** — which IT area fits (test + interests + CV, with agreements and mismatches spelled out), results grouped by interest × skill ("Best fit for you" first, then "You can do this, but it may not excite you"; "Want to get there?" areas shown with their biggest gaps and learning paths, not recommended), then an explainable role score and skills gap
4. **Personalised reskilling pathway** — gaps ordered biggest first, checked free courses and videos, total hours and weeks at the student's study time; paid HRD Corp-claimable courses listed apart for working adults
5. **SDG mapping** — every role and skill tagged to at least one SDG target with a reason; the learning path sums up which targets the chosen path contributes to
6. **Handling uncertainty** — three future scenarios (current trends, fast AI adoption, Malaysian demand leads); each role shows its rank range across them, and the app says scores are estimates, not predictions. When the "Update data" job brings new trend data, the jobs page shows which recommendations moved

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
│   ├── learning_resources.csv # 39 free videos and courses, each link checked
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
│   ├── learning.py          # Learning path page per role
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
| GET / POST | `/api/assessment/plan`, `/start`, `/next`, `/more`, `/sql`, `/result` | IT skills test: which 3–6 areas to test (from CV + interests) and why, questions for those areas (`areas`, and `added` for areas tested later, travel with the seed), the 2 strongest areas, read-only SQL runs, graded report |
| GET | `/api/skills?type=` | Skills for the intake form (`general`, `domain_knowledge`, `technology`) |
| GET | `/api/roles`, `/api/roles/<role_id>` | Roles; one role's skills, technologies, SDG targets and certifications |
| GET | `/api/profiles` | Fictional demo profiles |
| POST | `/api/questionnaire/score` | `{"answers": [36 numbers 1–5]}` → RIASEC totals (6–30), code, IT-area scores (0–100), warnings |
| POST | `/api/match` | `{"interest_answers": [...36], "test": {"seed", "responses"}, "cv_areas": {...}, "skill_ratings": {"SK020": 4}, "technologies": ["SK145"], "education_job_zone": 4, "scenario": "baseline", "hours_per_week": 5, "top": 10}` (every part optional) or `{"profile_id": "P01", ...}` → IT area fit with insights, then ranked roles with score breakdown, gaps, learning path, SDG and the rank under current trends |
| POST | `/api/explain` | Same body as `/api/match` plus `role_id` → a plain-language explanation (`source`: `llm` or `fallback`) |
| GET / POST | `/api/learn/<role_id>`, `/api/learn` | Learning path page for a role (POST: same body as `/api/match` plus `role_id`, built on the student's gaps) |
| GET | `/api/explain/status` | Whether the LLM is configured, and which model |
| POST | `/api/cv/summary` | `{"text"}` or `{"docx_base64"}` → summary, skills, qualifications, technologies found, evidence items with quotes, and `cv_areas` (0–100 per IT area, to send to `/api/match`) with `cv_areas_method` (`llm_evidence` or `technologies`). The CV is not stored |
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

- **Hosting.** The live demo, https://future-skills.replit.app, is a Replit Deployment (`deploymentTarget = "cloudrun"` in `.replit`) that runs `python src/main.py`. The app uses only the Python standard library, so there is no build step and nothing to install.
- **Development and preview.** The **Run** button starts the `Start application` workflow (`PORT=5000 python src/main.py`), and we test each change in Replit's Preview before publishing. The repository is synced with GitHub: we pull the latest `main` into Replit, check it in Preview, then publish.
- **Secrets.** `FIREWORKS_API_KEY` (and optionally `FIREWORKS_MODEL`) are kept in Replit Secrets and never committed; `.env.example` lists them. Without the key the app still works and shows a rule-based explanation instead of the AI one.
- **Live data refresh.** On the deployed app, the "Update data" button on the Trends page runs `scripts/update_trends.py` on Replit: it fetches OpenDOSM (and optionally arXiv) and recomputes the signals and scores. Data written this way lasts until the deployment restarts; the committed CSVs are the baseline.
- **Replit Agent.** Used for deployment settings only (the `.replit` workflows and publishing). We check every change it makes to `.replit` into GitHub. See `replit.md` for why the repo has `pyproject.toml` and `uv.lock` but no `requirements.txt`.

📄 Proof of use: `submission/SDC2026_TeamName_Replit_POU.pdf`

## AI Disclosure

- **In the product:** `gpt-oss-120b` (open-weight model, Apache 2.0) served by **Fireworks AI** (team's own paid account), used for two features only: the "Explain this for me" text (`scripts/explain.py`), which receives one match's computed facts and no personal data, and the CV summary (`scripts/cv_reader.py`), which receives the CV text the student uploads. CV text is never written to disk, logged or cached by our server. A reply containing a number not in its input is rejected and a rule-based text is shown. CV evidence items are kept only when their quote is really in the CV, and our code, not the model, turns them into area scores. Match scores, skill gaps, trends and learning paths are computed by our own code, not by the model.
- **In development:** Claude Code (Anthropic) for writing and testing code, data checks, source research and documentation drafts (major); ChatGPT (OpenAI) for discussion only, not code (minor); Replit Agent for deployment settings (minor). The team set the direction, IT areas, questionnaire items and weights, and reviewed every change with automated tests, the data validator and manual checks in the browser.

## Challenges & Learnings

- **Malaysia has almost no role-level demand data for IT.** DOSM publishes by industry and by major occupation group, and every IT role sits in the same ICT industry. Only Software Developers has its own job-ad series. We use the official MyCOL 2024/2025 critical-occupations list for each role, show DOSM industry figures as context only, and show "no data" instead of estimating a number.
- **Small, messy series.** DOSM online job ads jump at a series break in 2025 Q3; for some quarters DOSM names only the top 5 occupations, so we can only store an upper bound (a censored value); in 2026 Q2 about half the ads had no industry. Each signal therefore carries a confidence and its reasons, and windows never cross a break.
- **Growth that is not what it looks like.** AI papers on arXiv grew in most IT areas, but all papers grew faster, so AI's share fell. We flag these signals as a "composition effect" instead of reading them as AI entering the field faster.
- **Interest tests hardly separate IT areas.** The O*NET RIASEC profiles of software, data, security and networking roles correlate 0.85–0.98, so we added area-specific interest questions and an IT skills test with hands-on tasks.
- **Keeping GenAI honest.** The model only words an explanation of numbers our code computed; a reply with any number not in its input is rejected and a rule-based text is shown instead.
- **Publishing on Replit.** Publishing failed in Replit's package step until we removed every dependency and declared an empty Python project (`pyproject.toml`, `uv.lock`).
- **Working as three people on one repo.** Two of us once wired the same trend layer into the app in parallel. We now branch from the latest `main`, run the tests and the data validator, and merge small changes often.

## Future Improvements

- **Real trends, not snapshots.** Add the next DOSM Job Market Insights quarter (2026 Q3) and future MyCOL editions, so demand signals compare several periods instead of one status.
- **Rising and declining skills.** Derive skill-level signals (for example, skills named in job ads over time), not only area- and role-level ones.
- **Calibrate the trend score** with the team: a single medium-confidence signal can currently move a part to 100.
- **Employer and HR view:** a skills-gap heatmap and reskilling plan for a whole team.
- **Bahasa Malaysia and Chinese** versions of the interface (the IT areas already have Chinese names in the data).
- **More HRD Corp-claimable programmes,** checked against HRD Corp's own records, not only provider pages.
- **Progress tracking** along the learning path, and keeping refreshed trend data across deployment restarts.
- **A fairness check:** the app collects no age, gender or background, and a test could show that recommendations depend only on interests, skills and the CV.

## Team

| Name | Role | GitHub |
|---|---|---|
| Hong Zhi Yang (team leader) | Trend data (MyCOL, DOSM, arXiv signals) | [@zhiyang19015-stack](https://github.com/zhiyang19015-stack) |
| Ng Tian Ni | Roles, skills, SDG mapping | [@cherylloveslemonade](https://github.com/cherylloveslemonade) |
| Phon Kar Lok | App, matching, courses, repo | [@pekoremon](https://github.com/pekoremon) |

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
