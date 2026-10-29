"""Change the trend data and see what changes ("what if?").

"If this number were different, what would happen to my results?" is answered by running
the real pipeline on a changed copy of the inputs:

    data/trends.csv + data/roles.csv -> trend_signals.build -> trend_score.build -> matching

Only the raw inputs that scored signals use can be changed:
    - the latest 6-month count of AI papers on arXiv for each IT area (arxiv_ai_paper_growth),
    - the latest quarter of DOSM online job ads where DOSM has an IT series (only Software
      Developers; dosm_online_ads and dosm_online_ad_share),
    - each role's MyCOL status, yes / near / no (mycol_coverage and mycol_status).
The copy lives for one request: the data files, the "Update data" job and other users never
see it.

    changes = {"inputs": {trend_id: new value}, "mycol": {role_id: "yes" | "near" | "no"}}
"""

import csv
from pathlib import Path

import matching
import trend_score
import trend_signals

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
MYCOL = ("yes", "near", "no")

# Ready-made changes for a quick demo: (id, name, area, metric, growth over the earlier
# point it is compared with). The value is worked out from the data, so they keep working
# after "Update data".
EXAMPLES = [
    ("data_ai_research_up", "AI research in Data & AI speeds up (+20%)", "data_ai", "arxiv_ai_papers", 1.20),
    ("software_ads_down", "Software developer job ads fall 20%", "software_dev", "online_job_ads", 0.80),
    ("cyber_research_flat", "AI research in Cybersecurity stops growing", "cybersecurity", "arxiv_ai_papers", 1.00),
]
MYCOL_EXAMPLES = [
    ("mycol_drops_it01", "MyCOL drops Software Developers", {"IT01": "no"}),
    ("mycol_adds_security", "MyCOL adds Information Security Analysts", {"IT11": "yes"}),
]


class WhatIfError(ValueError):
    pass


