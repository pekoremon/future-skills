import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

import trend_score  # noqa: E402


def sig(signal, code, confidence, sid="S1"):
    return {"signal_id": sid, "signal": signal, "direction_code": str(code), "confidence": confidence}


class TestTrendScore(unittest.TestCase):
    def test_parts_are_confidence_weighted_directions(self):
        r = trend_score.score([sig("mycol_coverage", 1, "medium", "S1"), sig("dosm_online_ads", 0, "low", "S2"),
                               sig("arxiv_ai_paper_growth", 0, "medium", "S3")])
        # demand = 50 + 50 x (2/3 x 1 + 1/3 x 0) / (2/3 + 1/3) = 83.3; AI = 50
        self.assertEqual(r["my_demand_score"], 83.3)
        self.assertEqual(r["ai_momentum_score"], 50.0)
        self.assertEqual(r["trend_score"], round((83.3333 + 50) / 2, 1))
        self.assertEqual(r["input_signal_ids"], "S1;S2;S3")

    def test_no_data_is_left_out_not_filled(self):
        r = trend_score.score([sig("mycol_coverage", 1, "medium"), sig("arxiv_ai_paper_growth", 0, "none")])
        self.assertEqual(r["ai_momentum_score"], "no data")
        self.assertEqual(r["missing"], "ai_momentum")
        self.assertEqual(r["trend_score"], 100.0)

    def test_every_area_and_role_has_a_score(self):
        rows = trend_score.build()
        self.assertEqual({r["it_area"] for r in rows if not r["role_id"]}, set(trend_score.SUBFIELD_AREA.values()))
        self.assertEqual(len([r for r in rows if r["role_id"]]), 26)
        for r in rows:
            self.assertTrue(0 <= r["trend_score"] <= 100)

    def test_role_mycol_status_separates_roles_in_an_area(self):
        rows = {r["role_id"]: r for r in trend_score.build() if r["role_id"]}
        self.assertGreater(rows["IT01"]["my_demand_score"], rows["IT03"]["my_demand_score"])  # yes vs no


if __name__ == "__main__":
    unittest.main()
