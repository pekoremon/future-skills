import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

import kpi


class TestKpi(unittest.TestCase):
    def test_coverage_counts_only_needed_skills(self):
        m = kpi.measure()
        self.assertLessEqual(m["skills_with_free_course"], m["skills_needed"])
        self.assertEqual(m["pathway_coverage_pct"],
                         round(100 * m["skills_with_free_course"] / m["skills_needed"], 1))

    def test_every_role_and_skill_has_an_sdg_tag(self):
        m = kpi.measure()
        self.assertEqual(m["roles_with_sdg"], m["roles"])
        self.assertEqual(m["skills_with_sdg"], m["skills"])

    def test_free_needs_zero_cost(self):
        self.assertTrue(kpi.free({"cost_myr": "0"}))
        self.assertTrue(kpi.free({"cost_myr": ""}))
        self.assertFalse(kpi.free({"cost_myr": "120"}))


if __name__ == "__main__":
    unittest.main()
