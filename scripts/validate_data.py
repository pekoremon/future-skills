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
        "columns": ["role_id", "subfield", "subfield_code", "role_name_en", "onet_soc", "onet_title",
                    "job_zone", "masco_4digit_mycol", "mycol_occupation", "mycol_matched_title",
                    "is_mycol", "ai_replacement_risk", "notes"],
        "required": ["role_id", "subfield_code", "role_name_en", "onet_soc", "job_zone"],
    },
    "skills.csv": {
        "columns": ["skill_id", "skill_name", "skill_type", "onet_source_type", "onet_element_id",
                    "tech_category", "is_in_demand_tech"],
        "required": ["skill_id", "skill_name", "skill_type", "is_in_demand_tech"],
    },
    "role_skills.csv": {
        "columns": ["role_id", "skill_id", "importance", "level", "row_type"],
        "required": ["role_id", "skill_id", "row_type"],  # importance/level checked below
    },
    "trends.csv": {
        "columns": ["trend_id", "entity_type", "entity_id", "metric", "value", "unit",
                    "period_start", "period_end", "geography", "note"],
        "required": ["trend_id", "entity_type", "entity_id", "metric", "value"],
    },
    "sdg_map.csv": {
        "columns": ["entity_type", "entity_id", "sdg_target", "link_strength", "rationale"],
        "required": ["entity_type", "entity_id", "sdg_target", "link_strength", "rationale"],
    },
    "courses.csv": {
        "columns": ["course_id", "skill_id", "title", "provider", "url", "duration_hours",
                    "cost_myr", "hrd_corp_claimable", "verified_date"],
        "required": ["course_id", "skill_id", "title", "provider", "url", "verified_date"],
    },
    "certifications.csv": {
        "columns": ["cert_id", "role_id", "cert_name", "issuer", "cert_type",
                    "required_to_practise_my", "entry_requirement", "how_to_get", "cost_amount",
                    "cost_currency", "hrd_corp_claimable", "url", "verified_date", "notes"],
        "required": ["cert_id", "role_id", "cert_name", "issuer", "cert_type", "url",
                     "verified_date"],
    },
}

ALLOWED = {
    ("roles.csv", "subfield_code"): {"SE", "DA", "CS", "CI", "WD", "IM"},  # the 6 IT areas
    ("roles.csv", "job_zone"): {"1", "2", "3", "4", "5"},
    ("roles.csv", "is_mycol"): {"yes", "near", "no", ""},
    ("roles.csv", "it_reachable_draft"): {"yes", "needs_extra_qualification", "no", ""},
    ("roles.csv", "ai_replacement_risk"): {"low", "medium", "high", ""},
    ("skills.csv", "skill_type"): {"technology", "domain_knowledge", "general"},
    ("skills.csv", "is_in_demand_tech"): {"Y", "N"},  # Y = O*NET In Demand flag
    ("role_skills.csv", "row_type"): {"skill_knowledge", "in_demand_tech"},
    ("sdg_map.csv", "link_strength"): {"direct", "indirect"},
    ("trends.csv", "entity_type"): {"role", "skill", "domain", "occupation", "occupation_group",
                                    "population_group"},
    ("sdg_map.csv", "entity_type"): {"role", "skill"},
    ("courses.csv", "hrd_corp_claimable"): {"yes", "no", "unknown", ""},
    ("certifications.csv", "cert_type"): {"licence", "certification"},
    ("certifications.csv", "required_to_practise_my"): {"yes", "no", ""},
    ("certifications.csv", "cost_currency"): {"MYR", "USD", ""},
    ("certifications.csv", "hrd_corp_claimable"): {"yes", "no", "unknown", ""},
}

ID_COLUMN = {"roles.csv": "role_id", "skills.csv": "skill_id",
             "trends.csv": "trend_id", "courses.csv": "course_id",
             "certifications.csv": "cert_id"}

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
SDG_TARGET_RE = re.compile(r"^(1[0-7]|[1-9])\.([1-9]|1[0-9]|[a-d])$")

# Same names as scripts/update_trends.py; `overall` is the Malaysia-wide baseline and
# `services` the DOSM services sector, used only in trends.csv.
DOMAINS = {"agriculture", "finance", "healthcare", "generic_tech", "overall", "services"}

# Optional columns that must match a pattern when filled.
PATTERNS = {
    ("trends.csv", "value"): (re.compile(r"^(-?\d+(\.\d+)?|no data)$"), "a number or 'no data'"),
    ("roles.csv", "onet_soc"): (re.compile(r"^\d{2}-\d{4}\.\d{2}$"), "an O*NET-SOC code like 15-2051.00"),
    ("roles.csv", "masco_4digit_mycol"): (re.compile(r"^\d{4}$"), "a 4-digit MASCO code"),
    ("certifications.csv", "cost_amount"): (re.compile(r"^\d+(\.\d{1,2})?$"), "a number like 480 or 5660.40"),
    ("certifications.csv", "url"): (re.compile(r"^https?://"), "an http(s) link"),
}


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

        for col in ("source_date", "verified_date", "period_start", "period_end"):
            if values.get(col) and not is_valid_date(values[col]):
                errors.append(f"{where}: '{col}' must be a real past date in YYYY-MM-DD")

        for (table, col), allowed in ALLOWED.items():
            if table == name and values.get(col, "") not in allowed:
                errors.append(f"{where}: '{col}' = '{values.get(col)}', expected one of {sorted(allowed - {''})}")

        for (table, col), (pattern, expected) in PATTERNS.items():
            if table == name and values.get(col) and not pattern.match(values[col]):
                errors.append(f"{where}: '{col}' = '{values[col]}', expected {expected}")

        if name == "role_skills.csv":
            is_tech = values.get("row_type") == "in_demand_tech"
            # skill/knowledge rows need importance 1-5; technology rows have none (O*NET gives only a flag).
            # level (0-7) may be blank where O*NET suppresses it.
            for col, lo, hi, must in (("importance", 1, 5, not is_tech), ("level", 0, 7, False)):
                v = values.get(col, "")
                if not v:
                    if must:
                        errors.append(f"{where}: '{col}' is empty")
                    continue
                try:
                    ok = lo <= float(v) <= hi
                except ValueError:
                    ok = False
                if not ok:
                    errors.append(f"{where}: '{col}' = '{v}', expected a number from {lo} to {hi}")
            if is_tech and (values.get("importance") or values.get("level")):
                errors.append(f"{where}: in_demand_tech rows must not have importance or level")

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
        "domain": DOMAINS,
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
    for i, row in enumerate(tables.get("certifications.csv", []), start=2):
        ref("certifications.csv", i, "role", row.get("role_id", ""))
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
