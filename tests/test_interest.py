import sys
import unittest
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

import interest  # noqa: E402
from matching import load_areas  # noqa: E402


class TestInterest(unittest.TestCase):
    def setUp(self):
        self.items = interest.load_items()["items"]

    def test_bank_is_balanced(self):
        self.assertEqual(len(self.items), 36)
        self.assertEqual([i["n"] for i in self.items], list(range(1, 37)))
        self.assertEqual(set(Counter(i["type"] for i in self.items).values()), {6})
        areas = Counter(i["area"] for i in self.items if i["area"])
        self.assertEqual(set(areas), {a["id"] for a in load_areas()})
        self.assertEqual(set(areas.values()), {4})

    def test_scores_types_and_areas(self):
        answers = [5 if i["area"] == "data_ai" else 3 if i["type"] == "I" else 1 for i in self.items]
        r = interest.score(answers)
        self.assertEqual(r["area_items"]["data_ai"], 100.0)
        self.assertEqual(r["area_items"]["web_ux"], 0.0)
        self.assertEqual(r["code"][0], "I")
        self.assertEqual(r["percent"]["I"], round((r["riasec"]["I"] - 6) / 24 * 100))
        self.assertTrue(r["usable"])
        self.assertEqual(r["warnings"], [])

    def test_code_ties_follow_riasec_order(self):
        self.assertEqual(interest.code(dict(zip("RIASEC", [10, 20, 20, 5, 20, 5]))), "IAE")

    def test_same_answer_is_not_usable(self):
        r = interest.score([4] * 36)
        self.assertFalse(r["usable"])
        self.assertEqual(r["warnings"][0]["type"], "same_answer")

    def test_flat_profile_warns(self):
        answers = [4 if n % 2 else 3 for n in range(36)]
        r = interest.score(answers)
        self.assertTrue(r["usable"])
        self.assertIn("flat", [w["type"] for w in r["warnings"]])

    def test_rejects_bad_answers(self):
        for bad in ([3] * 35, [3] * 35 + [0], [3] * 35 + [True], "33", [3] * 35 + [2.5]):
            with self.assertRaises(interest.InterestError):
                interest.score(bad)


if __name__ == "__main__":
    unittest.main()
