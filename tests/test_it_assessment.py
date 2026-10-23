import builtins
import csv
import json
import math
import re
import sqlite3
import unittest
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BANK = json.loads((ROOT / "data" / "it_assessment.json").read_text(encoding="utf-8"))

TYPES = {"mcq", "multi", "numeric", "text", "code", "sql"}
STAGES = {"screen": 2, "deep": 6, "practical": 2}  # items per domain


# Reference answers for the coding questions; each must pass every test in the bank.
def merge_intervals(intervals):
    merged = []
    for start, end in sorted(intervals):
        if merged and start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    return merged


def is_balanced(s):
    pairs = {")": "(", "]": "[", "}": "{"}
    stack = []
    for ch in s:
        if ch in "([{":
            stack.append(ch)
        elif ch in pairs and (not stack or stack.pop() != pairs[ch]):
            return False
    return not stack


def find_bruteforce(lines, threshold):
    counts = Counter(line.rsplit(" from ", 1)[1].split()[0] for line in lines if "Failed password" in line)
    return [ip for ip, n in sorted(counts.items(), key=lambda kv: (-kv[1], kv[0])) if n >= threshold]


def network_address(ip, prefix):
    value = 0
    for octet in ip.split("."):
        value = value << 8 | int(octet)
    value &= (0xFFFFFFFF << (32 - prefix)) & 0xFFFFFFFF
    return ".".join(str(value >> shift & 255) for shift in (24, 16, 8, 0))


def top_categories(rows, n):
    totals = {}
    for category, amount in rows:
        if amount is not None:
            totals[category] = totals.get(category, 0) + amount
    ranked = sorted(totals.items(), key=lambda kv: (-kv[1], kv[0]))
    return [[c, round(t, 2)] for c, t in ranked[:n]]


def find_full_disks(df_text, threshold):
    found = []
    for line in df_text.splitlines()[1:]:
        if line.strip():
            parts = line.split(None, 5)
            use = int(parts[4].rstrip("%"))
            if use >= threshold:
                found.append((use, parts[5]))
    return [mount for _, mount in sorted(found, key=lambda x: (-x[0], x[1]))]


def availability(outages, period_minutes):
    clipped = sorted([max(0, s), min(period_minutes, e)] for s, e in outages)
    down, end_so_far = 0, 0
    for start, end in clipped:
        start = max(start, end_so_far)
        if end > start:
            down += end - start
            end_so_far = end
    return round(100 * (1 - down / period_minutes), 3)


def paginate(items, page, per_page):
    if per_page < 1 or page < 1:
        raise ValueError("page and per_page must be >= 1")
    total_pages = math.ceil(len(items) / per_page)
    if items and page > total_pages:
        raise ValueError("page out of range")
    return {"items": items[(page - 1) * per_page:page * per_page], "page": page,
            "total_pages": total_pages, "has_prev": page > 1, "has_next": page < total_pages}


SQL_ANSWERS = {
    "DA-P2": """SELECT c.name, SUM(o.amount) AS total
                FROM customers c JOIN orders o ON o.customer_id = c.id
                WHERE o.order_date BETWEEN '2025-01-01' AND '2025-12-31'
                GROUP BY c.id HAVING COUNT(*) >= 2 ORDER BY total DESC""",
}


def run_sql(question, answer_sql):
    db = sqlite3.connect(":memory:")
    db.executescript(question["setup_sql"])
    cur = db.execute(answer_sql)
    columns = [d[0] for d in cur.description]
    rows = [[round(v, 2) if isinstance(v, float) else v for v in row] for row in cur.fetchall()]
    return columns, rows


