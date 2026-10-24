"""Future Skills web server and JSON API. Replit runs this file.

Uses only the Python standard library (no pip install), so it runs on any Python 3.10+.

Endpoints (all JSON):
    GET  /                           the web app (src/static/)
    GET  /api                        list of endpoints
    GET  /api/health
    GET  /api/questionnaire          the 36 interest items (RIASEC type + IT area), scale and attribution
    GET  /api/assessment/start       IT skills test: a seed, the 6 screen questions and the rules
    POST /api/assessment/next        seed + screen answers -> the 2 strongest domains and 8 questions
    POST /api/assessment/sql         question id + SQL -> the rows it returns (read-only SQLite)
    POST /api/assessment/result      seed + all answers -> graded answers and domain readiness
    GET  /api/skills                 ?type=general|domain_knowledge|technology
    GET  /api/roles
    GET  /api/roles/<role_id>        role detail: skills, technologies, SDG, certifications
    GET  /api/profiles               fictional demo profiles
    POST /api/questionnaire/score    36 answers (1-5) -> RIASEC totals, code, IT-area scores, warnings
    POST /api/match                  test/preferences/CV -> IT area fit, then ranked roles with a learning path
    POST /api/explain                same body as /api/match + role_id -> LLM explanation (or fallback)
    GET  /api/learn/<role_id>        learning path page for a role: free resources by stage, with links
    POST /api/learn                  same body as /api/match + role_id -> the same, built on the student's gaps
    GET  /api/explain/status         whether the LLM is configured, and which model
    POST /api/cv/summary             {"text"} or {"docx_base64"} -> CV summary, skills, qualifications
    GET  /api/scenarios              future scenarios and the trend scores under each
    GET  /api/trends                 ?area=  trend scores, the signals behind them and the inputs
    POST /api/trends/update          start the "Update data" job (OpenDOSM, optional arXiv)
    GET  /api/trends/update          status of the last update job

Run locally: python src/main.py   (PORT sets the port, default 8080)
"""

import csv
import json
import mimetypes
import os
import random
import re
import subprocess
import sys
import threading
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
SCRIPTS = ROOT / "scripts"
STATIC = Path(__file__).resolve().parent / "static"
sys.path.insert(0, str(SCRIPTS))

import assessment  # noqa: E402  (scripts/ is added to the path above)
import cv_reader  # noqa: E402
import explain  # noqa: E402
import interest  # noqa: E402
import learning  # noqa: E402
import matching  # noqa: E402

UPDATE_TIMEOUT_S = 600
MAX_BODY = 4_000_000  # room for a base64 .docx CV

_update_lock = threading.Lock()
_update_state = {"status": "idle", "started": None, "finished": None, "arxiv": None,
                 "returncode": None, "log": ""}


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
        seed, responses = assessment_input(data["test"])
        try:
            report = assessment.report(seed, responses)
        except (assessment.AssessmentError, KeyError, ValueError) as e:
            raise BadRequest(f"'test': {e}") from e
        per_area["test_areas"] = matching.test_area_scores(report)
        per_area["test_in_depth"] = report["deep_domains"]

    levels = dict(assessment.skill_levels(report)) if "test" in data else {}  # ratings below may raise them
    for key, convert in (("skills", float), ("skill_ratings", matching.rating_to_level)):
        given = data.get(key, {})
        if not isinstance(given, dict):
            raise BadRequest(f"'{key}' must be an object of skill_id -> number")
        for sid, value in given.items():
            if sid not in skills:
                raise BadRequest(f"unknown skill_id '{sid}'")
            if not isinstance(value, (int, float)):
                raise BadRequest(f"'{key}.{sid}' must be a number")
            levels[sid] = max(levels.get(sid, 0.0), convert(value))
    if any(not 0 <= v <= 7 for v in levels.values()):
        raise BadRequest("skill levels must be 0-7 ('skill_ratings' must be 0-5)")

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


def assessment_input(data) -> tuple[int, dict]:
    """Seed and answers from an assessment request body, with every question id checked."""
    if not isinstance(data, dict):
        raise BadRequest("send a JSON object with 'seed' and 'responses'")
    seed, responses = data.get("seed"), data.get("responses", {})
    if isinstance(seed, bool) or not isinstance(seed, int) or not 0 <= seed < 2 ** 31:
        raise BadRequest("'seed' must be the integer from /api/assessment/start")
    if not isinstance(responses, dict):
        raise BadRequest("'responses' must be an object of question id -> answer")
    unknown = set(responses) - set(assessment.questions_by_id())
    if unknown:
        raise BadRequest(f"unknown question id(s): {', '.join(sorted(unknown))}")
    return seed, responses


@route("GET", "/api/assessment/start")
def assessment_start(request):
    bank = assessment.load_bank()
    seed = random.randrange(2 ** 31)
    return jsonify(seed=seed, name=bank["name"], disclaimer=bank["disclaimer"],
                   selection=bank["selection"], domains=bank["domains"],
                   questions=[assessment.public(q, seed) for q in assessment.screen_questions(seed)])