def read(name: str) -> list[dict]:
    with (DATA / name).open(encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def _number(t, area: str, metric: str, scope: str, before: tuple, now: tuple, limit: float, rule: dict) -> dict:
    row, prev = t.by_id[now[1]], t.by_id[before[1]]
    return {"id": now[1], "kind": "number", "area": area, "metric": metric, "scope": scope,
            "value": now[0], "period_start": row["period_start"], "period_end": row["period_end"],
            "previous": {"value": before[0], "period_start": prev["period_start"], "period_end": prev["period_end"]},
            "max": limit, "rule": rule,
            "source_name": row["source_name"], "source_url": row["source_url"], "release_date": row["release_date"]}


def editable() -> list[dict]:
    """The inputs a what-if may change, each with its value now, the earlier value its signal
    compares it with, the upper limit and the source."""
    t = trend_signals.Trends(read("trends.csv"))
    out = []
    for sd in read("subdomains.csv"):
        area = matching.SUBFIELD_AREA.get(sd["subfield_code"])
        if not area:
            continue  # not one of the six IT areas, so no score uses it
        ai = t.series("subdomain", sd["subdomain_id"], "arxiv_ai_papers")
        allp = t.series("subdomain", sd["subdomain_id"], "arxiv_all_papers")
        periods = sorted(p for p in ai if p in allp)[-2:]
        if len(periods) == 2:  # the same window as trend_signals.arxiv_signal
            scope = t.by_id[ai[periods[1]][1]]["note"].split(":")[0].replace("arXiv ", "")
            out.append(_number(t, area, "arxiv_ai_papers", scope, ai[periods[0]], ai[periods[1]],
                               allp[periods[1]][0], {"up_pct": trend_signals.ARXIV_PCT}))
        if sd["dosm_entity"]:
            etype, entity = sd["dosm_entity"].split("/")
            ads = t.series(etype, entity, "online_job_ads")
            tot = t.series(*trend_signals.ALL_ADS, "online_job_ads")
            periods = sorted(p for p in ads if p in tot and p >= t.brk)[-4:]  # as in ad_signals
            if len(periods) >= 2:
                scope = t.by_id[ads[periods[-1]][1]]["note"].split(";")[0]
                out.append(_number(t, area, "online_job_ads", scope, ads[periods[0]], ads[periods[-1]],
                                   tot[periods[-1]][0], {"up_pct": trend_signals.COUNT_PCT,
                                                         "share_pp": trend_signals.SHARE_PP}))
    for r in read("roles.csv"):
        area = matching.SUBFIELD_AREA.get(r["subfield_code"])
        if area:
            out.append({"id": r["role_id"], "kind": "mycol", "area": area, "label": r["role_name_en"],
                        "value": r["is_mycol"].strip().lower(), "options": list(MYCOL),
                        "occupation": r["mycol_occupation"], "source_name": r["mycol_source_name"],
                        "source_url": r["mycol_source_url"], "release_date": r["mycol_source_date"]})
    return out


def examples(items: list[dict] | None = None) -> list[dict]:
    items = items or editable()
    out = []
    for eid, name, area, metric, growth in EXAMPLES:
        found = next((i for i in items if i["area"] == area and i["metric"] == metric), None)
        if found:
            value = min(round(found["previous"]["value"] * growth), found["max"])
            out.append({"id": eid, "name": name, "changes": {"inputs": {found["id"]: value}, "mycol": {}}})
    ids = {i["id"] for i in items if i["kind"] == "mycol"}
    out += [{"id": eid, "name": name, "changes": {"inputs": {}, "mycol": m}}
            for eid, name, m in MYCOL_EXAMPLES if set(m) <= ids]
    return out


def validate(changes, items: list[dict] | None = None) -> dict:
    """Check a changes object and drop entries equal to the data now. WhatIfError if bad."""
    if changes is None:
        return {"inputs": {}, "mycol": {}}
    if not isinstance(changes, dict) or set(changes) - {"inputs", "mycol"}:
        raise WhatIfError("'trend_changes' must be an object with 'inputs' and/or 'mycol'")
    inputs, mycol = changes.get("inputs") or {}, changes.get("mycol") or {}
    if not isinstance(inputs, dict) or not isinstance(mycol, dict):
        raise WhatIfError("'trend_changes.inputs' and 'trend_changes.mycol' must be objects")
    found = {i["id"]: i for i in (items or editable())}
    out = {"inputs": {}, "mycol": {}}
    for tid, v in inputs.items():
        item = found.get(tid)
        if not item or item["kind"] != "number":
            raise WhatIfError(f"'{tid}' is not a trend input that can be changed")
        if isinstance(v, bool) or not isinstance(v, (int, float)) or not 0 <= v <= item["max"]:
            raise WhatIfError(f"'{tid}' must be a number from 0 to {item['max']:g}")
        if float(v) != item["value"]:
            out["inputs"][tid] = float(v)
    for rid, v in mycol.items():
        item = found.get(rid)
        if not item or item["kind"] != "mycol":
            raise WhatIfError(f"'{rid}' is not a role_id")
        if v not in MYCOL:
            raise WhatIfError(f"MyCOL status of '{rid}' must be one of {list(MYCOL)}")
        if v != item["value"]:
            out["mycol"][rid] = v
    return out


def changed(changes: dict | None) -> bool:
    return bool(changes and (changes["inputs"] or changes["mycol"]))


def run(changes: dict) -> tuple[list[dict], list[dict], list[dict]]:
    """Signals, trend score rows and roles built from the changed copy (validated changes)."""
    rows = read("trends.csv")
    for r in rows:
        if r["trend_id"] in changes["inputs"]:
            r["value"] = f"{changes['inputs'][r['trend_id']]:g}"
    roles = trend_signals.clean_roles(read("roles.csv"))
    for r in roles:
        r["is_mycol"] = changes["mycol"].get(r["role_id"], r["is_mycol"])
    signals = trend_signals.build(trend_signals.Trends(rows), read("subdomains.csv"), roles)
    return signals, trend_score.build(signals, roles), roles


def data_with(data: dict, scores: list[dict], roles: list[dict]) -> dict:
    """A matching.load_data() result with the trend scores and MyCOL statuses of a run()."""
    status = {r["role_id"]: r["is_mycol"] for r in roles}
    return {**data,
            "trend_scores": {matching.trend_key(r): float(r["trend_score"]) for r in scores},
            "trend_parts": {matching.trend_key(r): {"demand": matching.number(str(r["my_demand_score"])),
                                                    "ai": matching.number(str(r["ai_momentum_score"]))}
                            for r in scores},
            "roles": [{**r, "is_mycol": status.get(r["role_id"], r["is_mycol"])} for r in data["roles"]]}


def describe(changes: dict, items: list[dict] | None = None) -> list[dict]:
    """Each changed input, before and after, for the page."""
    found = {i["id"]: i for i in (items or editable())}
    out = []
    for tid, v in changes["inputs"].items():
        i = found[tid]
        out.append({"id": tid, "kind": "number", "area": i["area"], "metric": i["metric"], "scope": i["scope"],
                    "period_start": i["period_start"], "period_end": i["period_end"],
                    "previous": i["previous"], "before": i["value"], "after": v})
    for rid, v in changes["mycol"].items():
        i = found[rid]
        out.append({"id": rid, "kind": "mycol", "area": i["area"], "label": i["label"], "before": i["value"], "after": v})
    return out


def signal_changes(signals: list[dict], roles: list[dict]) -> list[dict]:
    """Scored signals of a run() whose value or direction differs from data/trend_signals.csv."""
    before = {(s["entity_id"], s["signal"]): s for s in read("trend_signals.csv") if s["scored"] == "TRUE"}
    area = {d["subdomain_id"]: matching.SUBFIELD_AREA.get(d["subfield_code"]) for d in read("subdomains.csv")}
    area.update({r["role_id"]: matching.SUBFIELD_AREA.get(r["subfield_code"]) for r in roles})
    out = []
    for s in signals:
        if s["scored"] != "TRUE":
            continue
        b = before.get((s["entity_id"], s["signal"]), {})
        if (str(b.get("value")), b.get("direction")) == (str(s["value"]), s["direction"]):
            continue
        out.append({"entity_id": s["entity_id"], "entity_label": s["entity_label"], "layer": s["layer"],
                    "area": area.get(s["entity_id"]),
                    "signal": s["signal"], "confidence": s["confidence"], "direction_rule": s["direction_rule"],
                    "direction_changed": b.get("direction") != s["direction"],
                    "before": {k: b.get(k) for k in ("value", "direction", "detail")},
                    "after": {k: s[k] for k in ("value", "direction", "detail")}})
    return out


def score_changes(before: dict, after: dict, scenario: str) -> list[dict]:
    """Trend scores (under the scenario) and their two parts that differ between two data dicts."""
    b, a = matching.scenario_trend_scores(before, scenario), matching.scenario_trend_scores(after, scenario)
    areas = [x["id"] for x in before["areas"]]
    out = []
    for key in sorted(set(a) | set(b), key=lambda k: (k not in areas, areas.index(k) if k in areas else k)):
        pb, pa = before["trend_parts"].get(key, {}), after["trend_parts"].get(key, {})
        if b.get(key) == a.get(key) and pb == pa:
            continue
        out.append({"key": key, "kind": "area" if key in areas else "role",
                    "before": {"score": b.get(key), **pb}, "after": {"score": a.get(key), **pa}})
    return out
