> [!IMPORTANT]
> **📁 Submission Documents & Templates**
>
> All required submission templates are in the official Google Drive folder:
> https://drive.google.com/drive/folders/1xw7c2aN8N-at8hPEULzkcU76e_FFb0Ef

# Future Skills

AI is replacing generic tech jobs. Future Skills helps graduating tech students find "tech + domain knowledge" roles in agriculture, finance and healthcare that are harder for AI to replace and that advance the UN SDGs, and gives them a step-by-step pathway to get there.

## Team Information

| Field | Details |
|---|---|
| Team Name | [TEAM NAME] |
| Team Domain | Domain 1 — Aiversecity Future-Ready Workforce |
| SDG Track (1–17) | SDG 4 — Quality Education (targets 4.3, 4.4); SDG 8 — Decent Work (targets 8.2, 8.5) |
| Team Leader | [Hong Zhi Yang] |
| University | [Universiti Tunku Abdul Rahman] |
| Number of Members | 3 |

## Links

| Resource | Link |
|---|---|
| GitHub Repository | [REPO URL] |
| Replit Project | [REPLIT PROJECT URL] |
| Live Demo | [REPLIT DEPLOYMENT URL] |
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

1. **Skills profile intake** — [form / RIASEC questionnaire]
2. **AI-trend signal layer** — updatable, dated sources (DOSM, OpenDOSM, arXiv)
3. **Future-role matching** — explainable match score and skills gap
4. **Personalised reskilling pathway** — ordered plan with estimated time, free / low-cost courses
5. **SDG mapping** — every role and skill tagged to at least one SDG target
6. **Handling uncertainty** — more than one AI-disruption scenario

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | [TBD] |
| Backend | Python [framework TBD] |
| Data | CSV tables in `data/`, validated by `scripts/validate_data.py` |
| Hosting / Dev | Replit |

## Project Structure

```
.
├── data/                    # Curated tables; every row has source_name, source_url, source_date
│   ├── roles.csv
│   ├── skills.csv
│   ├── role_skills.csv
│   ├── trends.csv
│   ├── sdg_map.csv
│   ├── courses.csv
│   └── sample_profiles.json # Fictional demo profiles only
├── docs/                    # Screenshots, diagrams
├── raw/                     # Raw downloads (git-ignored; listed in SOURCES.md)
├── scripts/
│   ├── onet_extract.py      # Extract role skills and RIASEC codes from O*NET
│   ├── update_trends.py     # Refresh trends.csv ("Update data" button)
│   └── validate_data.py     # Check every row has a source and date
├── src/
│   └── main.py              # Application entry point
├── submission/              # Required submission PDFs
├── tests/
├── .env.example
├── .replit
├── LICENSE
├── SOURCES.md               # All data sources and their licences
└── requirements.txt
```

## How to Run

### Option 1 — Run on Replit (Recommended)

1. Open the Replit Project, or import this repository via **Create Repl → Import from GitHub**.
2. Add any variables from `.env.example` in the **Secrets** tab.
3. Click **Run**. Replit uses the `.replit` file to start `python src/main.py`.

### Option 2 — Run Locally

```bash
git clone [REPO URL]
cd future-skills
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # then fill in your values
python src/main.py
```

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

[List every AI tool and model used in development and in the product.]

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
