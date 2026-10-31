import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
sys.path.insert(0, str(ROOT / "src"))

import fairness_check  # noqa: E402


class TestFairness(unittest.TestCase):
    def test_personal_details_change_nothing(self):
        out = fairness_check.check()
        self.assertEqual(out["people"], 8)
        self.assertEqual(out["roles"], 25)
        self.assertEqual(out["gap"], {"technologies": 0, "cv_area": 0.0, "area_fit": 0.0,
                                      "role_order": 0, "role_score": 0.0})
        self.assertTrue(out["fair"])

    def test_check_sees_a_real_difference(self):
        # A student with one more skill must come out different, or the check proves nothing.
        same = fairness_check.run_one(fairness_check.PEOPLE[0])
        sample = fairness_check.SAMPLE
        try:
            fairness_check.SAMPLE = sample.replace("Docker, Linux", "Docker, Linux, Kubernetes, Terraform, AWS")
            other = fairness_check.run_one(fairness_check.PEOPLE[0])
        finally:
            fairness_check.SAMPLE = sample
        gap = fairness_check.largest_gap([same, other])
        self.assertGreater(gap["technologies"], 0)
        self.assertGreater(gap["role_score"], 0)


if __name__ == "__main__":
    unittest.main()
