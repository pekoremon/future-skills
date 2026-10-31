"""The daily challenge and the video check quizzes on My learning.

Daily challenge: one code puzzle per day (Malaysia time), the same for every student: it
always has a snippet, log or command output to read. The area and level rotate by date, and
the puzzle carries a hint (what to check or try first) that the page pays coins to see. The LLM configured for explain.py writes a fresh puzzle; without
an API key, or when its reply fails the format check, the day's puzzle comes from the bank
in data/puzzles.json. Puzzles are kept in memory and in .cache/daily_puzzles.json, so a
restart keeps the answer.

Video check: before a YouTube video on a learning path counts as done, the student answers
5 multiple-choice questions on its topic and needs 4 right. The LLM writes them from the
video's title and the skills it teaches; the fallback is bank puzzles from the video's area.

Every puzzle stores its right option and 3 wrong ones. The options are shuffled the same way
for every request (seeded by the puzzle id), and the page only learns the answer after it
sends a choice. Coins for right answers are counted by the page (play.js).
"""

import hashlib
import json
import random
import threading
import urllib.error
import urllib.request
from collections import Counter
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import explain
import matching

ROOT = Path(__file__).resolve().parent.parent
BANK = ROOT / "data" / "puzzles.json"
DAILY_CACHE = ROOT / ".cache" / "daily_puzzles.json"
MYT = timezone(timedelta(hours=8))

AREAS = ["software_dev", "data_ai", "cybersecurity", "cloud_infra", "web_ux"]
LEVELS = ["easy", "medium", "hard"]
VIDEO_QUESTIONS = 5
VIDEO_PASS = 4
QUIZ_KEEP = 500  # video quizzes waiting for answers, kept in memory
LLM_TIMEOUT_S = 40
LLM_MAX_TOKENS = 3000

_lock = threading.Lock()
_daily = {}    # "YYYY-MM-DD" -> stored puzzle (with its answer)
_quizzes = {}  # quiz id -> {"url", "questions" (with answers)}
_bank = None


class PuzzleError(Exception):
    pass


def load_bank() -> dict:
    global _bank
    if _bank is None:
        _bank = json.loads(BANK.read_text(encoding="utf-8"))
    return _bank


def area_names() -> dict:
    return {a["id"]: a["name"] for a in matching.load_areas()}


def shuffled(p: dict, seed: str) -> tuple[list[str], int]:
    """The 4 options in a fixed order for this seed, and where the right one is."""
    options = [p["correct"], *p["wrong"]]
    random.Random(seed).shuffle(options)
    return options, options.index(p["correct"])


def public(p: dict, seed: str | None = None) -> dict:
    """What the page may see of a puzzle: everything but the answer and explanation."""
    options, _ = shuffled(p, seed or p["id"])
    return {"id": p["id"], "area": p["area"], "level": p["level"], "kind": p.get("kind", "Puzzle"),
            "prompt": p["prompt"], "code": p.get("code") or None, "options": options}


def graded(p: dict, choice, seed: str | None = None) -> dict:
    options, answer = shuffled(p, seed or p["id"])
    if isinstance(choice, bool) or not isinstance(choice, int) or not 0 <= choice < len(options):
        raise PuzzleError(f"'choice' must be an option number 0-{len(options) - 1}")
    return {"id": p["id"], "correct": choice == answer, "answer": answer, "answer_text": options[answer],
            "explain": p["explain"]}


# ---------- LLM ----------

PUZZLE_RULES = """Each puzzle is a JSON object with these keys:
  "kind": 2-4 words naming the puzzle type, e.g. "Predict the output", "Spot the bug", "Read the log"
  "prompt": the question, at most 60 words
  "code": a short code snippet, log or command output (at most 12 lines) that the question is about, or "" if none
  "correct": the one right answer, at most 25 words
  "wrong": exactly 3 plausible but clearly wrong answers, each at most 25 words
  "explain": 1-2 sentences saying why the right answer is right
Rules: exactly one answer is right; check it twice before you reply, and run any code in your head step by step. The wrong answers must differ from the right one and from each other, and be about as long as the right one, so length gives nothing away. Plain text only, no markdown. Do not mention real companies, people or universities by name. Reply with JSON only."""

