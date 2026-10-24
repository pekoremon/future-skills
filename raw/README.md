# raw/

Original downloads (DOSM PDFs, O*NET database ZIP, etc.). Files here are git-ignored to keep the repo small; record every file in `SOURCES.md` with its URL and download date so anyone can fetch it again.

Exception: the DOSM PDFs and `dosm_manual.csv` are committed on purpose as evidence for the numbers in `data/trends.csv`.

Also committed: `dosm/jmi_data_2026q2.xlsx` (the DOSM "Data JMI Q2 2026" workbook) and `mycol/mycol_2024_2025.csv` (the MyCOL 2024/2025 list typed from the TalentCorp brochure). `scripts/update_trends.py` reads both on every update; without them it keeps the previous rows.