class TestItAssessment(unittest.TestCase):
    def test_question_ids_are_unique(self):
        ids = [q["id"] for q in BANK["questions"]]
        self.assertEqual(len(ids), len(set(ids)))

    def test_each_domain_has_full_pools(self):
        domain_ids = {d["id"] for d in BANK["domains"]}
        counts = Counter((q["domain"], q["stage"]) for q in BANK["questions"])
        for domain in domain_ids:
            for stage, n in STAGES.items():
                self.assertEqual(counts[(domain, stage)], n, f"{domain}/{stage}")
        self.assertEqual({q["domain"] for q in BANK["questions"]}, domain_ids)

    def test_selection_fits_pools(self):
        sel = BANK["selection"]
        self.assertLessEqual(sel["screen_per_domain"], STAGES["screen"])
        self.assertLessEqual(sel["deep_per_domain"], STAGES["deep"])
        self.assertLessEqual(sel["practical_per_domain"], STAGES["practical"])

    def test_every_question_is_well_formed(self):
        for q in BANK["questions"]:
            with self.subTest(q["id"]):
                self.assertIn(q["type"], TYPES)
                self.assertIn(q["stage"], STAGES)
                self.assertTrue(q["prompt"].strip())
                self.assertTrue(q["explanation"].strip())
                self.assertTrue(q["skill"].strip())
                self.assertGreater(q["time_s"], 0)
                self.assertTrue(q["refs"])
                for r in q["refs"]:
                    self.assertTrue(r["url"].startswith("https://"), r["url"])

    def test_answers_match_their_type(self):
        for q in BANK["questions"]:
            with self.subTest(q["id"]):
                if q["type"] == "mcq":
                    self.assertGreaterEqual(len(q["options"]), 3)
                    self.assertIn(q["answer"], range(len(q["options"])))
                elif q["type"] == "multi":
                    self.assertTrue(q["answer"])
                    self.assertEqual(len(set(q["answer"])), len(q["answer"]))
                    self.assertTrue(set(q["answer"]) <= set(range(len(q["options"]))))
                elif q["type"] == "numeric":
                    self.assertIsInstance(q["answer"], (int, float))
                    self.assertGreaterEqual(q["tolerance"], 0)
                elif q["type"] == "text":
                    self.assertIn(q["answer"], q["accept"])

    def test_skill_ids_exist_in_skills_table(self):
        with (ROOT / "data" / "skills.csv").open(encoding="utf-8-sig", newline="") as f:
            known = {row["skill_id"] for row in csv.DictReader(f)}
        for q in BANK["questions"]:
            with self.subTest(q["id"]):
                self.assertTrue(q["onet_skill_ids"])
                self.assertTrue(set(q["onet_skill_ids"]) <= known)

    def test_domains_cite_onet_codes(self):
        for d in BANK["domains"]:
            for soc in d["onet_soc"]:
                self.assertRegex(soc, r"^\d\d-\d{4}\.\d\d$")

    def test_reference_solutions_pass_code_tests(self):
        code_qs = [q for q in BANK["questions"] if q["type"] == "code"]
        self.assertEqual(len(code_qs), 8)
        for q in code_qs:
            func = globals()[q["function"]]
            self.assertIn(f"def {q['function']}(", q["starter"])
            for i, case in enumerate(q["tests"]):
                with self.subTest(q["id"], case=i):
                    args = json.loads(json.dumps(case["args"]))
                    if "raises" in case:
                        with self.assertRaises(getattr(builtins, case["raises"])):
                            func(*args)
                    else:
                        result = json.loads(json.dumps(func(*args)))
                        self.assertEqual(result, case["expected"])

    def test_sql_questions_have_working_answers(self):
        for q in BANK["questions"]:
            if q["type"] == "sql":
                with self.subTest(q["id"]):
                    columns, rows = run_sql(q, SQL_ANSWERS[q["id"]])
                    self.assertEqual(columns, q["expected_columns"])
                    self.assertEqual(rows, q["expected_rows"])

    def test_computed_answers(self):
        by_id = {q["id"]: q for q in BANK["questions"]}
        self.assertEqual(by_id["NW-S1"]["answer"], 2 ** (32 - 27) - 2)
        self.assertEqual(by_id["SD-D5"]["answer"], math.floor(math.log2(1000)) + 1)
        self.assertAlmostEqual(by_id["CL-D3"]["answer"], 30 * 24 * 60 * 0.001)
        self.assertAlmostEqual(by_id["DA-D5"]["answer"], round(7 / 3, 2))
        self.assertEqual(network_address("192.168.50.192", 27) + "/27", by_id["NW-P2"]["answer"])

    def test_path_traversal_lines(self):
        q = next(q for q in BANK["questions"] if q["id"] == "CS-P2")
        lines = q["code"].splitlines()
        hits = [i for i, line in enumerate(lines) if re.search(r"\.\.(/|%2f)|%2e%2e%2f", line, re.I)]
        self.assertEqual(hits, q["answer"])

    def test_low_contrast_line_really_fails(self):
        def luminance(hex_colour):
            def channel(c):
                c /= 255
                return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
            r, g, b = (int(hex_colour[i:i + 2], 16) for i in (0, 2, 4))
            return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)

        ratio = (luminance("ffffff") + 0.05) / (luminance("999999") + 0.05)
        self.assertLess(ratio, 4.5)


