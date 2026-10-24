"""IT domain readiness assessment: pick questions, grade answers, build the report.

The question bank is data/it_assessment.json. A student is tested in 3 to 6 of the 6 IT
areas (choose_areas: what their CV shows and their top interests). They answer the same
number of quick-check (screen) items in each tested area, which ranks those areas against
each other, then deep and practical items in the 2 tested areas they scored best on. An area
that was not tested gets no test score at all, never a filled-in one.

Every call takes the tested area list next to the seed, because the seed alone no longer
decides which questions were asked. No list means all 6 areas (the full test, and share
links made before areas were chosen).

Code questions run in the student's browser (Pyodide), so the server only receives how
many tests passed. SQL questions run here, in a throwaway in-memory SQLite database that
may only read.
"""

import json
import random
import sqlite3
from pathlib import Path

BANK_PATH = Path(__file__).resolve().parent.parent / "data" / "it_assessment.json"

# Fields that give the answer away; the student only sees them in the report.
HIDDEN = ("answer", "accept", "tolerance", "explanation", "expected_rows", "ordered", "refs")
AREA_SPLIT = {"screen": 0.4, "deep": 0.6}  # area score of an area tested in depth (team choice)
# O*NET level (0-7) a fully right answer shows in the skills an item is tagged with. Team
# choice, read off O*NET's level anchors: a quick check is basic use, a hands-on task
# applied work. A part-right answer shows that level x the share of points earned.
STAGE_LEVEL = {"screen": 3.0, "deep": 4.0, "practical": 5.0}
SQL_MAX_STEPS = 2_000_000  # SQLite VM steps before a query is stopped
SQL_MAX_ROWS = 50
# Longest string or blob a query may build. Without it one step such as randomblob(1e9)
# makes the server allocate up to 1 GB; no test answer needs more than a few KB.
SQL_MAX_LENGTH = 1_000_000
SQLITE_RECURSIVE = 33  # authorizer code for WITH RECURSIVE; not exported by the sqlite3 module
SQL_ALLOWED = {sqlite3.SQLITE_SELECT, sqlite3.SQLITE_READ, sqlite3.SQLITE_FUNCTION, SQLITE_RECURSIVE}

# Which areas the focused test checks (team choices; SOURCES.md, "Choices and limits").
MIN_AREAS, MAX_AREAS = 3, 6
CV_MIN_SCORE = 50  # CV evidence (0-100) from which "your CV shows this area"
CV_MAX_AREAS = 3   # at most this many areas picked because of the CV, highest first
INTEREST_AREAS = 3  # the top interest areas are always tested

_bank = None


class AssessmentError(ValueError):
    pass


def load_bank() -> dict:
    global _bank
    if _bank is None:
        _bank = json.loads(BANK_PATH.read_text(encoding="utf-8"))
    return _bank


def questions_by_id() -> dict:
    return {q["id"]: q for q in load_bank()["questions"]}


def option_order(seed: int, q: dict) -> list:
    """Shown position -> original option index. Single-choice options are shuffled per
    student so the right answer is not always in the same place; multi-select options
    stay in order because they name numbered lines."""
    n = len(q.get("options", []))
    if q["type"] != "mcq":
        return list(range(n))
    return random.Random(f"{seed}:{q['id']}").sample(range(n), n)


def public(q: dict, seed: int) -> dict:
    """The question as the student sees it before answering."""
    shown = {k: v for k, v in q.items() if k not in HIDDEN}
    if "options" in q:
        shown["options"] = [q["options"][i] for i in option_order(seed, q)]
    return shown


def _pick(stage: str, domain: str, n: int, rng: random.Random) -> list:
    pool = [q for q in load_bank()["questions"] if q["domain"] == domain and q["stage"] == stage]
    return rng.sample(pool, n)


