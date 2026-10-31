"""Future Skills web server and JSON API. Replit runs this file.

Uses only the Python standard library (no pip install), so it runs on any Python 3.10+.

Endpoints (all JSON):
    GET  /                           the web app (src/static/)
    GET  /api                        list of endpoints
    GET  /api/health
    GET  /api/questionnaire          the 36 interest items (RIASEC type + IT area), scale and attribution
    POST /api/assessment/plan        CV evidence/tools + interest answers -> the 3-5 IT areas to test, and why
    GET  /api/assessment/start       ?areas=a,b,c  IT skills test: a seed, the screen questions and the rules
    POST /api/assessment/next        seed + areas + screen answers -> the 2 strongest areas and their questions
    POST /api/assessment/more        seed + areas + added areas -> quick-check questions for the added areas
    POST /api/assessment/sql         question id + SQL -> the rows it returns (read-only SQLite)
    POST /api/assessment/result      seed + areas (+ added) + all answers -> graded answers and area readiness
    GET  /api/skills                 ?type=general|domain_knowledge|technology
    GET  /api/roles
    GET  /api/roles/<role_id>        role detail: skills, technologies, SDG, certifications
    GET  /api/profiles               fictional demo profiles
    POST /api/questionnaire/score    36 answers (1-5) -> RIASEC totals, code, IT-area scores, warnings
    POST /api/match                  test/preferences/CV -> IT area fit, then ranked roles with a learning path
    POST /api/explain                same body as /api/match + role_id (+ "short": true for the
                                     two-sentence "Why this job?") -> LLM explanation (or fallback)
    GET  /api/learn/<role_id>        learning path page for a role: free resources by stage, with links
    POST /api/learn                  same body as /api/match + role_id -> the same, built on the student's gaps
    GET  /api/explain/status         whether the LLM is configured, and which model
    POST /api/cv/summary             {"text"} or {"docx_base64"} -> CV summary, skills, qualifications,
                                     evidence per IT area (cv_areas, to send to /api/match)
    GET  /api/scenarios              future scenarios and the trend scores under each
    GET  /api/trends                 ?area=  trend scores, the signals behind them and the inputs
    POST /api/trends/update          start the "Update data" job (OpenDOSM and arXiv; {"arxiv": false} skips arXiv)
    GET  /api/trends/update          status of the last update job and when the next automatic one is due
    GET  /api/whatif                 the trend inputs a what-if may change, and ready-made examples
    POST /api/whatif                 same body as /api/match + trend_changes -> what changes: inputs,
                                     signals, trend scores and the student's role ranks, before and after
    GET  /api/puzzles/daily          today's daily challenge (LLM-written, or from the bank)
    POST /api/puzzles/daily/check    date + chosen option -> right or wrong, and why
    POST /api/puzzles/daily/hint     date -> the hint for that day's puzzle (the page charges coins)
    POST /api/puzzles/video          learning-path video URL -> 5 questions on its topic
    POST /api/puzzles/video/check    quiz id + 5 answers -> score, and passed when 4 or more are right
    GET  /api/sdg/summary            students, paths and study hours per SDG target, over every student
    POST /api/sdg/record             anonymous browser id + role + planned/done hours of its learning path

/api/match, /api/explain and /api/learn also take "trend_changes" (scripts/whatif.py): the
results are then built from a changed copy of the trend data, for that request only.
They also take "sdg_goals": the UN goals the student cares about (matching.SDG_BONUS).

Run locally: python src/main.py   (PORT sets the port, default 8080)
The same update job also runs by itself once the API data is AUTO_UPDATE_DAYS old (default 7;
0 turns it off), checked every hour while the server runs.
"""

import csv
import gzip
import hashlib
import json
import mimetypes
import os
import random
import re
import subprocess
import sys
import threading
import time
from datetime import date, datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
SCRIPTS = ROOT / "scripts"
STATIC = Path(__file__).resolve().parent / "static"
sys.path.insert(0, str(SCRIPTS))


def load_env_file(path: Path = ROOT / ".env") -> None:
    """Read KEY=value lines from a local .env file. Real environment values (Replit Secrets) win."""
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except OSError:
        return
    for line in lines:
        key, sep, value = line.strip().partition("=")
        if sep and key and not key.startswith("#") and value.strip():
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


import assessment  # noqa: E402  (scripts/ is added to the path above)
import cv_reader  # noqa: E402
import explain  # noqa: E402
import impact  # noqa: E402
import interest  # noqa: E402
import learning  # noqa: E402
import matching  # noqa: E402
import puzzles  # noqa: E402
import whatif  # noqa: E402