class TestAssessmentFlow(unittest.TestCase):
    """The API flow: start -> next -> result, as the web page calls it."""

    def setUp(self):
        import sys
        sys.path.insert(0, str(ROOT / "src"))
        import main
        self.main = main

    def call(self, method, path, payload=None):
        res = self.main.dispatch(method, path, b"" if payload is None else json.dumps(payload).encode())
        return res.status, json.loads(res.body)

    def right_answer(self, q, shown=None):
        if q["type"] == "mcq" and shown:
            return shown["options"].index(q["options"][q["answer"]])
        if q["type"] == "code":
            return {"passed": len(q["tests"]), "total": len(q["tests"])}
        if q["type"] == "sql":
            return SQL_ANSWERS[q["id"]]
        return q["answer"]

    def test_full_run_with_right_answers_scores_100(self):
        bank = {q["id"]: q for q in BANK["questions"]}
        status, start = self.call("GET", "/api/assessment/start")
        self.assertEqual(status, 200)
        self.assertEqual(len(start["questions"]), 6)
        self.assertEqual({q["domain"] for q in start["questions"]}, {d["id"] for d in BANK["domains"]})
        for q in start["questions"]:
            self.assertNotIn("answer", q)
            self.assertNotIn("explanation", q)
        responses = {q["id"]: self.right_answer(bank[q["id"]], q) for q in start["questions"]}
        status, nxt = self.call("POST", "/api/assessment/next", {"seed": start["seed"], "responses": responses})
        self.assertEqual(status, 200)
        self.assertEqual(len(nxt["domains"]), 2)
        self.assertEqual(len(nxt["questions"]), 8)
        responses.update({q["id"]: self.right_answer(bank[q["id"]], q) for q in nxt["questions"]})
        status, result = self.call("POST", "/api/assessment/result", {"seed": start["seed"], "responses": responses})
        self.assertEqual(status, 200)
        self.assertEqual(result["deep_domains"], nxt["domains"])
        self.assertEqual(result["total_points"], result["total_max"])
        self.assertEqual(result["skills_to_improve"], [])
        for d in result["domains"]:
            if d["tested_in_depth"]:
                self.assertEqual(d["readiness"], 100)
                self.assertEqual(d["level"]["label"], "Job-ready")

    def test_strong_screen_domains_are_chosen(self):
        _, start = self.call("GET", "/api/assessment/start")
        bank = {q["id"]: q for q in BANK["questions"]}
        picked = [q for q in start["questions"] if q["domain"] in ("networking", "web_ux")]
        responses = {q["id"]: self.right_answer(bank[q["id"]], q) for q in picked}
        _, nxt = self.call("POST", "/api/assessment/next", {"seed": start["seed"], "responses": responses})
        self.assertEqual(sorted(nxt["domains"]), ["networking", "web_ux"])

    def test_partial_credit(self):
        from assessment import grade
        q = next(q for q in BANK["questions"] if q["id"] == "CS-P2")
        self.assertEqual(grade(q, q["answer"], 1)["points"], 4)
        self.assertEqual(grade(q, q["answer"][:2], 1)["points"], 2)
        self.assertEqual(grade(q, q["answer"][:2] + [0], 1)["points"], 1)
        code = next(q for q in BANK["questions"] if q["id"] == "SD-P1")
        self.assertEqual(grade(code, {"passed": 3, "total": 6}, 1)["points"], 2)
        self.assertEqual(grade(code, {"passed": 9, "total": 6}, 1)["points"], 0)
        text = next(q for q in BANK["questions"] if q["id"] == "NW-D1")
        self.assertTrue(grade(text, " /26 ", 1)["correct"])

    def test_always_picking_the_same_option_does_not_pay(self):
        from assessment import grade, option_order
        mcqs = [q for q in BANK["questions"] if q["type"] == "mcq"]
        for seed in range(20):
            for pick in range(3):
                right = sum(grade(q, pick, seed)["correct"] for q in mcqs)
                self.assertLess(right, len(mcqs) * 0.5, f"seed {seed}, always option {pick}")
        q = mcqs[0]
        self.assertEqual(sorted(option_order(7, q)), list(range(len(q["options"]))))
        self.assertEqual(option_order(7, q), option_order(7, q))

    def test_bad_requests(self):
        self.assertEqual(self.call("POST", "/api/assessment/next", {"seed": "x"})[0], 400)
        self.assertEqual(self.call("POST", "/api/assessment/result", {"seed": 1, "responses": {"ZZ-1": 0}})[0], 400)

    def test_sql_runner_is_read_only(self):
        for sql in ("DELETE FROM customers", "ATTACH 'x.db' AS x", "SELECT 1; SELECT 2",
                    "WITH RECURSIVE c(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM c) SELECT COUNT(*) FROM c"):
            with self.subTest(sql):
                self.assertEqual(self.call("POST", "/api/assessment/sql", {"id": "DA-P2", "sql": sql})[0], 400)
        status, out = self.call("POST", "/api/assessment/sql", {"id": "DA-P2", "sql": SQL_ANSWERS["DA-P2"]})
        self.assertEqual(status, 200)
        self.assertEqual(out["rows"], next(q for q in BANK["questions"] if q["id"] == "DA-P2")["expected_rows"])


if __name__ == "__main__":
    unittest.main()