def tested_areas(areas=None) -> list:
    """The tested area ids in bank order, so the same set always gives the same questions.

    None means all areas. Otherwise a list of 3-6 distinct area ids, or AssessmentError.
    """
    ids = [d["id"] for d in load_bank()["domains"]]
    if areas is None:
        return ids
    if not isinstance(areas, list) or not all(isinstance(a, str) for a in areas):
        raise AssessmentError(f"'areas' must be a list of IT area ids {ids}")
    unknown = sorted(set(areas) - set(ids))
    if unknown:
        raise AssessmentError(f"unknown IT area id(s): {', '.join(unknown)}")
    if len(set(areas)) != len(areas):
        raise AssessmentError("'areas' lists an area twice")
    if not MIN_AREAS <= len(areas) <= MAX_AREAS:
        raise AssessmentError(f"'areas' must name {MIN_AREAS} to {MAX_AREAS} IT areas")
    return [a for a in ids if a in areas]


def choose_areas(cv: dict | None, interest: dict | None) -> dict:
    """Which areas to test: CV areas scoring at least CV_MIN_SCORE (at most CV_MAX_AREAS,
    highest first) plus the INTEREST_AREAS top interest areas. Fewer than MIN_AREAS: add the
    next-highest interest areas, then the next-highest CV areas, then bank order. With no CV
    and no interests nothing points anywhere, so all areas are tested.

    cv and interest map area id -> 0-100 (CV evidence; preference from the questionnaire).
    Ties go to the area listed first in the bank.
    """
    ids = [d["id"] for d in load_bank()["domains"]]
    cv, interest = cv or {}, interest or {}

    def ranked(scores):
        return sorted((a for a in ids if a in scores), key=lambda a: (-scores[a], ids.index(a)))

    if not cv and not interest:
        return {"areas": ids, "from_cv": [], "from_interest": [], "filled": []}
    from_cv = [a for a in ranked(cv) if cv[a] >= CV_MIN_SCORE][:CV_MAX_AREAS]
    from_interest = ranked(interest)[:INTEREST_AREAS]
    chosen = from_cv + [a for a in from_interest if a not in from_cv]
    filled = []
    for a in ranked(interest)[INTEREST_AREAS:] + ranked(cv) + ids:
        if len(chosen) + len(filled) >= MIN_AREAS:
            break
        if a not in chosen and a not in filled:
            filled.append(a)
    return {"areas": tested_areas(chosen + filled), "from_cv": from_cv,
            "from_interest": from_interest, "filled": filled}


def test_size(areas: list) -> dict:
    """How many questions the test asks for these areas, and about how many minutes, from the
    mean time_s of each stage's items in those areas (the deep areas are not known yet)."""
    bank, sel = load_bank(), load_bank()["selection"]

    def mean_time(stage):
        times = [q["time_s"] for q in bank["questions"] if q["stage"] == stage and q["domain"] in areas]
        return sum(times) / len(times)

    screen = sel["screen_per_domain"] * len(areas)
    deep = sel["deep_domains"] * (sel["deep_per_domain"] + sel["practical_per_domain"])
    seconds = (screen * mean_time("screen") + sel["deep_domains"] * (
        sel["deep_per_domain"] * mean_time("deep") + sel["practical_per_domain"] * mean_time("practical")))
    return {"question_count": screen + deep, "minutes": round(seconds / 60)}


def screen_questions(seed: int, areas: list | None = None) -> list:
    """Stage 1: the same number of screen items per tested area, in a seed-dependent order."""
    rng = random.Random(seed)
    sel, tested = load_bank()["selection"], tested_areas(areas)
    picked = [q for d in tested for q in _pick("screen", d, sel["screen_per_domain"], rng)]
    rng.shuffle(picked)
    return picked


def top_domains(seed: int, responses: dict, areas: list | None = None) -> list:
    """The tested areas with the most screen points; ties are broken by the seed."""
    by_id = questions_by_id()
    points = {d: 0.0 for d in tested_areas(areas)}
    for qid, response in responses.items():
        q = by_id[qid]
        if q["stage"] == "screen" and q["domain"] in points:
            points[q["domain"]] += grade(q, response, seed)["points"]
    order = list(points)
    random.Random(seed).shuffle(order)
    order.sort(key=lambda d: -points[d])  # stable, so the shuffle decides ties
    return order[:load_bank()["selection"]["deep_domains"]]


