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
| score_R … score_C | O*NET RIASEC interest scores, 1–7 |
| job_zone | O*NET Job Zone 1–5 (U.S. level of preparation, not a Malaysian rule) |
| onet_title | O*NET occupation title |
| onet_soc | O*NET-SOC code, e.g. `15-2051.00` (required) |
| masco_4digit_mycol | 4-digit MASCO code of the MyCOL occupation, if any |
| mycol_occupation / mycol_matched_title | MyCOL occupation and the job title listed under it |
| is_mycol | `yes`, `near` (closest MyCOL match only) or `no` |
| it_reachable_draft | `yes`, `needs_extra_qualification` or `no` for an IT graduate |
| ai_replacement_risk | `low` / `medium` / `high`, from a cited source; empty until sourced |
| mycol_source_name / _url / _date | Source of the MyCOL match (the main `source_*` columns cite O*NET) |
| notes | Free text |

`source_*` cites the MyCOL report when the role is in MyCOL, otherwise the O*NET 31.0 database. `onet_soc` and `riasec_code_onet` always come from O*NET 31.0; see `data/onet/role_onet.csv`.

## data/onet/ — O*NET 31.0 extracts per role (generated, do not edit by hand)

Rebuild with `python scripts/onet_extract.py` after downloading the O*NET CSVs listed in `SOURCES.md` into `raw/onet_db_31_0_csv/`.

| File | Contents |
|---|---|
| role_onet.csv | RIASEC scores (1–7), RIASEC code and Job Zone per role |
| role_skills_onet.csv | Essential skills, transferable skills and knowledge areas with O*NET importance ≥ 3.0 (1–5) and level |
| role_hot_tech.csv | O*NET "Hot Technology" software examples; `in_demand = Y` marks the most demanded |

## skills.csv — 153 skills from O*NET 31.0

| Column | Meaning |
|---|---|
| skill_id | Unique id, e.g. `SK001` |
| skill_name | O*NET element or technology name |
| skill_type | `general` (essential and transferable skills), `domain_knowledge` (O*NET knowledge areas) or `technology` |
| onet_source_type | `essential_skill`, `transferable_skill`, `knowledge` or `technology_skills` |
| onet_element_id | O*NET element id, e.g. `2.A.2.a` (empty for technologies) |
| tech_category | O*NET commodity category (technologies only) |
| is_in_demand_tech | `Y` if O*NET flags the technology In Demand, otherwise `N` |

## role_skills.csv — which skills each role needs

| Column | Meaning |
|---|---|
| role_id | Must exist in roles.csv |
| skill_id | Must exist in skills.csv |
| importance | O*NET importance, 1–5 (only rows with importance ≥ 3.0 are kept); empty for technology rows |
| level | O*NET level, 0–7; empty for technology rows and where O*NET suppresses the value |
| row_type | `skill_knowledge` (rated skill or knowledge) or `in_demand_tech` (no rating, O*NET gives only a flag) |

## trends.csv — at least one signal per role and per skill

| Column | Meaning |
|---|---|
| trend_id | Unique id |
| entity_type | `role`, `skill`, `domain`, or one of the types below |
| entity_id | Id in the matching table (domain name for `domain`) |
| metric | e.g. `online_job_ads`, `arxiv_ai_papers` |
| value | Number as published |
| unit | e.g. `ads`, `papers`, `percent` |
| period_start | First day of the period, `YYYY-MM-DD` (empty only on a `no data` row with no period) |
| period_end | Last day of the period, `YYYY-MM-DD` |
| geography | `MY` for Malaysia, `global` for arXiv |
| note | Scope and caveats, e.g. "Sector-level (MSIC); not role-specific" |

`entity_type` can also be `occupation` (a MASCO code, e.g. `masco_2512`), `occupation_group` (a MASCO major group, e.g. `masco_2`) or `population_group` (e.g. `youth_15_24`). Domain ids are `agriculture`, `finance`, `healthcare`, `generic_tech`, plus `overall` (Malaysia-wide baseline) and `services`. `value` is a number or `no data`; we never fill a gap with an estimate.

This file is written by `scripts/update_trends.py`; edit `raw/dosm_manual.csv` instead. `scripts/trend_score.py` turns it into `trend_scores.csv` (one 0–100 score per domain, formula `v1`).

## sdg_map.csv — at least one SDG target per role and per skill

| Column | Meaning |
|---|---|
| sdg_id | Row id, e.g. `S01` |
| entity_type | `role` or `skill` |
| entity_id / entity_name | Id and name in roles.csv / skills.csv |
| sdg_goal / sdg_goal_name | Goal number and name |
| sdg_target | UN target number, e.g. `4.4` |
| link_strength | `direct` or `indirect` (team judgement) |
| rationale | One sentence on why (team judgement, not UN text) |

