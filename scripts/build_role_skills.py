"""Build data/role_skills.csv from the O*NET 31.0 database, using the ids in data/skills.csv.

For every role in data/roles.csv (by its onet_soc):
- skill_knowledge rows: each O*NET skill or knowledge area with Importance >= 3.0
  (scale 1-5) that O*NET does not suppress, with its Level (0-7). A suppressed Level is
  left empty, so matching skips it.
- in_demand_tech rows: each technology O*NET marks "In Demand" for the occupation.

Skills are matched to data/skills.csv by O*NET element id, technologies by name, so the
file always agrees with skills.csv. A skill or technology missing from skills.csv is
reported and left out.

Usage: python scripts/build_role_skills.py [--check]   (--check only compares)
"""

import argparse
import csv
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB = ROOT / "raw" / "onet_db_31_0_csv"
OUT = ROOT / "data" / "role_skills.csv"
MIN_IMPORTANCE = 3.0
SRC = {"source_name": "O*NET 31.0 Database", "source_url": "https://www.onetcenter.org/database.html",
       "source_date": "2026-10-22"}
FILES = ["essential_skills.csv", "transferable_skills.csv", "knowledge.csv"]


def read(path: Path) -> list[dict]:
    with path.open(encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def build() -> tuple[list[dict], set]:
    skills = read(ROOT / "data" / "skills.csv")
    by_element = {s["onet_element_id"]: s["skill_id"] for s in skills if s["onet_element_id"]}
    by_tech = {s["skill_name"]: s["skill_id"] for s in skills if s["skill_type"] == "technology"}
    roles = read(ROOT / "data" / "roles.csv")
    socs = {r["onet_soc"] for r in roles}

    im, lv = {}, {}
    for name in FILES:
        for r in read(DB / name):
            if r["O*NET-SOC Code"] not in socs:
                continue
            key = (r["O*NET-SOC Code"], r["Element ID"])
            if r["Scale ID"] == "IM" and r["Recommend Suppress"] != "Y":
                im[key] = float(r["Data Value"])
            elif r["Scale ID"] == "LV" and r["Recommend Suppress"] != "Y":
                lv[key] = float(r["Data Value"])
    tech = {}
    for r in read(DB / "software_skills.csv"):
        if r["O*NET-SOC Code"] in socs and r["In Demand"] == "Y":
            tech.setdefault(r["O*NET-SOC Code"], []).append(r["Workplace Example"])

    rows, missing = [], set()
    for role in roles:
        soc = role["onet_soc"]
        rated = []
        for (s, element), value in im.items():
            if s != soc or value < MIN_IMPORTANCE:
                continue
            if element not in by_element:
                missing.add(element)
                continue
            level = lv.get((soc, element))
            rated.append({"role_id": role["role_id"], "skill_id": by_element[element],
                          "importance": f"{value:.2f}", "level": "" if level is None else f"{level:.2f}",
                          "row_type": "skill_knowledge", **SRC})
        rows += sorted(rated, key=lambda r: r["skill_id"])
        for name in sorted(set(tech.get(soc, []))):
            if name not in by_tech:
                missing.add(name)
                continue
            rows.append({"role_id": role["role_id"], "skill_id": by_tech[name], "importance": "",
                         "level": "", "row_type": "in_demand_tech", **SRC})
    rows.sort(key=lambda r: (r["role_id"], r["row_type"] != "skill_knowledge", r["skill_id"]))
    return rows, missing


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--check", action="store_true", help="compare with the current file, write nothing")
    args = ap.parse_args()
    rows, missing = build()
    if missing:
        print(f"Not in skills.csv, left out: {', '.join(sorted(missing))}")
    if args.check:
        key = lambda r: (r["role_id"], r["skill_id"], r["row_type"])
        now = {key(r) for r in read(OUT)}
        want = {key(r) for r in rows}
        print(f"{len(want - now)} rows missing, {len(now - want)} rows wrong")
        return int(now != want)
    with OUT.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)
    print(f"{len(rows)} rows -> {OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