@route("POST", "/api/assessment/next")
def assessment_next(request):
    seed, responses = assessment_input(body(request))
    domains = assessment.top_domains(seed, responses)
    return jsonify(domains=domains,
                   questions=[assessment.public(q, seed) for q in assessment.deep_questions(seed, domains)])


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
    return jsonify(rows)


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


def match_options(req: dict, data: dict) -> tuple[dict, str]:
    """Profile (with study hours) and scenario from a /api/match or /api/explain request."""
    profile = build_profile(req, data["skills"])
    scenario = req.get("scenario", "baseline")
    if scenario not in matching.SCENARIOS:
        raise BadRequest(f"'scenario' must be one of {list(matching.SCENARIOS)}")
    hours = req.get("hours_per_week", matching.DEFAULT_HOURS_PER_WEEK)
    if isinstance(hours, bool) or not isinstance(hours, (int, float)) or not 1 <= hours <= 40:
        raise BadRequest("'hours_per_week' must be a number from 1 to 40")
    return {**profile, "hours_per_week": hours}, scenario


@route("POST", "/api/match")
def match(request):
    data = matching.load_data()
    req = body(request)
    top = req.get("top", 10)
    if not isinstance(top, int) or top < 1:
        raise BadRequest("'top' must be a positive integer")
    profile, scenario = match_options(req, data)

    result = matching.match_student(profile, data, scenario=scenario)
    ranked = result.pop("roles")
    baseline_rank = {m["role_id"]: i + 1 for i, m in
                     enumerate(matching.rank_roles(profile, data, scenario="baseline"))}
    for i, m in enumerate(ranked):
        m["rank"], m["baseline_rank"] = i + 1, baseline_rank[m["role_id"]]
    return jsonify(**result, weights=matching.WEIGHTS, area_weights=matching.AREA_WEIGHTS,
                   skill_split=matching.SKILL_SPLIT,
                   scenario={"id": scenario, **matching.SCENARIOS[scenario],
                             "trend_scores": matching.scenario_trend_scores(data, scenario)},
                   results=ranked[:top])


@route("POST", "/api/explain")
def explain_match(request):
    """LLM explanation of one role, from the same request body as /api/match plus role_id.

    The match is recomputed here, so the model only ever sees numbers our code produced.
    """
    data = matching.load_data()
    req = body(request)
    profile, scenario = match_options(req, data)
    role_id = req.get("role_id")
    found = next((m for m in matching.rank_roles(profile, data, scenario=scenario)
                  if m["role_id"] == role_id), None)
    if found is None:
        raise BadRequest(f"unknown role_id '{role_id}'")
    return jsonify(role_id=role_id, **explain.explain(found))


@route("GET", "/api/learn/<role_id>")
def learn_role(request, role_id: str):
    found = learning.page(role_id)
    return jsonify(found) if found else not_found(None)


@route("POST", "/api/learn")
def learn_for_student(request):
    """The learning path built on this student's own skill gaps for one role."""
    data = matching.load_data()
    req = body(request)
    profile, scenario = match_options(req, data)
    role_id = req.get("role_id")
    found = next((m for m in matching.rank_roles(profile, data, scenario=scenario)
                  if m["role_id"] == role_id), None)
    if found is None:
        raise BadRequest(f"unknown role_id '{role_id}'")
    return jsonify(learning.page(role_id, data, found, profile["hours_per_week"]))


@route("GET", "/api/explain/status")
def explain_status(request):
    return jsonify(configured=explain.configured(), model=explain.model_name(),
                   provider="Fireworks AI", env_names_seen=explain.env_names_seen(),
                   # yes/no only: do other deployment secrets reach the app?
                   other_secrets_seen={n: bool(os.getenv(n)) for n in
                                       ("SESSION_SECRET", "REPLIT_CONNECTORS_HOSTNAME")})


@route("POST", "/api/cv/summary")
def cv_summary(request):
    """Summarise an uploaded CV. The CV is used for this request only, never stored."""
    try:
        return jsonify(cv_reader.summarise(body(request), matching.load_data()["skills"]))
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


@route("POST", "/api/trends/update")
def trends_update(request):
    sent = request.get_json()
    arxiv = bool(sent.get("arxiv", False)) if isinstance(sent, dict) else False
    if not _update_lock.acquire(blocking=False):
        return jsonify({"error": "an update is already running", **_update_state}, http_status=409)
    _update_state.update(status="running", arxiv=arxiv, returncode=None, log="", finished=None,
                         started=datetime.now(timezone.utc).isoformat())
    threading.Thread(target=run_update, args=(arxiv,), daemon=True).start()
    return jsonify(dict(_update_state), http_status=202)


@route("GET", "/api/trends/update")
def trends_update_status(request):
    return jsonify(dict(_update_state))


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
        self.send_response(res.status)
        self.send_header("Content-Type", res.content_type)
        self.send_header("Content-Length", str(len(res.body)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(res.body)

    def do_GET(self):
        self._send("GET")

    def do_POST(self):
        self._send("POST")


def main() -> None:
    port = int(os.getenv("PORT", "8080"))
    server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print(f"Future Skills running on http://0.0.0.0:{port}", flush=True)
    print(f"Explain feature: LLM {'configured' if explain.configured() else 'NOT configured'}"
          f" (env names seen: {explain.env_names_seen() or 'none'})", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
