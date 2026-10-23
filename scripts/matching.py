"""Find which IT area suits a student, then rank the IT roles in it and explain every score.

Two steps, so the student first sees *which part of IT* fits them, then the roles:

1. Area fit, for each of the 6 IT areas of the skills test (data/it_assessment.json):

    area_fit = 0.45 x test + 0.30 x preference + 0.25 x CV evidence     (each part 0-100)

   - test: the IT skills test. Every area gets 3 quick-check items, so every area has a
     score; the 2 areas tested in depth combine quick check and deep items (TEST_SPLIT).
   - preference: the preference questionnaire, scored 0-100 per area.
   - CV evidence: projects, internships and certificates in the CV, scored 0-100 per area.
   A part the student skipped is left out and the other weights are scaled up, never filled.

2. Role score, for every role that belongs to an IT area (roles.csv column it_area):

    total = 0.5 x area fit of the role's area + 0.3 x skill + 0.2 x trend
    skill = 0.7 x rated skills/knowledge + 0.3 x In Demand technologies

   - rated skills: for each skill_knowledge row, coverage = min(student level / O*NET
     level, 1), weighted by O*NET importance. Rows whose level O*NET suppresses are skipped.
   - technologies: share of the role's In Demand technologies the student already uses.
   - trend: the 0-100 trend score for the role (data/trend_scores.csv, looked up by role_id,
     then it_area, then the older domain), or its value under a future scenario (SCENARIOS).
     A role with no trend data gets a neutral 50 and a flag.

All weights are team design choices, not data (see SOURCES.md, "Choices and limits").

Each role also has a learning path: its gaps, biggest first, with the free courses in
data/courses.csv and the total hours. Roles whose Job Zone is above the student's education
are ranked after the others and flagged, never hidden.

Student profile (data/sample_profiles.json; fictional people only):
    {"profile_id": "P01", "name": "...", "education_job_zone": 4,
     "test_areas": {"software_dev": 72, ...},   # 0-100 per area (test_area_scores)
     "preferences": {"software_dev": 80, ...},  # 0-100 per area
     "cv_areas": {"software_dev": 60, ...},     # 0-100 per area
     "skills": {"SK007": 4.0, ...},             # skill_id -> O*NET level 0-7
     "technologies": ["SK130", ...]}            # skill_ids of technologies used
Every part is optional.

Usage:
    python scripts/matching.py                    # first sample profile, top 5
    python scripts/matching.py --profile P02 --top 10
    python scripts/matching.py --json             # full result as JSON
"""

import argparse
import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"

AREA_WEIGHTS = {"test": 0.45, "preference": 0.30, "cv": 0.25}
AREA_SOURCE_LABEL = {"test": "skills test", "preference": "preferences", "cv": "CV evidence"}
TEST_SPLIT = {"screen": 0.4, "deep": 0.6}  # areas tested in depth: quick check vs deep items
WEIGHTS = {"area": 0.5, "skill": 0.3, "trend": 0.2}
SKILL_SPLIT = {"rated": 0.7, "tech": 0.3}
NEUTRAL_TREND = 50.0
DEFAULT_JOB_ZONE = 4  # bachelor's degree, the usual level of a graduating student
CLEAR_LEAD = 10  # area-fit points the best area needs over the next one to be called clear

# Older role -> domain mapping, kept only as the last trend lookup until the IT trend
# scores replace data/trend_scores.csv. generic_tech is the DOSM "Information & communication" sector.
ROLE_DOMAIN = {
    **dict.fromkeys(["R01", "R02", "R03", "R04", "R05", "R08", "R11", "R13", "R14",
                     "R16", "R17", "R26", "R31", "R34"], "generic_tech"),
    **dict.fromkeys(["R06", "R10"], "agriculture"),
    **dict.fromkeys(["R12", "R15", "R24", "R25", "R30"], "healthcare"),
    **dict.fromkeys(["R29", "R32", "R33", "R35"], "finance"),
}

# Future scenarios re-weight the two measured parts of each trend score
# (data/trend_scores.csv). They change no data; the weights are team assumptions.
SCENARIOS = {
    "baseline": {"name": "Current trends", "demand": 0.5, "ai": 0.5,
                 "description": "Malaysian job demand and AI momentum count equally, as in the trend score."},
    "fast_ai": {"name": "Fast AI adoption", "demand": 0.2, "ai": 0.8,
                "description": "AI spreads quickly into every field, so how fast AI research is entering "
                               "a field matters more than today's hiring."},
    "local_demand": {"name": "Malaysian demand leads", "demand": 0.8, "ai": 0.2,
                     "description": "AI adoption is slow and uneven, so today's Malaysian employment growth "
                                    "decides which fields need people."},
}
DEFAULT_HOURS_PER_WEEK = 5
MIN_PATH_GAP = 0.5  # rated gaps smaller than this (O*NET level points) get no course step


