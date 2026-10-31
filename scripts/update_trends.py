"""Rebuild data/trends.csv ("Update data" button). IT jobs only, DOSM data only.

Sources, by fetch_method:
  api              OpenDOSM API, re-fetched on every run:
                     productivity_qtr  - employment YoY growth, ICT sector + national
                     wages_occupation  - median monthly wage, MASCO 2 / 3 + national
                   Each dataset's last_updated / next_update / data_as_of is read from
                   its OpenDOSM page; an overdue upstream update is flagged in the note.
  dosm_file        DOSM "Data JMI" Excel workbook (raw/dosm/jmi_data_*.xlsx), parsed on
                   every run: online job ads by major occupation group and by industry.
                   DOSM publishes a new workbook each quarter on the Job Market Insights
                   release page; download it into raw/dosm/ and update JMI_FILE below.
  manual_snapshot  raw/dosm_manual.csv, typed by hand from DOSM press releases / PDFs:
                   Software Developers ads (only in the press release text and Exhibit 2)
                   and 2026 figures from the Labour Market Review.
                   raw/mycol/mycol_2024_2025.csv, the MyCOL 2024/2025 list typed from the
                   TalentCorp brochure; only occupations that a role in data/roles.csv
                   (from B) maps to are written to trends.csv.
  api (arXiv)      Per IT sub-domain (data/subdomains.csv): papers in its arXiv categories
                   whose abstract mentions AI / large language models, and all papers,
                   for the last 6 full months and the 6 months before. Global research
                   signal ("how fast AI is entering the field"), not Malaysian demand.

National ("overall") rows are kept only as the baseline the signals compare against.
After writing trends.csv it runs scripts/trend_signals.py (if present) to rebuild
data/trend_signals.csv.

Only the Python standard library is used, so it runs on any Python 3.9+.

Usage:
  python scripts/update_trends.py              # all sources (arXiv takes ~1-2 min)
  python scripts/update_trends.py --no-arxiv   # demo: keep the previous arXiv rows
"""
import argparse
import csv
import datetime as dt
import json
import re
import subprocess
import sys
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "trends.csv"
SIGNALS_OUT = ROOT / "data" / "trend_signals.csv"
MANUAL = ROOT / "raw" / "dosm_manual.csv"
SUBDOMAINS = ROOT / "data" / "subdomains.csv"
ROLES = ROOT / "data" / "roles.csv"  # from B
MYCOL = ROOT / "raw" / "mycol" / "mycol_2024_2025.csv"

ARXIV_API = "https://export.arxiv.org/api/query"
# "Abstract mentions AI or large language models."
ARXIV_AI_TERMS = ('(abs:"large language model" OR abs:LLM OR abs:"artificial intelligence" '
                  'OR abs:"machine learning" OR abs:"deep learning" OR abs:"neural network" '
                  'OR abs:"generative AI")')
ARXIV_DELAY_S = 3  # arXiv asks for >= 3 s between calls

# Latest DOSM "Data JMI" workbook and its release. Update all four each quarter.
JMI_FILE = ROOT / "raw" / "dosm" / "jmi_data_2026q2.xlsx"
JMI_SOURCE = "DOSM Job Market Insights data file (Data JMI Q2 2026)"
JMI_URL = "https://www.dosm.gov.my/portal-main/release-document-log?release_document_id=20742"
JMI_RELEASE_DATE = "2026-08-18"
JMI_FETCHED_DATE = "2026-10-23"   # date the workbook was downloaded into raw/dosm/
JMI_FIRST_QUARTER = (2025, 1)     # keep two pre-break quarters for context
JMI_BREAK_QUARTER = (2025, 3)     # total ads +108.8% vs 2025 Q2; DOSM gives no reason

FIELDS = [
    "trend_id", "entity_type", "entity_id", "metric", "value",
    "upper_bound",        # set only when is_censored = TRUE; value is then empty
    "unit", "period_start", "period_end", "geography", "note",
    "is_proxy",           # TRUE = group/sector used as a stand-in for IT roles
    "is_censored",        # TRUE = only a bound is known (see upper_bound); never a data point
    "series_break_flag",  # TRUE = first period after a series break; never compute trends across it
    "fetch_method",       # api | dosm_file | manual_snapshot
    "source_name", "source_url",
    "release_date",       # when the source published this number
    "fetched_date",       # when we fetched / downloaded / copied it
]
DEFAULTS = {"upper_bound": "", "geography": "MY", "is_proxy": "FALSE",
            "is_censored": "FALSE", "series_break_flag": "FALSE"}

