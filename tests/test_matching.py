import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

from matching import (ROLE_DOMAIN, SCENARIOS, interest_score, learning_path, load_data,
                      rank_roles, rating_to_level, scenario_trend_scores, skill_score)

SKILLS = {"S1": {"skill_name": "One"}, "S2": {"skill_name": "Two"}, "T1": {"skill_name": "Tech"},
          "S3": {"skill_name": "Three"}}
ROWS = [
    {"skill_id": "S1", "row_type": "skill_knowledge", "importance": "4", "level": "4"},
    {"skill_id": "S2", "row_type": "skill_knowledge", "importance": "2", "level": "4"},
    {"skill_id": "S3", "row_type": "skill_knowledge", "importance": "5", "level": ""},
    {"skill_id": "T1", "row_type": "in_demand_tech", "importance": "", "level": ""},
]
ROLE = {"riasec_code_onet": "IC", "score_R": "2", "score_I": "6", "score_A": "1",
        "score_S": "2", "score_E": "2", "score_C": "5"}


class TestMatching(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = load_data()
        cls.profile = {"profile_id": "T", "name": "Test", "education_job_zone": 4,
                       "riasec": {"R": 10, "I": 20, "A": 5, "S": 8, "E": 9, "C": 18},
                       "skills": {"SK022": 4.0}, "technologies": ["SK130"]}

    def test_interest_same_shape_scores_100(self):
        score, why = interest_score({"R": 4, "I": 12, "A": 2, "S": 4, "E": 4, "C": 10}, ROLE)
        self.assertEqual(score, 100.0)
        self.assertIn("shared: IC", why)

    def test_interest_flat_answers_not_scored(self):
        score, _ = interest_score({k: 3 for k in "RIASEC"}, ROLE)
        self.assertIsNone(score)

    def test_skill_score_weights_importance_and_skips_suppressed_level(self):
        result = skill_score({"skills": {"S1": 4, "S2": 2}, "technologies": []}, ROWS, SKILLS)
        # rated = (4*1 + 2*0.5) / (4+2) = 83.3; tech = 0; S3 has no level and is skipped
        self.assertEqual(result["rated_score"], 83.3)
        self.assertEqual(result["tech_score"], 0.0)
        self.assertEqual(result["score"], round(0.7 * 500 / 6, 1))
        self.assertEqual([g["skill_id"] for g in result["gaps"]], ["S2"])
        self.assertEqual(result["tech_missing"][0]["skill_id"], "T1")

    def test_rating_to_level(self):
        self.assertEqual(rating_to_level(5), 7.0)
        self.assertEqual(rating_to_level(0), 0.0)

    def test_every_role_is_ranked_with_sdg(self):
        ranked = rank_roles(self.profile, self.data)
        self.assertEqual(len(ranked), len(self.data["roles"]))
        for m in ranked:
            self.assertTrue(0 <= m["total"] <= 100)
            self.assertTrue(m["sdg"], m["role_id"])

    def test_role_domains_exist_in_trend_scores(self):
        roles = {r["role_id"] for r in self.data["roles"]}
        self.assertTrue(set(ROLE_DOMAIN) <= roles)
        self.assertTrue(set(ROLE_DOMAIN.values()) <= set(self.data["trend_scores"]))

    def test_flagged_roles_rank_after_others(self):
        tiers = [2 if "not_for_it_graduates" in m["flags"]
                 else 1 if "needs_extra_education" in m["flags"] else 0
                 for m in rank_roles(self.profile, self.data)]
        self.assertEqual(tiers, sorted(tiers))

    def test_trend_scenario_changes_score(self):
        base = {m["role_id"]: m["total"] for m in rank_roles(self.profile, self.data)}
        boom = dict(self.data["trend_scores"], agriculture=100.0)
        after = {m["role_id"]: m["total"] for m in rank_roles(self.profile, self.data, boom)}
        self.assertGreater(after["R06"], base["R06"])
        self.assertEqual(after["R01"], base["R01"])

    def test_baseline_scenario_matches_trend_score_file(self):
        self.assertEqual(scenario_trend_scores(self.data, "baseline"), self.data["trend_scores"])

    def test_scenarios_reweight_only_measured_parts(self):
        for name in SCENARIOS:
            scores = scenario_trend_scores(self.data, name)
            for domain, parts in self.data["trend_parts"].items():
                if None in parts.values():  # one part only: same score in every scenario
                    self.assertEqual(scores[domain], self.data["trend_scores"][domain])
        fin = self.data["trend_parts"]["finance"]
        fast = scenario_trend_scores(self.data, "fast_ai")["finance"]
        local = scenario_trend_scores(self.data, "local_demand")["finance"]
        self.assertEqual((fast > local), (fin["ai"] > fin["demand"]))

    def test_learning_path_dedupes_courses_and_skips_small_gaps(self):
        courses = {"S1": [{"course_id": "C1", "title": "Course", "provider": "P", "url": "https://x",
                           "duration_hours": "4", "cost_myr": "0", "hrd_corp_claimable": "unknown",
                           "verified_date": "2026-10-23"}]}
        courses["S2"] = courses["S1"]
        skill = {"gaps": [{"skill_id": "S1", "skill_name": "One", "level_needed": 4, "your_level": 1},
                          {"skill_id": "S2", "skill_name": "Two", "level_needed": 4, "your_level": 2},
                          {"skill_id": "S3", "skill_name": "Three", "level_needed": 4, "your_level": 3.8}],
                 "tech_missing": [{"skill_id": "T9", "skill_name": "Tool"}]}
        path = learning_path(skill, courses, hours_per_week=2)
        self.assertEqual(len(path["steps"]), 1)
        self.assertEqual(path["steps"][0]["skills"], ["One", "Two"])
        self.assertEqual((path["total_hours"], path["weeks"]), (4.0, 2.0))
        self.assertEqual([g["skill_id"] for g in path["gaps_without_course"]], ["T9"])

    def test_every_course_skill_exists(self):
        for sid in self.data["courses"]:
            self.assertIn(sid, self.data["skills"])


if __name__ == "__main__":
    unittest.main()
