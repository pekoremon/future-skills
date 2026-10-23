# Member A · Trend Data Handover (IT jobs)

Updated: 2026-10-23 · Status: trend layer built around **IT sub-domains** (team draft) and connected to B's `data/roles.csv` (26 roles). Output = `trend_signals.csv` (direction + confidence per signal); no 0–100 score.

Scope: IT jobs only. Malaysian numbers come from DOSM and MyCOL (TalentCorp). arXiv is a global research signal, not Malaysian demand.

---

## 1. How the trend layer is organised

| Layer | What | Sources | Scored? |
|---|---|---|---|
| **Sub-domain** | 6 IT sub-domains + 1 optional (`data/subdomains.csv`, team draft) | MyCOL (official MY), arXiv (global), DOSM online ads (only where DOSM has a series) | yes |
| **Role** | MyCOL yes / near / no per role (26 roles) | MyCOL + B's `data/roles.csv` | yes |
| **Industry background** | DOSM ICT sector (MSIC J): employment, wages, ad share | DOSM / OpenDOSM | no: same for all IT roles |
| **Reference** | Whole MASCO groups 2 and 3 | DOSM | no: not IT-only |

DOSM gives data by industry and MASCO major group, almost never by role. All IT roles sit in the same industry ("Information and communication"), so DOSM cannot tell sub-domains or roles apart. Real Malaysian data that **can** tell them apart is MyCOL.

### Sub-domains (draft, for the team to confirm)

| ID | Code | Sub-domain | arXiv categories | Roles in `data/roles.csv` (B) | MyCOL occupations those roles map to | DOSM online ads |
|---|---|---|---|---|---|---|
| `software_engineering` | SE | Software Engineering | cs.SE | IT01–IT04 | Software Developers; Application Programmers | Software Developers (MASCO 2512) |
| `data_ai` | DA | Data and AI | cs.DB, cs.LG | IT05–IT10 | Data Professionals; Database Designers and Administrators | no data |
| `cybersecurity` | CS | Cybersecurity | cs.CR | IT11–IT14 | Cyber Security Professionals | no data |
| `cloud_infra_networks` | CI | Cloud, Infrastructure and Networks | cs.NI, cs.DC | IT15–IT19 | IT System Administrators; Software Developers (IT19) | no data |
| `web_interface_design` | WD | Web and Interface Design | cs.HC | IT20–IT23 | Software and Application Developers and Analysts NEC; Creative Contents Designer Professionals; Digital Games and E-Sport Professionals | no data |
| `it_management_analysis` | IM | IT Management and Analysis | none (no matching category) | IT24–IT26 | Computer Systems Analysts; ICT Managers | no data |
| `hardware_embedded` | HW | Hardware and Embedded (optional) | cs.AR | none yet | none | no data |

`subfield_code` in `data/subdomains.csv` links each sub-domain to B's `subfield_code`. The role → MyCOL mapping lives only in `data/roles.csv` (B's file); the scripts read it on every run and stop if a MyCOL name in it does not match the official list. Names are matched ignoring case, spaces and punctuation, and "NEC" = "Not Elsewhere Classified", so B's spellings from the full report ("Cybersecurity Professionals", "…NEC") match the brochure list.

---

## 2. Files and how to run

```
future-skills/
  data/subdomains.csv        IT sub-domains + subfield_code + arXiv / DOSM mapping (team draft; edit here)
  data/roles.csv             26 IT roles from B (role -> MyCOL yes / near / no); B owns this file
  data/trends.csv            Trend inputs, 92 rows (generated, do not edit by hand)
  data/trend_signals.csv     Trend signals, 57 rows (generated)
  raw/dosm_manual.csv        12 rows typed by hand from DOSM releases
  raw/dosm/                  DOSM data workbook + PDFs (proof)
  raw/mycol/                 MyCOL 2024/2025 list (66 occupations) + TalentCorp brochure and full report PDFs (proof)
  scripts/update_trends.py   "Update data" button: rebuilds trends.csv, then runs trend_signals.py
  scripts/trend_signals.py   Signal rules
```