## courses.csv — free courses for the most common gap skills

One row per course × skill; a course that teaches several skills has one row per skill (`notes` says "Same course as …"). Only courses whose title, length and price were checked on the provider's own page or catalog are listed; a skill with no checked course is shown as such in the app, never filled with a guess.

| Column | Meaning |
|---|---|
| course_id | Unique id, e.g. `C07` |
| skill_id | Must exist in skills.csv |
| title / provider / url | Course details |
| duration_hours | Hours stated by the provider; empty when it states none |
| cost_myr | Cost in RM (`0` for free) |
| hrd_corp_claimable | `yes` / `no` / `unknown` (all `unknown` until checked with HRD Corp) |
| verified_date | Date someone opened the link and checked it (YYYY-MM-DD) |
| level | Provider's level label |
| notes | What the page said, caveats |

## role_summaries.csv — one plain line per role

What the job is, in one sentence a student understands, in English, Bahasa Melayu and Chinese (`summary_en`, `summary_ms`, `summary_zh`); shown under the role name on the learning path. Written by the team.

## projects.csv — portfolio project ideas per role

Two short projects per role that a student can build to show employers the role's skills, shown under "Prove it" on the learning path. Written by the team (`source_name` says so); columns `project_id`, `role_id`, `title`, `description`, and a free guide to follow (`guide_name`, `guide_url`), opened and checked on `verified_date`.

## certifications.csv — licences and certifications that prove a role's skills

Only skills that need a licence or certificate as proof; basic skills are covered by `courses.csv`. Every value was read on the issuer's or regulator's own page (or a cited news/university page when the official one gave no figure); unconfirmed values stay empty and the reason goes in `notes`.

| Column | Meaning |
|---|---|
| cert_id | Unique id, e.g. `CERT07` |
| role_id | Must exist in roles.csv |
| cert_name / issuer | Certificate or licence, and the body that issues it |
| cert_type | `licence` (legal registration to practise) or `certification` (industry credential) |
| required_to_practise_my | `yes` if Malaysian law requires it to practise, `no` if optional, empty if not verified |
| entry_requirement | What you need before applying (degree, experience, exam) |
| how_to_get | Steps to obtain it |
| cost_amount / cost_currency | Fee as published (`MYR` or `USD`); what it covers is in `notes` |
| hrd_corp_claimable | `yes` / `no` / `unknown` |
| url | Official page for the certificate |
| verified_date | Date someone opened the official page and checked it (YYYY-MM-DD) |
| notes | What the fee covers, caveats, what still needs checking |

## sample_profiles.json — 3–4 fictional students for the demo

No real CVs or personal data. Each profile is the input to `scripts/matching.py`:

| Field | Meaning |
|---|---|
| profile_id / name | Id and a name marked "(fictional)" |
| education_job_zone | Highest education as an O*NET Job Zone (4 = bachelor's degree) |
| riasec | Six RIASEC totals from the questionnaire (any scale) |
| skills | `skill_id` → level on the O*NET 0–7 scale (`rating_to_level()` converts a 1–5 self-rating) |
| technologies | `skill_id`s of technologies the student already uses |

## it_assessment.json — IT domain readiness questions

77 questions in the team's 5 IT areas (`software_dev`, `data_ai`, `cybersecurity`, `cloud_infra`, `web_ux`), each mapped to O*NET-SOC codes. Each area has at least 5 `screen`, 6 `deep` and 2 `practical` items. A student answers 21: 3 screen items in every area, which ranks all 5 areas fairly, then 2 deep + 1 practical in their 2 strongest areas (`selection`). Single-choice options are shuffled per student.

| Field | Meaning |
|---|---|
| id | e.g. `CS-D4` (domain prefix, stage letter S/D/P, number) |
| type | `mcq` (answer = option index, 0-based), `multi` (list of indexes), `numeric` (with `tolerance`), `text` (`accept` lists valid answers), `code` (Python function, `tests` with `args` and `expected` or `raises`), `sql` (`setup_sql`, `expected_columns`, `expected_rows`) |
| skill | Specific skill tested, used for the skills gap |
| onet_skill_ids | Skill ids in skills.csv, links answers to role_skills.csv |
| time_s | Expected time in seconds |
| refs | Public sources that back the answer |
| exams | Optional: certification exam sections on the same topic, as `{exam, section}` keys into the top-level `exams` (team mapping, see SOURCES.md) |

`scoring` holds points per stage, partial credit rules and the readiness levels. `exams` lists the certification exams (name, code, official page, section names). `review` counts outside experts who reviewed the bank and students who piloted it; the results page shows both, so raise them when that is done. `tests/test_it_assessment.py` checks every answer: it runs reference solutions against all code tests and the SQL answer in SQLite.
