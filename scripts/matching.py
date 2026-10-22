"""Rank the 35 roles for one student and explain every score.

    total = 0.2 x interest + 0.5 x skill + 0.3 x trend          (each part 0-100)
    skill = 0.7 x rated skills/knowledge + 0.3 x In Demand technologies

The weights are team design choices, not data (see SOURCES.md, "Choices and limits").

- interest: Pearson correlation between the student's six RIASEC scores and the
  role's O*NET interest scores (roles.csv score_R..score_C), mapped from -1..1 to
  0..100. Correlation ignores the scale, so raw questionnaire totals work as input.
- rated skills: for each skill_knowledge row, coverage = min(student level / O*NET
  level, 1), weighted by O*NET importance. Rows whose level O*NET suppresses are skipped.
- technologies: share of the role's In Demand technologies the student already uses.
  A role with none uses the rated part alone.
- trend: the 0-100 trend score of the role's domain (data/trend_scores.csv). Roles
  outside the four domains get a neutral 50, which the trend formula gives to a
  sector that grows at the national average.

Roles whose Job Zone is above the student's education are ranked after the others
and flagged, never hidden. Roles marked it_reachable_draft = no are ranked last.

Student profile (data/sample_profiles.json; fictional people only):
    {"profile_id": "P01", "name": "...", "education_job_zone": 4,
     "riasec": {"R": 12, "I": 22, "A": 9, "S": 14, "E": 11, "C": 19},
     "skills": {"SK007": 4.0, ...},       # skill_id -> O*NET level 0-7
     "technologies": ["SK130", ...]}      # skill_ids of technologies used

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

WEIGHTS = {"interest": 0.2, "skill": 0.5, "trend": 0.3}
SKILL_SPLIT = {"rated": 0.7, "tech": 0.3}
NEUTRAL_TREND = 50.0
DEFAULT_JOB_ZONE = 4  # bachelor's degree, the usual level of a graduating student
RIASEC = ["R", "I", "A", "S", "E", "C"]

# Draft role -> domain mapping for the trend score (team to confirm). generic_tech is
# the DOSM "Information & communication" sector; roles not listed have no domain.
ROLE_DOMAIN = {
    **dict.fromkeys(["R01", "R02", "R03", "R04", "R05", "R08", "R11", "R13", "R14",
                     "R16", "R17", "R26", "R31", "R34"], "generic_tech"),
    **dict.fromkeys(["R06", "R10"], "agriculture"),
    **dict.fromkeys(["R12", "R15", "R24", "R25", "R30"], "healthcare"),
    **dict.fromkeys(["R29", "R32", "R33", "R35"], "finance"),
}


def read_csv(name: str) -> list[dict]:
    with (DATA / name).open(encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


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
    return {
        "roles": read_csv("roles.csv"),
        "skills": {r["skill_id"]: r for r in read_csv("skills.csv")},
        "role_skills": role_skills,
        "trend_scores": {r["domain"]: float(r["trend_score"]) for r in read_csv("trend_scores.csv")},
        "sdg": sdg,
    }


def rating_to_level(rating: float) -> float:
    """Map a 1-5 self-rating from the intake form to the O*NET 0-7 level scale."""
    return round(max(0.0, min(rating, 5.0)) / 5 * 7, 2)


def interest_score(user: dict, role: dict) -> tuple[float | None, str]:
    u = [float(user.get(k, 0)) for k in RIASEC]
    r = [float(role[f"score_{k}"]) for k in RIASEC]
    mu, mr = sum(u) / 6, sum(r) / 6
    cov = sum((a - mu) * (b - mr) for a, b in zip(u, r))
    su = sum((a - mu) ** 2 for a in u) ** 0.5
    sr = sum((b - mr) ** 2 for b in r) ** 0.5
    if su == 0 or sr == 0:
        return None, "RIASEC answers are all equal, so interest cannot be compared"
    corr = cov / (su * sr)
    top_user = "".join(sorted(RIASEC, key=lambda k: -u[RIASEC.index(k)])[:3])
    shared = sorted(set(top_user) & set(role["riasec_code_onet"]), key=top_user.index)
    why = (f"Your top interests {top_user} vs role code {role['riasec_code_onet']}"
           + (f"; shared: {''.join(shared)}" if shared else "; no shared letters"))
    return round((corr + 1) * 50, 1), why


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


def match_role(profile: dict, role: dict, data: dict, trend_scores: dict) -> dict:
    rid = role["role_id"]
    interest, interest_why = interest_score(profile.get("riasec", {}), role)
    skill = skill_score(profile, data["role_skills"].get(rid, []), data["skills"])
    domain = ROLE_DOMAIN.get(rid)
    if domain in trend_scores:
        trend, trend_why = trend_scores[domain], f"Trend score of the {domain} domain"
    else:
        trend, trend_why = NEUTRAL_TREND, "No domain trend data for this role; neutral 50 used"

    parts = {"interest": interest, "skill": skill["score"], "trend": trend}
    used = {k: v for k, v in parts.items() if v is not None}
    weight_sum = sum(WEIGHTS[k] for k in used)
    total = sum(WEIGHTS[k] * v for k, v in used.items()) / weight_sum if weight_sum else 0.0

    flags = []
    if interest is None:
        flags.append("interest_not_scored")
    if trend_why.startswith("No domain"):
        flags.append("no_domain_trend")
    if int(role["job_zone"]) > int(profile.get("education_job_zone", DEFAULT_JOB_ZONE)):
        flags.append("needs_extra_education")
    if role["it_reachable_draft"] == "needs_extra_qualification":
        flags.append("needs_extra_qualification")
    if role["it_reachable_draft"] == "no":
        flags.append("not_for_it_graduates")

    return {
        "role_id": rid,
        "role_name": role["role_name_en"],
        "domain": domain,
        "total": round(total, 1),
        "components": {
            k: {"score": parts[k], "weight": WEIGHTS[k],
                "points": None if parts[k] is None else round(WEIGHTS[k] * parts[k] / weight_sum, 1)}
            for k in WEIGHTS},
        "explain": {"interest": interest_why, "trend": trend_why,
                    "skill": f"{skill['rated_score']} rated skills/knowledge, "
                             f"{skill['tech_score']} technologies"},
        "skill_detail": skill,
        "job_zone": int(role["job_zone"]),
        "is_mycol": role["is_mycol"],
        "flags": flags,
        "sdg": data["sdg"].get(("role", rid), []),
    }


def rank_roles(profile: dict, data: dict | None = None,
               trend_scores: dict | None = None) -> list[dict]:
    """Score every role for the profile. Pass trend_scores to try a future scenario."""
    data = data or load_data()
    trend_scores = data["trend_scores"] if trend_scores is None else trend_scores
    results = [match_role(profile, role, data, trend_scores) for role in data["roles"]]
    tier = lambda m: (2 if "not_for_it_graduates" in m["flags"]
                      else 1 if "needs_extra_education" in m["flags"] else 0)
    return sorted(results, key=lambda m: (tier(m), -m["total"]))


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

    ranked = rank_roles(profile)[:args.top]
    if args.json:
        print(json.dumps(ranked, indent=2, ensure_ascii=False))
        return 0
    print(f"Top {args.top} roles for {profile['name']}")
    for m in ranked:
        c = m["components"]
        print(f"\n{m['total']:5.1f}  {m['role_id']} {m['role_name']}  [{m['domain'] or 'no domain'}]"
              + (f"  flags: {', '.join(m['flags'])}" if m["flags"] else ""))
        print(f"       interest {c['interest']['score']}  skill {c['skill']['score']}  "
              f"trend {c['trend']['score']}")
        print(f"       {m['explain']['interest']}")
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
