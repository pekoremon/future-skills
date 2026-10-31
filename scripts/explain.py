"""Plain-language "Explain this for me" text for one role match, written by an LLM.

GenAI explains, our data decides: the model only sees the facts computed by
matching.py for that student and role, and a reply that contains any number not
found in those facts is rejected. Without an API key, or when the call or the check
fails, a template written from the same facts is returned instead.

LLM: any OpenAI-compatible chat completions API, called with the standard library only.
By default an open model served by Fireworks AI. Configuration (environment / Replit Secrets):
    LLM_API_KEY         the API key (FIREWORKS_API_KEY is read when this is not set)
    LLM_BASE_URL        optional, e.g. https://litellm.rapidscreen.io/v1 for the KrackedDevs
                        keys; default DEFAULT_BASE_URL below (Fireworks AI)
    LLM_MODEL           the model id on that API (FIREWORKS_MODEL is read when this is not set);
                        default DEFAULT_MODEL below, which only Fireworks serves
"""

import hashlib
import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request

DEFAULT_BASE_URL = "https://api.fireworks.ai/inference/v1"
DEFAULT_MODEL = "accounts/fireworks/models/gpt-oss-120b"
TIMEOUT_S = 25
MAX_TOKENS = 1500  # reasoning models spend part of this before the answer
MAX_REPLY_CHARS = 1400
CACHE_SIZE = 256

SYSTEM_PROMPT = """You explain career matches to final-year IT students in Malaysia.
You get the facts for one student and one role as JSON inside <facts> tags. The facts were computed by a scoring program from public data (O*NET, DOSM, MyCOL, UN SDG targets).

Write 4 to 5 sentences in plain English, speaking to the student as "you":
1. Why the role fits or does not fit them, using the IT area fit, interest and skill parts.
2. What the AI-era trend score means for them, using trend_direction.
3. The first concrete step: the first course in the learning path, if there is one, or else the biggest skill gap.
4. What the role's SDG target means in everyday terms.

Rules:
- area_fit, interest_fit, skill_fit and trend_points are the points each part adds to match_score, exactly as the student's job card shows them; max_points gives the most each part can add. Say them as points, e.g. "22.2 of 44.4 points", never as a score out of 100. null means the part is not scored.
- Use only the facts given. Do not add salaries, job counts, percentages, course names, companies or any other fact that is not in the JSON.
- Every number you write must appear exactly as it does in the facts. If you are unsure of a number, leave it out.
- Describe the trend only with the words in trend_direction. "positive" means above the neutral 50: recent data points up, or the role is on Malaysia's critical-occupations list. "neutral" means near 50 (37.5 to 62.5): flat or no clear signal; never call it rising, growing or strong. "negative" means below 50. "no data" means it was not measured.
- Do not predict the future. Never say that demand, jobs or opportunities will grow, keep growing, are likely to or are expected to. The trend score describes recent data and is an estimate; say so.
- Be honest: if a part of the score is low, say so kindly.
- No headings, lists or markdown. Plain sentences only."""

# "Why this job?" on each job card: the same facts and rules, but only why the role suits the
# student, in two sentences. No skill gaps or courses: the learning path page has those.
SHORT_PROMPT = SYSTEM_PROMPT.split("Write 4 to 5")[0] + """Write 2 short sentences (under 50 words in all) in plain English, speaking to the student as "you": why this role suits them, using the IT area fit, interest fit, skill fit and AI-era trend. Mention the strongest part first. Do not mention skill gaps, courses or learning steps.

Rules:""" + SYSTEM_PROMPT.split("Rules:")[1]
SHORT_REPLY_CHARS = 450

_cache = {}


def configured() -> bool:
    return bool(api_key())


def _env(name: str) -> str:
    """Environment value by name, tolerating stray spaces or case in the secret's name."""
    if os.getenv(name):
        return os.environ[name].strip()
    for key, value in os.environ.items():
        if key.strip().upper() == name and value.strip():
            return value.strip()
    return ""


def api_key() -> str:
    return _env("LLM_API_KEY") or _env("FIREWORKS_API_KEY")


