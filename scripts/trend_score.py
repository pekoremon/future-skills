"""Turn data/trend_signals.csv into 0-100 trend scores for matching (data/trend_scores.csv).

Member A's signals give a direction (+1 up / on MyCOL, 0 flat / near / no data) and a
confidence for each IT sub-domain and role, not a number. Matching needs a number, so,
as the handover suggests, each part is the confidence-weighted mean direction:

    part = 50 + 50 x sum(weight x direction_code) / sum(weight)       weight: CONFIDENCE

    Malaysian demand  MyCOL coverage of the sub-domain, DOSM online ads (count and share,
                      where DOSM has a series) and, for a role, its own MyCOL status
    AI momentum       arXiv AI paper growth in the sub-domain's categories (global)

    trend score = 0.5 x Malaysian demand + 0.5 x AI momentum

A signal with no data (confidence "none") is left out; a part with no signals is left out
and the score is the other part, never estimated. Scenarios in matching.py re-weight the
two parts. One row per IT area (sub-domain signals only) and one per role (plus its MyCOL
status). The 50 / 50 split and the weights are team choices.

Usage: python scripts/trend_score.py
"""

import csv
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
OUT = DATA / "trend_scores.csv"
FORMULA_VERSION = "v2-it-signals"

CONFIDENCE = {"high": 1.0, "medium": 2 / 3, "low": 1 / 3}
PART = {"mycol_coverage": "my_demand", "dosm_online_ads": "my_demand",
        "dosm_online_ad_share": "my_demand", "mycol_status": "my_demand",
        "arxiv_ai_paper_growth": "ai_momentum"}
SPLIT = {"my_demand": 0.5, "ai_momentum": 0.5}
SUBFIELD_AREA = {"SE": "software_dev", "DA": "data_ai", "CS": "cybersecurity",
                 "CI": "cloud_infra", "WD": "web_ux", "IM": "it_mgmt"}


def read(name: str) -> list[dict]:
    with (DATA / name).open(encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def score(signals: list[dict]) -> dict:
    sums = {p: [0.0, 0.0] for p in SPLIT}
    used = {p: [] for p in SPLIT}
    for s in signals:
        weight = CONFIDENCE.get(s["confidence"])
        if weight is None or s["signal"] not in PART:
            continue  # no data, or a signal matching does not use
        part = PART[s["signal"]]
        sums[part][0] += weight * float(s["direction_code"])
        sums[part][1] += weight
        used[part].append(s["signal_id"])
    parts = {p: round(50 + 50 * num / den, 1) for p, (num, den) in sums.items() if den}
    total = sum(SPLIT[p] * v for p, v in parts.items()) / sum(SPLIT[p] for p in parts) if parts else None
    return {"trend_score": "no data" if total is None else round(total, 1),
            "my_demand_score": parts.get("my_demand", "no data"),
            "ai_momentum_score": parts.get("ai_momentum", "no data"),
            "components_used": ";".join(p for p in SPLIT if p in parts),
            "missing": ";".join(p for p in SPLIT if p not in parts),
            "input_signal_ids": ";".join(i for p in SPLIT for i in used[p])}


def build(signals: list[dict] | None = None, roles: list[dict] | None = None) -> list[dict]:
    """Score rows from the signal and role files, or from the lists given (scripts/whatif.py)."""
    signals = [s for s in (read("trend_signals.csv") if signals is None else signals) if s["scored"] == "TRUE"]
    subdomain = {r["subfield_code"]: r["subdomain_id"] for r in read("subdomains.csv")}
    by_entity = {}
    for s in signals:
        by_entity.setdefault((s["layer"], s["entity_id"]), []).append(s)
    today = date.today().isoformat()
    rows = []
    for code, area in SUBFIELD_AREA.items():
        sub = by_entity.get(("subdomain", subdomain.get(code)), [])
        rows.append({"role_id": "", "it_area": area, **score(sub),
                     "formula_version": FORMULA_VERSION, "computed_date": today})
    for role in read("roles.csv") if roles is None else roles:
        sub = by_entity.get(("subdomain", subdomain.get(role["subfield_code"])), [])
        own = by_entity.get(("role", role["role_id"]), [])
        rows.append({"role_id": role["role_id"], "it_area": SUBFIELD_AREA.get(role["subfield_code"], ""),
                     **score(sub + own), "formula_version": FORMULA_VERSION, "computed_date": today})
    return [r for r in rows if r["trend_score"] != "no data"]


def main() -> int:
    rows = build()
    with OUT.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)
    for r in rows[:6]:
        print(f"  {r['it_area']:<14} {r['trend_score']:>5}  demand {r['my_demand_score']}  AI {r['ai_momentum_score']}")
    print(f"Wrote {len(rows)} rows ({len(rows) - 6} roles) to {OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
