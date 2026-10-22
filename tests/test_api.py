import sys
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

try:
    import main
except ImportError:  # Flask not installed
    main = None


@unittest.skipIf(main is None, "Flask is not installed (pip install -r requirements.txt)")
class TestApi(unittest.TestCase):
    def setUp(self):
        self.client = main.app.test_client()

    def test_health_and_index(self):
        self.assertEqual(self.client.get("/api/health").json, {"status": "ok"})
        self.assertIn("/api/match", self.client.get("/api").json["endpoints"])
        page = self.client.get("/")
        self.assertIn(b"<!doctype html>", page.data.lower())
        page.close()

    def test_questionnaire_items(self):
        q = self.client.get("/api/questionnaire").json
        self.assertEqual(len(q["items"]), 30)
        self.assertEqual(sorted({i["type"] for i in q["items"]}), sorted("RIASEC"))

    def test_skills_filter(self):
        techs = self.client.get("/api/skills?type=technology").json
        self.assertTrue(techs)
        self.assertTrue(all(s["skill_type"] == "technology" for s in techs))

    def test_role_detail(self):
        r = self.client.get("/api/roles/R11").json
        self.assertEqual(r["role"]["role_name_en"], "Data Scientists")
        self.assertEqual(r["domain"], "generic_tech")
        self.assertTrue(r["skills"] and r["technologies"] and r["sdg"])
        self.assertEqual(self.client.get("/api/roles/R99").status_code, 404)

    def test_questionnaire_score(self):
        answers = [{"type": t, "value": 4 if t == "I" else 1} for t in "RIASEC" for _ in range(5)]
        r = self.client.post("/api/questionnaire/score", json={"answers": answers}).json
        self.assertEqual(r["riasec"]["I"], 20)
        self.assertEqual(r["code"][0], "I")

    def test_questionnaire_rejects_bad_answer(self):
        r = self.client.post("/api/questionnaire/score", json={"answers": [{"type": "X", "value": 3}]})
        self.assertEqual(r.status_code, 400)

    def test_match_from_answers_and_ratings(self):
        answers = [{"type": t, "value": v} for t, v in zip("RIASEC", [1, 4, 0, 1, 1, 3])]
        r = self.client.post("/api/match", json={
            "answers": answers, "skill_ratings": {"SK022": 4}, "technologies": ["SK130"], "top": 3})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.json["results"]), 3)
        self.assertEqual(r.json["riasec_code"][0], "I")
        first = r.json["results"][0]
        self.assertIn("components", first)
        self.assertIn("skill_detail", first)

    def test_match_sample_profile(self):
        r = self.client.post("/api/match", json={"profile_id": "P01", "top": 1})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.json["results"]), 1)
        self.assertEqual(r.json["scenario"]["id"], "baseline")
        self.assertIn("pathway", r.json["results"][0])

    def test_match_scenario_and_hours(self):
        r = self.client.post("/api/match", json={"profile_id": "P01", "scenario": "fast_ai",
                                                 "hours_per_week": 10})
        self.assertEqual(r.status_code, 200)
        first = r.json["results"][0]
        self.assertEqual(first["rank"], 1)
        self.assertIn("baseline_rank", first)
        self.assertEqual(first["pathway"]["hours_per_week"], 10)
        bad = self.client.post("/api/match", json={"profile_id": "P01", "scenario": "doom"})
        self.assertEqual(bad.status_code, 400)
        self.assertEqual(len(self.client.get("/api/scenarios").json), 3)

    def test_match_rejects_unknown_ids(self):
        r = self.client.post("/api/match", json={"riasec": dict.fromkeys("RIASEC", 1),
                                                 "skills": {"SK999": 3}})
        self.assertEqual(r.status_code, 400)
        r = self.client.post("/api/match", json={"riasec": dict.fromkeys("RIASEC", 1),
                                                 "technologies": ["SK001"]})
        self.assertEqual(r.status_code, 400)
        self.assertEqual(self.client.post("/api/match", json={}).status_code, 400)

    def test_trends(self):
        r = self.client.get("/api/trends?domain=finance").json
        self.assertEqual([s["domain"] for s in r["scores"]], ["finance"])
        self.assertTrue(all(s["entity_id"] == "finance" for s in r["signals"]))

    def test_update_starts_once(self):
        with mock.patch.object(main.threading, "Thread"):  # do not really fetch data
            first = self.client.post("/api/trends/update", json={})
            second = self.client.post("/api/trends/update", json={})
        self.assertEqual(first.status_code, 202)
        self.assertEqual(first.json["arxiv"], False)
        self.assertEqual(second.status_code, 409)
        main._update_lock.release()


if __name__ == "__main__":
    unittest.main()
