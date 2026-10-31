"""Build data/trend_signals.csv from data/trends.csv. IT jobs only.

Layers (column `layer`):
  subdomain            One block per IT sub-domain in data/subdomains.csv. Scored.
                         arxiv_ai_paper_growth  AI papers, last 6 months vs the 6 before
                                                (global research signal: how fast AI is
                                                entering the field; not Malaysian demand)
                         mycol_coverage         official Malaysian critical-occupation status:
                                                share of the sub-domain's roles with
                                                is_mycol = yes (data/roles.csv, from B; linked
                                                by subfield_code)
                         dosm_online_ads        DOSM online job ads where DOSM publishes a
                                                series (only Software Developers); otherwise
                                                "no data"
  role                 MyCOL yes / near / no per role (is_mycol in data/roles.csv, from B).
                       Scored.
  industry_background  DOSM ICT sector (MSIC J): employment, wages, ad share. Same for all
                       IT roles, so it is context only. Not scored.
  reference            Whole MASCO groups 2 and 3 (not IT-only). Not scored.

Each signal is a descriptive comparison of 1-4 points, not a fitted trend and not a
0-100 score. It gives direction / direction_code (+1 / 0 / -1, by the draft threshold
in direction_rule), a strength from -1 to 1 for scoring, confidence with the reasons, and
the trend_ids it used. trend_score.py weights strength by confidence. Strength equals
direction_code except for arXiv growth (growth / ARXIV_FULL_PCT, capped at -1 and 1) and
MyCOL (yes = 1, near = 0.5, no = 0; a sub-domain gets the mean over its roles).

Rules
  - Windows start at the latest series break (series_break_flag); trends never cross it.
  - Censored rows (empty value, upper_bound set) are never used as data points.
  - Confidence: fewer than 4 points -> low; proxy entity -> at most medium; further
    reasons can lower it (listed in confidence_reason).
  - composition_effect = TRUE when a share or count moved only because its total moved.

Usage:
  python scripts/trend_signals.py [trends.csv] [trend_signals.csv]
Standard library only.
"""
import csv
import datetime as dt
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SUBDOMAINS = ROOT / "data" / "subdomains.csv"
ROLES = ROOT / "data" / "roles.csv"
FORMULA_VERSION = "v4-it-roles"

# Draft thresholds, to be agreed by A + B.
COUNT_PCT = 5.0    # ad count change: > +5% up, < -5% down
SHARE_PP = 0.25    # ad share change: > +0.25pp up, < -0.25pp down
GAP_PP = 0.5       # gap vs national: > +0.5pp above, < -0.5pp below
ARXIV_PCT = 10.0   # AI paper growth: > +10% up, < -10% down
ARXIV_FULL_PCT = 40.0  # AI paper growth with full strength: +40% or more -> 1, -40% or less -> -1
MYCOL_STRENGTH = {"yes": 1.0, "near": 0.5, "no": 0.0}  # near: a related title in the same MyCOL occupation
UNCLASSIFIED_MAX = 25.0  # % of ads without an industry before industry shares are low confidence

FIELDS = [
    "signal_id", "layer", "scored", "entity_type", "entity_id", "entity_label", "signal",
    "window_start", "window_end", "n_points", "value", "unit",
    "count_change_pct", "total_change_pct", "direction", "direction_code", "strength", "direction_rule",
    "composition_effect", "confidence", "confidence_reason", "is_proxy", "series_break_in_window",
    "detail", "input_trend_ids", "formula_version", "computed_date",
]
LEVELS = ["low", "medium", "high"]

ICT = ("sector", "ict", "ICT sector (MSIC J: Information & communication)")
PROF = ("occupation_group", "masco_2", "Professionals (MASCO major group 2; not IT-only)")
TECH = ("occupation_group", "masco_3", "Technicians & Associate Professionals (MASCO major group 3; not IT-only)")
ALL_ADS = ("occupation_group", "overall")
CLASSIFIED_ADS = ("sector", "overall_classified")


def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def quarter(p):
    return f"{p[:4]}Q{(int(p[5:7]) - 1) // 3 + 1}"


