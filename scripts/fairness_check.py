"""Check that recommendations do not depend on who the student is.

The same fictional CV (src/static/sample_cv.txt) is sent eight times, each time as a different
student: the name, gender, age, religion, ethnicity and home state change, the skills,
education and experience do not. Each CV goes through the real app path:

    POST /api/cv/summary -> technologies, education level, cv_areas
    POST /api/match      -> IT area fit and every role's score (same interest answers each time)

A fair result is the same for all eight: the same technologies found, the same IT area
scores, the same roles in the same order with the same scores. The script prints the
largest difference seen and exits 1 if there is any.

It also sends the personal details themselves in the /api/match request (gender, age,
ethnicity, religion, state) to show the API does not use them.

By default the CV is read without the LLM (word match against skills.csv), which gives the
same answer every time. With --llm (needs LLM_API_KEY) the LLM reads each CV too, so its
evidence quotes can differ from run to run; the script then reports the spread instead.

    python scripts/fairness_check.py          # deterministic check, used by tests/test_fairness.py
    python scripts/fairness_check.py --llm    # also check the LLM's CV evidence
"""

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
sys.path.insert(0, str(ROOT / "src"))

import explain  # noqa: E402
import main  # noqa: E402

SAMPLE = (ROOT / "src" / "static" / "sample_cv.txt").read_text(encoding="utf-8")
SAMPLE_HEADER = "NUR AIMAN BINTI HASSAN (fictional sample CV)\nKuala Lumpur, Malaysia"

# Fictional people only. Each line changes who the student is, never what they can do.
PEOPLE = [
    {"name": "NUR AIMAN BINTI HASSAN", "gender": "Female", "age": 22, "ethnicity": "Malay", "religion": "Islam", "state": "Kelantan"},
    {"name": "MUHAMMAD HAFIZ BIN ISMAIL", "gender": "Male", "age": 23, "ethnicity": "Malay", "religion": "Islam", "state": "Terengganu"},
    {"name": "TAN MEI LING", "gender": "Female", "age": 22, "ethnicity": "Chinese", "religion": "Buddhism", "state": "Penang"},
    {"name": "LIM WEI JIE", "gender": "Male", "age": 24, "ethnicity": "Chinese", "religion": "Christianity", "state": "Johor"},
    {"name": "PRIYA A/P RAJENDRAN", "gender": "Female", "age": 23, "ethnicity": "Indian", "religion": "Hinduism", "state": "Perak"},
    {"name": "ARJUN A/L MURUGAN", "gender": "Male", "age": 22, "ethnicity": "Indian", "religion": "Hinduism", "state": "Selangor"},
    {"name": "JANET ANAK JUGAH", "gender": "Female", "age": 35, "ethnicity": "Iban", "religion": "Christianity", "state": "Sarawak"},
    {"name": "MOHD FAIZAL BIN JUMAT", "gender": "Male", "age": 41, "ethnicity": "Kadazan-Dusun", "religion": "Islam", "state": "Sabah"},
]

# The same interest answers for everyone (the fictional demo student P01's), so only the CV differs.
INTEREST = next(p for p in json.loads((ROOT / "data" / "sample_profiles.json").read_text(encoding="utf-8"))
                if p["profile_id"] == "P01")["interest_answers"]


def cv_for(person: dict) -> str:
    header = (f"{person['name']} (fictional sample CV)\n"
              f"{person['gender']}, age {person['age']}, {person['ethnicity']}, {person['religion']}\n"
              f"{person['state']}, Malaysia")
    return SAMPLE.replace(SAMPLE_HEADER, header)


def post(path: str, body: dict) -> dict:
    res = main.dispatch("POST", path, json.dumps(body).encode("utf-8"))
    out = json.loads(res.body)
    if res.status != 200:
        raise RuntimeError(f"{path}: {res.status} {out}")
    return out


