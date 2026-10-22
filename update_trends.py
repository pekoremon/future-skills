"""Rebuild data/trends.csv from live sources ("Update data" button).

Sources (all free, no API key):
  1. OpenDOSM productivity_qtr  - employment YoY growth by sector (quarterly)
  2. OpenDOSM wages_occupation  - median monthly wage by MASCO major group (annual)
  3. OpenDOSM lfs_month_youth   - youth unemployment rate, 15-24 and 15-30 (monthly)
  4. arXiv API                  - monthly count of AI/ML papers per domain
  5. raw/dosm_manual.csv        - numbers copied by hand from DOSM releases (Job Market
                                  Insights, Employment Statistics, Agriculture Census)

After writing trends.csv it runs trend_score.py to rebuild data/trend_scores.csv.

Only standard library is used so the demo runs on any Python 3.9+.

Usage:
  python scripts/update_trends.py            # all sources
  python scripts/update_trends.py --no-arxiv # skip arXiv (faster, ~2 min saved)
"""
import argparse
import csv
import datetime as dt
import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "trends.csv"
MANUAL = ROOT / "raw" / "dosm_manual.csv"

FIELDS = [
    "trend_id", "entity_type", "entity_id", "metric", "value", "unit",
    "period_start", "period_end", "geography", "note",
    "source_name", "source_url", "source_date",
]

TODAY = dt.date.today().isoformat()
OPENDOSM_API = "https://api.data.gov.my/data-catalogue"
OPENDOSM_PAGE = "https://open.dosm.gov.my/data-catalogue/{}"

# Domain -> OpenDOSM productivity sector code (MSIC-based).
# Healthcare has no employment series in OpenDOSM (only productivity for
# "private healthcare"), so it is reported as no data rather than proxied.
SECTORS = {
    "agriculture": ("p1", "Agriculture"),
    "finance": ("p5.6", "Finance and insurance"),
    "generic_tech": ("p5.5", "Information and communication"),
    "overall": ("p0", "Overall"),
}

# MASCO-2020 major groups relevant to tech roles.
OCCUPATIONS = {
    "masco_2": "professionals",
    "masco_3": "technicians",
    "overall": "overall",
}

ARXIV_API = "https://export.arxiv.org/api/query"
ARXIV_CATS = "(cat:cs.AI OR cat:cs.LG)"
ARXIV_DOMAINS = {
    # Not bare "crop": in cs.AI/cs.LG it mostly matches image cropping.
    "agriculture": '(abs:agriculture OR abs:agricultural OR abs:farming OR abs:cropland OR abs:"crop yield")',
    "finance": "(abs:finance OR abs:financial OR abs:banking OR abs:fintech)",
    "healthcare": "(abs:clinical OR abs:healthcare OR abs:medical OR abs:patient)",
}
ARXIV_MONTHS = 12
ARXIV_DELAY_S = 3  # arXiv asks for >= 3 s between calls


def http_get(url, timeout=60, retries=3):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "future-skills-hackathon"})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read().decode("utf-8")
        except Exception as e:
            if attempt == retries - 1:
                raise
            print(f"  retry {attempt + 1} after error: {e}", file=sys.stderr)
            time.sleep(3)


def opendosm(dataset, **params):
    q = urllib.parse.urlencode({"id": dataset, "limit": 10000, **params})
    return json.loads(http_get(f"{OPENDOSM_API}?{q}"))


def quarter_end(start):
    d = dt.date.fromisoformat(start)
    m = d.month + 3
    nxt = dt.date(d.year + (m > 12), (m - 1) % 12 + 1, 1)
    return (nxt - dt.timedelta(days=1)).isoformat()


def employment_growth(quarters=4):
    data = opendosm("productivity_qtr")
    rows = []
    for domain, (code, label) in SECTORS.items():
        series = sorted(
            (r for r in data if r["sector"] == code and r["series"] == "growth_yoy"),
            key=lambda r: r["date"],
        )[-quarters:]
        for r in series:
            rows.append({
                "entity_type": "domain",
                "entity_id": domain,
                "metric": "employment_growth_yoy",
                "value": r["employment"],
                "unit": "percent",
                "period_start": r["date"],
                "period_end": quarter_end(r["date"]),
                "geography": "MY",
                "note": f"Sector-level (MSIC): {label}; not role-specific",
                "source_name": "OpenDOSM productivity_qtr (DOSM)",
                "source_url": OPENDOSM_PAGE.format("productivity_qtr"),
                "source_date": TODAY,
            })
    rows.append({
        "entity_type": "domain",
        "entity_id": "healthcare",
        "metric": "employment_growth_yoy",
        "value": "no data",
        "unit": "",
        "period_start": "",
        "period_end": "",
        "geography": "MY",
        "note": "OpenDOSM has no employment series for healthcare (checked productivity_qtr and productivity_annual)",
        "source_name": "OpenDOSM data catalogue (searched)",
        "source_url": "https://open.dosm.gov.my/data-catalogue",
        "source_date": TODAY,
    })
    return rows


def occupation_wages(years=2):
    data = opendosm("wages_occupation")
    rows = []
    for entity, occ in OCCUPATIONS.items():
        series = sorted(
            (r for r in data if r["occupation"] == occ and r["sex"] == "both"),
            key=lambda r: r["date"],
        )[-years:]
        for r in series:
            year = r["date"][:4]
            rows.append({
                "entity_type": "occupation_group",
                "entity_id": entity,
                "metric": "median_monthly_wage",
                "value": r["wages_median"],
                "unit": "MYR",
                "period_start": f"{year}-01-01",
                "period_end": f"{year}-12-31",
                "geography": "MY",
                "note": "Proxy: MASCO major group data, not role-specific",
                "source_name": "OpenDOSM wages_occupation (DOSM Salaries & Wages Survey)",
                "source_url": OPENDOSM_PAGE.format("wages_occupation"),
                "source_date": TODAY,
            })
    return rows