DAILY_RULES = """Extra rules for the daily challenge:
  "code" must NOT be empty: the question is about a real snippet (code, SQL, a config file, a log or command output) that the student has to read.
  "hint": one sentence, at most 25 words, telling the student what to check or try first, without giving the answer away."""

LEVEL_HINT = {"easy": "a first-year IT student can answer it in under a minute",
              "medium": "it needs a final-year IT student to think for a minute or two",
              "hard": "it tricks someone who only half understands the topic; a junior professional should get it"}


def _llm_json(system: str, user: str) -> object:
    body = explain.chat_body([{"role": "system", "content": system}, {"role": "user", "content": user}],
                             LLM_MAX_TOKENS, 0.7)
    req = urllib.request.Request(explain.api_url(), data=json.dumps(body).encode("utf-8"), headers={
        "Authorization": f"Bearer {explain.api_key()}", "Content-Type": "application/json",
        "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=LLM_TIMEOUT_S) as r:
        data = json.loads(r.read())
    choice = data["choices"][0]
    if choice.get("finish_reason") == "length":
        raise ValueError("reply cut off at max tokens")
    text = (choice["message"].get("content") or "").strip()
    start, end = min((i for i in (text.find("{"), text.find("[")) if i >= 0), default=-1), max(text.rfind("}"), text.rfind("]"))
    if start < 0 or end < start:
        raise ValueError("no JSON in the reply")
    return json.loads(text[start:end + 1])


def valid_puzzle(p, daily: bool = False) -> dict:
    """A puzzle from the LLM with every field checked, or ValueError. A daily one also needs code and a hint."""
    if not isinstance(p, dict):
        raise ValueError("puzzle is not an object")
    out = {}
    for key, limit in (("kind", 40), ("prompt", 600), ("code", 900), ("correct", 220), ("explain", 600)):
        value = p.get(key, "" if key == "code" else None)
        if not isinstance(value, str) or (key != "code" and not value.strip()) or len(value) > limit:
            raise ValueError(f"bad '{key}'")
        out[key] = value.strip()
    wrong = p.get("wrong")
    if not isinstance(wrong, list) or len(wrong) != 3 or not all(isinstance(w, str) and w.strip() and len(w) <= 220 for w in wrong):
        raise ValueError("'wrong' must be 3 short strings")
    out["wrong"] = [w.strip() for w in wrong]
    if daily:
        hint = p.get("hint")
        if not out["code"]:
            raise ValueError("the daily puzzle needs code")
        if not isinstance(hint, str) or not hint.strip() or len(hint) > 220:
            raise ValueError("bad 'hint'")
        out["hint"] = hint.strip()
    if len({o.lower() for o in [out["correct"], *out["wrong"]]}) != 4:
        raise ValueError("options repeat")
    return out


def llm_status() -> dict:
    return {"configured": explain.configured(), "model": explain.model_name() if explain.configured() else None}


def _llm_reason(e: Exception) -> str:
    if isinstance(e, urllib.error.HTTPError):
        return f"LLM API error {e.code}"
    if isinstance(e, (urllib.error.URLError, TimeoutError, OSError)):
        return f"LLM API unreachable: {e.__class__.__name__}"
    return f"unexpected LLM reply: {e}"


# ---------- daily challenge ----------

def today() -> date:
    return datetime.now(MYT).date()


def daily_plan(day: date) -> tuple[str, str]:
    """The day's area and level: the area changes every day, the level every 5 days."""
    n = day.toordinal()
    return AREAS[n % len(AREAS)], LEVELS[(n // len(AREAS)) % len(LEVELS)]


def bank_daily(day: date, area: str, level: str) -> dict:
    """A bank puzzle with code: the day's area and level, or the nearest level that has one."""
    coded = [p for p in load_bank()["puzzles"] if p.get("code") and p["area"] == area]
    by_distance = sorted(LEVELS, key=lambda lv: abs(LEVELS.index(lv) - LEVELS.index(level)))
    pool = next(pl for lv in by_distance if (pl := [p for p in coded if p["level"] == lv]))
    pick = pool[int(hashlib.sha256(day.isoformat().encode()).hexdigest(), 16) % len(pool)]
    return {**pick, "source": "bank", "model": None}


def _read_cache() -> dict:
    try:
        return json.loads(DAILY_CACHE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def _write_cache(key: str, stored: dict) -> None:
    try:
        cache = _read_cache()
        cache[key] = stored
        DAILY_CACHE.parent.mkdir(parents=True, exist_ok=True)
        DAILY_CACHE.write_text(json.dumps(dict(sorted(cache.items())[-60:]), ensure_ascii=False, indent=1), encoding="utf-8")
    except OSError:
        pass  # read-only disk: the puzzle stays in memory


def daily_stored(day: date) -> dict:
    """The day's puzzle with its answer, written once and then reused."""
    key = day.isoformat()
    with _lock:
        if key in _daily:
            return _daily[key]
        cached = _read_cache().get(key)
        if cached and cached.get("code") and cached.get("hint"):  # days saved before hints are written again
            _daily[key] = cached
            return cached
        area, level = daily_plan(day)
        stored, reason = None, None
        if explain.configured():
            try:
                user = (f"Write one IT code puzzle for today's daily challenge for final-year IT students in Malaysia.\n"
                        f"IT area: {area_names().get(area, area)}. Level: {level} ({LEVEL_HINT[level]}).\n"
                        f"Make it different from a textbook definition question, and do not mention the date. Variety seed: {key}.\n\n" + PUZZLE_RULES + "\n" + DAILY_RULES)
                p = valid_puzzle(_llm_json("You write short, correct IT code puzzles for students.", user), daily=True)
                stored = {"id": f"daily-{key}", "area": area, "level": level, **p,
                          "source": "llm", "model": explain.model_name()}
            except Exception as e:  # noqa: BLE001  any failure falls back to the bank
                reason = _llm_reason(e)
        else:
            reason = "no LLM_API_KEY set"
        if stored is None:
            stored = {**bank_daily(day, area, level), "id": f"daily-{key}", "reason": reason}
        stored["date"] = key
        _daily[key] = stored
        if stored["source"] == "llm":
            _write_cache(key, stored)
        return stored


def daily(day: date | None = None) -> dict:
    day = day or today()
    s = daily_stored(day)
    return {"date": s["date"], "area": s["area"], "area_name": area_names().get(s["area"], s["area"]),
            "level": s["level"], "level_label": load_bank()["levels"][s["level"]]["label"],
            "source": s["source"], "model": s.get("model"),
            "puzzle": public(s, s["id"])}


def parse_day(value) -> date:
    try:
        day = date.fromisoformat(value)
    except (TypeError, ValueError):
        raise PuzzleError("'date' must be YYYY-MM-DD") from None
    if day > today():
        raise PuzzleError("that day's challenge is not out yet")
    return day


def daily_hint(value) -> dict:
    day = parse_day(value)
    s = daily_stored(day)
    return {"date": s["date"], "hint": s["hint"]}


def check_daily(value, choice) -> dict:
    day = parse_day(value)
    s = daily_stored(day)
    return {**graded(s, choice, s["id"]), "date": s["date"], "level": s["level"]}


# ---------- video check quiz ----------

def resource_by_url(url: str) -> dict | None:
    import csv
    with (ROOT / "data" / "learning_resources.csv").open(encoding="utf-8-sig", newline="") as f:
        return next((r for r in csv.DictReader(f) if r["url"] == url), None)


def resource_topic(r: dict) -> tuple[list[str], str]:
    """The skill names a resource teaches and the IT area it belongs to most."""
    data = matching.load_data()
    targets = [t.split(":", 1) for t in r["targets"].split(";") if ":" in t]
    skills = [sid for kind, sid in targets if kind == "skill"]
    areas = [a for kind, a in targets if kind == "area" and a in AREAS]
    if not areas and skills:
        votes = Counter(role["it_area"] for role in matching.it_roles(data)
                        for row in data["role_skills"].get(role["role_id"], []) if row["skill_id"] in skills)
        areas = [a for a, _ in votes.most_common() if a in AREAS]
    names = [data["skills"][s]["skill_name"] for s in skills if s in data["skills"]]
    return names, areas[0] if areas else AREAS[0]


def video_quiz(url) -> dict:
    """5 questions on a learning-path video; the answers stay on the server."""
    if not isinstance(url, str) or not url:
        raise PuzzleError("'url' is required")
    r = resource_by_url(url)
    if r is None:
        raise PuzzleError("that URL is not a resource on any learning path")
    skills, area = resource_topic(r)
    quiz_id = hashlib.sha256(f"{url}|{random.random()}".encode()).hexdigest()[:16]
    questions, source, reason = None, "bank", None
    if explain.configured():
        try:
            user = (f"A student says they finished this free learning video or course:\n"
                    f"Title: {r['title']}\nChannel: {r['provider']}\nLevel: {r['level'] or 'any'}\n"
                    f"Skills it teaches: {', '.join(skills) or area_names().get(area, area)}\n\n"
                    f"Write {VIDEO_QUESTIONS} multiple-choice questions that check they understood the main ideas a resource "
                    f"with this title would teach. Start easy and end with one that applies the idea to a small example. "
                    f"Reply with a JSON array of {VIDEO_QUESTIONS} puzzles.\n\n" + PUZZLE_RULES)
            got = _llm_json("You write short, correct quiz questions for IT students.", user)
            if not isinstance(got, list) or len(got) < VIDEO_QUESTIONS:
                raise ValueError(f"expected {VIDEO_QUESTIONS} questions")
            questions = [{**valid_puzzle(q), "id": f"{quiz_id}-{i + 1}", "area": area, "level": "medium"}
                         for i, q in enumerate(got[:VIDEO_QUESTIONS])]
            source = "llm"
        except Exception as e:  # noqa: BLE001  any failure falls back to the bank
            reason = _llm_reason(e)
    else:
        reason = "no LLM_API_KEY set"
    if questions is None:
        level = {"beginner": ["easy", "medium"], "advanced": ["medium", "hard"]}.get(r["level"], ["easy", "medium", "hard"])
        pool = [p for p in load_bank()["puzzles"] if p["area"] == area and p["level"] in level]
        questions = random.Random(quiz_id).sample(pool, min(VIDEO_QUESTIONS, len(pool)))
    with _lock:
        if len(_quizzes) >= QUIZ_KEEP:
            _quizzes.pop(next(iter(_quizzes)))
        _quizzes[quiz_id] = {"url": url, "questions": questions}
    return {"quiz_id": quiz_id, "title": r["title"], "area": area, "area_name": area_names().get(area, area),
            "skills": skills, "source": source, "model": explain.model_name() if source == "llm" else None,
            "reason": reason, "pass_mark": VIDEO_PASS,
            "questions": [public(q, f"{quiz_id}|{q['id']}") for q in questions]}


def check_video_quiz(quiz_id, answers) -> dict:
    quiz = _quizzes.get(quiz_id) if isinstance(quiz_id, str) else None
    if quiz is None:
        raise PuzzleError("this quiz has expired; start it again")
    qs = quiz["questions"]
    if not isinstance(answers, list) or len(answers) != len(qs):
        raise PuzzleError(f"'answers' must be a list of {len(qs)} option numbers")
    results = [graded(q, a, f"{quiz_id}|{q['id']}") for q, a in zip(qs, answers)]
    score = sum(r["correct"] for r in results)
    needed = min(VIDEO_PASS, len(qs))
    return {"quiz_id": quiz_id, "url": quiz["url"], "score": score, "total": len(qs), "pass_mark": needed,
            "passed": score >= needed, "results": results}
