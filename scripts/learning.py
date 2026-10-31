"""Learning path page for one role: where to learn it, in order, with links.

Stages, in order:
  1. Foundations    free resources for the role's IT area (and for every IT student)
  2. For this role  resources made for this exact role (e.g. QA testing, blockchain)
  3. Skills to build the role's skills and In Demand technologies, biggest first, each with
                    its free resources (data/learning_resources.csv) and courses
                    (data/courses.csv). With a student profile the list is that student's
                    gaps from matching.py; without one it is the role's own list.
  4. Prove it       portfolio project ideas for the role (data/projects.csv) and its
                    certifications (data/certifications.csv)

Every stage is free. Paid courses whose provider says they are HRD Corp claimable are
listed apart, for working adults whose employer can claim the fee (matching.hrd_corp_options).

The page also sums up the SDG targets the path contributes to: the role's own targets and
those of every skill in stage 3 (data/sdg_map.csv), with the team's rationale for each link.

Every link was opened and checked on its verified_date. A skill with no checked resource
says so instead of suggesting one we have not seen.
"""

import matching

MAX_SKILLS = 10   # skills listed in stage 3; the rest are counted
MAX_PER_SKILL = 3


def targets(resource: dict) -> list[tuple[str, str]]:
    return [tuple(t.split(":", 1)) for t in resource["targets"].split(";") if ":" in t]


def item(r: dict) -> dict:
    return {"id": r.get("resource_id") or r.get("course_id"), "title": r["title"], "provider": r["provider"],
            "format": r.get("format") or "course", "url": r["url"],
            "hours": matching.number(r["duration_hours"]) if r.get("duration_hours") else None,
            "cost_myr": matching.number(r["cost_myr"]) if r.get("cost_myr") else None,
            "level": r.get("level", ""), "verified_date": r["verified_date"],
            # notes in courses.csv are for the team ("Same course as C07"), so only resources show theirs
            "notes": r.get("notes", "") if "targets" in r else ""}


def skill_rows(role: dict, data: dict, match: dict | None) -> tuple[list[dict], int]:
    """Skills to build, biggest gap (or importance) first, then technologies."""
    if match:
        d = match["skill_detail"]
        rated = [{"skill_id": g["skill_id"], "skill_name": g["skill_name"], "kind": "skill",
                  "your_level": g["your_level"], "level_needed": g["level_needed"],
                  "rated": g.get("rated", True)}
                 for g in d["gaps"] if g["level_needed"] - g["your_level"] >= matching.MIN_PATH_GAP]
        techs = [{"skill_id": t["skill_id"], "skill_name": t["skill_name"], "kind": "technology"}
                 for t in d["tech_missing"]]
    else:
        rows = data["role_skills"].get(role["role_id"], [])
        name = lambda sid: data["skills"][sid]["skill_name"]
        rated = [{"skill_id": r["skill_id"], "skill_name": name(r["skill_id"]), "kind": "skill",
                  "level_needed": matching.number(r["level"]) if r["level"] else None}
                 for r in sorted((r for r in rows if r["row_type"] == "skill_knowledge"),
                                 key=lambda r: -float(r["importance"]))]
        techs = [{"skill_id": r["skill_id"], "skill_name": name(r["skill_id"]), "kind": "technology"}
                 for r in rows if r["row_type"] == "in_demand_tech"]
    # technologies, then skills, that have something to learn from come first, so the page
    # leads with links; within each group the biggest gap (or importance) stays first.
    # Skills the student has not rated (counted as 0) come after all of those, so general
    # skills nobody asked about do not crowd out the technical gaps (see matching.learning_path)
    unrated = [s for s in rated if s.get("rated") is False]
    rated = [s for s in rated if s.get("rated") is not False]
    every = rated + techs + unrated
    free = lambda s: [c for c in data["courses"].get(s["skill_id"], []) if matching.is_free(c)]  # noqa: E731
    linked = lambda group: [s for s in group if free(s)]  # noqa: E731
    rest = lambda group: [s for s in group if not free(s)]  # noqa: E731
    shown = (linked(techs) + linked(rated) + rest(techs + rated) + linked(unrated) + rest(unrated))[:MAX_SKILLS]
    for s in shown:
        s["resources"] = [item(c) for c in free(s)][:MAX_PER_SKILL]
    hrd = matching.hrd_corp_options([(s["skill_id"], s["skill_name"]) for s in every], data["courses"])
    return shown, len(every) - len(shown), hrd


