import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

from matching import (AREA_WEIGHTS, SCENARIOS, area_fit, it_roles, learning_path, load_data,
                      match_student, rank_roles, rating_to_level, role_area, role_trend,
                      scenario_trend_scores, skill_score, test_area_scores)

SKILLS = {"S1": {"skill_name": "One"}, "S2": {"skill_name": "Two"}, "T1": {"skill_name": "Tech"},
          "S3": {"skill_name": "Three"}}
ROWS = [
    {"skill_id": "S1", "row_type": "skill_knowledge", "importance": "4", "level": "4"},
    {"skill_id": "S2", "row_type": "skill_knowledge", "importance": "2", "level": "4"},
    {"skill_id": "S3", "row_type": "skill_knowledge", "importance": "5", "level": ""},
    {"skill_id": "T1", "row_type": "in_demand_tech", "importance": "", "level": ""},
]
AREAS = [{"id": i, "name": i.title(), "name_zh": "", "description": ""} for i in ("a", "b", "c")]


class TestAreaFit(unittest.TestCase):
    def test_test_area_scores_weights_deep_items(self):
        report = {"domains": [{"id": "a", "profile": 67, "tested_in_depth": True, "readiness": 100},
                              {"id": "b", "profile": 33, "tested_in_depth": False}]}
        self.assertEqual(test_area_scores(report), {"a": round(0.4 * 67 + 0.6 * 100, 1), "b": 33.0})

    def test_all_sources_use_the_area_weights(self):
        fit = area_fit({"test_areas": {"a": 100, "b": 0, "c": 0}, "preferences": {"a": 0, "b": 100, "c": 0},
                        "cv_areas": {"a": 0, "b": 0, "c": 100}}, AREAS)
        by_id = {a["id"]: a["fit"] for a in fit["areas"]}
        self.assertEqual(by_id, {"a": 45.0, "b": 30.0, "c": 25.0})
        self.assertEqual(fit["best"], "a")
        self.assertEqual(sum(AREA_WEIGHTS.values()), 1)

    def test_missing_source_is_left_out_not_filled(self):
        fit = area_fit({"test_areas": {"a": 80, "b": 40, "c": 20}}, AREAS)
        self.assertEqual([a["fit"] for a in fit["areas"]], [80.0, 40.0, 20.0])
        self.assertIsNone(fit["areas"][0]["parts"]["preference"]["score"])
        self.assertIn("one_source", [i["type"] for i in fit["insights"]])

    def test_mismatch_between_test_and_preference_is_reported(self):
        fit = area_fit({"test_areas": {"a": 90, "b": 40, "c": 10},
                        "preferences": {"a": 20, "b": 95, "c": 10}}, AREAS)
        mismatch = [i for i in fit["insights"] if i["type"] == "mismatch"]
        self.assertEqual(mismatch[0]["areas"], ["a", "b"])

    def test_no_answers_gives_no_area(self):
        fit = area_fit({}, AREAS)
        self.assertIsNone(fit["best"])
        self.assertEqual(fit["insights"], [])
        self.assertTrue(all(a["fit"] is None for a in fit["areas"]))


class TestMatching(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = load_data()
        cls.profile = {"profile_id": "T", "name": "Test", "education_job_zone": 4,
                       "test_areas": {"software_dev": 90, "data_ai": 40, "cybersecurity": 30,
                                      "cloud_infra": 30, "web_ux": 30, "it_mgmt": 30},
                       "skills": {"SK022": 4.0}, "technologies": ["SK130"]}

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

    def test_role_area_prefers_csv_column(self):
        soc = {"15-1252.00": "software_dev"}
        self.assertEqual(role_area({"onet_soc": "15-1252.00", "it_area": ""}, soc), "software_dev")
        self.assertEqual(role_area({"onet_soc": "15-1252.00", "it_area": "web_ux"}, soc), "web_ux")
        self.assertIsNone(role_area({"onet_soc": "29-1141.00"}, soc))

    def test_only_it_roles_are_ranked_with_sdg(self):
        ranked = rank_roles(self.profile, self.data)
        areas = {a["id"] for a in self.data["areas"]}
        self.assertEqual(len(ranked), len(it_roles(self.data)))
        self.assertTrue(ranked)
        for m in ranked:
            self.assertIn(m["it_area"], areas)
            self.assertTrue(0 <= m["total"] <= 100)
            self.assertTrue(m["sdg"], m["role_id"])

    def test_strong_area_lifts_its_roles(self):
        first = next(m for m in rank_roles(self.profile, self.data)
                     if "needs_extra_education" not in m["flags"])
        self.assertEqual(first["it_area"], "software_dev")

    def test_flagged_roles_rank_after_others(self):
        tiers = ["needs_extra_education" in m["flags"] for m in rank_roles(self.profile, self.data)]
        self.assertEqual(tiers, sorted(tiers))

    def test_trend_lookup_order(self):
        role = {"role_id": "R02", "it_area": "software_dev"}
        self.assertEqual(role_trend(role, {"R02": 70, "software_dev": 60})[0], 70)
        self.assertEqual(role_trend(role, {"software_dev": 60, "generic_tech": 50})[0], 60)
        self.assertEqual(role_trend(role, {"generic_tech": 55})[0], 55)
        self.assertFalse(role_trend(role, {})[2])

    def test_trend_change_changes_score(self):
        base = {m["role_id"]: m["total"] for m in rank_roles(self.profile, self.data)}
        boom = {**self.data["trend_scores"], "R11": 100.0}
        after = {m["role_id"]: m["total"] for m in rank_roles(self.profile, self.data, boom)}
        self.assertGreater(after["R11"], base["R11"])
        self.assertEqual(after["R02"], base["R02"])

    def test_baseline_scenario_matches_trend_score_file(self):
        self.assertEqual(scenario_trend_scores(self.data, "baseline"), self.data["trend_scores"])

    def test_scenarios_reweight_only_measured_parts(self):
        for name in SCENARIOS:
            scores = scenario_trend_scores(self.data, name)
            for key, parts in self.data["trend_parts"].items():
                if None in parts.values():  # one part only: same score in every scenario
                    self.assertEqual(scores[key], self.data["trend_scores"][key])

    def test_match_student_lists_areas_and_top_roles(self):
        result = match_student(self.profile, self.data)
        self.assertEqual(len(result["areas"]), 6)
        self.assertEqual(result["best"], "software_dev")
        ids = {m["role_id"] for m in result["roles"]}
        for a in result["areas"]:
            self.assertTrue(set(a["top_roles"]) <= ids)

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
