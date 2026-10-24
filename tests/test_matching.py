import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

import interest
from matching import (AREA_WEIGHTS, SCENARIOS, area_fit, interest_score, it_roles, learning_path,
                      load_data, match_student, rank_roles, rating_to_level, role_area, role_trend,
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
    def test_test_area_scores_use_the_report_area_score(self):
        report = {"domains": [{"id": "a", "profile": 67, "tested_in_depth": True, "readiness": 100,
                               "area_score": 86.8},
                              {"id": "b", "profile": 33, "tested_in_depth": False, "area_score": 33.0}]}
        self.assertEqual(test_area_scores(report), {"a": 86.8, "b": 33.0})

    def test_tie_goes_to_the_area_tested_in_depth(self):
        fit = area_fit({"test_areas": {"a": 40, "b": 40, "c": 0}, "test_in_depth": ["b", "c"]}, AREAS)
        self.assertEqual(fit["best"], "b")

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
                       "skills": {"SK020": 4.0}, "technologies": ["SK145"]}

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
        self.assertEqual(role_area({"onet_soc": "15-1252.00", "subfield_code": ""}, soc), "software_dev")
        self.assertEqual(role_area({"onet_soc": "15-1252.00", "subfield_code": "WD"}, soc), "web_ux")
        self.assertIsNone(role_area({"onet_soc": "29-1141.00"}, soc))

    def test_every_role_has_an_area_and_interest_scores(self):
        self.assertEqual(len(it_roles(self.data)), len(self.data["roles"]))
        self.assertTrue(all(r["interest_scores"] for r in self.data["roles"]))

    def test_interest_same_shape_scores_100(self):
        role = {"interest_scores": dict(zip("RIASEC", [2, 6, 1, 2, 2, 5])), "riasec_code_onet": "IC"}
        score, why = interest_score(dict(zip("RIASEC", [4, 12, 2, 4, 4, 10])), role)
        self.assertEqual(score, 100.0)
        self.assertIn("shared: IC", why)
        self.assertIsNone(interest_score(dict.fromkeys("RIASEC", 3), role)[0])

    def test_questionnaire_feeds_preferences_and_role_interest(self):
        items = interest.load_items()["items"]
        answers = [5 if i["area"] == "web_ux" or i["type"] == "A" else 2 for i in items]
        profile = {**self.profile, "test_areas": None, "interest": interest.score(answers)}
        result = match_student(profile, self.data)
        self.assertEqual(result["best"], "web_ux")
        self.assertEqual(result["sources_used"], ["preference"])
        game = next(m for m in result["roles"] if m["role_id"] == "IT22")  # Video Game Designers, AIE
        web = next(m for m in result["roles"] if m["role_id"] == "IT20")   # Web Developers, CIA
        self.assertGreater(game["components"]["interest"]["score"], web["components"]["interest"]["score"])

    def test_same_answer_questionnaire_is_left_out(self):
        profile = {"interest": interest.score([3] * 36)}
        result = match_student(profile, self.data)
        self.assertEqual(result["sources_used"], [])
        self.assertIn("same_answer", [i["type"] for i in result["insights"]])
        self.assertIn("interest_not_scored", result["roles"][0]["flags"])

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
        role = {"role_id": "IT01", "it_area": "software_dev"}
        self.assertEqual(role_trend(role, {"IT01": 70, "software_dev": 60})[0], 70)
        self.assertEqual(role_trend(role, {"software_dev": 60, "generic_tech": 50})[0], 60)
        self.assertEqual(role_trend(role, {"generic_tech": 55})[0], 55)
        self.assertFalse(role_trend(role, {})[2])

    def test_trend_change_changes_score(self):
        base = {m["role_id"]: m["total"] for m in rank_roles(self.profile, self.data)}
        boom = {**self.data["trend_scores"], "IT05": 100.0}
        after = {m["role_id"]: m["total"] for m in rank_roles(self.profile, self.data, boom)}
        self.assertGreater(after["IT05"], base["IT05"])
        self.assertEqual(after["IT01"], base["IT01"])

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
