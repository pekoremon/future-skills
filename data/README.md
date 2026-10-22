# Data dictionary

All tables are UTF-8 CSV. Every row must have `source_name`, `source_url` (http/https) and `source_date` (YYYY-MM-DD); `python scripts/validate_data.py` enforces this. Leave a value empty rather than guessing; write "no data" in a note instead of filling in a number.

## roles.csv — 35 roles (5 per RIASEC type + 5 generic IT roles as a control group)

| Column | Meaning |
|---|---|
| role_id | Unique id, e.g. `R11` |
| group | `IT_CONTROL`, `R`, `I`, `A`, `S`, `E` or `C` |
| priority | Order within the group (1 = first choice) |
| role_name_en | Role name in English (O*NET title where one exists) |
| riasec_type_assigned | RIASEC type the team assigned (`IT` for the control group) |
| riasec_code_onet | Top 1–3 interest letters from O*NET, e.g. `ICR` (from `scripts/onet_extract.py`) |
| onet_soc | O*NET-SOC code, e.g. `15-2051.00` (required) |
| masco_4digit_mycol | 4-digit MASCO code of the MyCOL occupation, if any |
| mycol_occupation / mycol_matched_title | MyCOL occupation and the job title listed under it |
| is_mycol | `yes`, `near` (closest MyCOL match only) or `no` |
| it_reachable_draft | `yes`, `needs_extra_qualification` or `no` for an IT graduate |
| ai_replacement_risk | `low` / `medium` / `high`, from a cited source; empty until sourced |
| notes | Free text |

`source_*` cites the MyCOL report when the role is in MyCOL, otherwise the O*NET 31.0 database. `onet_soc` and `riasec_code_onet` always come from O*NET 31.0; see `data/onet/role_onet.csv`.

## data/onet/ — O*NET 31.0 extracts per role (generated, do not edit by hand)

Rebuild with `python scripts/onet_extract.py` after downloading the O*NET CSVs listed in `SOURCES.md` into `raw/onet_db_31_0_csv/`.

| File | Contents |
|---|---|
| role_onet.csv | RIASEC scores (1–7), RIASEC code and Job Zone per role |
| role_skills_onet.csv | Essential skills, transferable skills and knowledge areas with O*NET importance ≥ 3.0 (1–5) and level |
| role_hot_tech.csv | O*NET "Hot Technology" software examples; `in_demand = Y` marks the most demanded |

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