def read_csv(name: str) -> list[dict]:
    with (DATA / name).open(encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def load_areas() -> list[dict]:
    """The 6 IT areas, from the skills test bank so test and matching always agree."""
    bank = json.loads((DATA / "it_assessment.json").read_text(encoding="utf-8"))
    return [{k: d[k] for k in ("id", "name", "name_zh", "description", "onet_soc")}
            for d in bank["domains"]]


def role_area(role: dict, soc_area: dict) -> str | None:
    """roles.csv it_area if filled in, else the area whose test lists the role's O*NET code."""
    return (role.get("it_area") or "").strip() or soc_area.get(role["onet_soc"])


def trend_key(row: dict) -> str:
    return next(row[k] for k in ("role_id", "it_area", "domain") if row.get(k))


def load_data() -> dict:
    """Read every table matching needs, keyed for fast lookup."""
    role_skills = {}
    for r in read_csv("role_skills.csv"):
        role_skills.setdefault(r["role_id"], []).append(r)
    sdg = {}
    for r in read_csv("sdg_map.csv"):
        sdg.setdefault((r["entity_type"], r["entity_id"]), []).append(
            {"target": r["sdg_target"], "goal_name": r["sdg_goal_name"],
             "link_strength": r["link_strength"], "rationale": r["rationale"]})
    courses = {}
    for r in read_csv("courses.csv"):
        courses.setdefault(r["skill_id"], []).append(r)
    areas = load_areas()
    soc_area = {soc: a["id"] for a in areas for soc in a["onet_soc"]}
    roles = [{**r, "it_area": role_area(r, soc_area)} for r in read_csv("roles.csv")]
    trends = read_csv("trend_scores.csv")
    return {
        "areas": areas,
        "roles": roles,
        "skills": {r["skill_id"]: r for r in read_csv("skills.csv")},
        "role_skills": role_skills,
        "trend_scores": {trend_key(r): float(r["trend_score"]) for r in trends},
        "trend_parts": {trend_key(r): {"demand": number(r["my_demand_score"]),
                                       "ai": number(r["ai_momentum_score"])} for r in trends},
        "courses": courses,
        "sdg": sdg,
    }


def number(value: str) -> float | None:
    try:
        return float(value)
    except ValueError:
        return None  # "no data"


def scenario_trend_scores(data: dict, scenario: str) -> dict:
    """Trend score per key under a scenario; a part with no data is left out, never filled."""
    s = SCENARIOS[scenario]
    scores = {}
    for key, parts in data["trend_parts"].items():
        used = {k: v for k, v in parts.items() if v is not None}
        weight = sum(s[k] for k in used)
        if weight:
            scores[key] = round(min(100.0, max(0.0, sum(s[k] * v for k, v in used.items()) / weight)), 1)
    return scores


def learning_path(skill: dict, courses: dict, hours_per_week: float = DEFAULT_HOURS_PER_WEEK) -> dict:
    """Order the gaps (biggest first, then missing technologies) and attach free courses.

    Rated gaps under MIN_PATH_GAP level points are close enough and get no step.
    A course that covers several gap skills is listed once. Gaps with no verified course
    are returned separately so the page can say so instead of inventing one.
    """
    steps, no_course, seen = [], [], {}
    gaps = [(g["skill_id"], g["skill_name"]) for g in skill["gaps"]
            if g["level_needed"] - g["your_level"] >= MIN_PATH_GAP] + \
           [(t["skill_id"], t["skill_name"]) for t in skill["tech_missing"]]
    for sid, name in gaps:
        options = courses.get(sid, [])
        if not options:
            no_course.append({"skill_id": sid, "skill_name": name})
            continue
        for c in options:
            if c["url"] in seen:
                seen[c["url"]]["skills"].append(name)
                continue
            step = {"course_id": c["course_id"], "title": c["title"], "provider": c["provider"],
                    "url": c["url"], "hours": number(c["duration_hours"]) if c["duration_hours"] else None,
                    "cost_myr": number(c["cost_myr"]), "hrd_corp_claimable": c["hrd_corp_claimable"],
                    "verified_date": c["verified_date"], "skills": [name]}
            seen[c["url"]] = step
            steps.append(step)
    hours = sum(s["hours"] for s in steps if s["hours"])
    return {"steps": steps, "total_hours": round(hours, 1), "hours_per_week": hours_per_week,
            "weeks": round(hours / hours_per_week, 1) if hours_per_week else None,
            "steps_without_hours": sum(1 for s in steps if not s["hours"]),
            "gaps_without_course": no_course}


def rating_to_level(rating: float) -> float:
    """Map a 1-5 self-rating from the intake form to the O*NET 0-7 level scale."""
    return round(max(0.0, min(rating, 5.0)) / 5 * 7, 2)


def test_area_scores(report: dict) -> dict:
    """0-100 test score per area from an assessment.report() result.

    Every area has its quick-check profile; the 2 areas tested in depth also have deep and
    hands-on items, which carry more weight because they are harder and more numerous.
    """
    return {d["id"]: round(TEST_SPLIT["screen"] * d["profile"] + TEST_SPLIT["deep"] * d["readiness"], 1)
            if d["tested_in_depth"] else float(d["profile"]) for d in report["domains"]}


def weighted(parts: dict, weights: dict) -> tuple[float | None, dict]:
    """Weighted mean of the parts that have a value, and each part's share of the result."""
    used = {k: v for k, v in parts.items() if v is not None}
    total = sum(weights[k] for k in used)
    if not total:
        return None, {k: None for k in parts}
    return (round(sum(weights[k] * v for k, v in used.items()) / total, 1),
            {k: None if parts[k] is None else round(weights[k] * parts[k] / total, 1) for k in parts})


def top_area(scores: dict | None) -> str | None:
    """The single highest area, or None when there are no scores or the top is tied."""
    if not scores:
        return None
    ranked = sorted(scores.items(), key=lambda kv: -kv[1])
    if len(ranked) > 1 and ranked[0][1] == ranked[1][1]:
        return None
    return ranked[0][0]


def area_fit(profile: dict, areas: list[dict]) -> dict:
    """Score the 6 IT areas from test, preferences and CV, and say what the sources agree on."""
    sources = {"test": profile.get("test_areas") or None,
               "preference": profile.get("preferences") or None,
               "cv": profile.get("cv_areas") or None}
    names = {a["id"]: a["name"] for a in areas}
    rows = []
    for a in areas:
        parts = {k: None if s is None or s.get(a["id"]) is None else float(s[a["id"]])
                 for k, s in sources.items()}
        fit, points = weighted(parts, AREA_WEIGHTS)
        given = [f"{AREA_SOURCE_LABEL[k]} {v:g}" for k, v in parts.items() if v is not None]
        rows.append({"id": a["id"], "name": a["name"], "name_zh": a["name_zh"],
                     "description": a["description"], "fit": fit,
                     "parts": {k: {"score": parts[k], "weight": AREA_WEIGHTS[k], "points": points[k]}
                               for k in AREA_WEIGHTS},
                     "explain": ", ".join(given) if given else "No answers for this area yet"})
    rows.sort(key=lambda r: -(r["fit"] if r["fit"] is not None else -1))

    used = [k for k, s in sources.items() if s]
    tops = {k: top_area(sources[k]) for k in used}
    best = rows[0] if rows and rows[0]["fit"] is not None else None
    insights = []
    if best:
        lead = best["fit"] - (rows[1]["fit"] or 0) if len(rows) > 1 else best["fit"]
        agree = [k for k in used if tops[k] == best["id"]]
        insights.append({"type": "best_area", "area": best["id"],
                         "text": f"{best['name']} fits you best (area fit {best['fit']:g})"
                                 + (f", a clear lead of {lead:.1f} points." if lead >= CLEAR_LEAD
                                    else f", but only {lead:.1f} points ahead of {rows[1]['name']}: "
                                         "look at both." if len(rows) > 1 else ".")})
        if len(used) > 1:
            insights.append({"type": "agreement", "sources": agree,
                             "text": f"{len(agree)} of your {len(used)} sources rank {best['name']} first"
                                     + (f" ({', '.join(AREA_SOURCE_LABEL[k] for k in agree)})."
                                        if agree else ".")})
    for a, b in (("test", "preference"), ("test", "cv"), ("preference", "cv")):
        if tops.get(a) and tops.get(b) and tops[a] != tops[b]:
            insights.append({"type": "mismatch", "sources": [a, b], "areas": [tops[a], tops[b]],
                             "text": f"Your {AREA_SOURCE_LABEL[a]} result points to {names[tops[a]]}, but your "
                                     f"{AREA_SOURCE_LABEL[b]} result points to {names[tops[b]]}."})
    if len(used) == 1:
        insights.append({"type": "one_source", "sources": used,
                         "text": f"Only your {AREA_SOURCE_LABEL[used[0]]} result was used. Add the other "
                                 "parts for a more reliable result."})
    return {"areas": rows, "sources_used": used, "best": best["id"] if best else None,
            "insights": insights}


def skill_score(profile: dict, rows: list[dict], skills: dict) -> dict:
    have = {k: float(v) for k, v in profile.get("skills", {}).items()}
    techs = set(profile.get("technologies", []))
    gaps, strengths, missing_tech, used_tech = [], [], [], []
    got = total = 0.0
    for r in rows:
        name = skills[r["skill_id"]]["skill_name"]
        if r["row_type"] == "in_demand_tech":
            (used_tech if r["skill_id"] in techs else missing_tech).append(
                {"skill_id": r["skill_id"], "skill_name": name})
            continue
        if not r["level"]:
            continue  # O*NET suppressed the level; importance alone cannot give coverage
        imp, need = float(r["importance"]), float(r["level"])
        user = have.get(r["skill_id"], 0.0)
        cover = min(user / need, 1.0) if need > 0 else 1.0
        got += imp * cover
        total += imp
        item = {"skill_id": r["skill_id"], "skill_name": name, "importance": imp,
                "level_needed": need, "your_level": user}
        if cover < 1:
            gaps.append({**item, "gap_points": round(imp * (1 - cover), 2)})
        else:
            strengths.append(item)
    rated = 100 * got / total if total else None
    tech_count = len(used_tech) + len(missing_tech)
    tech = 100 * len(used_tech) / tech_count if tech_count else None
    if rated is None:
        score = tech
    elif tech is None:
        score = rated
    else:
        score = SKILL_SPLIT["rated"] * rated + SKILL_SPLIT["tech"] * tech
    gaps.sort(key=lambda g: -g["gap_points"])
    strengths.sort(key=lambda s: -s["importance"])
    return {"score": None if score is None else round(score, 1),
            "rated_score": None if rated is None else round(rated, 1),
            "tech_score": None if tech is None else round(tech, 1),
            "gaps": gaps, "strengths": strengths,
            "tech_used": used_tech, "tech_missing": missing_tech}


def role_trend(role: dict, trend_scores: dict) -> tuple[float, str, bool]:
    """Trend score for the role: its own, else its area's, else its older domain's, else 50."""
    for key, what in ((role["role_id"], "this role"), (role["it_area"], f"the {role['it_area']} area"),
                      (ROLE_DOMAIN.get(role["role_id"]), f"the {ROLE_DOMAIN.get(role['role_id'])} sector")):
        if key in trend_scores:
            return trend_scores[key], f"Trend score of {what}", True
    return NEUTRAL_TREND, "No trend data for this role; neutral 50 used", False


def match_role(profile: dict, role: dict, data: dict, trend_scores: dict, fits: dict) -> dict:
    rid = role["role_id"]
    area = fits.get(role["it_area"])
    skill = skill_score(profile, data["role_skills"].get(rid, []), data["skills"])
    trend, trend_why, has_trend = role_trend(role, trend_scores)

    parts = {"area": area["fit"] if area else None, "skill": skill["score"], "trend": trend}
    total, points = weighted(parts, WEIGHTS)

    flags = []
    if parts["area"] is None:
        flags.append("area_not_scored")
    if not has_trend:
        flags.append("no_trend_data")
    if int(role["job_zone"]) > int(profile.get("education_job_zone", DEFAULT_JOB_ZONE)):
        flags.append("needs_extra_education")
    if role["it_reachable_draft"] == "needs_extra_qualification":
        flags.append("needs_extra_qualification")

    return {
        "role_id": rid,
        "role_name": role["role_name_en"],
        "it_area": role["it_area"],
        "area_name": area["name"] if area else None,
        "total": total or 0.0,
        "components": {k: {"score": parts[k], "weight": WEIGHTS[k], "points": points[k]} for k in WEIGHTS},
        "explain": {"area": (f"{area['name']} area fit: {area['explain']}" if area
                             else "Area fit not scored: no test, preference or CV answers"),
                    "trend": trend_why,
                    "skill": f"{skill['rated_score']} rated skills/knowledge, "
                             f"{skill['tech_score']} technologies"},
        "skill_detail": skill,
        "pathway": learning_path(skill, data["courses"],
                                 profile.get("hours_per_week", DEFAULT_HOURS_PER_WEEK)),
        "job_zone": int(role["job_zone"]),
        "is_mycol": role["is_mycol"],
        "flags": flags,
        "sdg": data["sdg"].get(("role", rid), []),
    }


def it_roles(data: dict) -> list[dict]:
    """Roles that belong to one of the 6 IT areas; every other role is left out."""
    ids = {a["id"] for a in data["areas"]}
    return [r for r in data["roles"] if r["it_area"] in ids]


def rank_roles(profile: dict, data: dict | None = None, trend_scores: dict | None = None,
               scenario: str | None = None, fit: dict | None = None) -> list[dict]:
    """Score every IT role for the profile under a scenario (SCENARIOS) or given trend scores."""
    data = data or load_data()
    if scenario:
        trend_scores = scenario_trend_scores(data, scenario)
    trend_scores = data["trend_scores"] if trend_scores is None else trend_scores
    fit = fit or area_fit(profile, data["areas"])
    fits = {a["id"]: a for a in fit["areas"] if a["fit"] is not None}
    results = [match_role(profile, role, data, trend_scores, fits) for role in it_roles(data)]
    return sorted(results, key=lambda m: ("needs_extra_education" in m["flags"], -m["total"]))


def match_student(profile: dict, data: dict | None = None, scenario: str = "baseline") -> dict:
    """The whole result: area profile with insights first, then the ranked roles."""
    data = data or load_data()
    fit = area_fit(profile, data["areas"])
    roles = rank_roles(profile, data, scenario=scenario, fit=fit)
    counts = {}
    for r in it_roles(data):
        counts[r["it_area"]] = counts.get(r["it_area"], 0) + 1
    for a in fit["areas"]:
        a["role_count"] = counts.get(a["id"], 0)
        a["top_roles"] = [m["role_id"] for m in roles if m["it_area"] == a["id"]][:3]
    return {**fit, "roles": roles}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--profile", help="profile_id in data/sample_profiles.json (default: first)")
    ap.add_argument("--top", type=int, default=5)
    ap.add_argument("--json", action="store_true", help="print the full result as JSON")
    args = ap.parse_args()

    profiles = json.loads((DATA / "sample_profiles.json").read_text(encoding="utf-8"))
    if not profiles:
        print("data/sample_profiles.json has no profiles")
        return 1
    profile = next((p for p in profiles if p["profile_id"] == args.profile), None) \
        if args.profile else profiles[0]
    if profile is None:
        print(f"No profile '{args.profile}'")
        return 1

    result = match_student(profile)
    result["roles"] = result["roles"][:args.top]
    if args.json:
        print(json.dumps(result, indent=2, ensure_ascii=False))
        return 0
    print(f"IT areas for {profile['name']}")
    for a in result["areas"]:
        print(f"  {a['fit'] if a['fit'] is not None else '-':>5}  {a['name']:<36} {a['explain']}"
              + ("" if a["role_count"] else "  (no roles yet)"))
    for i in result["insights"]:
        print(f"  * {i['text']}")
    print(f"\nTop {args.top} roles")
    for m in result["roles"]:
        c = m["components"]
        print(f"\n{m['total']:5.1f}  {m['role_id']} {m['role_name']}  [{m['area_name']}]"
              + (f"  flags: {', '.join(m['flags'])}" if m["flags"] else ""))
        print(f"       area {c['area']['score']}  skill {c['skill']['score']}  trend {c['trend']['score']}")
        gaps = m["skill_detail"]["gaps"][:3]
        if gaps:
            print("       top gaps: " + "; ".join(
                f"{g['skill_name']} ({g['your_level']} -> {g['level_needed']})" for g in gaps))
        missing = m["skill_detail"]["tech_missing"][:5]
        if missing:
            print("       tech to learn: " + ", ".join(t["skill_name"] for t in missing))
        if m["sdg"]:
            print("       SDG: " + ", ".join(s["target"] for s in m["sdg"]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