UPDATE_TIMEOUT_S = 600
AUTO_UPDATE_DAYS = float(os.getenv("AUTO_UPDATE_DAYS", "7"))
AUTO_CHECK_S = 3600
MAX_BODY = 4_000_000  # room for a base64 .docx CV

_update_lock = threading.Lock()
_update_state = {"status": "idle", "started": None, "finished": None, "arxiv": None,
                 "trigger": None, "returncode": None, "log": ""}


class BadRequest(Exception):
    pass


class Request:
    def __init__(self, method: str, target: str, body: bytes = b""):
        parts = urlsplit(target)
        self.method, self.path = method, parts.path
        self.args = {k: v[0] for k, v in parse_qs(parts.query).items()}
        self.body = body

    def get_json(self):
        try:
            return json.loads(self.body or b"null")
        except ValueError:
            return None


class Response:
    def __init__(self, status: int, body: bytes, content_type: str):
        self.status, self.body, self.content_type = status, body, content_type


def jsonify(payload=None, http_status: int = 200, **fields) -> Response:
    data = fields if payload is None else payload
    return Response(http_status, json.dumps(data, ensure_ascii=False).encode("utf-8"),
                    "application/json; charset=utf-8")


ROUTES = []  # (method, compiled pattern, display path, handler)


def route(method: str, path: str):
    """Register a handler; <name> in the path becomes a keyword argument."""
    pattern = re.compile("^" + re.sub(r"<(\w+)>", r"(?P<\1>[^/]+)", path) + "$")

    def register(fn):
        ROUTES.append((method, pattern, path, fn))
        return fn
    return register


def not_found(_=None) -> Response:
    return jsonify(error="not found", http_status=404)


def static_file(name: str) -> Response:
    path = (STATIC / name).resolve()
    if not path.is_file() or STATIC not in path.parents:
        return not_found()
    kind = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    if kind.startswith("text/") or kind in ("application/javascript", "image/svg+xml"):
        kind += "; charset=utf-8"
    return Response(200, path.read_bytes(), kind)


def dispatch(method: str, target: str, body: bytes = b"") -> Response:
    """Answer one request; used by the HTTP server and by the tests."""
    req = Request(method, target, body)
    if method == "GET" and req.path.startswith("/static/"):
        return static_file(req.path[len("/static/"):])
    for m, pattern, _, fn in ROUTES:
        found = pattern.match(req.path)
        if found and m == method:
            try:
                return fn(req, **found.groupdict())
            except BadRequest as e:
                return jsonify(error=str(e), http_status=400)
    if any(p.match(req.path) for _, p, _, _ in ROUTES):
        return jsonify(error="method not allowed", http_status=405)
    return not_found()


