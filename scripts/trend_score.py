"""Compute a 0-100 trend score per domain from data/trends.csv.

Written by member A (v0); weights confirmed by the team on 2026-10-23 (v1): both
components count equally. scripts/matching.py SCENARIOS re-weight them for future scenarios.

Two components, both read only from trends.csv (no numbers typed in here):

  1. my_demand  (Malaysia, DOSM: OpenDOSM productivity_qtr + Labour Market Review)
     Mean employment_growth_yoy over the latest 4 quarters for the domain's
     sector, minus the same mean for "overall".
     score = 50 + 10 * gap_pp   -> each percentage point above the national
     average adds 10 points; equal to the national average = 50.

  2. ai_momentum  (global, arXiv)
     Papers in the latest 6 months / papers in the 6 months before, minus 1.
     score = 50 + 100 * growth  -> +10% growth = 60, flat = 50.
     Assumption (not data): faster AI research in a field means more demand
     for people who combine tech skills with that field's knowledge.

trend_score = mean of the components that have data, clipped to 0-100.
A component without data is listed in `missing`, never filled in.
DOSM Job Market Insights ad counts are not scored yet: the release texts
only give sector numbers for some quarters (see raw/dosm_manual.csv).

Usage:  python scripts/trend_score.py
"""
import csv
import datetime as dt
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TRENDS = ROOT / "data" / "trends.csv"
OUT = ROOT / "data" / "trend_scores.csv"

DOMAINS = ["agriculture", "finance", "healthcare", "generic_tech"]
FIELDS = [
    "domain", "trend_score", "my_demand_score", "ai_momentum_score",
    "my_employment_gap_pp", "ai_paper_growth", "components_used", "missing",
    "input_trend_ids", "formula_version", "computed_date",
]
FORMULA_VERSION = "v1"


def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None  # no data or blank


def clip(x):
    return max(0.0, min(100.0, x))


def series(rows, entity, metric):
    """[(period_start, value, trend_id)] sorted by date, numeric values only.

    One value per period: the first row wins. OpenDOSM rows are written
    before the hand-copied DOSM rows, so revised API data beats older reports.
    """
    out = {}
    for r in rows:
        if r["entity_type"] == "domain" and r["entity_id"] == entity and r["metric"] == metric:
            v = num(r["value"])
            if v is not None and r["period_start"] not in out:
                out[r["period_start"]] = (r["period_start"], v, r["trend_id"])
    return sorted(out.values(), key=lambda x: x[0])


def my_demand(rows, domain):
    dom = series(rows, domain, "employment_growth_yoy")[-4:]
    nat = series(rows, "overall", "employment_growth_yoy")[-4:]
    if len(dom) < 4 or len(nat) < 4:
        return None, None, []
    gap = sum(v for _, v, _ in dom) / 4 - sum(v for _, v, _ in nat) / 4
    return round(gap, 2), round(clip(50 + 10 * gap), 1), [t for *_, t in dom + nat]


def ai_momentum(rows, domain):
    s = series(rows, domain, "ai_paper_count_monthly")[-12:]
    if len(s) < 12:
        return None, None, []
    prev = sum(v for _, v, _ in s[:6])
    last = sum(v for _, v, _ in s[6:])
    if prev == 0:
        return None, None, []
    growth = last / prev - 1
    return round(growth, 3), round(clip(50 + 100 * growth), 1), [t for *_, t in s]


def main():
    with TRENDS.open(encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))

    out = []
    for d in DOMAINS:
        gap, s1, ids1 = my_demand(rows, d)
        growth, s2, ids2 = ai_momentum(rows, d)
        parts = {"my_demand": s1, "ai_momentum": s2}
        used = [k for k, v in parts.items() if v is not None]
        missing = [k for k, v in parts.items() if v is None]
        score = round(sum(parts[k] for k in used) / len(used), 1) if used else "no data"
        out.append({
            "domain": d,
            "trend_score": score,
            "my_demand_score": "no data" if s1 is None else s1,
            "ai_momentum_score": "no data" if s2 is None else s2,
            "my_employment_gap_pp": "" if gap is None else gap,
            "ai_paper_growth": "" if growth is None else growth,
            "components_used": ";".join(used),
            "missing": ";".join(missing),
            "input_trend_ids": ";".join(ids1 + ids2),
            "formula_version": FORMULA_VERSION,
            "computed_date": dt.date.today().isoformat(),
        })

    with OUT.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        w.writerows(out)
    for r in out:
        print(f"  {r['domain']:<13} score={r['trend_score']:<6} "
              f"demand={r['my_demand_score']:<6} ai={r['ai_momentum_score']:<6} missing={r['missing'] or '-'}")
    print(f"Wrote {len(out)} rows to {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
