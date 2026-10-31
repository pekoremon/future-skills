import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

import learning  # noqa: E402
import matching  # noqa: E402


class TestLearning(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = matching.load_data()

    def test_every_role_has_a_page_with_links(self):
        for role in self.data["roles"]:
            p = learning.page(role["role_id"], self.data)
            links = [r for st in p["stages"] for r in st["resources"]] + \
                    [r for s in p["skills"] for r in s["resources"]]
            self.assertTrue(p["stages"][0]["resources"], role["role_id"])  # foundations for every area
            self.assertTrue(all(r["url"].startswith("https://") for r in links))
            self.assertLessEqual(len(p["skills"]), learning.MAX_SKILLS)

    def test_every_role_has_project_ideas(self):
        for role in self.data["roles"]:
            p = learning.page(role["role_id"], self.data)
            self.assertGreaterEqual(len(p["projects"]), 2, role["role_id"])
            self.assertTrue(all(x["title"] and x["description"] for x in p["projects"]))

    def test_path_lists_its_sdg_targets(self):
        for role in self.data["roles"]:
            p = learning.page(role["role_id"], self.data)
            own = {s["target"] for s in self.data["sdg"].get(("role", role["role_id"]), [])}
            self.assertEqual({t["target"] for t in p["sdg"] if t["role"]}, own)
            self.assertTrue(own, role["role_id"])  # every role is tagged to at least one SDG
            skill_ids = {s["skill_id"] for s in p["skills"]}
            self.assertTrue(all(k["skill_id"] in skill_ids for t in p["sdg"] for k in t["skills"]))
            self.assertEqual([bool(t["role"]) for t in p["sdg"]], sorted((bool(t["role"]) for t in p["sdg"]), reverse=True))

    def test_paid_hrd_corp_courses_stay_out_of_the_free_plan(self):
        paid = {c["url"] for cs in self.data["courses"].values() for c in cs if not matching.is_free(c)}
        self.assertTrue(paid)
        for role in self.data["roles"]:
            p = learning.page(role["role_id"], self.data)
            free = [r for st in p["stages"] for r in st["resources"]] + [r for s in p["skills"] for r in s["resources"]]
            self.assertFalse(paid & {r["url"] for r in free}, role["role_id"])
            self.assertTrue(all(c["url"] in paid and c["cost_myr"] > 0 for c in p["hrd_corp_options"]))
            self.assertEqual(len({c["url"] for c in p["hrd_corp_options"]}), len(p["hrd_corp_options"]))
        cloud = learning.page("IT15", self.data)
        self.assertTrue(any("AWS" in c["title"] for c in cloud["hrd_corp_options"]))

    def test_role_specific_resources(self):
        game = learning.page("IT22", self.data)
        self.assertTrue(any("Unity" in r["title"] for r in game["stages"][1]["resources"]))
        self.assertIsNone(learning.page("R99", self.data))

    def test_linked_technologies_come_first(self):
        skills = learning.page("IT22", self.data)["skills"]
        kinds = [s["kind"] for s in skills if s["resources"]]
        self.assertEqual(kinds, sorted(kinds, key=lambda k: k != "technology"))

    def test_personal_page_uses_the_students_gaps(self):
        profile = {"skills": {}, "technologies": []}
        match = next(m for m in matching.rank_roles(profile, self.data) if m["role_id"] == "IT05")
        p = learning.page("IT05", self.data, match, hours_per_week=10)
        self.assertTrue(p["personal"])
        self.assertTrue(all("your_level" in s for s in p["skills"] if s["kind"] == "skill"))
        self.assertEqual(p["weeks"], round(p["total_hours"] / 10, 1))

    def test_unrated_skills_come_last(self):
        tools = [r["skill_id"] for r in self.data["role_skills"]["IT02"] if r["row_type"] == "in_demand_tech"]
        profile = {"skills": {"SK020": 2.0}, "technologies": tools}  # rated Programming only; has every tool
        match = next(m for m in matching.rank_roles(profile, self.data) if m["role_id"] == "IT02")
        skills = [s for s in learning.page("IT02", self.data, match)["skills"] if s["kind"] == "skill"]
        flags = [s["rated"] for s in skills]
        self.assertEqual(flags, sorted(flags, reverse=True))  # every rated skill before any unrated one
        self.assertEqual(skills[0]["skill_name"], "Programming")

    def test_skill_resources_feed_the_job_card_path(self):
        self.assertTrue(any(c["course_id"].startswith("L") for c in self.data["courses"]["SK059"]))  # AWS


if __name__ == "__main__":
    unittest.main()