def read_csv(name: str) -> list[dict]:
    with (DATA / name).open(encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def body(request: Request) -> dict:
    data = request.get_json()
    if not isinstance(data, dict):
        raise BadRequest("send a JSON object")
    return data


def interest_result(answers) -> dict:
    try:
        return interest.score(answers)
    except interest.InterestError as e:
        raise BadRequest(str(e)) from e


def build_profile(data: dict, skills: dict) -> dict:
    """Turn a /api/match request into a matching profile, checking every id."""
    if "profile_id" in data:
        profiles = json.loads((DATA / "sample_profiles.json").read_text(encoding="utf-8"))
        found = next((p for p in profiles if p["profile_id"] == data["profile_id"]), None)
        if found is None:
            raise BadRequest(f"unknown profile_id '{data['profile_id']}'")
        return matching.with_interest(found)

    areas = {a["id"] for a in matching.load_areas()}
    per_area = {}
    for key in ("test_areas", "preferences", "cv_areas"):
        given = data.get(key)
        if given is None:
            continue
        if not isinstance(given, dict) or not set(given) <= areas or not all(
                isinstance(v, (int, float)) and not isinstance(v, bool) and 0 <= v <= 100
                for v in given.values()):
            raise BadRequest(f"'{key}' must map IT area ids {sorted(areas)} to numbers 0-100")
        per_area[key] = given
    if data.get("interest_answers") is not None:
        per_area["interest"] = interest_result(data["interest_answers"])
    if "test" in data:
        seed, responses, tested, added = assessment_input(data["test"])
        try:
            report = assessment.report(seed, responses, tested, added)
        except (assessment.AssessmentError, KeyError, ValueError) as e:
            raise BadRequest(f"'test': {e}") from e
        per_area["test_areas"] = matching.test_area_scores(report)
        per_area["test_in_depth"] = report["deep_domains"]

    levels = dict(assessment.skill_levels(report)) if "test" in data else {}  # ratings below may raise them
    # O*NET levels are 0-7; self-ratings 0-5 (the page sends 1-5). Out of range is refused,
    # not clamped, so a bad request never turns into a silent 0 or top score.
    for key, convert, hi in (("skills", float, 7), ("skill_ratings", matching.rating_to_level, 5)):
        given = data.get(key, {})
        if not isinstance(given, dict):
            raise BadRequest(f"'{key}' must be an object of skill_id -> number")
        for sid, value in given.items():
            if sid not in skills:
                raise BadRequest(f"unknown skill_id '{sid}'")
            if isinstance(value, bool) or not isinstance(value, (int, float)):
                raise BadRequest(f"'{key}.{sid}' must be a number")
            if not 0 <= value <= hi:
                raise BadRequest(f"'{key}.{sid}' must be 0-{hi}")
            levels[sid] = max(levels.get(sid, 0.0), convert(value))

    techs = data.get("technologies", [])
    if not isinstance(techs, list):
        raise BadRequest("'technologies' must be a list of skill_ids")
    for sid in techs:
        if skills.get(sid, {}).get("skill_type") != "technology":
            raise BadRequest(f"'{sid}' is not a technology skill_id")

    zone = data.get("education_job_zone", matching.DEFAULT_JOB_ZONE)
    if zone not in range(1, 6):
        raise BadRequest("'education_job_zone' must be 1-5")
    return {"profile_id": "request", "name": "You", "education_job_zone": zone,
            **per_area, "skills": levels, "technologies": techs}


@route("GET", "/")
def web_app(request):
    return static_file("index.html")


@route("GET", "/api")
def index(request):
    return jsonify(name="Future Skills API",
                   endpoints=sorted({path for _, _, path, _ in ROUTES if path.startswith("/api")}))


@route("GET", "/api/health")
def health(request):
    return jsonify(status="ok")


@route("GET", "/api/questionnaire")
def questionnaire(request):
    return jsonify(interest.load_items())


def tested_areas(areas) -> list:
    try:
        return assessment.tested_areas(areas)
    except assessment.AssessmentError as e:
        raise BadRequest(str(e)) from None


def assessment_input(data) -> tuple[int, dict, list, list]:
    """Seed, answers, tested areas and areas added later from an assessment request body,
    every id checked. No 'areas' means all 5 (the full test, and share links made before
    areas existed); no 'added' means none."""
    if not isinstance(data, dict):
        raise BadRequest("send a JSON object with 'seed', 'areas' and 'responses'")
    seed, responses = data.get("seed"), data.get("responses", {})
    if isinstance(seed, bool) or not isinstance(seed, int) or not 0 <= seed < 2 ** 31:
        raise BadRequest("'seed' must be the integer from /api/assessment/start")
    if not isinstance(responses, dict):
        raise BadRequest("'responses' must be an object of question id -> answer")
    unknown = set(responses) - set(assessment.questions_by_id())
    if unknown:
        raise BadRequest(f"unknown question id(s): {', '.join(sorted(unknown))}")
    tested = tested_areas(data.get("areas"))
    try:
        return seed, responses, tested, assessment.added_areas(tested, data.get("added"))
    except assessment.AssessmentError as e:
        raise BadRequest(str(e)) from None


@route("POST", "/api/assessment/plan")
def assessment_plan(request):
    """The areas the focused test checks: what the CV shows plus the top interests."""
    data, req = matching.load_data(), body(request)
    cv = req.get("cv_areas")
    areas = {a["id"] for a in data["areas"]}
    if cv is not None and (not isinstance(cv, dict) or not set(cv) <= areas or not all(
            isinstance(v, (int, float)) and not isinstance(v, bool) and 0 <= v <= 100 for v in cv.values())):
        raise BadRequest(f"'cv_areas' must map IT area ids {sorted(areas)} to numbers 0-100")
    techs = req.get("technologies", [])
    if not isinstance(techs, list) or any(data["skills"].get(t, {}).get("skill_type") != "technology" for t in techs):
        raise BadRequest("'technologies' must be a list of technology skill_ids")
    cv_scores, _ = cv_and_tools(cv, techs, data)
    prefs = None
    if req.get("interest_answers") is not None:
        scored = interest_result(req["interest_answers"])
        if scored["usable"]:
            prefs, _ = matching.interest_preferences(scored, matching.it_roles(data))
    plan = assessment.choose_areas(cv_scores, prefs)
    return jsonify(**plan, **assessment.test_size(plan["areas"]), cv_scores=cv_scores, interest_scores=prefs,
                   cv_min_score=assessment.CV_MIN_SCORE, min_areas=assessment.MIN_AREAS,
                   max_areas=assessment.MAX_AREAS)


@route("GET", "/api/assessment/start")
def assessment_start(request):
    bank = assessment.load_bank()
    given = request.args.get("areas")
    tested = tested_areas(given.split(",") if given is not None else None)
    seed = random.randrange(2 ** 31)
    return jsonify(seed=seed, areas=tested, **assessment.test_size(tested), name=bank["name"],
                   disclaimer=bank["disclaimer"], selection=bank["selection"], domains=bank["domains"],
                   questions=[assessment.public(q, seed) for q in assessment.screen_questions(seed, tested)])


@route("POST", "/api/assessment/next")
def assessment_next(request):
    seed, responses, tested, _ = assessment_input(body(request))
    domains = assessment.top_domains(seed, responses, tested)
    return jsonify(domains=domains,
                   questions=[assessment.public(q, seed) for q in assessment.deep_questions(seed, domains)])


@route("POST", "/api/assessment/more")
def assessment_more(request):
    """'Test your other areas': the quick-check questions of the areas in 'added' (all of
    them, so the page can add the ones it has not asked yet). Earlier questions never change."""
    seed, _, tested, added = assessment_input(body(request))
    if not added:
        raise BadRequest("'added' must name at least one IT area that was not tested")
    return jsonify(areas=tested, added=added,
                   questions=[assessment.public(q, seed) for q in assessment.added_questions(seed, added)])


@route("POST", "/api/assessment/sql")
def assessment_sql(request):
    data = body(request)
    q = assessment.questions_by_id().get(data.get("id"))
    if q is None or q["type"] != "sql":
        raise BadRequest("'id' must be a SQL question id")
    try:
        return jsonify(assessment.run_sql(q, data.get("sql")))
    except assessment.AssessmentError as e:
        raise BadRequest(str(e)) from None


@route("POST", "/api/assessment/result")
def assessment_result(request):
    return jsonify(assessment.report(*assessment_input(body(request))))


@route("GET", "/api/skills")
def skills(request):
    rows = read_csv("skills.csv")
    kind = request.args.get("type")
    if kind:
        rows = [r for r in rows if r["skill_type"] == kind]
    # How many roles list each In Demand technology, so the app can show the common ones first.
    counts = {}
    for r in read_csv("role_skills.csv"):
        if r["row_type"] == "in_demand_tech":
            counts[r["skill_id"]] = counts.get(r["skill_id"], 0) + 1
    return jsonify([{**r, "role_count": counts.get(r["skill_id"], 0)} for r in rows])


@route("GET", "/api/roles")
def roles(request):
    keep = ["role_id", "role_name_en", "subfield", "it_area", "riasec_code_onet", "job_zone",
            "is_mycol", "onet_soc", "masco_4digit_mycol"]
    return jsonify([{k: r[k] for k in keep} for r in matching.it_roles(matching.load_data())])


@route("GET", "/api/roles/<role_id>")
def role_detail(request, role_id: str):
    data = matching.load_data()
    role = next((r for r in data["roles"] if r["role_id"] == role_id), None)
    if role is None:
        return not_found(None)
    rated, techs = [], []
    for r in data["role_skills"].get(role_id, []):
        item = {"skill_id": r["skill_id"], "skill_name": data["skills"][r["skill_id"]]["skill_name"]}
        if r["row_type"] == "in_demand_tech":
            techs.append(item)
        else:
            rated.append({**item, "importance": float(r["importance"]),
                          "level": float(r["level"]) if r["level"] else None})
    rated.sort(key=lambda s: -s["importance"])
    trend, _, has_trend = matching.role_trend(role, data["trend_scores"])
    return jsonify(role=role, it_area=role["it_area"], trend_score=trend if has_trend else None,
                   skills=rated, technologies=techs, sdg=data["sdg"].get(("role", role_id), []),
                   certifications=[c for c in read_csv("certifications.csv")
                                   if c["role_id"] == role_id])


@route("GET", "/api/profiles")
def profiles(request):
    return jsonify(json.loads((DATA / "sample_profiles.json").read_text(encoding="utf-8")))


@route("POST", "/api/questionnaire/score")
def questionnaire_score(request):
    return jsonify(interest_result(body(request).get("answers")))


def cv_and_tools(cv_areas: dict | None, technologies: list[str], data: dict) -> tuple[dict, dict]:
    """The "CV and tools" part of area fit: per area, the higher of the CV evidence scores the
    page sent (cv_areas from /api/cv/summary) and the score of the tools the student uses (from
    the CV or the Skills page). Both describe the same experience, so the stronger one counts,
    never their sum, and a score the page sent is never lowered."""
    tools, tools_why = matching.cv_area_scores(technologies, data) if technologies else ({}, {})
    if not cv_areas:
        return tools, tools_why
    merged, why = dict(cv_areas), {a: "from your CV evidence" for a in cv_areas}
    for a, v in tools.items():
        if v > merged.get(a, -1):
            merged[a], why[a] = v, tools_why[a]
    return merged, why


def with_cv_areas(profile: dict, sent: dict | None, data: dict) -> dict:
    """The profile with its "CV and tools" area scores from its technologies (and the CV scores
    the page sent). Sample profiles keep their fictional cv_areas as written."""
    if profile["profile_id"] == "request":
        profile["cv_areas"], profile["cv_why"] = cv_and_tools(sent, profile["technologies"], data)
    elif not profile.get("cv_areas") and profile.get("technologies"):
        profile["cv_areas"], profile["cv_why"] = matching.cv_area_scores(profile["technologies"], data)
    return profile


def match_options(req: dict, data: dict) -> tuple[dict, str]:
    """Profile (with study hours) and scenario from a /api/match or /api/explain request."""
    profile = with_cv_areas(build_profile(req, data["skills"]), req.get("cv_areas"), data)
    scenario = req.get("scenario", "baseline")
    if scenario not in matching.SCENARIOS:
        raise BadRequest(f"'scenario' must be one of {list(matching.SCENARIOS)}")
    hours = req.get("hours_per_week", matching.DEFAULT_HOURS_PER_WEEK)
    if isinstance(hours, bool) or not isinstance(hours, (int, float)) or not 1 <= hours <= 40:
        raise BadRequest("'hours_per_week' must be a number from 1 to 40")
    goals = req.get("sdg_goals", [])
    if not isinstance(goals, list) or not all(str(g) in {str(i) for i in range(1, 18)} for g in goals):
        raise BadRequest("'sdg_goals' must be a list of UN goal numbers 1-17")
    return {**profile, "hours_per_week": hours, "sdg_goals": [str(g) for g in goals]}, scenario


def trend_data_version(changes: dict | None = None) -> dict:
    """Which trend data the scores used: a short hash of the trend files (and of the what-if
    changes, if any) and the date computed.

    The page keeps the last ranking with this version, so when the "Update data" job writes
    new trend data, or the student changes it in a what-if, it can show what changed
    (automatic re-planning).
    """
    h = hashlib.sha256()
    for name in ("trend_scores.csv", "trend_signals.csv"):
        path = DATA / name
        if path.exists():
            h.update(path.read_bytes())
    if changes:
        h.update(json.dumps(changes, sort_keys=True).encode("utf-8"))
    dates = [r["computed_date"] for r in read_csv("trend_scores.csv") if r.get("computed_date")]
    return {"id": h.hexdigest()[:12], "computed_date": max(dates, default=None), "what_if": bool(changes)}


def trend_changes(req: dict, required: bool = False) -> dict | None:
    """The request's checked what-if changes, or None when it changes nothing."""
    try:
        changes = whatif.validate(req.get("trend_changes"))
    except whatif.WhatIfError as e:
        raise BadRequest(str(e)) from None
    if required and not whatif.changed(changes):
        raise BadRequest("'trend_changes' must change at least one trend input")
    return changes if whatif.changed(changes) else None


def match_data(req: dict) -> tuple[dict, dict | None]:
    """matching.load_data(), built from a changed copy of the trend data when the request
    sends 'trend_changes'. Nothing is saved."""
    data, changes = matching.load_data(), trend_changes(req)
    if changes:
        _, scores, roles = whatif.run(changes)
        data = whatif.data_with(data, scores, roles)
    return data, changes


@route("POST", "/api/match")
def match(request):
    req = body(request)
    data, changes = match_data(req)
    top = req.get("top", 10)
    if not isinstance(top, int) or top < 1:
        raise BadRequest("'top' must be a positive integer")
    profile, scenario = match_options(req, data)

    result = matching.match_student(profile, data, scenario=scenario)
    ranked = result.pop("roles")
    # The role's rank in every scenario, so the page can show how much it depends on the
    # assumptions. Counted among the roles the page lists (not above the student's level).
    listed = lambda m: not {"needs_extra_education", "not_for_it_graduates"} & set(m["flags"])  # noqa: E731
    ranks = {}
    for name in matching.SCENARIOS:
        order = [m["role_id"] for m in matching.rank_roles(profile, data, scenario=name) if listed(m)]
        for i, rid in enumerate(order):
            ranks.setdefault(rid, {})[name] = i + 1
    baseline = matching.rank_roles(profile, data, scenario="baseline")
    baseline_rank = {m["role_id"]: i + 1 for i, m in enumerate(baseline)}
    baseline_total = {m["role_id"]: m["total"] for m in baseline}  # so the page can show what a scenario changed
    for i, m in enumerate(ranked):
        m["rank"], m["baseline_rank"] = i + 1, baseline_rank[m["role_id"]]
        m["baseline_total"] = baseline_total[m["role_id"]]
        m["scenario_ranks"] = ranks.get(m["role_id"])  # None for a role the page does not list
    return jsonify(**result, weights=matching.WEIGHTS, area_weights=matching.AREA_WEIGHTS,
                   skill_split=matching.SKILL_SPLIT,
                   scenario={"id": scenario, **matching.SCENARIOS[scenario],
                             "trend_scores": matching.scenario_trend_scores(data, scenario),
                             "baseline_trend_scores": matching.scenario_trend_scores(data, "baseline")},
                   trend_data=trend_data_version(changes), sdg_bonus=matching.SDG_BONUS,
                   sdg_goals=matching.sdg_goal_options(data), results=ranked[:top])


@route("POST", "/api/explain")
def explain_match(request):
    """LLM explanation of one role, from the same request body as /api/match plus role_id.

    The match is recomputed here, so the model only ever sees numbers our code produced.
    """
    req = body(request)
    data, _ = match_data(req)
    profile, scenario = match_options(req, data)
    role_id = req.get("role_id")
    found = next((m for m in matching.rank_roles(profile, data, scenario=scenario)
                  if m["role_id"] == role_id), None)
    if found is None:
        raise BadRequest("'role_id' is required" if not role_id else f"unknown role_id '{role_id}'")
    # What would raise it: the same match with the card's two "Learn next" technologies added
    learn = found["skill_detail"]["tech_missing"][:2]
    after = None
    if learn:
        more = {**profile, "technologies": profile.get("technologies", []) + [t["skill_id"] for t in learn]}
        more = with_cv_areas(more, req.get("cv_areas"), data)
        after = next(m for m in matching.rank_roles(more, data, scenario=scenario) if m["role_id"] == role_id)
    return jsonify(role_id=role_id, **explain.explain(found, short=bool(req.get("short"))),
                   to_raise=explain.raise_tips(found, after, [t["skill_name"] for t in learn]))


@route("GET", "/api/learn/<role_id>")
def learn_role(request, role_id: str):
    found = learning.page(role_id)
    return jsonify(found) if found else not_found(None)


@route("POST", "/api/learn")
def learn_for_student(request):
    """The learning path built on this student's own skill gaps for one role."""
    req = body(request)
    data, _ = match_data(req)
    profile, scenario = match_options(req, data)
    role_id = req.get("role_id")
    found = next((m for m in matching.rank_roles(profile, data, scenario=scenario)
                  if m["role_id"] == role_id), None)
    if found is None:
        raise BadRequest("'role_id' is required" if not role_id else f"unknown role_id '{role_id}'")
    return jsonify(learning.page(role_id, data, found, profile["hours_per_week"]))


@route("GET", "/api/explain/status")
def explain_status(request):
    return jsonify(configured=explain.configured(), model=explain.model_name(),
                   provider=explain.provider())


@route("POST", "/api/cv/summary")
def cv_summary(request):
    """Summarise an uploaded CV. The CV is used for this request only, never stored."""
    data = matching.load_data()
    try:
        return jsonify(cv_reader.summarise(body(request), data["skills"], data))
    except cv_reader.CVError as e:
        raise BadRequest(str(e)) from None


@route("GET", "/api/scenarios")
def scenarios(request):
    data = matching.load_data()
    return jsonify([{"id": k, **v, "trend_scores": matching.scenario_trend_scores(data, k)}
                    for k, v in matching.SCENARIOS.items()])


@route("GET", "/api/trends")
def trends(request):
    """Trend scores per IT area and role, the signals behind them, and the raw inputs."""
    area = request.args.get("area")
    scores = read_csv("trend_scores.csv")
    signals = read_csv("trend_signals.csv")
    subdomains = read_csv("subdomains.csv")
    if area:
        codes = {c for c, a in matching.SUBFIELD_AREA.items() if a == area}
        ids = {d["subdomain_id"] for d in subdomains if d["subfield_code"] in codes}
        roles = {r["role_id"] for r in read_csv("roles.csv") if r["subfield_code"] in codes}
        scores = [s for s in scores if s["it_area"] == area]
        signals = [s for s in signals if (s["layer"] == "subdomain" and s["entity_id"] in ids)
                   or (s["layer"] == "role" and s["entity_id"] in roles)]
    return jsonify(computed_date=max((s["computed_date"] for s in scores), default=None),
                   scores=scores, signals=signals, subdomains=subdomains, inputs=read_csv("trends.csv"))


def run_update(arxiv: bool) -> None:
    cmd = [sys.executable, str(SCRIPTS / "update_trends.py")] + ([] if arxiv else ["--no-arxiv"])
    try:
        done = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True,
                              timeout=UPDATE_TIMEOUT_S)
        code, log = done.returncode, done.stdout + done.stderr
        if code == 0:  # the signals changed, so the 0-100 scores matching uses must too
            done = subprocess.run([sys.executable, str(SCRIPTS / "trend_score.py")], cwd=ROOT,
                                  capture_output=True, text=True, timeout=60)
            code, log = done.returncode, log + done.stdout + done.stderr
    except subprocess.TimeoutExpired as e:
        code, log = -1, f"timed out after {UPDATE_TIMEOUT_S} s\n{e.stdout or ''}"
    _update_state.update(status="done" if code == 0 else "failed", returncode=code,
                         log=log[-4000:], finished=datetime.now(timezone.utc).isoformat())
    _update_lock.release()


