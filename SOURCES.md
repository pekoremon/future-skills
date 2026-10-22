# Sources and Licences

Every row in `data/` cites one of the sources below in its `source_name`, `source_url` and `source_date` columns. Malaysian demand signals come from DOSM and MyCOL; O*NET (US) is used only for skill structure and RIASEC interest codes.

## Data sources

| Source | Used for | Format / update | Licence | Notes |
|---|---|---|---|---|
| [DOSM Job Market Insights](https://www.dosm.gov.my/uploads/release-content/file_20260818075305.pdf) | Online job ads by occupation, industry, STEM / TVET / MyCOL | PDF, quarterly (latest 2026 Q2) | [TO CHECK] | Numbers extracted by hand or script into `trends.csv` |
| [OpenDOSM](https://open.dosm.gov.my/data-catalogue/lfs_year) | Programmatic source for the "Update data" button; labour force data | API / CSV / Parquet, no key | [TO CHECK] | Look for a vacancies-by-occupation dataset |
| [O*NET Database](https://www.onetcenter.org/database.html) | Role skills, hot technologies, RIASEC scores | ZIP download | CC BY 4.0 — attribution required | US data; skill structure only |
| [ESCO](https://esco.ec.europa.eu/en/use-esco/download) | Backup skill taxonomy; green / digital skill lists for SDG mapping | API / CSV | [TO CHECK] | Based on ISCO-08, same root as MASCO |
| [MyCOL 2024/2025](https://www.ajobthing.com/resources/blog/66-critical-jobs-malaysia-2026-full-mycol-list-talent-corp) | Evidence that chosen roles are in demand in Malaysia (66 critical occupations) | Annual report | [TO CHECK] | Replace with the original TalentCorp report link |
| MyMahir | 120 emerging roles and skill lists (reference only) | Website, no public API | [TO CHECK] | Manual reference |
| arXiv API | Monthly AI paper counts per domain (how fast AI enters each field) | API, no key | arXiv metadata: CC0 | Supplementary signal |
| UN SDG targets | Official target wording for `sdg_map.csv` | Website | [TO CHECK] | |

## Licence notes

- **O*NET** database is CC BY 4.0: credit O*NET in the app and here.
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
