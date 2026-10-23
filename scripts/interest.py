"""Score the IT Career Interest Profiler (data/interest_items.json).

Each of the 36 items measures one RIASEC type (6 per type) and 24 of them also point to
one IT area (4 per area). One set of answers gives two results:
- riasec: total per type, 6-30, compared later with each role's O*NET interest scores;
- area_items: 0-100 per IT area, from the mean answer of the area's 4 items.

Answers are 1-5 (Strongly disagree ... Strongly agree), one per item, in item order.
"""

import json
from pathlib import Path

ITEMS_PATH = Path(__file__).resolve().parent.parent / "data" / "interest_items.json"
RIASEC = ["R", "I", "A", "S", "E", "C"]
SCALE = range(1, 6)
FLAT_SPREAD = 15  # area-item scores closer together than this are called a flat profile

_bank = None


class InterestError(ValueError):
    pass


def load_items() -> dict:
    global _bank
    if _bank is None:
        _bank = json.loads(ITEMS_PATH.read_text(encoding="utf-8"))
    return _bank


def code(totals: dict) -> str:
    """The 3 highest types, highest first; ties follow R, I, A, S, E, C."""
    return "".join(sorted(RIASEC, key=lambda k: (-totals[k], RIASEC.index(k)))[:3])


def score(answers) -> dict:
    """RIASEC totals, IT-area item scores and warnings for one complete set of answers."""
    items = load_items()["items"]
    if not isinstance(answers, list) or len(answers) != len(items):
        raise InterestError(f"interest answers must be a list of {len(items)} numbers, one per item")
    for i, a in enumerate(answers):
        if isinstance(a, bool) or a not in SCALE:
            raise InterestError(f"interest answer {i + 1} must be a whole number from 1 to 5")

    totals, per_area = dict.fromkeys(RIASEC, 0), {}
    for item, a in zip(items, answers):
        totals[item["type"]] += a
        if item["area"]:
            per_area.setdefault(item["area"], []).append(a)
    area_items = {k: round((sum(v) / len(v) - 1) / 4 * 100, 1) for k, v in per_area.items()}

    warnings = []
    if len(set(answers)) == 1:
        warnings.append({"type": "same_answer",
                         "text": "Every answer is the same, so the questionnaire cannot tell your "
                                 "interests apart. It is left out of your matches."})
    elif max(area_items.values()) - min(area_items.values()) < FLAT_SPREAD:
        warnings.append({"type": "flat",
                         "text": "Your interest in the six IT areas is very even. You may still be "
                                 "exploring: treat this part of the result as a light hint."})
    return {"riasec": totals,
            "percent": {k: round((v - 6) / 24 * 100) for k, v in totals.items()},
            "code": code(totals), "area_items": area_items,
            "usable": not any(w["type"] == "same_answer" for w in warnings), "warnings": warnings}
