"""Measure the Phase 1 KPIs from the data files, now or at any earlier commit.

Pathway coverage (KPI 2 in the Phase 1 proposal): the share of skills our roles need
(data/role_skills.csv) that have at least one free (RM 0), manually checked course or video:
a row in data/courses.csv with that skill_id, or a row in data/learning_resources.csv whose
targets name "skill:<id>", with a verified_date. It also counts the SDG and source coverage
the Domain 1 brief asks for: every role and skill tagged to an SDG target with a reason.

Usage:
    python scripts/kpi.py               # the data files as they are now
    python scripts/kpi.py --rev 6802b63 # the data as committed (6802b63 = Phase 1 submission)
"""

import csv
import io
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PHASE1_TARGET = 40.0  # % pathway coverage promised for Phase 2 in the Phase 1 proposal


def reader(rev: str | None):
    def read(name: str) -> list[dict]:
        if rev is None:
            text = (ROOT / "data" / name).read_text(encoding="utf-8-sig")
        else:
            text = subprocess.run(["git", "show", f"{rev}:data/{name}"], cwd=ROOT, check=True,
                                  capture_output=True, text=True, encoding="utf-8").stdout.lstrip("﻿")
        return list(csv.DictReader(io.StringIO(text)))
    return read


def free(row: dict) -> bool:
    try:
        return float(row.get("cost_myr") or 0) == 0
    except ValueError:
        return False


def measure(rev: str | None = None) -> dict:
    read = reader(rev)
    needed = {r["skill_id"] for r in read("role_skills.csv")}
    covered = {r["skill_id"] for r in read("courses.csv") if free(r) and r.get("verified_date")}
    for r in read("learning_resources.csv"):
        if free(r) and r.get("verified_date"):
            covered |= {t[len("skill:"):] for t in r["targets"].split(";") if t.startswith("skill:")}
    roles = {r["role_id"] for r in read("roles.csv")}
    skills = {r["skill_id"] for r in read("skills.csv")}
    sdg = [r for r in read("sdg_map.csv") if r.get("rationale", "").strip()]
    return {
        "skills_needed": len(needed),
        "skills_with_free_course": len(needed & covered),
        "pathway_coverage_pct": round(100 * len(needed & covered) / len(needed), 1) if needed else 0.0,
        "roles": len(roles),
        "roles_with_sdg": len(roles & {r["entity_id"] for r in sdg if r["entity_type"] == "role"}),
        "skills": len(skills),
        "skills_with_sdg": len(skills & {r["entity_id"] for r in sdg if r["entity_type"] == "skill"}),
    }


def main(argv: list[str]) -> int:
    rev = argv[argv.index("--rev") + 1] if "--rev" in argv else None
    m = measure(rev)
    print(f"Data: {'data/ (working tree)' if rev is None else 'commit ' + rev}")
    print(f"Pathway coverage: {m['skills_with_free_course']} of {m['skills_needed']} needed skills "
          f"have a free, checked course = {m['pathway_coverage_pct']}% (Phase 2 target {PHASE1_TARGET}%)")
    print(f"SDG tags: {m['roles_with_sdg']} of {m['roles']} roles, "
          f"{m['skills_with_sdg']} of {m['skills']} skills")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