def start_update(arxiv: bool, trigger: str) -> bool:
    """Start the update job in the background; False if one is already running."""
    if not _update_lock.acquire(blocking=False):
        return False
    _update_state.update(status="running", arxiv=arxiv, trigger=trigger, returncode=None, log="",
                         finished=None, started=datetime.now(timezone.utc).isoformat())
    threading.Thread(target=run_update, args=(arxiv,), daemon=True).start()
    return True


def last_api_fetch() -> date | None:
    """Newest fetched_date of the trend inputs the update job fetches (fetch_method api)."""
    days = [r["fetched_date"] for r in read_csv("trends.csv") if r.get("fetch_method") == "api"]
    return date.fromisoformat(max(days)) if days else None


def next_auto_update() -> date | None:
    last = last_api_fetch()
    if AUTO_UPDATE_DAYS <= 0 or last is None:
        return None
    return last + timedelta(days=AUTO_UPDATE_DAYS)


def auto_update_loop() -> None:
    """Keep the OpenDOSM and arXiv inputs fresh without anyone pressing "Update data"."""
    while True:
        due = next_auto_update()
        if due and date.today() >= due and start_update(True, "schedule"):
            print(f"Automatic trend update started (data from {last_api_fetch()})", flush=True)
        time.sleep(AUTO_CHECK_S)