def run_one(person: dict, with_details: bool = False) -> dict:
    """One student through the app: their CV summary, then their matches."""
    cv = post("/api/cv/summary", {"text": cv_for(person)})
    body = {"interest_answers": INTEREST, "cv_areas": cv["cv_areas"],
            "technologies": [t["skill_id"] for t in cv["technologies"]],
            "education_job_zone": cv["education_job_zone"] or 4, "hours_per_week": 5, "top": 50}
    if with_details:
        body.update({k: person[k] for k in ("gender", "age", "ethnicity", "religion", "state")})
    res = post("/api/match", body)
    return {"technologies": sorted(t["skill_id"] for t in cv["technologies"]),
            "cv_method": cv["cv_areas_method"],
            "cv_areas": cv["cv_areas"],
            "areas": {a["id"]: a["fit"] for a in res["areas"]},
            "roles": [(m["role_id"], m["total"]) for m in res["results"]],
            "names": {m["role_id"]: m["role_name"] for m in res["results"]}}


def largest_gap(results: list[dict]) -> dict:
    """The largest difference from the first student, per part of the result."""
    base = results[0]
    gap = {"technologies": 0, "cv_area": 0.0, "area_fit": 0.0, "role_order": 0, "role_score": 0.0}
    for r in results[1:]:
        gap["technologies"] += r["technologies"] != base["technologies"]
        for key, part in (("cv_area", "cv_areas"), ("area_fit", "areas")):
            for a in set(base[part]) | set(r[part]):
                x, y = base[part].get(a), r[part].get(a)
                if x is None or y is None:
                    gap[key] = max(gap[key], 100.0) if x != y else gap[key]
                else:
                    gap[key] = max(gap[key], abs(x - y))
        gap["role_order"] += [i for i, _ in r["roles"]] != [i for i, _ in base["roles"]]
        scores = dict(r["roles"])
        gap["role_score"] = max([gap["role_score"]] + [abs(s - scores.get(i, -100)) for i, s in base["roles"]])
    return gap


def check(use_llm: bool = False) -> dict:
    """Run every person, with and without their details in the match request."""
    configured = explain.configured
    if not use_llm:
        explain.configured = lambda: False  # read the CV by word match only, for this run
    try:
        results = [run_one(p) for p in PEOPLE]
        with_details = [run_one(p, with_details=True) for p in PEOPLE]
    finally:
        explain.configured = configured
    gap = largest_gap(results + with_details)
    return {"people": len(PEOPLE), "roles": len(results[0]["roles"]), "cv_method": results[0]["cv_method"],
            "gap": gap, "fair": not any(gap.values()), "results": results}


def main_cli() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--llm", action="store_true", help="also read each CV with the LLM (needs LLM_API_KEY)")
    args = ap.parse_args()
    if args.llm and not explain.configured():
        print("--llm needs LLM_API_KEY (see .env.example)")
        return 2
    out = check(args.llm)
    print(f"Fairness check: {out['people']} fictional students, same CV skills, different name, gender, "
          f"age, ethnicity, religion and state (CV read by {out['cv_method']}).")
    for p, r in zip(PEOPLE, out["results"]):
        top = ", ".join(f"{r['names'][i]} {s}" for i, s in r["roles"][:3])
        print(f"  {p['ethnicity']:<14} {p['gender']:<6} age {p['age']:<3} {p['religion']:<12} -> top 3: {top}")
    g = out["gap"]
    print(f"Largest difference across {out['people']} students x {out['roles']} roles, "
          f"with and without personal details in the request:")
    print(f"  technologies found differ for {g['technologies']} student(s); CV area score {g['cv_area']}; "
          f"IT area fit {g['area_fit']}; role order differs for {g['role_order']}; role score {g['role_score']}")
    print("PASS: recommendations do not depend on personal details." if out["fair"]
          else "FAIL: some recommendations changed with personal details.")
    return 0 if out["fair"] else 1


if __name__ == "__main__":
    sys.exit(main_cli())