def deep_questions(seed: int, domains: list) -> list:
    """Stage 2: deep items, then one practical item, for each chosen domain."""
    rng = random.Random(seed + 1)
    sel = load_bank()["selection"]
    picked = []
    for d in domains:
        picked += _pick("deep", d, sel["deep_per_domain"], rng)
        picked += _pick("practical", d, sel["practical_per_domain"], rng)
    return picked


def run_sql(q: dict, sql: str) -> dict:
    """Run a student's SELECT against the question's data. Returns columns and rows."""
    if not isinstance(sql, str) or not sql.strip():
        raise AssessmentError("write a SQL query first")
    db = sqlite3.connect(":memory:")
    try:
        db.executescript(q["setup_sql"])
        db.setlimit(sqlite3.SQLITE_LIMIT_LENGTH, SQL_MAX_LENGTH)
        db.set_authorizer(lambda action, *_: sqlite3.SQLITE_OK if action in SQL_ALLOWED else sqlite3.SQLITE_DENY)
        db.set_progress_handler(lambda: 1, SQL_MAX_STEPS)  # non-zero aborts the query
        cur = db.execute(sql.strip().rstrip(";"))
        if cur.description is None:
            raise AssessmentError("the query must return rows (use SELECT)")
        rows = [[round(v, 2) if isinstance(v, float) else v for v in row] for row in cur.fetchmany(SQL_MAX_ROWS + 1)]
        return {"columns": [d[0] for d in cur.description], "rows": rows[:SQL_MAX_ROWS],
                "truncated": len(rows) > SQL_MAX_ROWS}
    except sqlite3.Error as e:
        message = ("the query took too long" if "interrupted" in str(e)
                   else "the query builds a value that is too large" if "too big" in str(e) else str(e))
        raise AssessmentError(f"SQL error: {message}") from None
    finally:
        db.close()


def _norm_text(v) -> str:
    return "".join(str(v).split()).lower()


def grade(q: dict, response, seed: int) -> dict:
    """Points for one answer, given as the shown option position. A missing or malformed
    answer scores 0."""
    full = load_bank()["scoring"]["points"][q["stage"]]
    t, ratio = q["type"], 0.0
    if t == "mcq":
        order = option_order(seed, q)
        ok = isinstance(response, int) and not isinstance(response, bool) and 0 <= response < len(order)
        ratio = float(ok and order[response] == q["answer"])
    elif t == "multi" and isinstance(response, list):
        chosen = {r for r in response if isinstance(r, int) and not isinstance(r, bool)}
        right = set(q["answer"])
        ratio = max(0, len(chosen & right) - len(chosen - right)) / len(right)
    elif t == "numeric" and isinstance(response, (int, float)) and not isinstance(response, bool):
        ratio = float(abs(response - q["answer"]) <= q["tolerance"])
    elif t == "text" and isinstance(response, str):
        ratio = float(_norm_text(response) in {_norm_text(a) for a in q["accept"]})
    elif t == "code" and isinstance(response, dict):
        passed, total = response.get("passed"), len(q["tests"])
        if isinstance(passed, int) and response.get("total") == total and 0 <= passed <= total:
            ratio = passed / total
    elif t == "sql" and isinstance(response, str):
        try:
            got = run_sql(q, response)
            rows = got["rows"] if q.get("ordered") else sorted(got["rows"], key=repr)
            want = q["expected_rows"] if q.get("ordered") else sorted(q["expected_rows"], key=repr)
            ratio = float([c.lower() for c in got["columns"]] == q["expected_columns"] and rows == want)
        except AssessmentError:
            ratio = 0.0
    return {"points": round(full * ratio, 2), "max": full, "correct": ratio == 1}


def correct_answer(q: dict):
    """The answer in a form the report can show."""
    if q["type"] == "mcq":
        return q["options"][q["answer"]]
    if q["type"] == "multi":
        return [q["options"][i] for i in q["answer"]]
    if q["type"] == "sql":
        return {"columns": q["expected_columns"], "rows": q["expected_rows"]}
    if q["type"] == "code":
        return None  # the tests are the answer
    return q["answer"]