def base_url() -> str:
    return (_env("LLM_BASE_URL") or DEFAULT_BASE_URL).rstrip("/")


def api_url() -> str:
    return base_url() + "/chat/completions"


def provider() -> str:
    """A name for the API host, for the status page."""
    host = urllib.parse.urlsplit(base_url()).hostname or base_url()
    return "Fireworks AI" if host.endswith("fireworks.ai") else host


def env_names_seen() -> list[str]:
    """Names (never values) of LLM environment variables, for diagnosis."""
    return sorted(repr(k) for k in os.environ if "FIREWORKS" in k.upper() or k.strip().upper().startswith("LLM_"))


def model_name() -> str:
    return _env("LLM_MODEL") or _env("FIREWORKS_MODEL") or DEFAULT_MODEL


# OpenAI reasoning models (o-series, GPT-5 and later) take max_completion_tokens instead of
# max_tokens and only their default temperature, so they get a different request body.
REASONING_MODEL = re.compile(r"^(?:.*/)?(?:o\d|gpt-(?:[5-9]|\d{2}))", re.IGNORECASE)


def chat_body(messages: list[dict], max_tokens: int, temperature: float) -> dict:
    """Chat completions request body for the configured model."""
    model = model_name()
    if REASONING_MODEL.match(model):
        return {"model": model, "max_completion_tokens": max_tokens, "reasoning_effort": "low",
                "messages": messages}
    return {"model": model, "max_tokens": max_tokens, "temperature": temperature, "messages": messages}


def build_facts(match: dict) -> dict:
    """The only information the LLM may use: one role's match, trimmed to what matters."""
    c, d, p = match["components"], match["skill_detail"], match["pathway"]
    return {
        "role": match["role_name"],
        "it_area": match["area_name"] or "no IT area",
        "match_score": match["total"],
        # each part as the points it adds to match_score, the numbers on the student's job card
        "area_fit": c["area"]["points"],
        "interest_fit": c["interest"]["points"],
        "skill_fit": c["skill"]["points"],
        "trend_points": c["trend"]["points"],
        "max_points": max_points(c),
        "trend_direction": {"malaysian_demand": direction((match.get("trend_parts") or {}).get("demand")),
                            "ai_momentum": direction((match.get("trend_parts") or {}).get("ai"))},
        "area_note": match["explain"]["area"],
        "interest_note": match["explain"]["interest"],
        "trend_note": match["explain"]["trend"],
        "biggest_gaps": [{"skill": g["skill_name"], "your_level": g["your_level"],
                          "level_needed": g["level_needed"]}  # rated gaps first, as in the learning path
                         for g in sorted(d["gaps"], key=lambda g: not g.get("rated", True))[:3]],
        "technologies_to_learn": [t["skill_name"] for t in d["tech_missing"][:4]],
        "learning_path": [{"course": s["title"], "provider": s["provider"], "hours": s["hours"],
                           "covers": s["skills"]} for s in p["steps"][:3]],
        "learning_path_total_hours": p["total_hours"],
        "learning_path_weeks": p["weeks"],
        "hours_per_week": p["hours_per_week"],
        "flags": match["flags"],
        "sdg": [{"target": s["target"], "goal": s["goal_name"], "why": s["rationale"]}
                for s in match["sdg"][:2]],
        # the student's picked UN goals this role supports, and the points they added
        "sdg_goals_picked": (match.get("sdg_choice") or {}).get("goals", []),
        "sdg_bonus": (match.get("sdg_choice") or {}).get("bonus", 0.0),
    }


def max_points(components: dict) -> dict:
    """The most points each scored part can add: its weight, scaled up when a part is skipped,
    as in matching.weighted(). A skipped part gets None."""
    used = sum(c["weight"] for c in components.values() if c["score"] is not None)
    names = {"area": "area_fit", "interest": "interest_fit", "skill": "skill_fit", "trend": "trend_points"}
    return {names[k]: None if c["score"] is None or not used else round(100 * c["weight"] / used, 1)
            for k, c in components.items()}