@route("POST", "/api/trends/update")
def trends_update(request):
    sent = request.get_json()
    arxiv = bool(sent.get("arxiv", True)) if isinstance(sent, dict) else True
    if not start_update(arxiv, "button"):
        return jsonify({"error": "an update is already running", **_update_state}, http_status=409)
    return jsonify(dict(_update_state), http_status=202)


@route("GET", "/api/trends/update")
def trends_update_status(request):
    due = next_auto_update()
    return jsonify({**_update_state, "auto_update_days": AUTO_UPDATE_DAYS,
                    "last_fetched": str(last_api_fetch() or "") or None,
                    "next_auto_update": due.isoformat() if due else None})


@route("GET", "/api/whatif")
def what_if_inputs(request):
    items = whatif.editable()
    return jsonify(inputs=items, examples=whatif.examples(items), trend_weight=matching.WEIGHTS["trend"])


@route("POST", "/api/whatif")
def what_if(request):
    """Change the trend data and see what changes: the same pipeline as the real data
    (signals -> trend scores -> matching) runs on a changed copy, for this request only."""
    req = body(request)
    data, changes = matching.load_data(), trend_changes(req, required=True)
    profile, scenario = match_options(req, data)
    signals, scores, roles = whatif.run(changes)
    after = whatif.data_with(data, scores, roles)

    def ranked(d):
        result = matching.match_student(profile, d, scenario=scenario)
        return result["groups"], [{"role_id": m["role_id"], "role_name": m["role_name"], "it_area": m["it_area"],
                                   "total": m["total"], "trend": m["components"]["trend"]["score"],
                                   "flags": m["flags"]} for m in result["roles"]]
    groups, before_roles = ranked(data)
    _, after_roles = ranked(after)
    return jsonify(changes=whatif.describe(changes), signals=whatif.signal_changes(signals, roles),
                   trend_scores=whatif.score_changes(data, after, scenario),
                   scenario={"id": scenario, **matching.SCENARIOS[scenario]}, trend_weight=matching.WEIGHTS["trend"],
                   groups=groups, before=before_roles, after=after_roles)


