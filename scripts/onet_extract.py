"""Extract skills and RIASEC interest codes for our roles from the O*NET database.

Input:  the O*NET 31.0 database CSV files under raw/onet_db_31_0_csv/
        (https://www.onetcenter.org/database.html -> "CSV" per-file downloads),
        and data/roles.csv for the list of roles.
Output: review tables under data/onet/ (nothing in data/*.csv is overwritten):
          role_onet.csv        one row per role: O*NET-SOC, RIASEC scores + code, job zone
          role_skills_onet.csv one row per role x skill / knowledge area (importance >= 3.0)
          role_hot_tech.csv    one row per role x "Hot Technology" software example

O*NET is CC BY 4.0: every row keeps source_name = "O*NET 31.0 Database" and the
download date.

Usage: python scripts/onet_extract.py [--min-importance 3.0]
"""

import argparse
import csv
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB = ROOT / "raw" / "onet_db_31_0_csv"
OUT = ROOT / "data" / "onet"

SOURCE_NAME = "O*NET 31.0 Database"
SOURCE_URL = "https://www.onetcenter.org/database.html"
SOURCE_DATE = "2026-10-22"

# Roles whose name in roles.csv is not an exact O*NET title and that have no onet_soc.
SOC_OVERRIDES = {}

RIASEC = ["R", "I", "A", "S", "E", "C"]
RIASEC_ELEMENTS = {"1.B.1.a": "R", "1.B.1.b": "I", "1.B.1.c": "A",
                   "1.B.1.d": "S", "1.B.1.e": "E", "1.B.1.f": "C"}
HIGH_POINTS = ["1.B.1.g", "1.B.1.h", "1.B.1.i"]  # values 1-6 map to R..C, 0 = none


def read(name: str):
    with open(DB / name, encoding="utf-8", newline="") as f:
        yield from csv.DictReader(f)


def write(name: str, rows: list[dict]) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    with open(OUT / name, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)


def importance_rows(file: str, skill_type: str, socs: set, min_im: float):
    """Pair each element's Importance (IM) with its Level (LV) for the given SOCs."""
    im, lv = {}, {}
    for r in read(file):
        soc = r["O*NET-SOC Code"]
        if soc not in socs or r["Recommend Suppress"] == "Y":
            continue
        key = (soc, r["Element ID"], r["Element Name"])
        if r["Scale ID"] == "IM":
            im[key] = float(r["Data Value"])
        elif r["Scale ID"] == "LV":
            lv[key] = float(r["Data Value"])
    for (soc, eid, name), value in im.items():
        if value >= min_im:
            yield soc, eid, name, skill_type, value, lv.get((soc, eid, name))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--min-importance", type=float, default=3.0,
                    help="keep elements with O*NET importance >= this (scale 1-5)")
    args = ap.parse_args()

    titles = {r["Title"]: r["O*NET-SOC Code"] for r in read("occupation_data.csv")}
    soc_title = {v: k for k, v in titles.items()}
    with open(ROOT / "data" / "roles.csv", encoding="utf-8", newline="") as f:
        roles = list(csv.DictReader(f))

    role_soc = {}
    for r in roles:
        soc = r["onet_soc"] or SOC_OVERRIDES.get(r["role_id"]) or titles.get(r["role_name_en"])
        if not soc:
            print(f"WARNING: no O*NET match for {r['role_id']} {r['role_name_en']}")
            continue
        role_soc[r["role_id"]] = soc
    socs = set(role_soc.values())

    scores, high = defaultdict(dict), defaultdict(dict)
    for r in read("career_interest_types.csv"):
        soc, eid = r["O*NET-SOC Code"], r["Element ID"]
        if soc not in socs:
            continue
        if eid in RIASEC_ELEMENTS:
            scores[soc][RIASEC_ELEMENTS[eid]] = float(r["Data Value"])
        elif eid in HIGH_POINTS:
            high[soc][eid] = int(float(r["Data Value"]))
    job_zone = {r["O*NET-SOC Code"]: r["Job Zone"] for r in read("job_zones.csv")}

    src = {"source_name": SOURCE_NAME, "source_url": SOURCE_URL, "source_date": SOURCE_DATE}
    by_id = {r["role_id"]: r for r in roles}

    role_rows = []
    for rid, soc in role_soc.items():
        code = "".join(RIASEC[high[soc][e] - 1] for e in HIGH_POINTS if high[soc].get(e))
        role_rows.append({
            "role_id": rid, "role_name_en": by_id[rid]["role_name_en"],
            "subfield_code": by_id[rid]["subfield_code"], "onet_soc": soc, "onet_title": soc_title[soc],
            "riasec_code_onet": code,
            **{f"score_{k}": scores[soc].get(k, "") for k in RIASEC},
            "job_zone": job_zone.get(soc, ""), **src,
        })
    write("role_onet.csv", role_rows)

    soc_roles = defaultdict(list)
    for rid, soc in role_soc.items():
        soc_roles[soc].append(rid)
    skill_rows = []
    for file, kind in [("essential_skills.csv", "essential_skill"),
                       ("transferable_skills.csv", "transferable_skill"),
                       ("knowledge.csv", "knowledge")]:
        for soc, eid, name, skill_type, im, lv in importance_rows(file, kind, socs, args.min_importance):
            for rid in soc_roles[soc]:
                skill_rows.append({"role_id": rid, "onet_soc": soc, "element_id": eid,
                                   "element_name": name, "skill_type": skill_type,
                                   "importance": im, "level": "" if lv is None else lv, **src})
    skill_rows.sort(key=lambda r: (r["role_id"], r["skill_type"], -r["importance"]))
    write("role_skills_onet.csv", skill_rows)

    tech_rows = []
    for r in read("software_skills.csv"):
        if r["O*NET-SOC Code"] in socs and r["Hot Technology"] == "Y":
            for rid in soc_roles[r["O*NET-SOC Code"]]:
                tech_rows.append({"role_id": rid, "onet_soc": r["O*NET-SOC Code"],
                                  "technology": r["Workplace Example"],
                                  "category": r["Element Name"], "in_demand": r["In Demand"], **src})
    tech_rows.sort(key=lambda r: (r["role_id"], r["in_demand"] != "Y", r["technology"]))
    write("role_hot_tech.csv", tech_rows)

    print(f"{len(role_rows)} roles, {len(skill_rows)} role-skill rows, "
          f"{len(tech_rows)} hot-tech rows -> {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