TODAY = dt.date.today().isoformat()
OPENDOSM_API = "https://api.data.gov.my/data-catalogue"
OPENDOSM_PAGE = "https://open.dosm.gov.my/data-catalogue/{}"

# entity_id -> OpenDOSM productivity sector code. p5.5 = "Information and
# communication" in productivity_lookup, i.e. MSIC section J.
SECTORS = {"ict": "p5.5", "overall": "p0"}

# entity_id -> OpenDOSM wages_occupation group (MASCO-2020 major groups).
OCCUPATIONS = {"masco_2": "professionals", "masco_3": "technicians", "overall": "overall"}

# entity -> row label in the Data JMI workbook.
JMI_OCCUPATION_ROWS = {
    "overall": "Jumlah",
    "masco_2": "Professionals",
    "masco_3": "Technicians and associate professionals",
}
JMI_INDUSTRY_ROWS = {"ict": "Information and communication"}


def http_get(url, timeout=15, retries=2):  # short: the demo must not hang offline
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "future-skills-hackathon"})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read().decode("utf-8")
        except Exception as e:
            if attempt == retries - 1:
                raise
            print(f"  retry {attempt + 1} after error: {e}", file=sys.stderr)
            time.sleep(2)


def opendosm(dataset):
    q = urllib.parse.urlencode({"id": dataset, "limit": 10000})
    return json.loads(http_get(f"{OPENDOSM_API}?{q}"))


def opendosm_meta(dataset):
    """last_updated, next_update, data_as_of from the dataset's OpenDOSM page."""
    try:
        page = http_get(OPENDOSM_PAGE.format(dataset))
    except Exception as e:
        print(f"  could not read {dataset} metadata: {e}", file=sys.stderr)
        return {}
    meta = {}
    for key in ("last_updated", "next_update", "data_as_of"):
        m = re.search(rf'"{key}":"(\d{{4}}[^"]*)"', page)
        if m:
            meta[key] = m.group(1)
    return meta


def meta_note(dataset, meta):
    """Release date for the rows, plus a warning if the upstream update is overdue."""
    release = meta.get("last_updated", "")[:10]
    if not release:
        return "", "OpenDOSM metadata unavailable; release_date kept from the previous run"
    note = f"OpenDOSM data as of {meta.get('data_as_of', '?')}"
    nxt = meta.get("next_update", "")[:10]
    if nxt and nxt < TODAY:
        note += f"; UPSTREAM DELAYED: scheduled update {nxt} has not happened"
        print(f"  WARNING: {dataset} update was due {nxt}; data still as of "
              f"{meta.get('data_as_of', '?')}", file=sys.stderr)
    return release, note


def quarter_end(start):
    d = dt.date.fromisoformat(start)
    m = d.month + 3
    nxt = dt.date(d.year + (m > 12), (m - 1) % 12 + 1, 1)
    return (nxt - dt.timedelta(days=1)).isoformat()


def employment_growth(quarters=4):
    data = opendosm("productivity_qtr")
    release, mnote = meta_note("productivity_qtr", opendosm_meta("productivity_qtr"))
    rows = []
    for entity, code in SECTORS.items():
        series = sorted(
            (r for r in data if r["sector"] == code and r["series"] == "growth_yoy"),
            key=lambda r: r["date"],
        )[-quarters:]
        for r in series:
            rows.append({
                **DEFAULTS,
                "entity_type": "sector", "entity_id": entity,
                "metric": "employment_growth_yoy", "value": r["employment"], "unit": "percent",
                "period_start": r["date"], "period_end": quarter_end(r["date"]),
                "note": ("National baseline" if entity == "overall" else
                         "Proxy: whole ICT sector (MSIC J); all jobs in the sector; not only IT roles")
                        + "; " + mnote,
                "is_proxy": "FALSE" if entity == "overall" else "TRUE",
                "fetch_method": "api",
                "source_name": "OpenDOSM productivity_qtr (DOSM)",
                "source_url": OPENDOSM_PAGE.format("productivity_qtr"),
                "release_date": release, "fetched_date": TODAY,
            })
    return rows