def puzzle_call(fn, *args):
    try:
        return jsonify(fn(*args))
    except puzzles.PuzzleError as e:
        raise BadRequest(str(e)) from None


@route("GET", "/api/puzzles/daily")
def puzzle_daily(request):
    return jsonify(puzzles.daily())


@route("POST", "/api/puzzles/daily/check")
def puzzle_daily_check(request):
    data = body(request)
    return puzzle_call(puzzles.check_daily, data.get("date"), data.get("choice"))


@route("POST", "/api/puzzles/daily/hint")
def puzzle_daily_hint(request):
    return puzzle_call(puzzles.daily_hint, body(request).get("date"))


@route("POST", "/api/puzzles/video")
def puzzle_video(request):
    return puzzle_call(puzzles.video_quiz, body(request).get("url"))


@route("POST", "/api/puzzles/video/check")
def puzzle_video_check(request):
    data = body(request)
    return puzzle_call(puzzles.check_video_quiz, data.get("quiz_id"), data.get("answers"))


@route("GET", "/api/sdg/summary")
def sdg_summary(request):
    return jsonify(impact.summary())


@route("POST", "/api/sdg/record")
def sdg_record(request):
    data = body(request)
    try:
        return jsonify(impact.record(data.get("learner"), data.get("role_id"), data.get("hours_planned"),
                                     data.get("hours_done"), data.get("items_done", 0)))
    except impact.ImpactError as e:
        raise BadRequest(str(e)) from None