def slug(name):
    return re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")


def read_csv(path):
    with Path(path).open(encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


class Trends:
    def __init__(self, rows):
        self.rows = rows
        self.by_id = {r["trend_id"]: r for r in rows}
        self.brk = max((r["period_start"] for r in rows
                        if r["metric"] == "online_job_ads" and r["series_break_flag"] == "TRUE"),
                       default="")

    def series(self, etype, entity, metric):
        """{period_start: (value, trend_id)}; numeric, non-censored; first row per period wins."""
        out = {}
        for r in self.rows:
            if (r["entity_type"], r["entity_id"], r["metric"]) == (etype, entity, metric):
                v = num(r["value"])
                if v is not None and r["is_censored"] != "TRUE" and r["period_start"] not in out:
                    out[r["period_start"]] = (v, r["trend_id"])
        return out

    def find(self, etype, entity, metric):
        return [r for r in self.rows if (r["entity_type"], r["entity_id"], r["metric"]) == (etype, entity, metric)]

    def censored(self, etype, entity, metric):
        return sorted(r["period_start"] for r in self.find(etype, entity, metric) if r["is_censored"] == "TRUE")

    def methods(self, ids):
        counts = {}
        for i in ids:
            m = self.by_id[i]["fetch_method"]
            counts[m] = counts.get(m, 0) + 1
        return counts


def confidence(n, proxy, extra=()):
    """extra: (reason, highest level allowed)."""
    level, reasons = 2, []
    if n < 4:
        level = 0
        reasons.append(f"only {n} data point(s), fewer than 4")
    if proxy:
        level = min(level, 1)
        reasons.append("proxy measure, not IT-only")
    for reason, cap in extra:
        level = min(level, LEVELS.index(cap))
        reasons.append(reason)
    return LEVELS[level], "; ".join(reasons)


def direction(value, threshold, up="up", down="down", flat="flat"):
    if value > threshold:
        return up, 1
    if value < -threshold:
        return down, -1
    return flat, 0


def row(**kw):
    base = {k: "" for k in FIELDS}
    base.update(series_break_in_window="FALSE", composition_effect="", is_proxy="FALSE")
    base.update(kw)
    if base["strength"] == "":
        base["strength"] = base["direction_code"]
    return base


def no_data(layer, entity, label, signal, why):
    return row(layer=layer, scored="TRUE", entity_type=entity[0], entity_id=entity[1], entity_label=label,
               signal=signal, direction="no_data", direction_code=0, confidence="none",
               confidence_reason=why, detail="no data")


# --- online job ads -------------------------------------------------------------------

def ad_signals(t, layer, scored, src, label, base, with_count=True, extra=(), out_entity=None):
    etype, entity = src[:2]
    ads = t.series(etype, entity, "online_job_ads")
    tot = t.series(*base, "online_job_ads")
    periods = sorted(p for p in ads if p in tot and p >= t.brk)[-4:]
    if len(periods) < 2:
        return []
    first, last = periods[0], periods[-1]
    n = len(periods)
    count_chg = 100 * (ads[last][0] / ads[first][0] - 1)
    tot_chg = 100 * (tot[last][0] / tot[first][0] - 1)
    s1 = 100 * ads[first][0] / tot[first][0]
    s2 = 100 * ads[last][0] / tot[last][0]
    ids = [ads[p][1] for p in periods] + [tot[p][1] for p in periods]
    proxy = t.by_id[ads[last][1]]["is_proxy"] == "TRUE"
    cens = [quarter(p) for p in t.censored(etype, entity, "online_job_ads")]
    extra = list(extra)
    if cens:
        extra.append((f"{', '.join(cens)} are censored upper bounds and are excluded", "high"))
    conf, why = confidence(n, proxy, extra)
    count_dir, count_code = direction(count_chg, COUNT_PCT)
    share_dir, share_code = direction(s2 - s1, SHARE_PP)
    denom = "of all online ads" if base == ALL_ADS else "of ads that have an industry"
    oe = out_entity or (etype, entity)
    common = dict(layer=layer, scored=scored, entity_type=oe[0], entity_id=oe[1], entity_label=label,
                  window_start=first, window_end=t.by_id[ads[last][1]]["period_end"], n_points=n,
                  count_change_pct=round(count_chg, 2), total_change_pct=round(tot_chg, 2),
                  confidence=conf, confidence_reason=why, is_proxy="TRUE" if proxy else "FALSE",
                  input_trend_ids=";".join(ids))
    out = []
    if with_count:
        out.append(row(**common, signal="ad_count_change" if layer != "subdomain" else "dosm_online_ads",
                       value=round(count_chg, 2), unit="percent", direction=count_dir, direction_code=count_code,
                       direction_rule=f"ad count change > +{COUNT_PCT}% up; < -{COUNT_PCT}% down; else flat (draft threshold)",
                       detail=f"{quarter(first)} {int(ads[first][0]):,} -> {quarter(last)} {int(ads[last][0]):,} ads"
                              + (f"; window starts at {quarter(t.brk)}, the first quarter after the series break"
                                 if first == t.brk else "")))
    comp = share_code != count_code
    detail = f"share {s1:.2f}% -> {s2:.2f}% {denom}; {denom[3:]} {tot_chg:+.1f}%"
    if comp:
        detail += (f"; share {'rise' if share_code > 0 else 'fall' if share_code < 0 else 'change'} comes from "
                   f"the total moving, not from the entity's own ads ({count_chg:+.1f}%)")
    out.append(row(**common, signal="ad_share_change" if layer != "subdomain" else "dosm_online_ad_share",
                   value=round(s2 - s1, 2), unit="pp", direction=share_dir, direction_code=share_code,
                   direction_rule=f"share change > +{SHARE_PP}pp up; < -{SHARE_PP}pp down; else flat (draft threshold)",
                   composition_effect="TRUE" if comp else "FALSE", detail=detail))
    return out


def unclassified_extra(t):
    """Low confidence if many ads in the window have no industry."""
    allads = t.series(*ALL_ADS, "online_job_ads")
    cls = t.series(*CLASSIFIED_ADS, "online_job_ads")
    worst = max(((100 * (1 - cls[p][0] / allads[p][0]), p) for p in cls if p in allads and p >= t.brk),
                default=(0, ""))
    if worst[0] > UNCLASSIFIED_MAX:
        return [(f"{worst[0]:.1f}% of ads in {quarter(worst[1])} have no industry", "low")]
    return []


# --- gaps vs national -----------------------------------------------------------------

def gap_row(t, layer, ent, signal, value, n, start, end, ids, detail, extra):
    etype, entity, label = ent
    proxy = t.by_id[ids[0]]["is_proxy"] == "TRUE"
    conf, why = confidence(n, proxy, extra)
    d, code = direction(value, GAP_PP, "above_national", "below_national", "in_line")
    return row(layer=layer, scored="FALSE", entity_type=etype, entity_id=entity, entity_label=label,
               signal=signal, window_start=start, window_end=end, n_points=n, value=round(value, 2), unit="pp",
               direction=d, direction_code=code,
               direction_rule=f"gap > +{GAP_PP}pp above_national; < -{GAP_PP}pp below_national; else in_line (draft threshold)",
               confidence=conf, confidence_reason=why, is_proxy="TRUE" if proxy else "FALSE",
               detail=detail, input_trend_ids=";".join(ids))


def employment_gap(t, layer, ent):
    etype, entity, _ = ent
    own = t.series(etype, entity, "employment_growth_yoy")
    nat = t.series(etype, "overall", "employment_growth_yoy")
    periods = sorted(p for p in own if p in nat)[-4:]
    if not periods:
        return []
    gaps = [own[p][0] - nat[p][0] for p in periods]
    ids = [own[p][1] for p in periods] + [nat[p][1] for p in periods]
    methods = t.methods(ids)
    extra = []
    if "api" in methods and "manual_snapshot" in methods:
        extra.append(("mixes revised values (OpenDOSM) with first-release values (DOSM reports) "
                      "that DOSM may revise", "medium"))
    detail = "; ".join(f"{quarter(p)} {g:+.1f}pp" for p, g in zip(periods, gaps))
    detail += " | rows by fetch_method: " + ", ".join(f"{k}={v}" for k, v in sorted(methods.items()))
    return [gap_row(t, layer, ent, "employment_growth_gap_vs_national", sum(gaps) / len(gaps), len(periods),
                    periods[0], t.by_id[own[periods[-1]][1]]["period_end"], ids, detail, extra)]


def wage_gap(t, layer, ent):
    etype, entity, _ = ent
    own = t.series(etype, entity, "median_wage_growth_yoy")
    nat = t.series(etype, "overall", "median_wage_growth_yoy")
    common = sorted(p for p in own if p in nat)
    if common:
        p = common[-1]
        ids = [own[p][1], nat[p][1]]
        detail = (f"{own[p][0]:+.1f}% vs all sectors {nat[p][0]:+.1f}% YoY ({p[:7]}); "
                  "formal-sector employees, administrative data")
        return [gap_row(t, layer, ent, "wage_growth_gap_vs_national", own[p][0] - nat[p][0], 1, p,
                        t.by_id[own[p][1]]["period_end"], ids, detail,
                        [("single month of administrative data", "low")])]
    own = t.series(etype, entity, "median_monthly_wage")
    nat = t.series(etype, "overall", "median_monthly_wage")
    common = sorted(p for p in own if p in nat)
    if len(common) < 2:
        return []
    a, b = common[-2], common[-1]
    g_own = 100 * (own[b][0] / own[a][0] - 1)
    g_nat = 100 * (nat[b][0] / nat[a][0] - 1)
    ids = [own[a][1], own[b][1], nat[a][1], nat[b][1]]
    detail = f"group {g_own:+.2f}% vs all occupations {g_nat:+.2f}% ({a[:4]} to {b[:4]})"
    return [gap_row(t, layer, ent, "wage_growth_gap_vs_national", g_own - g_nat, 2, a,
                    t.by_id[own[b][1]]["period_end"], ids, detail,
                    [("two annual levels; Malaysian citizen employees only", "low")])]


# --- sub-domain layer -----------------------------------------------------------------

def arxiv_signal(t, sd):
    ent = ("subdomain", sd["subdomain_id"])
    label = sd["label_en"]
    ai = t.series("subdomain", sd["subdomain_id"], "arxiv_ai_papers")
    allp = t.series("subdomain", sd["subdomain_id"], "arxiv_all_papers")
    periods = sorted(p for p in ai if p in allp)[-2:]
    if len(periods) < 2:
        why = next((r["note"] for r in t.find(*ent, "arxiv_ai_papers")), "no arXiv rows in trends.csv")
        return no_data("subdomain", ent, label, "arxiv_ai_paper_growth", why)
    p1, p2 = periods
    growth = 100 * (ai[p2][0] / ai[p1][0] - 1)
    all_growth = 100 * (allp[p2][0] / allp[p1][0] - 1)
    s1, s2 = 100 * ai[p1][0] / allp[p1][0], 100 * ai[p2][0] / allp[p2][0]
    d, code = direction(growth, ARXIV_PCT)
    _, share_code = direction(s2 - s1, 1.0)
    comp = code > 0 and share_code <= 0
    ids = [ai[p1][1], ai[p2][1], allp[p1][1], allp[p2][1]]
    cats = t.by_id[ai[p2][1]]["note"].split(":")[0].replace("arXiv ", "")
    extra = [("global arXiv signal, not Malaysian demand; keyword match on abstracts", "medium")]
    if "cs.LG" in cats:
        extra.append(("cs.LG is itself a machine-learning category, so most of its papers match the AI terms", "medium"))
    conf, why = confidence(4, False, extra)  # two 6-month windows of monthly papers: treated as a full window
    detail = (f"{cats}: AI papers {int(ai[p1][0]):,} -> {int(ai[p2][0]):,} ({growth:+.1f}%); "
              f"all papers {all_growth:+.1f}%; AI share {s1:.1f}% -> {s2:.1f}%")
    if comp:
        detail += (f"; all papers in the category grew faster ({all_growth:+.1f}%), so AI's share did not rise: "
                   "the growth reflects more papers overall, not AI entering the field faster")
    return row(layer="subdomain", scored="TRUE", entity_type=ent[0], entity_id=ent[1], entity_label=label,
               signal="arxiv_ai_paper_growth", window_start=p1, window_end=t.by_id[ai[p2][1]]["period_end"],
               n_points=2, value=round(growth, 2), unit="percent",
               count_change_pct=round(growth, 2), total_change_pct=round(all_growth, 2),
               direction=d, direction_code=code, strength=round(max(-1.0, min(1.0, growth / ARXIV_FULL_PCT)), 3),
               direction_rule=f"AI paper growth > +{ARXIV_PCT}% up; < -{ARXIV_PCT}% down; else flat (draft threshold); "
                              f"strength = growth / {ARXIV_FULL_PCT}%, capped at -1 and 1",
               composition_effect="TRUE" if comp else "FALSE", confidence=conf, confidence_reason=why,
               detail=detail, input_trend_ids=";".join(ids))


def mycol_ids(t, roles):
    """trend_ids of the MyCOL occupation rows these roles map to (yes / near only)."""
    have = {r["entity_id"]: r["trend_id"] for r in t.rows if r["entity_type"] == "mycol_occupation"}
    ids = []
    for r in roles:
        tid = have.get(f"masco_{r['masco_4digit_mycol']}", "") if r["is_mycol"] in ("yes", "near") else ""
        if tid and tid not in ids:
            ids.append(tid)
    return ids


def mycol_signal(t, sd, roles):
    ent = ("subdomain", sd["subdomain_id"])
    mine = [r for r in roles if r["subfield_code"] == sd["subfield_code"]]
    if not mine:
        return no_data("subdomain", ent, sd["label_en"], "mycol_coverage",
                       "no roles for this sub-domain in data/roles.csv")
    yes = [r["role_id"] for r in mine if r["is_mycol"] == "yes"]
    near = [r["role_id"] for r in mine if r["is_mycol"] == "near"]
    no = [r["role_id"] for r in mine if r["is_mycol"] == "no"]
    d, code = ("on_mycol", 1) if yes else ("near_mycol", 0) if near else ("not_on_mycol", 0)
    coverage = sum(MYCOL_STRENGTH[r["is_mycol"]] for r in mine) / len(mine)
    return row(layer="subdomain", scored="TRUE", entity_type=ent[0], entity_id=ent[1], entity_label=sd["label_en"],
               signal="mycol_coverage", window_start="2024-01-01", window_end="2025-12-31", n_points=1,
               value=round(100 * coverage, 1), unit="percent of roles (yes = 1, near = 0.5)",
               direction=d, direction_code=code, strength=round(coverage, 3),
               direction_rule="any role is_mycol = yes -> on_mycol; else any near -> near_mycol; else not_on_mycol; "
                              "strength = share of roles on MyCOL, near counted as half",
               confidence="medium",
               confidence_reason="official Malaysian list (status, not a trend; one edition); "
                                 "role-to-occupation match by B (data/roles.csv)",
               detail=f"{len(mine)} roles: yes {len(yes)} ({', '.join(yes) or '-'}), near {len(near)} "
                      f"({', '.join(near) or '-'}), no {len(no)} ({', '.join(no) or '-'})",
               input_trend_ids=";".join(mycol_ids(t, mine)))


def dosm_signals(t, sd):
    ent = ("subdomain", sd["subdomain_id"])
    if not sd["dosm_entity"]:
        return [no_data("subdomain", ent, sd["label_en"], "dosm_online_ads",
                        "DOSM publishes no online job ad series for this sub-domain's occupations")]
    src = tuple(sd["dosm_entity"].split("/"))
    label = f"{sd['label_en']} (DOSM: {src[1]})"
    return ad_signals(t, "subdomain", "TRUE", src, label, ALL_ADS, out_entity=ent)


# --- role layer ------------------------------------------------------------------------

def role_signals(roles, t):
    out = []
    for r in roles:
        status = r["is_mycol"]
        occ = r["mycol_occupation"]
        detail = (f"sub-domain {r['subfield_code']}; MyCOL occupation: {occ} (MASCO {r['masco_4digit_mycol']}), "
                  f"matched title: {r['mycol_matched_title'] or '-'}" if occ
                  else f"sub-domain {r['subfield_code']}; no MyCOL occupation")
        if r["notes"]:
            detail += f"; note from roles.csv: {r['notes']}"
        out.append(row(layer="role", scored="TRUE", entity_type="role", entity_id=r["role_id"],
                       entity_label=r["role_name_en"], signal="mycol_status", n_points=1,
                       window_start="2024-01-01", window_end="2025-12-31", value=status, unit="yes/near/no",
                       direction=status, direction_code={"yes": 1, "near": 0, "no": 0}[status],
                       strength=MYCOL_STRENGTH[status],
                       direction_rule="is_mycol from data/roles.csv (B): yes = MyCOL lists this job title; "
                                      "near = a similar or related title in that MyCOL occupation; no = neither",
                       confidence="medium", confidence_reason="official list; role-to-occupation match by B",
                       detail=detail, input_trend_ids=";".join(mycol_ids(t, [r]))))
    return out


def clean_roles(roles):
    """Normalise is_mycol in place; ValueError if a role has another value."""
    for r in roles:
        r["is_mycol"] = r["is_mycol"].strip().lower()
        if r["is_mycol"] not in ("yes", "near", "no"):
            raise ValueError(f"{ROLES.name} {r['role_id']}: is_mycol must be yes / near / no")
    return roles


def build(t, subdomains, roles):
    """Every signal for trends t (a Trends), numbered in file order. main() writes them;
    scripts/whatif.py runs the same code on a changed copy of the inputs."""
    signals = []
    for sd in subdomains:
        signals.append(arxiv_signal(t, sd))
        signals.append(mycol_signal(t, sd, roles))
        signals += dosm_signals(t, sd)
    signals += role_signals(roles, t)
    signals += (employment_gap(t, "industry_background", ICT)
                + wage_gap(t, "industry_background", ICT)
                + ad_signals(t, "industry_background", "FALSE", ICT, ICT[2], CLASSIFIED_ADS,
                             with_count=False, extra=unclassified_extra(t)))
    signals += (ad_signals(t, "reference", "FALSE", PROF, PROF[2], ALL_ADS)
                + ad_signals(t, "reference", "FALSE", TECH, TECH[2], ALL_ADS)
                + wage_gap(t, "reference", PROF)
                + wage_gap(t, "reference", TECH))

    today = dt.date.today().isoformat()
    for i, s in enumerate(signals, 1):
        s["signal_id"] = f"S{i:02d}"
        s["formula_version"] = FORMULA_VERSION
        s["computed_date"] = today
    return signals


def main():
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "data" / "trends.csv"
    dst = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / "data" / "trend_signals.csv"
    t = Trends(read_csv(src))
    subdomains = read_csv(SUBDOMAINS)
    try:
        roles = clean_roles(read_csv(ROLES)) if ROLES.exists() else []
    except ValueError as e:
        sys.exit(str(e))
    if not roles:
        print(f"  ({ROLES.relative_to(ROOT)} not found: role layer and MyCOL coverage have no data)")
    signals = build(t, subdomains, roles)

    # Every referenced trend_id must exist in the input.
    missing = [i for s in signals for i in s["input_trend_ids"].split(";") if i and i not in t.by_id]
    if missing:
        sys.exit(f"input_trend_ids not found in {src.name}: {missing}")

    with dst.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        w.writerows(signals)
    for s in signals:
        print(f"  {s['signal_id']} {s['layer']:<19} {s['entity_id']:<24} {s['signal']:<34} "
              f"{str(s['value']):>7} {s['unit']:<17} {s['direction']:<15} {s['confidence']}")
    print(f"Wrote {len(signals)} signals to {dst}")


if __name__ == "__main__":
    main()