def occupation_wages(years=2):
    data = opendosm("wages_occupation")
    release, mnote = meta_note("wages_occupation", opendosm_meta("wages_occupation"))
    rows = []
    for entity, occ in OCCUPATIONS.items():
        series = sorted(
            (r for r in data if r["occupation"] == occ and r["sex"] == "both"),
            key=lambda r: r["date"],
        )[-years:]
        for r in series:
            year = r["date"][:4]
            rows.append({
                **DEFAULTS,
                "entity_type": "occupation_group", "entity_id": entity,
                "metric": "median_monthly_wage", "value": r["wages_median"], "unit": "MYR",
                "period_start": f"{year}-01-01", "period_end": f"{year}-12-31",
                "note": ("National baseline" if entity == "overall" else
                         f"Proxy: whole MASCO major group ({occ}); all fields; not IT only")
                        + "; Malaysian citizen employees aged 15-64 only; excludes bonuses; " + mnote,
                "is_proxy": "FALSE" if entity == "overall" else "TRUE",
                "fetch_method": "api",
                "source_name": "OpenDOSM wages_occupation (DOSM Salaries & Wages Survey)",
                "source_url": OPENDOSM_PAGE.format("wages_occupation"),
                "release_date": release, "fetched_date": TODAY,
            })
    return rows


def read_xlsx(path):
    """First worksheet of an .xlsx as a list of rows (standard library only)."""
    ns = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    with zipfile.ZipFile(path) as z:
        strings = [
            "".join(t.text or "" for t in si.iter(f"{{{ns['m']}}}t"))
            for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", ns)
        ]
        sheet = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
    cells = {}
    for row in sheet.iter(f"{{{ns['m']}}}row"):
        r = int(row.get("r")) - 1
        for c in row.findall("m:c", ns):
            v = c.find("m:v", ns)
            if v is None:
                continue
            col = 0
            for ch in re.match(r"[A-Z]+", c.get("r")).group():
                col = col * 26 + ord(ch) - 64
            cells[(r, col - 1)] = strings[int(v.text)] if c.get("t") == "s" else float(v.text)
    nrows = max(r for r, _ in cells) + 1
    ncols = max(c for _, c in cells) + 1
    return [[cells.get((r, c)) for c in range(ncols)] for r in range(nrows)]


def jmi_table(rows, title):
    """{row label: {(year, quarter): value}} for one table of the Data JMI workbook."""
    start = next(i for i, r in enumerate(rows)
                 if any(isinstance(x, str) and x.startswith(title) for x in r))
    yrow = next(i for i in range(start, start + 5)
                if any(isinstance(x, float) and 2015 < x < 2035 for x in rows[i]))
    # Layout: annual block (no Q labels), quarterly block (Q1..Q4), monthly block.
    # The year sits above the first column of each year.
    cols, year = {}, None
    for j, q in enumerate(rows[yrow + 1]):
        y = rows[yrow][j]
        if isinstance(y, float):
            year = int(y)
        if isinstance(q, str) and re.fullmatch(r"Q[1-4]", q.strip()):
            cols[j] = (year, int(q.strip()[1]))
        elif cols and isinstance(q, str):
            break  # monthly block starts
    table = {}
    for r in rows[yrow + 2:]:
        label = next((x.strip() for x in r[:2] if isinstance(x, str)), None)
        if label is None or label.startswith("Source"):
            break
        table[label] = {yq: r[j] for j, yq in cols.items() if isinstance(r[j], float)}
    return table