def raise_tips(before: dict, after: dict | None, learn: list[str]) -> dict:
    """What would raise the score: the same match recomputed with the "Learn next"
    technologies added (after), and the interest part when it is not scored yet."""
    tips = {"learn": learn, "new_score": None, "gain": None,
            "interest_points": None}
    if after is not None and learn:
        tips["new_score"] = after["total"]
        tips["gain"] = round(after["total"] - before["total"], 1)
    if before["components"]["interest"]["score"] is None:
        tips["interest_points"] = round(100 * before["components"]["interest"]["weight"], 1)
    return tips


NUMBER = re.compile(r"\d+(?:\.\d+)?")
# Claims about the future; the trend layer only describes recent data, so a reply making one is rejected.
PREDICTION = re.compile(
    r"\b(?:will|won't|is going to|are going to|likely to|unlikely to|expected to|set to|bound to|poised to)"
    r"\s+(?:\w+\s+){0,2}?(?:grow|rise|increase|expand|boom|stay|remain|keep|continue|decline|fall|shrink|drop|be in)\b"
    r"|\b(?:will|likely to|expected to|set to)\s+(?:\w+\s+){0,2}?become\s+(?:even\s+)?(?:more|less|increasingly)\s+"
    r"(?:important|valuable|needed|in demand|sought|common|scarce|relevant)"
    r"|\bas AI(?: tools)? (?:evolves?|advances?|improves?|spreads?|grows?)\b"
    r"|\bkeep(?:s)? (?:growing|rising|increasing)\b|\bin the (?:coming|next) (?:years|decade)\b|\bfuture[- ]proof",
    re.IGNORECASE)


NEUTRAL_BAND = 12.5  # points around 50 read as flat: the +-10% arXiv flat band on the 0-100 scale


def direction(score: float | None) -> str:
    """A trend part in words: clearly above, near or clearly below the neutral 50, or not measured."""
    if score is None:
        return "no data"
    return "positive" if score >= 50 + NEUTRAL_BAND else "negative" if score <= 50 - NEUTRAL_BAND else "neutral"


def predictions(text: str) -> list[str]:
    return [m.group(0) for m in PREDICTION.finditer(text)]


def _normalise(n: str) -> str:
    return str(float(n)).rstrip("0").rstrip(".") if "." in n else str(int(n))


def unknown_numbers(text: str, facts: dict) -> list[str]:
    """Numbers in the reply not found in the facts (0-10, 100 and 2030 are always allowed)."""
    allowed = {_normalise(n) for n in NUMBER.findall(json.dumps(facts))}
    allowed |= {str(i) for i in range(0, 11)} | {"100", "2030"}  # counting, scales, SDG year
    return [n for n in NUMBER.findall(text) if _normalise(n) not in allowed]


def points(facts: dict, key: str) -> str:
    """One part as on the job card: "22.2 of 44.4 points", or "not scored"."""
    if facts[key] is None:
        return "not scored"
    return f"{facts[key]:g} of {facts['max_points'][key]:g} points"


def fallback_text(facts: dict) -> str:
    """A plain explanation written from the facts, used whenever the LLM is not."""
    parts = [f"{facts['role']} scores {facts['match_score']} out of 100 for you: {facts['it_area']} area fit "
             f"{points(facts, 'area_fit')}, skill fit {points(facts, 'skill_fit')} and AI-era trend "
             f"{points(facts, 'trend_points')} "
             f"(Malaysian demand {facts['trend_direction']['malaysian_demand']}, AI momentum "
             f"{facts['trend_direction']['ai_momentum']}; an estimate from recent data, not a prediction)."]
    if facts["learning_path"]:
        first = facts["learning_path"][0]
        hours = f" ({first['hours']} hours)" if first["hours"] else ""
        parts.append(f"A good first step is the free course \"{first['course']}\" from "
                     f"{first['provider']}{hours}, which covers {', '.join(first['covers'])}.")
    elif facts["biggest_gaps"]:
        g = facts["biggest_gaps"][0]
        parts.append(f"Your biggest gap is {g['skill']} (you {g['your_level']}, needed "
                     f"{g['level_needed']} on O*NET's 0-7 scale).")
    if facts["sdg"]:
        s = facts["sdg"][0]
        parts.append(f"The role links to SDG target {s['target']}: {s['why']}")
    if facts.get("sdg_goals_picked"):
        parts.append(f"It supports SDG {', '.join(facts['sdg_goals_picked'])}, which you picked, "
                     f"so it gets {facts['sdg_bonus']:g} extra points.")
    return " ".join(parts)


