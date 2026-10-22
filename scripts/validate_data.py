"""Check that every data row has a source, a valid date and valid references.

Usage:
    python scripts/validate_data.py

Exits with status 1 and prints each problem if any check fails.
"""

import csv
import json
import re
import sys
from datetime import date
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

SOURCE_COLUMNS = ["source_name", "source_url", "source_date"]

# Columns each table must have (besides the source columns), and which must be filled.
TABLES = {
    "roles.csv": {
        "columns": ["role_id", "name_en", "name_zh", "domain", "onet_soc", "masco",
                    "in_mycol", "riasec_code", "ai_risk"],
        "required": ["role_id", "name_en", "domain"],
    },
    "skills.csv": {
        "columns": ["skill_id", "name_en", "name_zh", "skill_type", "onet_hot_technology"],
        "required": ["skill_id", "name_en", "skill_type"],
    },
    "role_skills.csv": {
        "columns": ["role_id", "skill_id", "importance"],
        "required": ["role_id", "skill_id", "importance"],
    },
    "trends.csv": {
        "columns": ["trend_id", "entity_type", "entity_id", "metric", "value", "unit", "period"],
        "required": ["trend_id", "entity_type", "entity_id", "metric", "value", "period"],
    },
    "sdg_map.csv": {
        "columns": ["entity_type", "entity_id", "sdg_target", "rationale"],
        "required": ["entity_type", "entity_id", "sdg_target", "rationale"],
    },
    "courses.csv": {
        "columns": ["course_id", "skill_id", "title", "provider", "url", "duration_hours",
                    "cost_myr", "hrd_corp_claimable", "verified_date"],
        "required": ["course_id", "skill_id", "title", "provider", "url", "verified_date"],
    },
}

ALLOWED = {
    ("roles.csv", "domain"): {"agriculture", "finance", "healthcare", "general_tech"},
    ("roles.csv", "in_mycol"): {"yes", "no", ""},
    ("roles.csv", "ai_risk"): {"low", "medium", "high", ""},
    ("skills.csv", "skill_type"): {"tech", "domain", "general"},
    ("skills.csv", "onet_hot_technology"): {"yes", "no", ""},
    ("role_skills.csv", "importance"): {"1", "2", "3", "4", "5"},
    ("trends.csv", "entity_type"): {"role", "skill", "domain"},
    ("sdg_map.csv", "entity_type"): {"role", "skill"},
    ("courses.csv", "hrd_corp_claimable"): {"yes", "no", "unknown", ""},
}

ID_COLUMN = {"roles.csv": "role_id", "skills.csv": "skill_id",
             "trends.csv": "trend_id", "courses.csv": "course_id"}

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
SDG_TARGET_RE = re.compile(r"^(1[0-7]|[1-9])\.([1-9]|10|[a-c])$")


def is_valid_date(value: str) -> bool:
    if not DATE_RE.match(value):
        return False
    try:
        return date.fromisoformat(value) <= date.today()
    except ValueError:
        return False


def read_table(path: Path) -> tuple[list[str], list[dict]]:
    with path.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        return reader.fieldnames or [], list(reader)


def check_table(name: str, header: list[str], rows: list[dict]) -> list[str]:
    spec = TABLES[name]
    errors = []

    missing = [c for c in spec["columns"] + SOURCE_COLUMNS if c not in header]
    if missing:
        return [f"{name}: missing columns {missing}"]

    seen_ids = set()
    for i, row in enumerate(rows, start=2):  # row 1 is the header
        where = f"{name} line {i}"
        values = {k: (v or "").strip() for k, v in row.items() if k}

        for col in spec["required"] + SOURCE_COLUMNS:
            if not values.get(col):
                errors.append(f"{where}: '{col}' is empty")

        url = values.get("source_url", "")
        if url and not url.startswith(("http://", "https://")):
            errors.append(f"{where}: source_url must start with http:// or https://")

        for col in ("source_date", "verified_date"):
            if values.get(col) and not is_valid_date(values[col]):
                errors.append(f"{where}: '{col}' must be a real past date in YYYY-MM-DD")

        for (table, col), allowed in ALLOWED.items():
            if table == name and values.get(col, "") not in allowed:
                errors.append(f"{where}: '{col}' = '{values.get(col)}', expected one of {sorted(allowed - {''})}")

        if name == "sdg_map.csv" and values.get("sdg_target") and not SDG_TARGET_RE.match(values["sdg_target"]):
            errors.append(f"{where}: sdg_target '{values['sdg_target']}' is not a UN target like 4.4")

        id_col = ID_COLUMN.get(name)
        if id_col and values.get(id_col):
            if values[id_col] in seen_ids:
                errors.append(f"{where}: duplicate {id_col} '{values[id_col]}'")
            seen_ids.add(values[id_col])

    return errors


def check_references(tables: dict[str, list[dict]]) -> list[str]:
    ids = {
        "role": {r["role_id"] for r in tables.get("roles.csv", [])},
        "skill": {r["skill_id"] for r in tables.get("skills.csv", [])},
        "domain": ALLOWED[("roles.csv", "domain")],
    }
    errors = []

    def ref(table: str, line: int, kind: str, value: str) -> None:
        if value and value not in ids[kind]:
            errors.append(f"{table} line {line}: unknown {kind} '{value}'")

    for i, row in enumerate(tables.get("role_skills.csv", []), start=2):
        ref("role_skills.csv", i, "role", row.get("role_id", ""))
        ref("role_skills.csv", i, "skill", row.get("skill_id", ""))
    for i, row in enumerate(tables.get("courses.csv", []), start=2):
        ref("courses.csv", i, "skill", row.get("skill_id", ""))
    for table in ("trends.csv", "sdg_map.csv"):
        for i, row in enumerate(tables.get(table, []), start=2):
            kind = row.get("entity_type", "")
            if kind in ids:
                ref(table, i, kind, row.get("entity_id", ""))
    return errors


def check_profiles(path: Path) -> list[str]:
    try:
        profiles = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        return [f"{path.name}: invalid JSON ({e})"]
    if not isinstance(profiles, list):
        return [f"{path.name}: must be a JSON list of profiles"]
    return []


def validate(data_dir: Path = DATA_DIR) -> list[str]:
    errors = []
    tables = {}
    for name in TABLES:
        path = data_dir / name
        if not path.exists():
            errors.append(f"{name}: file not found")
            continue
        header, rows = read_table(path)
        errors += check_table(name, header, rows)
        tables[name] = rows
    errors += check_references(tables)

    profiles = data_dir / "sample_profiles.json"
    if profiles.exists():
        errors += check_profiles(profiles)
    return errors


def main() -> int:
    errors = validate()
    if errors:
        print(f"{len(errors)} problem(s) found:")
        for e in errors:
            print(f"  - {e}")
        return 1
    print("All data checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