def jmi_rows():
    rows = read_xlsx(JMI_FILE)
    occ = jmi_table(rows, "Table 2")
    ind = jmi_table(rows, "Table 1")
    total = occ["Jumlah"]
    ind_total, unclassified = ind["Jumlah"], ind.get("Unclassified", {})
    quarters = sorted(q for q in total if q >= JMI_FIRST_QUARTER)

    out = []

    def add(etype, entity, yq, value, note, proxy):
        y, q = yq
        start = f"{y}-{3 * q - 2:02d}-01"
        out.append({
            **DEFAULTS,
            "entity_type": etype, "entity_id": entity, "metric": "online_job_ads",
            "value": int(value), "unit": "job offerings",
            "period_start": start, "period_end": quarter_end(start),
            "note": note, "is_proxy": proxy,
            "series_break_flag": "TRUE" if yq == JMI_BREAK_QUARTER else "FALSE",
            "fetch_method": "dosm_file", "source_name": JMI_SOURCE, "source_url": JMI_URL,
            "release_date": JMI_RELEASE_DATE, "fetched_date": JMI_FETCHED_DATE,
        })

    for i, yq in enumerate(quarters):
        prev = quarters[i - 1] if i else None
        pre_break = "; before the series break: not comparable with later quarters" if yq < JMI_BREAK_QUARTER else ""
        # National total (occupation table has no unclassified ads).
        note = "National baseline: all online job ads"
        if prev and prev in total:
            note += f"; QoQ {100 * (total[yq] / total[prev] - 1):+.1f}% (computed)"
        if yq == JMI_BREAK_QUARTER:
            note += "; SERIES BREAK: DOSM gives no reason (cause unverified); trends are not computed across it"
        elif yq < JMI_BREAK_QUARTER:
            note += "; before the series break: not comparable with later quarters"
        add("occupation_group", "overall", yq, total[yq], note, "FALSE")

        for entity, label in JMI_OCCUPATION_ROWS.items():
            if entity == "overall" or yq not in occ.get(label, {}):
                continue
            share = 100 * occ[label][yq] / total[yq]
            add("occupation_group", entity, yq, occ[label][yq],
                f"Proxy: whole MASCO major group ({label}); all fields; not IT only; "
                f"{share:.1f}% of all ads (computed)" + pre_break, "TRUE")

        # Industry table: share is taken of ads that have an industry, because
        # "Unclassified" swings a lot (e.g. about half of all ads in 2026 Q2).
        classified = ind_total.get(yq, 0) - unclassified.get(yq, 0)
        unc_pct = 100 * unclassified.get(yq, 0) / ind_total[yq] if yq in ind_total else 0
        add("sector", "overall_classified", yq, classified,
            f"Baseline for industry shares: all ads minus Unclassified; Unclassified = {unc_pct:.1f}% "
            f"of all ads (computed)" + ("; LARGE UNCLASSIFIED SHARE: industry counts this quarter are "
                                       "much lower than usual" if unc_pct > 25 else "") + pre_break, "FALSE")
        for entity, label in JMI_INDUSTRY_ROWS.items():
            if yq in ind.get(label, {}):
                share = 100 * ind[label][yq] / classified
                add("sector", entity, yq, ind[label][yq],
                    f"Proxy: whole ICT sector (MSIC J); all jobs in the sector; not only IT roles; "
                    f"{share:.2f}% of ads with an industry (computed)" + pre_break, "TRUE")
    return out