def level_for(score: float) -> dict:
    return next(lv for lv in load_bank()["scoring"]["levels"] if score >= lv["min"])


def skill_levels(report: dict) -> dict:
    """O*NET level (0-7) per skill_id shown by the test: the best item tagged with it.

    Wrong answers lower nothing, because one missed item is weak evidence against a skill.
    """
    by_id, levels = questions_by_id(), {}
    for item in report["items"]:
        if not item["points"]:
            continue
        shown = round(STAGE_LEVEL[item["stage"]] * item["points"] / item["max"], 2)
        for sid in by_id[item["id"]]["onet_skill_ids"]:
            levels[sid] = max(levels.get(sid, 0.0), shown)
    return levels


def report(seed: int, responses: dict, areas: list | None = None) -> dict:
    """Grade every answer and score each tested area. Untested areas are listed with
    tested False and no scores."""
    bank, by_id, tested = load_bank(), questions_by_id(), tested_areas(areas)
    deep = top_domains(seed, {k: v for k, v in responses.items() if by_id[k]["stage"] == "screen"}, tested)
    asked = screen_questions(seed, tested) + deep_questions(seed, deep)

    items, earned, possible = [], {}, {}
    for q in asked:
        g = grade(q, responses.get(q["id"]), seed)
        key = (q["domain"], "screen" if q["stage"] == "screen" else "deep")
        earned[key] = earned.get(key, 0) + g["points"]
        possible[key] = possible.get(key, 0) + g["max"]
        items.append({"id": q["id"], "domain": q["domain"], "stage": q["stage"], "type": q["type"],
                      "skill": q["skill"], "prompt": q["prompt"], "answered": q["id"] in responses,
                      **g, "correct_answer": correct_answer(q), "explanation": q["explanation"],
                      "refs": q["refs"]})

    domains = []
    for d in bank["domains"]:
        row = {"id": d["id"], "name": d["name"], "name_zh": d["name_zh"], "tested": d["id"] in tested,
               "tested_in_depth": d["id"] in deep,
               "roles": [{"onet_soc": s, "title": t} for s, t in zip(d["onet_soc"], d["onet_titles"])]}
        domains.append(row)
        if not row["tested"]:
            continue
        screen_points, screen_max = earned.get((d["id"], "screen"), 0), possible[(d["id"], "screen")]
        row.update(screen_points=screen_points, screen_max=screen_max,
                   profile=round(100 * screen_points / screen_max))
        if d["id"] in deep:
            score = round(100 * earned[(d["id"], "deep")] / possible[(d["id"], "deep")])
            row.update(readiness=score, level=level_for(score))

    # One score per tested area to compare them, used here and by matching. An area seen
    # only in the quick check may not overtake the areas tested in depth: it scored no higher
    # there, and 3 easy items say less than 3 harder ones.
    for d in domains:
        if d["tested_in_depth"]:
            d["area_score"] = round(AREA_SPLIT["screen"] * d["profile"] + AREA_SPLIT["deep"] * d["readiness"], 1)
    floor = min(d["area_score"] for d in domains if d["tested_in_depth"])
    for d in domains:
        if d["tested"] and not d["tested_in_depth"]:
            d["area_score"] = float(min(d["profile"], floor))
    best = max((d for d in domains if d["tested_in_depth"]),
               key=lambda d: (d["area_score"], d["readiness"], d["profile"]))
    gaps = [{"skill": i["skill"], "domain": i["domain"], "id": i["id"]} for i in items if not i["correct"]]
    return {"seed": seed, "areas": tested, "deep_domains": deep, "recommended": best["id"], "domains": domains,
            "skills_to_improve": gaps, "items": items,
            "total_points": round(sum(i["points"] for i in items), 2),
            "total_max": sum(i["max"] for i in items), "disclaimer": bank["disclaimer"]}