def youth_unemployment(months=4):
    data = sorted(opendosm("lfs_month_youth"), key=lambda r: r["date"])[-months:]
    rows = []
    for r in data:
        start = dt.date.fromisoformat(r["date"])
        end = (start.replace(day=28) + dt.timedelta(days=4)).replace(day=1) - dt.timedelta(days=1)
        for age in ("15_24", "15_30"):
            rows.append({
                "entity_type": "population_group",
                "entity_id": f"youth_{age}",
                "metric": "unemployment_rate",
                "value": r[f"u_rate_{age}"],
                "unit": "percent",
                "period_start": start.isoformat(),
                "period_end": end.isoformat(),
                "geography": "MY",
                "note": "Context for fresh graduates; not domain-specific",
                "source_name": "OpenDOSM lfs_month_youth (DOSM Labour Force Survey)",
                "source_url": OPENDOSM_PAGE.format("lfs_month_youth"),
                "source_date": TODAY,
            })
    return rows


def last_full_months(n):
    first_this_month = dt.date.today().replace(day=1)
    months = []
    end = first_this_month - dt.timedelta(days=1)
    for _ in range(n):
        start = end.replace(day=1)
        months.append((start, end))
        end = start - dt.timedelta(days=1)
    return list(reversed(months))


def arxiv_count(domain_query, start, end):
    query = (
        f"{ARXIV_CATS} AND {domain_query} AND "
        f"submittedDate:[{start:%Y%m%d}0000 TO {end:%Y%m%d}2359]"
    )
    # max_results=0 returns a wrong totalResults; 1 is correct.
    url = f"{ARXIV_API}?" + urllib.parse.urlencode({"search_query": query, "max_results": 1})
    xml = http_get(url)
    tag = "<opensearch:totalResults"
    i = xml.index(tag)
    return int(xml[xml.index(">", i) + 1: xml.index("<", i + 1)]), url


def arxiv_trends():
    rows = []
    for domain, q in ARXIV_DOMAINS.items():
        for start, end in last_full_months(ARXIV_MONTHS):
            count, url = arxiv_count(q, start, end)
            print(f"  arXiv {domain} {start:%Y-%m}: {count}")
            rows.append({
                "entity_type": "domain",
                "entity_id": domain,
                "metric": "ai_paper_count_monthly",
                "value": count,
                "unit": "papers",
                "period_start": start.isoformat(),
                "period_end": end.isoformat(),
                "geography": "global",
                "note": "cs.AI/cs.LG papers whose abstract mentions the domain; signal of AI entering the field, not MY demand",
                "source_name": "arXiv API",
                "source_url": url,
                "source_date": TODAY,
            })
            time.sleep(ARXIV_DELAY_S)
    return rows


def manual_rows():
    if not MANUAL.exists():
        print(f"  (no {MANUAL.relative_to(ROOT)}, skipped)")
        return []
    with MANUAL.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    # An unquoted comma in a note shifts every later column; refuse such rows.
    bad = [i + 2 for i, r in enumerate(rows) if None in r or None in r.values()]
    if bad:
        raise ValueError(f"{MANUAL.name} lines {bad} have the wrong number of columns "
                         "(quote any note that contains a comma)")
    return [{k: r.get(k, "") for k in FIELDS if k != "trend_id"} for r in rows]


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--no-arxiv", action="store_true", help="skip arXiv (slow: ~3 s per month per domain)")
    args = ap.parse_args()

    # (label, fetch function, source_name prefixes of the rows it produces)
    steps = [
        ("OpenDOSM employment growth", employment_growth,
         ("OpenDOSM productivity_qtr", "OpenDOSM data catalogue")),
        ("OpenDOSM occupation wages", occupation_wages, ("OpenDOSM wages_occupation",)),
        ("OpenDOSM youth unemployment", youth_unemployment, ("OpenDOSM lfs_month_youth",)),
        ("DOSM releases (manual)", manual_rows, ("DOSM ",)),
        ("arXiv AI paper counts", None if args.no_arxiv else arxiv_trends, ("arXiv API",)),
    ]

    old = []
    if OUT.exists():
        with OUT.open(encoding="utf-8-sig", newline="") as f:
            old = [{k: r.get(k, "") for k in FIELDS if k != "trend_id"} for r in csv.DictReader(f)]

    rows = []
    for name, fn, prefixes in steps:
        print(f"[{name}]")
        try:
            if fn is None:
                raise RuntimeError("skipped by flag")
            got = fn()
        except Exception as e:
            # Keep the previous rows so a skipped or dead source doesn't
            # wipe its data (and its part of the trend score) during the demo.
            got = [r for r in old if r["source_name"].startswith(prefixes)]
            print(f"  {e}; kept {len(got)} previous rows", file=sys.stderr)
        else:
            print(f"  {len(got)} rows")
        rows.extend(got)

    if not rows:
        sys.exit("No rows fetched; trends.csv left unchanged.")

    for i, r in enumerate(rows, 1):
        r["trend_id"] = f"T{i:04d}"
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        w.writerows(rows)
    print(f"Wrote {len(rows)} rows to {OUT.relative_to(ROOT)}")

    import trend_score  # same folder
    trend_score.main()


if __name__ == "__main__":
    main()