def read_subdomains():
    with SUBDOMAINS.open(encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def six_month_windows():
    """(previous 6 full months, last 6 full months) as (start, end) dates."""
    end = dt.date.today().replace(day=1) - dt.timedelta(days=1)

    def back(d, months):
        m = d.month - months
        y = d.year + (m - 1) // 12
        return dt.date(y, (m - 1) % 12 + 1, 1)

    last = (back(end, 5), end)
    prev = (back(end, 11), back(end, 5) - dt.timedelta(days=1))
    return prev, last


_arxiv_last_call = 0.0


def arxiv_count(query):
    # Wait only what is left of the 3 s since the previous call started, not 3 s after it.
    global _arxiv_last_call
    wait = ARXIV_DELAY_S - (time.monotonic() - _arxiv_last_call)
    if wait > 0:
        time.sleep(wait)
    _arxiv_last_call = time.monotonic()
    # max_results=0 returns a wrong totalResults; 1 is correct.
    url = f"{ARXIV_API}?" + urllib.parse.urlencode({"search_query": query, "max_results": 1})
    xml = http_get(url, timeout=30)
    m = re.search(r"<opensearch:totalResults[^>]*>(\d+)<", xml)
    if not m:
        raise ValueError("arXiv response has no totalResults")
    return int(m.group(1)), url


def arxiv_rows(old=()):
    prev, last = six_month_windows()
    # The earlier window ended 6 months ago, so its counts are settled: when the previous
    # run fetched the same window, keep those rows (with their fetch date) and halve the calls.
    kept = {(r["entity_id"], r["metric"], r["period_start"], r["period_end"]): r
            for r in old if r["source_name"] == "arXiv API" and r["value"] != "no data"
            and (r["period_start"], r["period_end"]) == (prev[0].isoformat(), prev[1].isoformat())}
    rows = []
    for sd in read_subdomains():
        cats = [c for c in sd["arxiv_categories"].split(";") if c]
        base = {**DEFAULTS, "entity_type": "subdomain", "entity_id": sd["subdomain_id"],
                "unit": "papers", "geography": "global", "fetch_method": "api",
                "source_name": "arXiv API", "release_date": TODAY, "fetched_date": TODAY}
        if not cats:
            rows.append({**base, "metric": "arxiv_ai_papers", "value": "no data", "unit": "",
                         "period_start": last[0].isoformat(), "period_end": last[1].isoformat(),
                         "note": "No arXiv category matches this sub-domain",
                         "source_url": "https://arxiv.org/category_taxonomy"})
            continue
        cat_q = "(" + " OR ".join(f"cat:{c}" for c in cats) + ")"
        for start, end in (prev, last):
            date_q = f"submittedDate:[{start:%Y%m%d}0000 TO {end:%Y%m%d}2359]"
            for metric, q, what in (
                ("arxiv_ai_papers", f"{cat_q} AND {ARXIV_AI_TERMS} AND {date_q}",
                 "papers whose abstract mentions AI or large language models"),
                ("arxiv_all_papers", f"{cat_q} AND {date_q}", "all papers"),
            ):
                key = (sd["subdomain_id"], metric, start.isoformat(), end.isoformat())
                if key in kept:
                    print(f"  {sd['subdomain_id']:<24} {metric:<17} {start:%Y-%m}..{end:%Y-%m}: "
                          f"{kept[key]['value']} (kept, fetched {kept[key]['fetched_date']})")
                    rows.append(kept[key])
                    continue
                n, url = arxiv_count(q)
                print(f"  {sd['subdomain_id']:<24} {metric:<17} {start:%Y-%m}..{end:%Y-%m}: {n}")
                rows.append({**base, "metric": metric, "value": n,
                             "period_start": start.isoformat(), "period_end": end.isoformat(),
                             "note": f"arXiv {' + '.join(cats)}: {what}; 6-month window; global research "
                                     "signal, not Malaysian demand; keyword match on abstracts (approximate); "
                                     "recent counts can still rise as late submissions are indexed",
                             "source_url": url})
    return rows


def slug(name):
    return re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")


def mycol_key(name):
    """Match MyCOL names across spellings (brochure vs full report): 'Cyber Security' =
    'Cybersecurity', 'Not Elsewhere Classified' = 'NEC', case-insensitive."""
    name = name.lower().replace("not elsewhere classified", "nec")
    return re.sub(r"[^a-z0-9]", "", name)


def mycol_rows():
    """One row per MyCOL 2024/2025 occupation that a role in data/roles.csv (B) maps to."""
    with MYCOL.open(encoding="utf-8-sig", newline="") as f:
        mycol = {mycol_key(r["occupation"]): r for r in csv.DictReader(f)}
    with ROLES.open(encoding="utf-8-sig", newline="") as f:
        roles = list(csv.DictReader(f))
    codes = {sd["subfield_code"] for sd in read_subdomains()}
    occs = {}  # official name -> {"m": MyCOL row, "masco": code, "roles": [...]}
    for r in roles:
        rid, status = r["role_id"], r["is_mycol"].strip().lower()
        if status not in ("yes", "near", "no"):
            raise ValueError(f"{ROLES.name} {rid}: is_mycol must be yes / near / no, got '{r['is_mycol']}'")
        if r["subfield_code"] not in codes:
            raise ValueError(f"{ROLES.name} {rid}: subfield_code '{r['subfield_code']}' is not in {SUBDOMAINS.name}")
        if status == "no":
            continue
        m = mycol.get(mycol_key(r["mycol_occupation"]))
        if not m:
            raise ValueError(f"{ROLES.name} {rid}: '{r['mycol_occupation']}' is not in {MYCOL.name}")
        o = occs.setdefault(m["occupation"], {"m": m, "masco": r["masco_4digit_mycol"], "roles": []})
        if o["masco"] != r["masco_4digit_mycol"]:
            raise ValueError(f"{ROLES.name} {rid}: MASCO {r['masco_4digit_mycol']} differs from "
                             f"{o['masco']} for '{m['occupation']}'")
        o["roles"].append(f"{rid} {r['subfield_code']} {status}")
    rows = []
    for occ, o in occs.items():
        m = o["m"]
        rows.append({
            **DEFAULTS,
            "entity_type": "mycol_occupation",
            "entity_id": f"masco_{o['masco']}" if o["masco"] else slug(occ),
            "metric": "on_mycol", "value": 1, "unit": "flag (1 = listed)",
            "period_start": "2024-01-01", "period_end": "2025-12-31",
            "note": f"{occ} (MASCO {o['masco'] or '?'}, code as given in data/roles.csv); MyCOL 2024/2025 "
                    f"list no. {m['list_no']}; roles mapped (role subfield is_mycol): {', '.join(o['roles'])}; "
                    "official Malaysian critical-occupation status; one edition, not a trend",
            "fetch_method": "manual_snapshot",
            "source_name": m["source_name"], "source_url": m["source_url"],
            "release_date": m["release_date"], "fetched_date": m["fetched_date"],
        })
    return rows


def manual_rows():
    if not MANUAL.exists():
        print(f"  (no {MANUAL.relative_to(ROOT)}, skipped)")
        return []
    with MANUAL.open(encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))
    # An unquoted comma in a note shifts every later column; refuse such rows.
    bad = [i + 2 for i, r in enumerate(rows) if None in r or None in r.values()]
    if bad:
        raise ValueError(f"{MANUAL.name} lines {bad} have the wrong number of columns "
                         "(quote any note that contains a comma)")
    return [{**{k: r.get(k, "") for k in FIELDS if k != "trend_id"}, "fetch_method": "manual_snapshot"}
            for r in rows]


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--no-arxiv", action="store_true", help="skip arXiv and keep the previous arXiv rows")
    args = ap.parse_args()

    def skipped():
        raise RuntimeError("skipped by --no-arxiv")

    old = []
    if OUT.exists():
        with OUT.open(encoding="utf-8-sig", newline="") as f:
            old = [{k: r.get(k, "") for k in FIELDS if k != "trend_id"} for r in csv.DictReader(f)]

    # (label, fetch function, test that picks this step's rows from the previous run)
    steps = [
        ("OpenDOSM employment growth", employment_growth, lambda r: "productivity_qtr" in r["source_name"]),
        ("OpenDOSM occupation wages", occupation_wages, lambda r: "wages_occupation" in r["source_name"]),
        ("DOSM Data JMI workbook", jmi_rows, lambda r: r["fetch_method"] == "dosm_file"),
        ("DOSM releases (manual)", manual_rows,
         lambda r: r["fetch_method"] == "manual_snapshot" and r["entity_type"] != "mycol_occupation"),
        ("MyCOL 2024/2025", mycol_rows, lambda r: r["entity_type"] == "mycol_occupation"),
        ("arXiv AI papers per sub-domain", skipped if args.no_arxiv else lambda: arxiv_rows(old),
         lambda r: r["source_name"] == "arXiv API"),
    ]

    rows = []
    for name, fn, was_mine in steps:
        print(f"[{name}]")
        try:
            got = fn()
        except Exception as e:
            # Keep the previous rows so a dead source doesn't wipe its data
            # (and its part of the trend score) during the demo.
            got = [r for r in old if was_mine(r)]
            print(f"  {e}; kept {len(got)} previous rows", file=sys.stderr)
        else:
            print(f"  {len(got)} rows")
        rows.extend(got)

    if not rows:
        sys.exit("No rows fetched; trends.csv left unchanged.")

    # If OpenDOSM metadata could not be read, reuse the release_date of the previous run.
    prev_release = {r["source_name"]: r["release_date"] for r in old if r["release_date"]}
    for r in rows:
        if not r["release_date"]:
            r["release_date"] = prev_release.get(r["source_name"], "")

    for i, r in enumerate(rows, 1):
        r["trend_id"] = f"T{i:04d}"
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        w.writerows(rows)
    print(f"Wrote {len(rows)} rows to {OUT.relative_to(ROOT)}")

    # Signals (direction + confidence per IT entity) are built by trend_signals.py.
    signals = ROOT / "scripts" / "trend_signals.py"
    if signals.exists():
        print("[trend_signals.py]", flush=True)
        try:
            subprocess.run([sys.executable, "-I", str(signals), str(OUT), str(SIGNALS_OUT)], check=True)
        except subprocess.CalledProcessError as e:
            print(f"  trend_signals.py failed ({e}); previous {SIGNALS_OUT.name} kept", file=sys.stderr)
    else:
        print(f"  ({signals.relative_to(ROOT)} not found; {SIGNALS_OUT.relative_to(ROOT)} not rebuilt)")


if __name__ == "__main__":
    main()
