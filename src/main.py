"""Future Skills web server and JSON API. Replit runs this file.

Uses only the Python standard library (no pip install), so it runs on any Python 3.10+.

Endpoints (all JSON):
    GET  /                           the web app (src/static/)
    GET  /api                        list of endpoints
    GET  /api/health
    GET  /api/questionnaire          the 30 Mini-IP items, answer scale and attribution
    GET  /api/skills                 ?type=general|domain_knowledge|technology
    GET  /api/roles
    GET  /api/roles/<role_id>        role detail: skills, technologies, SDG, certifications
    GET  /api/profiles               fictional demo profiles
    POST /api/questionnaire/score    RIASEC answers (0-4) -> six totals (0-20) and a 3-letter code
    POST /api/match                  student profile -> ranked, explained roles with a learning path
    GET  /api/scenarios              future scenarios and the trend scores under each
    GET  /api/trends                 ?domain=  trend scores and the signals behind them
    POST /api/trends/update          start the "Update data" job (OpenDOSM, optional arXiv)
    GET  /api/trends/update          status of the last update job

Run locally: python src/main.py   (PORT sets the port, default 8080)
"""

import csv
import json
import mimetypes
import os
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

import matching  # noqa: E402  (scripts/ is added to the path above)

RIASEC = matching.RIASEC
LIKERT = range(0, 5)  # Mini-IP answers: 0 = strongly dislike ... 4 = strongly like
UPDATE_TIMEOUT_S = 600
MAX_BODY = 1_000_000

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


def score_answers(answers) -> dict:
    """Sum questionnaire answers per RIASEC type."""
    if not isinstance(answers, list) or not answers:
        raise BadRequest("'answers' must be a non-empty list of {type, value}")
    totals = dict.fromkeys(RIASEC, 0)
    for i, a in enumerate(answers):
        t, v = (a.get("type"), a.get("value")) if isinstance(a, dict) else (None, None)
        if t not in totals or isinstance(v, bool) or v not in LIKERT:
            raise BadRequest(f"answers[{i}]: type must be one of {RIASEC} and value 0-4")
        totals[t] += v
    return totals


def riasec_code(totals: dict) -> str:
    return "".join(sorted(RIASEC, key=lambda k: -totals[k])[:3])


def build_profile(data: dict, skills: dict) -> dict:
    """Turn a /api/match request into a matching profile, checking every id."""
    if "profile_id" in data:
        profiles = json.loads((DATA / "sample_profiles.json").read_text(encoding="utf-8"))
        found = next((p for p in profiles if p["profile_id"] == data["profile_id"]), None)
        if found is None:
            raise BadRequest(f"unknown profile_id '{data['profile_id']}'")
        return found

    if "answers" in data:
        riasec = score_answers(data["answers"])
    elif isinstance(data.get("riasec"), dict):
        riasec = data["riasec"]
        if not all(isinstance(riasec.get(k), (int, float)) for k in RIASEC):
            raise BadRequest(f"'riasec' needs a number for each of {RIASEC}")
    else:
        raise BadRequest("send 'answers', 'riasec' or 'profile_id'")

    levels = {}
    for key, convert in (("skills", float), ("skill_ratings", matching.rating_to_level)):
        given = data.get(key, {})
        if not isinstance(given, dict):
            raise BadRequest(f"'{key}' must be an object of skill_id -> number")
        for sid, value in given.items():
            if sid not in skills:
                raise BadRequest(f"unknown skill_id '{sid}'")
            if not isinstance(value, (int, float)):
                raise BadRequest(f"'{key}.{sid}' must be a number")
            levels[sid] = convert(value)
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
            "riasec": riasec, "skills": levels, "technologies": techs}


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
    return jsonify(json.loads((DATA / "riasec_items.json").read_text(encoding="utf-8")))


@route("GET", "/api/skills")
def skills(request):
    rows = read_csv("skills.csv")
    kind = request.args.get("type")
    if kind:
        rows = [r for r in rows if r["skill_type"] == kind]
    return jsonify(rows)