def short_facts(facts: dict) -> dict:
    """The facts for "Why this job?": the score parts and SDG, without gaps or courses."""
    return {k: v for k, v in facts.items() if k not in (
        "biggest_gaps", "technologies_to_learn", "learning_path", "learning_path_total_hours",
        "learning_path_weeks", "hours_per_week")}


def short_fallback(facts: dict) -> str:
    """One sentence on why the role suits the student, used whenever the LLM is not."""
    parts = {"area_fit": "IT area fit", "interest_fit": "interest fit", "skill_fit": "skill fit"}
    # strongest = the largest share of its own maximum, so a part with a small weight can still lead
    scored = sorted(((facts[k] / facts["max_points"][k], k) for k in parts
                     if facts[k] is not None and facts["max_points"][k]), reverse=True)
    best = (f"your strongest part is {parts[scored[0][1]]} ({points(facts, scored[0][1])})" if scored
            else "your parts are not scored yet")
    return (f"{facts['role']} scores {facts['match_score']} out of 100 for you: {best}, and its AI-era trend "
            f"adds {points(facts, 'trend_points')} (an estimate from recent data, not a prediction).")


def _call_llm(facts: dict, prompt: str = SYSTEM_PROMPT) -> str:
    body = chat_body([
        {"role": "system", "content": prompt},
        {"role": "user", "content": "<facts>\n" + json.dumps(facts, ensure_ascii=False, indent=1)
                                    + "\n</facts>\nExplain this match to me."},
    ], MAX_TOKENS, 0.3)
    req = urllib.request.Request(api_url(), data=json.dumps(body).encode("utf-8"), headers={
        "Authorization": f"Bearer {api_key()}",
        "Content-Type": "application/json", "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=TIMEOUT_S) as r:
        data = json.loads(r.read())
    choice = data["choices"][0]
    if choice.get("finish_reason") == "length":
        raise ValueError("reply cut off at max_tokens")
    return (choice["message"].get("content") or "").strip()


def explain(match: dict, short: bool = False) -> dict:
    """Return {"text", "source": "llm"|"fallback", "model", "reason"} for one match.

    short: two sentences on why the role suits the student ("Why this job?").
    """
    facts = build_facts(match)
    if short:
        facts = short_facts(facts)
    key = hashlib.sha256(json.dumps([facts, short], sort_keys=True).encode()).hexdigest()
    if key in _cache:
        return {**_cache[key], "cached": True}

    result = {"text": short_fallback(facts) if short else fallback_text(facts), "source": "fallback",
              "model": None, "reason": None}
    if not configured():
        result["reason"] = "no LLM_API_KEY set"
        return result
    try:
        text = _call_llm(facts, SHORT_PROMPT if short else SYSTEM_PROMPT)
        bad = unknown_numbers(text, facts)
        future = predictions(text)
        if not text:
            result["reason"] = "empty reply"
        elif bad:
            result["reason"] = f"reply had numbers not in the facts: {', '.join(bad[:5])}"
        elif future:
            result["reason"] = f"reply predicted the future: {future[0]!r}"
        elif len(text) > (SHORT_REPLY_CHARS if short else MAX_REPLY_CHARS):
            result["reason"] = "reply too long"
        else:
            result = {"text": text, "source": "llm", "model": model_name(), "provider": provider(), "reason": None}
    except urllib.error.HTTPError as e:
        result["reason"] = f"LLM API error {e.code}"
    except (urllib.error.URLError, TimeoutError, OSError) as e:
        result["reason"] = f"LLM API unreachable: {e.__class__.__name__}"
    except (KeyError, IndexError, ValueError) as e:
        result["reason"] = f"unexpected LLM reply: {e}"

    if result["source"] == "llm":
        if len(_cache) >= CACHE_SIZE:
            _cache.pop(next(iter(_cache)))
        _cache[key] = result
    return result
