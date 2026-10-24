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

    def test_skill_resources_feed_the_job_card_path(self):
        self.assertTrue(any(c["course_id"].startswith("L") for c in self.data["courses"]["SK059"]))  # AWS


if __name__ == "__main__":
    unittest.main()