@route("GET", "/api/roles")
def roles(request):
    keep = ["role_id", "group", "role_name_en", "riasec_code_onet", "job_zone", "is_mycol",
            "it_reachable_draft", "onet_soc", "masco_4digit_mycol"]
    return jsonify([{**{k: r[k] for k in keep}, "domain": matching.ROLE_DOMAIN.get(r["role_id"])}
                    for r in read_csv("roles.csv")])


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
    domain = matching.ROLE_DOMAIN.get(role_id)
    return jsonify(role=role, domain=domain, trend_score=data["trend_scores"].get(domain),
                   skills=rated, technologies=techs, sdg=data["sdg"].get(("role", role_id), []),
                   certifications=[c for c in read_csv("certifications.csv")
                                   if c["role_id"] == role_id])


@route("GET", "/api/profiles")
def profiles(request):
    return jsonify(json.loads((DATA / "sample_profiles.json").read_text(encoding="utf-8")))


@route("POST", "/api/questionnaire/score")
def questionnaire_score(request):
    totals = score_answers(body(request).get("answers"))
    return jsonify(riasec=totals, code=riasec_code(totals))


@route("POST", "/api/match")
def match(request):
    data = matching.load_data()
    req = body(request)
    profile = build_profile(req, data["skills"])
    top = req.get("top", 10)
    if not isinstance(top, int) or top < 1:
        raise BadRequest("'top' must be a positive integer")
    scenario = req.get("scenario", "baseline")
    if scenario not in matching.SCENARIOS:
        raise BadRequest(f"'scenario' must be one of {list(matching.SCENARIOS)}")
    hours = req.get("hours_per_week", matching.DEFAULT_HOURS_PER_WEEK)
    if isinstance(hours, bool) or not isinstance(hours, (int, float)) or not 1 <= hours <= 40:
        raise BadRequest("'hours_per_week' must be a number from 1 to 40")
    profile = {**profile, "hours_per_week": hours}

    ranked = matching.rank_roles(profile, data, scenario=scenario)
    baseline_rank = {m["role_id"]: i + 1 for i, m in
                     enumerate(matching.rank_roles(profile, data, scenario="baseline"))}
    for i, m in enumerate(ranked):
        m["rank"], m["baseline_rank"] = i + 1, baseline_rank[m["role_id"]]
    return jsonify(riasec=profile["riasec"], riasec_code=riasec_code(profile["riasec"]),
                   weights=matching.WEIGHTS, skill_split=matching.SKILL_SPLIT,
                   scenario={"id": scenario, **matching.SCENARIOS[scenario],
                             "trend_scores": matching.scenario_trend_scores(data, scenario)},
                   results=ranked[:top])


@route("GET", "/api/scenarios")
def scenarios(request):
    data = matching.load_data()
    return jsonify([{"id": k, **v, "trend_scores": matching.scenario_trend_scores(data, k)}
                    for k, v in matching.SCENARIOS.items()])


@route("GET", "/api/trends")
def trends(request):
    domain = request.args.get("domain")
    scores = read_csv("trend_scores.csv")
    signals = read_csv("trends.csv")
    if domain:
        scores = [s for s in scores if s["domain"] == domain]
        signals = [s for s in signals if s["entity_type"] == "domain" and s["entity_id"] == domain]
    return jsonify(computed_date=max((s["computed_date"] for s in scores), default=None),
                   scores=scores, signals=signals)


def run_update(arxiv: bool) -> None:
    cmd = [sys.executable, str(SCRIPTS / "update_trends.py")] + ([] if arxiv else ["--no-arxiv"])
    try:
        done = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True,
                              timeout=UPDATE_TIMEOUT_S)
        code, log = done.returncode, done.stdout + done.stderr
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
    server.serve_forever()


if __name__ == "__main__":
    main()
