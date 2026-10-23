"""Plain-language "Explain this for me" text for one role match, written by an LLM.

GenAI explains, our data decides: the model only sees the facts computed by
matching.py for that student and role, and a reply that contains any number not
found in those facts is rejected. Without an API key, or when the call or the check
fails, a template written from the same facts is returned instead.

LLM: an open model served by Fireworks AI (OpenAI-compatible chat completions API),
called with the standard library only. Configuration (environment / Replit Secrets):
    FIREWORKS_API_KEY   required to use the LLM
    FIREWORKS_MODEL     optional, default DEFAULT_MODEL below
"""

import hashlib
import json
import os
import re
import urllib.error
import urllib.request

API_URL = "https://api.fireworks.ai/inference/v1/chat/completions"
DEFAULT_MODEL = "accounts/fireworks/models/gpt-oss-120b"
TIMEOUT_S = 25
MAX_TOKENS = 1500  # reasoning models spend part of this before the answer
MAX_REPLY_CHARS = 1400
CACHE_SIZE = 256

SYSTEM_PROMPT = """You explain career matches to final-year IT students in Malaysia.
You get the facts for one student and one role as JSON inside <facts> tags. The facts were computed by a scoring program from public data (O*NET, DOSM, MyCOL, UN SDG targets).

Write 4 to 5 sentences in plain English, speaking to the student as "you":
1. Why the role fits or does not fit them, using the IT area fit, interest and skill parts.
2. What the field's AI-era trend score means for them.
3. The first concrete step: the first course in the learning path, if there is one, or else the biggest skill gap.
4. What the role's SDG target means in everyday terms.

Rules:
- Use only the facts given. Do not add salaries, job counts, percentages, course names, companies or any other fact that is not in the JSON.
- Every number you write must appear exactly as it does in the facts. If you are unsure of a number, leave it out.
- Be honest: if a part of the score is low, say so kindly.
- No headings, lists or markdown. Plain sentences only."""

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
    return _env("FIREWORKS_API_KEY")


def env_names_seen() -> list[str]:
    """Names (never values) of environment variables that mention Fireworks, for diagnosis."""
    return sorted(repr(k) for k in os.environ if "FIREWORKS" in k.upper())


def model_name() -> str:
    return _env("FIREWORKS_MODEL") or DEFAULT_MODEL


def build_facts(match: dict) -> dict:
    """The only information the LLM may use: one role's match, trimmed to what matters."""
    c, d, p = match["components"], match["skill_detail"], match["pathway"]
    return {
        "role": match["role_name"],
        "it_area": match["area_name"] or "no IT area",
        "match_score": match["total"],
        "area_fit": c["area"]["score"],
        "interest_fit": c["interest"]["score"],
        "skill_fit": c["skill"]["score"],
        "trend_score": c["trend"]["score"],
        "area_note": match["explain"]["area"],
        "interest_note": match["explain"]["interest"],
        "trend_note": match["explain"]["trend"],
        "biggest_gaps": [{"skill": g["skill_name"], "your_level": g["your_level"],
                          "level_needed": g["level_needed"]} for g in d["gaps"][:3]],
        "technologies_to_learn": [t["skill_name"] for t in d["tech_missing"][:4]],
        "learning_path": [{"course": s["title"], "provider": s["provider"], "hours": s["hours"],
                           "covers": s["skills"]} for s in p["steps"][:3]],
        "learning_path_total_hours": p["total_hours"],
        "learning_path_weeks": p["weeks"],
        "hours_per_week": p["hours_per_week"],
        "flags": match["flags"],
        "sdg": [{"target": s["target"], "goal": s["goal_name"], "why": s["rationale"]}
                for s in match["sdg"][:2]],
    }


NUMBER = re.compile(r"\d+(?:\.\d+)?")


def _normalise(n: str) -> str:
    return str(float(n)).rstrip("0").rstrip(".") if "." in n else str(int(n))


def unknown_numbers(text: str, facts: dict) -> list[str]:
    """Numbers in the reply not found in the facts (0-10, 100 and 2030 are always allowed)."""
    allowed = {_normalise(n) for n in NUMBER.findall(json.dumps(facts))}
    allowed |= {str(i) for i in range(0, 11)} | {"100", "2030"}  # counting, scales, SDG year
    return [n for n in NUMBER.findall(text) if _normalise(n) not in allowed]


def fallback_text(facts: dict) -> str:
    """A plain explanation written from the facts, used whenever the LLM is not."""
    parts = [f"{facts['role']} scores {facts['match_score']} out of 100 for you: {facts['it_area']} area fit "
             f"{facts['area_fit'] if facts['area_fit'] is not None else 'not scored'}, "
             f"skill fit {facts['skill_fit']} and AI-era trend {facts['trend_score']}."]
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
    return " ".join(parts)


def _call_llm(facts: dict) -> str:
    body = {
        "model": model_name(),
        "max_tokens": MAX_TOKENS,
        "temperature": 0.3,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": "<facts>\n" + json.dumps(facts, ensure_ascii=False, indent=1)
                                        + "\n</facts>\nExplain this match to me."},
        ],
    }
    req = urllib.request.Request(API_URL, data=json.dumps(body).encode("utf-8"), headers={
        "Authorization": f"Bearer {api_key()}",
        "Content-Type": "application/json", "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=TIMEOUT_S) as r:
        data = json.loads(r.read())
    choice = data["choices"][0]
    if choice.get("finish_reason") == "length":
        raise ValueError("reply cut off at max_tokens")
    return (choice["message"].get("content") or "").strip()


def explain(match: dict) -> dict:
    """Return {"text", "source": "llm"|"fallback", "model", "reason"} for one match."""
    facts = build_facts(match)
    key = hashlib.sha256(json.dumps(facts, sort_keys=True).encode()).hexdigest()
    if key in _cache:
        return {**_cache[key], "cached": True}

    result = {"text": fallback_text(facts), "source": "fallback", "model": None, "reason": None}
    if not configured():
        result["reason"] = "no FIREWORKS_API_KEY set"
        return result
    try:
        text = _call_llm(facts)
        bad = unknown_numbers(text, facts)
        if not text:
            result["reason"] = "empty reply"
        elif bad:
            result["reason"] = f"reply had numbers not in the facts: {', '.join(bad[:5])}"
        elif len(text) > MAX_REPLY_CHARS:
            result["reason"] = "reply too long"
        else:
            result = {"text": text, "source": "llm", "model": model_name(), "reason": None}
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
