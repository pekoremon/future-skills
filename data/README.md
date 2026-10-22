# Data dictionary

All tables are UTF-8 CSV. Every row must have `source_name`, `source_url` (http/https) and `source_date` (YYYY-MM-DD); `python scripts/validate_data.py` enforces this. Leave a value empty rather than guessing; write "no data" in a note instead of filling in a number.

## roles.csv — about 18 roles (3 domains × 5 + 3 generic tech roles as a control group)

| Column | Meaning |
|---|---|
| role_id | Short unique id, e.g. `agri_data_analyst` |
| name_en / name_zh | Role name in English / Chinese |
| domain | `agriculture`, `finance`, `healthcare` or `general_tech` |
| onet_soc | O*NET-SOC code, e.g. `15-2051.00` |
| masco | MASCO code |
| in_mycol | `yes` / `no` |
| riasec_code | Holland code from O*NET, e.g. `ICR` |
| ai_risk | AI substitution risk (`low` / `medium` / `high`), from a cited source |

## skills.csv — 60–80 skills

| Column | Meaning |
|---|---|
| skill_id | Short unique id |
| name_en / name_zh | Skill name |
| skill_type | `tech`, `domain` or `general` |
| onet_hot_technology | `yes` / `no` |

## role_skills.csv — which skills each role needs

| Column | Meaning |
|---|---|
| role_id | Must exist in roles.csv |
| skill_id | Must exist in skills.csv |
| importance | Integer 1–5 |

## trends.csv — at least one signal per role and per skill

| Column | Meaning |
|---|---|
| trend_id | Unique id |
| entity_type | `role`, `skill` or `domain` |
| entity_id | Id in the matching table (domain name for `domain`) |
| metric | e.g. `online_job_ads`, `arxiv_ai_papers` |
| value | Number as published |
| unit | e.g. `ads`, `papers`, `percent` |
| period | e.g. `2026-Q2`, `2026-09` |

## sdg_map.csv — at least one SDG target per role and per skill

| Column | Meaning |
|---|---|
| entity_type | `role` or `skill` |
| entity_id | Id in roles.csv / skills.csv |
| sdg_target | UN target number, e.g. `4.4` |
| rationale | One sentence on why |

## courses.csv — 1–2 courses per skill

| Column | Meaning |
|---|---|
| course_id | Unique id |
| skill_id | Must exist in skills.csv |
| title / provider / url | Course details |
| duration_hours | Estimated hours |
| cost_myr | Cost in RM (`0` for free) |
| hrd_corp_claimable | `yes` / `no` / `unknown` |
| verified_date | Date someone opened the link and checked it (YYYY-MM-DD) |

## sample_profiles.json — 3–4 fictional students for the demo

No real CVs or personal data.