```bash
python scripts/update_trends.py              # all sources; arXiv takes ~1-2 min
python scripts/update_trends.py --no-arxiv   # demo: ~2 s, keeps the previous arXiv rows
python scripts/trend_signals.py              # recompute signals only, trends.csv untouched
```

Standard library only. If a source fails, its rows from the previous run are kept; if `trend_signals.py` fails, the previous `trend_signals.csv` is kept. Network calls time out after 15 s so the button cannot hang offline.

---

## 3. Where each row of trends.csv comes from

| entity_type | Rows | Source | fetch_method |
|---|---|---|---|
| `subdomain` | 25 | arXiv API: AI papers and all papers per sub-domain, last 6 full months vs the 6 before (`it_management_analysis`: one "no data" row) | `api` |
| `mycol_occupation` | 11 | MyCOL 2024/2025 occupations that a role in `data/roles.csv` maps to (yes / near); `entity_id` = `masco_<code>` from B's file; list from `raw/mycol/mycol_2024_2025.csv` (typed from the brochure) | `manual_snapshot` |
| `occupation` | 4 | Software Developers ads (2 real, 2 censored) from DOSM press releases | `manual_snapshot` |
| `occupation_group` | 24 | MASCO 2 / 3 + all ads (DOSM "Data JMI" workbook); MASCO 2 / 3 + national wages (OpenDOSM) | `dosm_file`, `api` |
| `sector` | 28 | ICT + national: ads (workbook), employment growth (OpenDOSM + Labour Market Review), wages (Labour Market Review) | `dosm_file`, `api`, `manual_snapshot` |

Fields: `value` (empty when censored), `upper_bound`, `is_proxy`, `is_censored`, `series_break_flag`, `fetch_method`, `release_date` (when the source published it), `fetched_date` (when we fetched or copied it). All percentages in notes are computed by the script.

**MyCOL notes:** the brochure gives occupation names only; the MASCO 4-digit codes come from B's `data/roles.csv` (B took them from the full report). MyCOL has no "near" category; "near" is B's definition (§6). `release_date` 2026-03-13 is the brochure file date; the report was announced by TalentCorp in May 2025.

---

## 4. Current signals (`data/trend_signals.csv`)

### Sub-domain layer (scored)

| Sub-domain | arXiv AI paper growth | MyCOL | DOSM online ads |
|---|---|---|---|
| Software Engineering | +29.9%, up, **composition effect** | 50% of 4 roles yes (2 no) | −0.95%, flat (low); share +0.38pp, up, **composition effect** (low) |
| Data and AI | +2.7%, flat | 33.3% of 6 roles yes (2 near, 2 no) | no data |
| Cybersecurity | +31.3%, up, **composition effect** | 0% yes; all 4 roles near | no data |
| Cloud, Infrastructure and Networks | +18.8%, up, **composition effect** | 20% of 5 roles yes (3 near, 1 no) | no data |
| Web and Interface Design | +0.9%, flat | 0% yes; 3 of 4 roles near, 1 no | no data |
| IT Management and Analysis | no data (no arXiv category) | 100% of 3 roles yes | no data |
| Hardware and Embedded | +40.5%, up, **composition effect** | no data (no roles in roles.csv) | no data |

**Important arXiv finding:** in every sub-domain where AI papers "grew", **all** papers in the category grew faster, so AI's share of papers fell (e.g. Software Engineering: AI papers +29.9%, all papers +37.4%, AI share 58.4% → 55.2%). The growth reflects more papers overall, not AI entering the field faster. These signals are marked `composition_effect = TRUE`. arXiv confidence is at most medium (global signal, keyword match).

**MyCOL coverage** = share of the sub-domain's roles with `is_mycol = yes`. Direction: any yes → `on_mycol` (+1); else any near → `near_mycol` (0); else `not_on_mycol` (0). It is a status, not a trend (one edition).

### Role layer (scored)