def low_data(res: Response, method: str, headers) -> tuple[int, bytes, dict]:
    """Status, body and headers that cost students on mobile data as little as possible.

    GET answers carry an ETag of their content: a browser that already has the same bytes
    gets 304 and no body. Text bodies over 1 KB are gzip-compressed for browsers that accept
    it (about 70-85% smaller). Cache-Control stays no-cache, so every page load still checks
    for new data (the "Update data" job), but an unchanged file costs one tiny request."""
    out = {"Content-Type": res.content_type, "Cache-Control": "no-cache", "Vary": "Accept-Encoding"}
    status, data = res.status, res.body
    if method == "GET" and status == 200:
        etag = '"' + hashlib.sha256(data).hexdigest()[:16] + '"'
        out["ETag"] = etag
        if etag in (headers.get("If-None-Match") or ""):
            return 304, b"", out
    textual = res.content_type.startswith(("text/", "application/json", "application/javascript", "image/svg"))
    if textual and len(data) > 1024 and "gzip" in (headers.get("Accept-Encoding") or ""):
        data = gzip.compress(data, compresslevel=6)
        out["Content-Encoding"] = "gzip"
    return status, data, out


class Handler(BaseHTTPRequestHandler):
    server_version = "FutureSkills/1.0"

    def _send(self, method: str) -> None:
        size = int(self.headers.get("Content-Length") or 0)
        if size > MAX_BODY:
            res = jsonify(error="request too large", http_status=413)
        else:
            try:
                res = dispatch(method, self.path, self.rfile.read(size) if size else b"")
            except Exception as e:  # keep serving; report the error as JSON
                self.log_error("error on %s %s: %r", method, self.path, e)
                res = jsonify(error="internal server error", http_status=500)
        status, data, headers = low_data(res, method, self.headers)
        self.send_response(status)
        for name, value in headers.items():
            self.send_header(name, value)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        self._send("GET")

    def do_POST(self):
        self._send("POST")


def main() -> None:
    load_env_file()  # here, not on import, so the tests never pick up a real API key
    port = int(os.getenv("PORT", "8080"))
    server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print(f"Future Skills running on http://0.0.0.0:{port}", flush=True)
    print(f"Explain feature: LLM {'configured' if explain.configured() else 'NOT configured'}"
          f" (env names seen: {explain.env_names_seen() or 'none'})", flush=True)
    if AUTO_UPDATE_DAYS > 0:
        threading.Thread(target=auto_update_loop, daemon=True).start()
    server.serve_forever()


if __name__ == "__main__":
    main()