def sdg_summary(role_id: str, skills: list[dict], sdg: dict) -> list[dict]:
    """SDG targets of the role and of the skills on its path, the role's own targets first."""
    targets = {}

    def entry(s):
        return targets.setdefault(s["target"], {"target": s["target"], "goal_name": s["goal_name"],
                                               "role": None, "skills": []})

    for s in sdg.get(("role", role_id), []):
        entry(s)["role"] = {"link_strength": s["link_strength"], "rationale": s["rationale"]}
    for k in skills:
        for s in sdg.get(("skill", k["skill_id"]), []):
            entry(s)["skills"].append({"skill_id": k["skill_id"], "skill_name": k["skill_name"],
                                       "link_strength": s["link_strength"], "rationale": s["rationale"]})
    goal = lambda t: tuple((0, int(x), "") if x.isdigit() else (1, 0, x) for x in t.split("."))  # 9.5 before 9.b  # noqa: E731
    return sorted(targets.values(), key=lambda t: (t["role"] is None, -len(t["skills"]), goal(t["target"])))


def page(role_id: str, data: dict | None = None, match: dict | None = None,
         hours_per_week: float = matching.DEFAULT_HOURS_PER_WEEK) -> dict | None:
    data = data or matching.load_data()
    role = next((r for r in data["roles"] if r["role_id"] == role_id), None)
    if role is None:
        return None
    area = next((a for a in data["areas"] if a["id"] == role["it_area"]), None)
    foundations, for_role = [], []
    for r in data["resources"]:
        t = targets(r)
        if ("role", role_id) in t:
            for_role.append(item(r))
        elif ("area", role["it_area"]) in t or ("area", "all") in t:
            foundations.append(item(r))
    skills, more, hrd = skill_rows(role, data, match)
    for s in skills:
        s["sdg"] = [{"target": x["target"], "goal_name": x["goal_name"]} for x in data["sdg"].get(("skill", s["skill_id"]), [])]
    certs = [c for c in matching.read_csv("certifications.csv") if c["role_id"] == role_id]
    summary = next(({k[8:]: v for k, v in s.items() if k.startswith("summary_")}
                    for s in matching.read_csv("role_summaries.csv") if s["role_id"] == role_id), {})
    projects = [{"id": p["project_id"], "title": p["title"], "description": p["description"],
                 "guide": {"name": p["guide_name"], "url": p["guide_url"]}}
                for p in matching.read_csv("projects.csv") if p["role_id"] == role_id]

    seen, hours, untimed = set(), 0.0, 0
    for r in foundations + for_role + [x for s in skills for x in s["resources"]]:
        if r["url"] in seen:
            continue
        seen.add(r["url"])
        if r["hours"]:
            hours += r["hours"]
        else:
            untimed += 1
    return {
        "role": {"role_id": role_id, "name": role["role_name_en"], "it_area": role["it_area"],
                 "area_name": area["name"] if area else None, "job_zone": int(role["job_zone"]),
                 "is_mycol": role["is_mycol"], "onet_soc": role["onet_soc"], "summary": summary},
        "personal": match is not None,
        "stages": [
            {"id": "foundations", "title": f"Foundations for {area['name'] if area else 'IT'}", "resources": foundations},
            {"id": "role", "title": f"Made for {role['role_name_en']}", "resources": for_role},
        ],
        "skills": skills, "skills_not_shown": more,
        "projects": projects,
        "certifications": certs,
        "hrd_corp_options": hrd,
        "sdg": sdg_summary(role_id, skills, data["sdg"]),
        "total_hours": round(hours, 1), "resources_without_hours": untimed,
        "hours_per_week": hours_per_week,
        "weeks": round(hours / hours_per_week, 1) if hours_per_week else None,
    }