26 signals, one per role (`mycol_status` = B's `is_mycol`): 8 yes, 12 near, 6 no. Each links to the MyCOL occupation row it uses (`input_trend_ids`).

### Industry background (not scored)

ICT sector: employment growth +0.95pp above national (medium); wage growth −2.5pp below national (low, one month); ICT share of ads with an industry +0.34pp (low, 49.1% of 2026 Q2 ads unclassified).

### Reference (not scored)

MASCO 2: ads +6.61%, share +5.87pp, wage growth in line. MASCO 3: ads −13.91%, share −1.51pp, wage growth +3.52pp above national.

Draft thresholds (A + B to agree): AI paper growth ±10%, ad count ±5%, ad share ±0.25pp, gap vs national ±0.5pp. If matching needs a number, use `direction_code` weighted by confidence. Formula version `v4-it-roles`.

---

## 5. Known limits (state these in the proposal)

1. **DOSM cannot separate sub-domains or roles.** Only Software Engineering has a DOSM series (Software Developers, 2 real points). Other sub-domains show "no data".
2. **arXiv is global and keyword-based**, and its growth is mostly category growth (see §4).
3. **MyCOL is one edition** (2024/2025): a status, not a trend; role-to-occupation match and "near" are B's judgement.
4. **Few points**: descriptive comparison only.
5. **DOSM issues**: online-ads series break at 2025 Q3 (cause unverified); 49% unclassified industry in 2026 Q2; OpenDOSM `productivity_qtr` update overdue (last updated 2026-02-23, due 2026-05-21); employment growth gets revised (2025 Q1 national: first published 3.0%, now 1.8%). In the demo, do not rely on an API refresh; show the data dates.
6. **`trend_id` changes when trends.csv is rebuilt.** Do not hard-code `T00xx` in other files (fix proposed: stable IDs).

---

## 6. What other members need to do

**B: `data/roles.csv`** (received, 26 roles). Columns the scripts use:

| Column | Used for |
|---|---|
| `role_id` | role signal `entity_id` |
| `role_name_en` | role signal label |
| `subfield_code` | links the role to a sub-domain (must be a `subfield_code` in `data/subdomains.csv`) |
| `is_mycol` | `yes` / `near` / `no` (anything else stops the script) |
| `mycol_occupation`, `masco_4digit_mycol` | the MyCOL occupation for yes / near (name must match the official list; one MASCO code per occupation) |
| `mycol_matched_title`, `notes` | shown in the role signal's `detail` |

If B edits the file, rerun `python scripts/update_trends.py --no-arxiv` (about 2 s).

**Team:** confirm the sub-domain list in `data/subdomains.csv` (keep or drop the optional Hardware and Embedded: B has no roles there), the definition of "near", and the draft thresholds.

**Still open for A:** read the MyMahir occupation pages (vacancy and shortage-persistence icons) by hand if the team wants them; next DOSM quarter (2026 Q3 release, due 2026-11-17): download the new "Data JMI" workbook and update the `JMI_*` constants in `update_trends.py`.

**C:** GitHub repo, `validate_data.py`, `SOURCES.md`; `matching.py` should read the new `layer` / `scored` / `direction_code` / `confidence` columns.

---

## 7. Entries for SOURCES.md (for C to merge)

| Source | Link | Notes |
|---|---|---|
| TalentCorp, MyMahir Malaysia Critical Occupations List (MyCOL) 2024/2025, brochure | https://www.talentcorp.com.my/images/uploads/publication/205/MyMahir-MyCOL-20242025-Brochure-1773377416.pdf | 66 occupations; names only, no MASCO codes |
| arXiv API | https://info.arxiv.org/help/api/tou.html | Paper counts only (metadata), per arXiv API Terms of Use; ≥3 s between requests |
| DOSM Job Market Insights, data workbook "Data JMI Q2 2026" | https://www.dosm.gov.my/portal-main/release-document-log?release_document_id=20742 | Official DOSM; cite "Source: Department of Statistics Malaysia" |
| DOSM Job Market Insights releases (2025 Q3 – 2026 Q2) | https://www.dosm.gov.my/portal-main/release-content/big-data-analytics-job-market-insights-q22026 | same |
| DOSM Labour Market Review 2025 Q1, 2026 Q1, 2026 Q2 | https://storage.dosm.gov.my/analysis/lmr_2026-q2_en.pdf | same |
| OpenDOSM `productivity_qtr`, `wages_occupation` | https://open.dosm.gov.my/data-catalogue | CC BY 4.0 (C: confirm in site footer); `wages_occupation` covers citizen employees only, excludes bonuses |
