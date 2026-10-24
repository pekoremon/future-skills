# Sources and Licences

Every row in `data/` cites one of the sources below in its `source_name`, `source_url` and `source_date` columns. Malaysian demand signals come from DOSM and MyCOL; O*NET (US) is used only for skill structure and RIASEC interest codes.

Dates are `YYYY-MM-DD`. For downloaded files, `source_date` is the date we downloaded the file. For web pages and documents without a single publication date, it is the date we consulted them. It is not the publication date of the data.

**Exception:** `trends.csv` (member A's trend inputs) has two dates instead of `source_date`: `release_date`, when the source published the figure, and `fetched_date`, when we fetched or copied it.

## Data sources

| Source | Used for | Format / update | Licence | Notes |
|---|---|---|---|---|
| [DOSM Big Data Analytics: Job Market Insights](https://www.dosm.gov.my/portal-main/release-content/big-data-analytics-job-market-insights-q22026) (2025 Q3 – 2026 Q2) | Online job ads for Software Developers (MASCO 2512), the only IT occupation DOSM publishes | PDF / release page, quarterly | DOSM official release; cite "Source: Department of Statistics Malaysia" | Copied by hand into `raw/dosm_manual.csv`. Censored values (not in the top 5) keep only an upper bound and are never used as data points |
| [DOSM Job Market Insights data workbook "Data JMI Q2 2026"](https://www.dosm.gov.my/portal-main/release-document-log?release_document_id=20742) | Online job ads by MASCO major group and by industry (ICT share) | Excel, quarterly | Same as above | Series break at 2025 Q3 (cause not given by DOSM); 49% of 2026 Q2 ads have no industry |
| [DOSM Labour Market Review](https://storage.dosm.gov.my/analysis/lmr_2026-q2_en.pdf) 2025 Q1, 2026 Q1, Q2 | ICT and national employment growth (Table 4.2); wage growth (Table 5.1) | PDF, quarterly | Same as above | Used where OpenDOSM has no data yet |
| [OpenDOSM](https://open.dosm.gov.my/data-catalogue) `productivity_qtr`, `wages_occupation` | Live source for the "Update data" button: ICT and national employment growth, median wage by MASCO major group | API, no key | OpenDOSM open data, CC BY 4.0 [TO CHECK on the site footer] | `productivity_qtr` update is overdue (last 2026-02-23, due 2026-05-21); `wages_occupation` covers citizen employees only |
| [O*NET Database](https://www.onetcenter.org/database.html) | Role skills, In Demand technologies, RIASEC scores, Job Zone | CSV download (O*NET 31.0) | CC BY 4.0 — attribution required | US data; skill structure only |
| [ESCO](https://esco.ec.europa.eu/en/use-esco/download) | Backup skill taxonomy; green / digital skill lists for SDG mapping | API / CSV | [TO CHECK] | Based on ISCO-08, same root as MASCO |
| [MyCOL 2024/2025](https://www.talentcorp.com.my/images/uploads/publication/204/MyMahir-Malaysia-Critical-Occupations-List-MyCOL20242025-1773385490.pdf) (landing page: https://www.talentcorp.com.my/mycol/) | Malaysian demand: whether each role and IT area is on the official critical-occupations list (66 occupations); [brochure](https://www.talentcorp.com.my/images/uploads/publication/205/MyMahir-MyCOL-20242025-Brochure-1773377416.pdf) for the names | Annual report | [TO CHECK] | One edition, so a status, not a trend. The PDF states no publication date; we use its file date, 2026-03-13 |
| MyMahir | 120 emerging roles and skill lists (reference only) | Website, no public API | [TO CHECK] | Manual reference |
| [arXiv API](https://info.arxiv.org/help/api/tou.html) | AI papers and all papers per IT sub-domain (`data/subdomains.csv`: cs.SE, cs.DB + cs.LG, cs.CR, cs.NI + cs.DC, cs.HC), last 6 full months vs the 6 before | API, no key | arXiv metadata: CC0; follows the API terms of use (3 s between requests) | Global signal, not Malaysian; keyword match, so approximate. IT Management has no arXiv category, so no AI momentum |
| [Microsoft Learn](https://learn.microsoft.com/training/) | Free courses in `courses.csv` (Python, SQL, Power BI, Git, GitHub, HTML/CSS, Azure, Docker, C#) | [Catalog API](https://learn.microsoft.com/api/catalog/), no key | Free to use; content © Microsoft | Titles and durations from the catalog API, 2026-10-23 |
| [OpenLearn (The Open University)](https://www.open.edu/openlearn/) | Free courses in `courses.csv` (thinking skills, communication, English, maths, bookkeeping, cyber security) | Course pages | Free; course pages state their own licence | Hours and level read on each course page, 2026-10-23 |
| [freeCodeCamp.org YouTube channel](https://www.youtube.com/@freecodecamp), [Harvard CS50](https://cs50.harvard.edu/x/), Grow with Google, Simplilearn, Microsoft Learn, AWS Training | Free videos and courses in `learning_resources.csv` for the learning path page (39 resources) | YouTube / course pages | Free to watch; content © each creator, linked not copied | Each link checked on 2026-10-24: title and channel from YouTube oEmbed, length from the video page, HTTP 200 for course pages. A link we could not open (Splunk Education, HTTP 403) was left out |
| [The Linux Foundation training](https://training.linuxfoundation.org/) | Free courses LFS101 (Linux) and LFS158 (Kubernetes) | Course pages | Free ($0) courses | Read on each course page, 2026-10-23 |
| [UKM Professional Certificate in Data Analytics](https://www.ukm.my/studyukm/professional-certificate-in-data-analytics/) | Paid, HRD Corp-claimable option in `courses.csv` (Python, Tableau, Power BI) | Course page | Fees and terms set by UKM | RM 3,000, 3 months online. The page says it is claimable under HRD Corp through a registered employer. Checked 2026-10-24 |
| [Trainocate Malaysia](https://trainocate.com.my/) (CompTIA Network+, AWS Technical Essentials) | Paid, HRD Corp-claimable options in `courses.csv` | Course pages | Fees set by the provider | Each course page says "HRD Corp Claimable" (a provider statement, not an HRD Corp record). Checked 2026-10-24 |
| [UN SDG targets](https://unstats.un.org/sdgs/indicators/indicators-list/) | Official target numbers for `sdg_map.csv` | Website / PDF | [TO CHECK] | File used: [Global indicator framework, English PDF](https://unstats.un.org/sdgs/indicators/Global-Indicator-Framework-after-2026-refinement_Eng.pdf) (A/RES/71/313 Annex, refined to 2026), consulted 2026-10-22. The one-line rationales and `link_strength` values are our own judgement, not UN text |

## Licence notes

- **O*NET** database is CC BY 4.0: credit O*NET in the app and here. Suggested attribution (check the wording against the O*NET licence page before submission):

  > This product includes information from the O*NET 31.0 Database by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). Used under the CC BY 4.0 license. O*NET(R) is a trademark of USDOL/ETA. The project team has modified all or some of this information. USDOL/ETA has not approved, endorsed, or tested these modifications.
- **Interest questionnaire** (`data/interest_items.json`): 36 statements written by the team, based on Holland's RIASEC types as used by O*NET. It is not an O*NET instrument, so the O*NET Interest Profiler CC BY-ND terms do not apply.

## Raw files

Downloads kept in `raw/`. Most are git-ignored; the DOSM PDFs below and `dosm_manual.csv` are committed as evidence for the hand-copied numbers. One line per file:

| File | URL | Downloaded (YYYY-MM-DD) | By |
|---|---|---|---|
| `onet_interest_profiler/Interest_Profiler.pdf` (Short Form, 60 items) | https://www.onetcenter.org/dl_tools/ipsf/Interest_Profiler.pdf | 2026-10-22 | Claude |
| `onet_interest_profiler/IP_Score_Report.pdf` | https://www.onetcenter.org/dl_tools/ipsf/IP_Score_Report.pdf | 2026-10-22 | Claude |
| `onet_interest_profiler/IP_Score_Report_Starter.pdf` | https://www.onetcenter.org/dl_tools/ipsf/IP_Score_Report_Starter.pdf | 2026-10-22 | Claude |
| `onet_interest_profiler/IP_Career_Listings.pdf` | https://www.onetcenter.org/dl_tools/ipsf/IP_Career_Listings.pdf | 2026-10-22 | Claude |
| `onet_interest_profiler/IP_Manual.html` | https://www.onetcenter.org/reports/IP_Manual.html | 2026-10-22 | Claude |
| `onet_db_31_0_csv/` (occupation_data, career_interest_types, essential_skills, transferable_skills, knowledge, software_skills, job_zones, content_model_reference, scales_reference `.csv`) | https://www.onetcenter.org/dl_files/database/db_31_0_csv/ (O*NET 31.0, one file each) | 2026-10-22 | Claude |
| `MyMahir-Malaysia-Critical-Occupations-List-MyCOL20242025-1773385490.pdf` | https://www.talentcorp.com.my/images/uploads/publication/204/MyMahir-Malaysia-Critical-Occupations-List-MyCOL20242025-1773385490.pdf | 2026-10-22 | cherylloveslemonade |

| `dosm_manual.csv` | Hand-copied from the DOSM releases above (edit this file, not `data/trends.csv`) | 2026-10-22 | zhiyang19015-stack |
| `jmi_2025q3.pdf` | https://www.dosm.gov.my/portal-main/release-content/big-data-analytics-job-market-insights-q32025 | 2026-10-22 | zhiyang19015-stack |
| `jmi_2025q4.pdf` | https://www.dosm.gov.my/portal-main/release-content/big-data-analytics-job-market-insights-q42025 | 2026-10-22 | zhiyang19015-stack |
| `jmi_2026q1.pdf` | https://www.dosm.gov.my/portal-main/release-content/big-data-analytics-job-market-insights-q12026 | 2026-10-22 | zhiyang19015-stack |
| `jmi_2026q2.pdf` | https://www.dosm.gov.my/portal-main/release-content/big-data-analytics-job-market-insights-q22026 | 2026-10-22 | zhiyang19015-stack |
| `lmr_2026q1.pdf` | https://storage.dosm.gov.my/analysis/lmr_2026-q1_en.pdf | 2026-10-22 | zhiyang19015-stack |
| `lmr_2026q2.pdf` | https://storage.dosm.gov.my/analysis/lmr_2026-q2_en.pdf | 2026-10-22 | zhiyang19015-stack |
| `agriculture_census_2024_report.pdf` | https://www.dosm.gov.my/uploads/release-content/file_20260319122516.pdf | 2026-10-22 | zhiyang19015-stack |

## How the O*NET files are used

| File | Used for | Output table |
|---|---|---|
| `essential_skills.csv` | General skills, importance and level | `skills.csv`, `role_skills.csv` |
| `transferable_skills.csv` | Transferable skills, importance and level | `skills.csv`, `role_skills.csv` |
| `knowledge.csv` | Domain knowledge, importance and level | `skills.csv`, `role_skills.csv` |
| `software_skills.csv` | In Demand technologies per occupation | `skills.csv`, `role_skills.csv` |
| `career_interest_types.csv` | RIASEC scores and interest high-point code | `onet/role_onet.csv` |
| `job_zones.csv` | Job Zone (level of preparation) | `roles.csv` |

Intermediate extracts made from these files with `scripts/onet_extract.py`: `role_onet.csv`, `role_skills_onet.csv`, `role_hot_tech.csv`. `role_skills.csv` is built by `scripts/build_role_skills.py`, which matches skills to `skills.csv` by O*NET element id and technologies by name.

## Choices and limits

- **MyCOL match types.** `is_mycol` is `yes` when the role title appears in an occupation's "job titles included" list, `near` when we matched the closest MyCOL occupation or a similar title, and `no` when MyCOL has nothing close. `near` rows are shown as "based on a related occupation". The MyCOL PDF's occupation titles and MASCO codes are images; we read them with OCR and checked the matches by hand, so re-check any code before relying on it. The `mycol_source_*` columns in `roles.csv` hold this source.
- **IT areas.** The 6 areas (`subfield_code` in `roles.csv`) are the team's own grouping of 26 O*NET IT occupations. The RIASEC scores in `onet/role_onet.csv` are O*NET data.
- **Importance filter.** `role_skills.csv` keeps O*NET skill and knowledge ratings with importance of 3.0 or higher. A skill missing from a role therefore means "below 3.0 or not rated". Importance ratings are kept as published (none of the kept rows is flagged "Recommend Suppress"). Seven level values that O*NET flags "Recommend Suppress" are left blank, so those seven rows have an importance but no level. The matching code skips them.
- **Technology rows.** `row_type = in_demand_tech` rows in `role_skills.csv` have no importance or level, because O*NET gives technologies only an In Demand flag. We did not estimate numbers. `is_in_demand_tech = Y` in `skills.csv` means O*NET's In Demand flag, which is stricter than O*NET's Hot Technology flag.
- **Mathematics** appears twice, as a skill and as a knowledge area, because O*NET lists it under two element IDs.
- **SDG links** are mostly `indirect`. Many general skills map to target 4.4 as general employability skills.
- **Education.** Job Zone is O*NET's U.S. measure of preparation. It is not a Malaysian qualification rule. Roles above the user's level are ranked later and marked "needs extra education", not hidden.
- **Area fit.** `0.45 × skills test + 0.30 × preference + 0.25 × CV evidence`, per IT area. Preference = `0.6 × the area's 4 questionnaire items + 0.4 × the average RIASEC fit of the area's roles`; the items weigh more because the O*NET interest profiles of software, data, security and networking roles correlate 0.85–0.98, so RIASEC alone hardly separates them. A part the student skipped is left out, never filled. See `scripts/matching.py`.
- **Skills test score per area.** An area tested in depth scores `0.4 × quick check + 0.6 × readiness`. An area seen only in the quick check keeps its quick-check score but never more than the weaker of the two areas tested in depth: it scored no higher in the quick check, and 3 easy items say less than harder ones. The test result page and the matches use this same score, so they name the same best area (`scripts/assessment.py`).
- **Skills shown by the test.** Each question is tagged with the O*NET skills and knowledge it tests. A right answer counts as level 3 (quick check), 4 (in depth) or 5 (hands-on) on the O*NET 0–7 scale in those skills, times the share of points earned; the best answer per skill counts, and a wrong answer lowers nothing. The student's own rating is used when it is higher. The three levels are team choices read off O*NET's level anchors.
- **Role score.** `0.4 × area fit + 0.1 × interest + 0.3 × skill + 0.2 × trend`; skill = 70% rated skills + 30% In Demand technologies. Interest is the Pearson correlation between the student's and the role's RIASEC scores. All weights are team design choices, not data.
- **Trend score.** Member A's signals (`trend_signals.csv`) give a direction and a confidence, not a number. `scripts/trend_score.py` turns each part into `50 + 50 × the confidence-weighted average direction` (high 1, medium 2/3, low 1/3): Malaysian demand from MyCOL coverage, DOSM ads and the role's own MyCOL status; AI momentum from arXiv. Trend = 50/50 of the two parts. The signals have no "down" values yet, so scores run from 50 to 100.
- **Future scenarios.** The three scenarios (`SCENARIOS` in `matching.py`) only re-weight the two measured parts of each trend score: current trends 50/50, fast AI adoption 20% demand / 80% AI momentum, Malaysian demand leads 80/20. They change no data, and the weights are team assumptions. IT Management, with no arXiv category, keeps the same score in every scenario.
- **Learning path page.** For each role: free resources for its IT area, resources made for the role, then its skills and tools with resources (technologies first), then certifications. Resources come only from `learning_resources.csv` and `courses.csv`; a skill with no checked resource says so. Salaries are not shown: we found no public Malaysian salary data per IT role (DOSM publishes only MASCO major-group medians).
- **Learning path.** Gaps are ordered by importance × missing level, then missing technologies. Gaps smaller than 0.5 O*NET level points get no course. Total time = sum of stated course hours; weeks = hours ÷ the student's study hours per week. Courses with no stated length are counted separately.
- **Empty fields.** `ai_replacement_risk` in `roles.csv` is empty until we have a sourced figure. We do not fill it from opinion.
- **Data policy.** Only public or synthetic data. No real CVs or personal data.

## AI model in the product

- **gpt-oss-120b** on **Fireworks AI** (`accounts/fireworks/models/gpt-oss-120b`), open-weight model under Apache 2.0, called through the Fireworks chat completions API. Used only to word the "Explain this for me" text from facts our code computed. Replies with numbers not in those facts are rejected (`scripts/explain.py`). It is not a data source.

## Known risks and fallbacks

- **Hardest risk: almost no role-level Malaysian demand data.** All IT roles sit in one DOSM industry (Information and communication), and DOSM publishes online ads for only one IT occupation (Software Developers). MyCOL is the only official Malaysian source that separates IT roles, and it is one edition.
- **Fallback.** (1) A missing number is never estimated: the app shows "no data" and the score uses only the measured part. (2) Every data point keeps its source, release date and fetch date, and the Update data job keeps the last good rows when a source fails. (3) Next step: read the vacancy and shortage icons on the MyMahir occupation pages, and add the next DOSM quarter (2026 Q3 release, due 2026-11-17).
- **Second risk: course coverage.** `courses.csv` covers 26 of the 186 skills the roles use. The app says "No verified free course in our list yet" for the rest instead of suggesting an unchecked one.
