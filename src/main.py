"""Future Skills web API (Flask). Replit runs this file.

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
    POST /api/match                  student profile -> ranked, explained roles
    GET  /api/trends                 ?domain=  trend scores and the signals behind them
    POST /api/trends/update          start the "Update data" job (OpenDOSM, optional arXiv)
    GET  /api/trends/update          status of the last update job

Run locally: pip install -r requirements.txt && python src/main.py
"""

import csv
import json
import os
import subprocess
import sys
import threading
from datetime import datetime, timezone
from pathlib import Path

from flask import Flask, jsonify, request

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
SCRIPTS = ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS))

import matching  # noqa: E402  (scripts/ is added to the path above)

RIASEC = matching.RIASEC
LIKERT = range(0, 5)  # Mini-IP answers: 0 = strongly dislike ... 4 = strongly like
UPDATE_TIMEOUT_S = 600

app = Flask(__name__)
app.json.sort_keys = False

_update_lock = threading.Lock()
_update_state = {"status": "idle", "started": None, "finished": None, "arxiv": None,
                 "returncode": None, "log": ""}


class BadRequest(Exception):
    pass


@app.errorhandler(BadRequest)
def bad_request(e):
    return jsonify(error=str(e)), 400


@app.errorhandler(404)
def not_found(_):
    return jsonify(error="not found"), 404


def read_csv(name: str) -> list[dict]:
    with (DATA / name).open(encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def body() -> dict:
    data = request.get_json(silent=True)
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


@app.get("/")
def web_app():
    return app.send_static_file("index.html")


@app.get("/api")
def index():
    return jsonify(name="Future Skills API",
                   endpoints=sorted({str(r) for r in app.url_map.iter_rules()
                                     if str(r).startswith("/api")}))


@app.get("/api/health")
def health():
    return jsonify(status="ok")


@app.get("/api/questionnaire")
def questionnaire():
    return jsonify(json.loads((DATA / "riasec_items.json").read_text(encoding="utf-8")))


@app.get("/api/skills")
def skills():
    rows = read_csv("skills.csv")
    kind = request.args.get("type")
    if kind:
        rows = [r for r in rows if r["skill_type"] == kind]
    return jsonify(rows)


@app.get("/api/roles")
def roles():
    keep = ["role_id", "group", "role_name_en", "riasec_code_onet", "job_zone", "is_mycol",
            "it_reachable_draft", "onet_soc", "masco_4digit_mycol"]
    return jsonify([{**{k: r[k] for k in keep}, "domain": matching.ROLE_DOMAIN.get(r["role_id"])}
                    for r in read_csv("roles.csv")])


@app.get("/api/roles/<role_id>")
def role_detail(role_id: str):
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


@app.get("/api/profiles")
def profiles():
    return jsonify(json.loads((DATA / "sample_profiles.json").read_text(encoding="utf-8")))


@app.post("/api/questionnaire/score")
def questionnaire_score():
    totals = score_answers(body().get("answers"))
    return jsonify(riasec=totals, code=riasec_code(totals))


@app.post("/api/match")
def match():
    data = matching.load_data()
    req = body()
    profile = build_profile(req, data["skills"])
    top = req.get("top", 10)
    if not isinstance(top, int) or top < 1:
        raise BadRequest("'top' must be a positive integer")
    ranked = matching.rank_roles(profile, data)
    return jsonify(riasec=profile["riasec"], riasec_code=riasec_code(profile["riasec"]),
                   weights=matching.WEIGHTS, skill_split=matching.SKILL_SPLIT,
                   results=ranked[:top])


@app.get("/api/trends")
def trends():
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


@app.post("/api/trends/update")
def trends_update():
    arxiv = bool((request.get_json(silent=True) or {}).get("arxiv", False))
    if not _update_lock.acquire(blocking=False):
        return jsonify(error="an update is already running", **_update_state), 409
    _update_state.update(status="running", arxiv=arxiv, returncode=None, log="", finished=None,
                         started=datetime.now(timezone.utc).isoformat())
    threading.Thread(target=run_update, args=(arxiv,), daemon=True).start()
    return jsonify(_update_state), 202


@app.get("/api/trends/update")
def trends_update_status():
    return jsonify(_update_state)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "8080")),
            debug=os.getenv("FLASK_DEBUG") == "1")
