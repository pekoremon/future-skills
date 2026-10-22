# Sources and Licences

Every row in `data/` cites one of the sources below in its `source_name`, `source_url` and `source_date` columns. Malaysian demand signals come from DOSM and MyCOL; O*NET (US) is used only for skill structure and RIASEC interest codes.

Dates are `YYYY-MM-DD`. For downloaded files, `source_date` is the date we downloaded the file. For web pages and documents without a single publication date, it is the date we consulted them. It is not the publication date of the data.

## Data sources

| Source | Used for | Format / update | Licence | Notes |
|---|---|---|---|---|
| [DOSM Job Market Insights](https://www.dosm.gov.my/uploads/release-content/file_20260818075305.pdf) | Online job ads by occupation, industry, STEM / TVET / MyCOL | PDF, quarterly (latest 2026 Q2) | [TO CHECK] | Numbers extracted by hand or script into `trends.csv` |
| [OpenDOSM](https://open.dosm.gov.my/data-catalogue/lfs_year) | Programmatic source for the "Update data" button; labour force data | API / CSV / Parquet, no key | [TO CHECK] | Look for a vacancies-by-occupation dataset |
| [O*NET Database](https://www.onetcenter.org/database.html) | Role skills, In Demand technologies, RIASEC scores, Job Zone | CSV download (O*NET 31.0) | CC BY 4.0 — attribution required | US data; skill structure only |
| [ESCO](https://esco.ec.europa.eu/en/use-esco/download) | Backup skill taxonomy; green / digital skill lists for SDG mapping | API / CSV | [TO CHECK] | Based on ISCO-08, same root as MASCO |
| [MyCOL 2024/2025](https://www.talentcorp.com.my/images/uploads/publication/204/MyMahir-Malaysia-Critical-Occupations-List-MyCOL20242025-1773385490.pdf) (landing page: https://www.talentcorp.com.my/mycol/) | Evidence that chosen roles are in demand in Malaysia (66 critical occupations) | Annual report | [TO CHECK] | Original TalentCorp report. The PDF states no publication date; we use its file date, 2026-03-13 |
| MyMahir | 120 emerging roles and skill lists (reference only) | Website, no public API | [TO CHECK] | Manual reference |
| arXiv API | Monthly AI paper counts per domain (how fast AI enters each field) | API, no key | arXiv metadata: CC0 | Supplementary signal |
| [UN SDG targets](https://unstats.un.org/sdgs/indicators/indicators-list/) | Official target numbers for `sdg_map.csv` | Website / PDF | [TO CHECK] | File used: [Global indicator framework, English PDF](https://unstats.un.org/sdgs/indicators/Global-Indicator-Framework-after-2026-refinement_Eng.pdf) (A/RES/71/313 Annex, refined to 2026), consulted 2026-10-22. The one-line rationales and `link_strength` values are our own judgement, not UN text |

## Licence notes

- **O*NET** database is CC BY 4.0: credit O*NET in the app and here. Suggested attribution (check the wording against the O*NET licence page before submission):

  > This product includes information from the O*NET 31.0 Database by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). Used under the CC BY 4.0 license. O*NET(R) is a trademark of USDOL/ETA. The project team has modified all or some of this information. USDOL/ETA has not approved, endorsed, or tested these modifications.
- **O*NET Interest Profiler (RIASEC) items** are CC BY-ND when used verbatim; a translation needs separate permission.

## Raw files

Downloads kept in `raw/` (git-ignored). One line per file:

| File | URL | Downloaded (YYYY-MM-DD) | By |
|---|---|---|---|
| `onet_interest_profiler/Interest_Profiler.pdf` (Short Form, 60 items) | https://www.onetcenter.org/dl_tools/ipsf/Interest_Profiler.pdf | 2026-10-22 | Claude |
| `onet_interest_profiler/IP_Score_Report.pdf` | https://www.onetcenter.org/dl_tools/ipsf/IP_Score_Report.pdf | 2026-10-22 | Claude |
| `onet_interest_profiler/IP_Score_Report_Starter.pdf` | https://www.onetcenter.org/dl_tools/ipsf/IP_Score_Report_Starter.pdf | 2026-10-22 | Claude |
| `onet_interest_profiler/IP_Career_Listings.pdf` | https://www.onetcenter.org/dl_tools/ipsf/IP_Career_Listings.pdf | 2026-10-22 | Claude |
| `onet_interest_profiler/IP_Manual.html` | https://www.onetcenter.org/reports/IP_Manual.html | 2026-10-22 | Claude |
| `onet_db_31_0_csv/` (occupation_data, career_interest_types, essential_skills, transferable_skills, knowledge, software_skills, job_zones, content_model_reference, scales_reference `.csv`) | https://www.onetcenter.org/dl_files/database/db_31_0_csv/ (O*NET 31.0, one file each) | 2026-10-22 | Claude |
| `MyMahir-Malaysia-Critical-Occupations-List-MyCOL20242025-1773385490.pdf` | https://www.talentcorp.com.my/images/uploads/publication/204/MyMahir-Malaysia-Critical-Occupations-List-MyCOL20242025-1773385490.pdf | 2026-10-22 | cherylloveslemonade |

## How the O*NET files are used

| File | Used for | Output table |
|---|---|---|
| `essential_skills.csv` | General skills, importance and level | `skills.csv`, `role_skills.csv` |
| `transferable_skills.csv` | Transferable skills, importance and level | `skills.csv`, `role_skills.csv` |
| `knowledge.csv` | Domain knowledge, importance and level | `skills.csv`, `role_skills.csv` |
| `software_skills.csv` | In Demand technologies per occupation | `skills.csv`, `role_skills.csv` |
| `career_interest_types.csv` | RIASEC scores and interest high-point code | `roles.csv` |
| `job_zones.csv` | Job Zone (level of preparation) | `roles.csv` |

Intermediate extracts made from these files with `scripts/onet_extract.py`: `role_onet.csv`, `role_skills_onet.csv`, `role_hot_tech.csv`.

## Choices and limits

- **MyCOL match types.** `is_mycol` is `yes` when the role title appears in an occupation's "job titles included" list, `near` when we matched the closest MyCOL occupation or a similar title, and `no` when MyCOL has nothing close. `near` rows are shown as "based on a related occupation". The MyCOL PDF's occupation titles and MASCO codes are images; we read them with OCR and checked the matches by hand, so re-check any code before relying on it. The `mycol_source_*` columns in `roles.csv` hold this source.
- **Groups versus RIASEC.** `group` in `roles.csv` is the team's own category. `riasec_code_onet` and the six `score_*` columns are O*NET data. Matching uses the scores, not the group. A few roles have a first RIASEC letter that differs from their group.
- **Role replaced.** The original R32, Financial Risk Specialists (13-2054.00), has no skills or knowledge ratings in O*NET 31.0, so R32 is now Financial Quantitative Analysts (13-2099.01). Its MyCOL match is the occupation Financial Analysts (2413), marked `near`.
- **Importance filter.** `role_skills.csv` keeps O*NET skill and knowledge ratings with importance of 3.0 or higher. A skill missing from a role therefore means "below 3.0 or not rated". Importance ratings are kept as published (none of the kept rows is flagged "Recommend Suppress"). Seven level values that O*NET flags "Recommend Suppress" are left blank, so those seven rows have an importance but no level. The matching code skips them.
- **Technology rows.** `row_type = in_demand_tech` rows in `role_skills.csv` have no importance or level, because O*NET gives technologies only an In Demand flag. We did not estimate numbers. `is_in_demand_tech = Y` in `skills.csv` means O*NET's In Demand flag, which is stricter than O*NET's Hot Technology flag.
- **Mathematics** appears twice, as a skill and as a knowledge area, because O*NET lists it under two element IDs.
- **SDG links** are mostly `indirect`. Many general skills map to target 4.4 as general employability skills.
- **Education.** Job Zone is O*NET's U.S. measure of preparation. It is not a Malaysian qualification rule. Roles above the user's level are ranked later and marked "needs extra education", not hidden.
- **Scores.** The weights (0.2 interest, 0.5 skill, 0.3 trend) and the 70/30 split inside the skill score are team design choices, not data. See `scripts/matching.py`.
- **Empty fields.** `ai_replacement_risk` in `roles.csv` is empty until we have a sourced figure. We do not fill it from opinion.
- **Data policy.** Only public or synthetic data. No real CVs or personal data.
