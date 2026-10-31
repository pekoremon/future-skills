"""Measure KPI 1 (career clarity) from the pilot survey's answers.

KPI 1 in the Phase 1 proposal: at least 70% of 20 or more IT student testers can name a
target IT role, its top missing skills and a next course after one session, compared
with before. The survey (create-survey-form.gs, a Google Form) asks the same three
questions before (Part 1) and after (Part 3) the student uses the app:

    What IT job do you want after graduating?
    What are the 2 skills you most need to learn for that job?
    What course or learning resource will you take next for it?

A tester counts as "clear" at a point when all three answers are real answers: the job
and the course are not blank or "not sure", and the skills answer names at least 2 skills
(split on commas, "and", "&", "/", semicolons and new lines). The confidence question (1-5)
is averaged before and after. Whether an answer is a real IT job or course is not judged
here; check the rows this script prints by hand.

Download the responses from the linked Google Sheet as CSV (File > Download > .csv), then:

    python scripts/clarity_kpi.py responses.csv
    python scripts/clarity_kpi.py responses.csv --rows   # also print each tester's verdict

Google Forms gives the before and after questions the same column title, so the first
column with a title is "before" and the second is "after".
"""

import argparse
import csv
import re
import sys

TARGET_SHARE = 70.0  # % of testers clear after one session
TARGET_TESTERS = 20

Q_JOB = "What IT job do you want after graduating?"
Q_SKILLS = "What are the 2 skills you most need to learn for that job?"
Q_COURSE = "What course or learning resource will you take next for it?"
Q_CONF = "How confident are you about your next career step?"

NOT_SURE = re.compile(r"^(not sure|unsure|don'?t know|do not know|idk|no idea|none|nil|n/?a|-|tak pasti|tidak tahu|不知道|不确定)?[.!?]*$", re.I)
SKILL_SPLIT = re.compile(r",|;|/|&|\band\b|\bdan\b|\n|、|和")


def real(answer: str) -> bool:
    return not NOT_SURE.match(answer.strip())


def skill_count(answer: str) -> int:
    return sum(1 for part in SKILL_SPLIT.split(answer) if real(part))


def clear(job: str, skills: str, course: str) -> bool:
    return real(job) and skill_count(skills) >= 2 and real(course)


def columns(header: list[str], title: str) -> tuple[int, int]:
    found = [i for i, h in enumerate(header) if h.strip() == title]
    if len(found) != 2:
        raise SystemExit(f"expected 2 columns titled {title!r} (before and after), found {len(found)}")
    return found[0], found[1]


def measure(rows: list[list[str]]) -> dict:
    header, answers = rows[0], [r for r in rows[1:] if any(c.strip() for c in r)]
    job, skills, course, conf = (columns(header, q) for q in (Q_JOB, Q_SKILLS, Q_COURSE, Q_CONF))
    testers = []
    for r in answers:
        r = r + [""] * (len(header) - len(r))
        before = clear(r[job[0]], r[skills[0]], r[course[0]])
        after = clear(r[job[1]], r[skills[1]], r[course[1]])
        testers.append({"before": before, "after": after, "job_after": r[job[1]].strip(),
                        "skills_after": r[skills[1]].strip(), "course_after": r[course[1]].strip(),
                        "conf": (r[conf[0]].strip(), r[conf[1]].strip())})
    n = len(testers)

    def share(key: str) -> float:
        return 100 * sum(t[key] for t in testers) / n if n else 0.0

    def mean_conf(i: int) -> float | None:
        vals = [float(t["conf"][i]) for t in testers if t["conf"][i].replace(".", "", 1).isdigit()]
        return sum(vals) / len(vals) if vals else None

    return {"testers": testers, "n": n, "before": share("before"), "after": share("after"),
            "conf_before": mean_conf(0), "conf_after": mean_conf(1)}


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("csv", help="the survey responses downloaded as CSV")
    ap.add_argument("--rows", action="store_true", help="print each tester's after answers and verdict")
    args = ap.parse_args()
    with open(args.csv, encoding="utf-8-sig", newline="") as f:
        r = measure(list(csv.reader(f)))
    if args.rows:
        for i, t in enumerate(r["testers"], 1):
            mark = "clear" if t["after"] else "not clear"
            print(f"{i:>3}. {mark:<9} job: {t['job_after']} | skills: {t['skills_after']} | course: {t['course_after']}")
        print()
    n, before, after = r["n"], r["before"], r["after"]
    print(f"Career clarity: {n} testers; {before:.0f}% before -> {after:.0f}% after "
          f"({sum(t['before'] for t in r['testers'])} -> {sum(t['after'] for t in r['testers'])} of {n})")
    if r["conf_before"] is not None and r["conf_after"] is not None:
        print(f"Confidence (1-5): {r['conf_before']:.1f} before -> {r['conf_after']:.1f} after")
    met = after >= TARGET_SHARE and n >= TARGET_TESTERS
    print(f"Target: >= {TARGET_SHARE:.0f}% of >= {TARGET_TESTERS} testers -> {'met' if met else 'not met'}"
          + ("" if n >= TARGET_TESTERS else f" (only {n} testers)"))
    sys.exit(0)


if __name__ == "__main__":
    main()
