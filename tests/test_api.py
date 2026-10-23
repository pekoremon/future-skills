import json
import sys
import threading
import unittest
import urllib.request
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

import main  # noqa: E402


class Result:
    def __init__(self, res):
        self.status_code, self.data = res.status, res.body
        self.json = json.loads(res.body) if res.content_type.startswith("application/json") else None

    def close(self):
        pass


class Client:
    """Calls main.dispatch directly, like a test client."""

    def get(self, path):
        return Result(main.dispatch("GET", path))

    def post(self, path, json=None):
        return Result(main.dispatch("POST", path, b"" if json is None else _dumps(json)))


def _dumps(value):
    return json.dumps(value).encode("utf-8")


class TestApi(unittest.TestCase):
    def setUp(self):
        self.client = Client()

    def test_real_http_server(self):
        server = main.ThreadingHTTPServer(("127.0.0.1", 0), main.Handler)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        try:
            base = f"http://127.0.0.1:{server.server_address[1]}"
            with urllib.request.urlopen(base + "/api/health") as r:
                self.assertEqual(json.loads(r.read()), {"status": "ok"})
            req = urllib.request.Request(base + "/api/match", data=_dumps({"profile_id": "P01", "top": 1}),
                                         headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req) as r:
                self.assertEqual(len(json.loads(r.read())["results"]), 1)
            with urllib.request.urlopen(base + "/static/app.js") as r:
                self.assertIn("javascript", r.headers["Content-Type"])
        finally:
            server.shutdown()
            server.server_close()

    def test_static_files_stay_inside_static(self):
        self.assertEqual(self.client.get("/static/../main.py").status_code, 404)
        self.assertEqual(self.client.get("/static/style.css").status_code, 200)
        self.assertEqual(self.client.get("/nope").status_code, 404)
        self.assertEqual(self.client.get("/api/match").status_code, 405)

    def test_bad_json_body_is_400(self):
        res = Result(main.dispatch("POST", "/api/match", b"{not json"))
        self.assertEqual(res.status_code, 400)

    def test_health_and_index(self):
        self.assertEqual(self.client.get("/api/health").json, {"status": "ok"})
        self.assertIn("/api/match", self.client.get("/api").json["endpoints"])
        page = self.client.get("/")
        self.assertIn(b"<!doctype html>", page.data.lower())
        page.close()

    def test_questionnaire_items(self):
        q = self.client.get("/api/questionnaire").json
        self.assertEqual(len(q["items"]), 36)
        self.assertEqual(sorted({i["type"] for i in q["items"]}), sorted("RIASEC"))
        self.assertEqual(sorted(q["scale"]), ["1", "2", "3", "4", "5"])

    def test_skills_filter(self):
        techs = self.client.get("/api/skills?type=technology").json
        self.assertTrue(techs)
        self.assertTrue(all(s["skill_type"] == "technology" for s in techs))

    def test_role_detail(self):
        r = self.client.get("/api/roles/IT05").json
        self.assertEqual(r["role"]["role_name_en"], "Data Scientists")
        self.assertEqual(r["it_area"], "data_ai")
        self.assertTrue(r["skills"] and r["technologies"] and r["sdg"])
        self.assertEqual(self.client.get("/api/roles/R99").status_code, 404)

    def test_questionnaire_score(self):
        items = self.client.get("/api/questionnaire").json["items"]
        answers = [5 if i["type"] == "I" else 1 for i in items]
        r = self.client.post("/api/questionnaire/score", json={"answers": answers}).json
        self.assertEqual(r["riasec"]["I"], 30)
        self.assertEqual(r["code"][0], "I")
        self.assertEqual(len(r["area_items"]), 6)

    def test_questionnaire_rejects_bad_answer(self):
        r = self.client.post("/api/questionnaire/score", json={"answers": [3] * 35 + [6]})
        self.assertEqual(r.status_code, 400)
        r = self.client.post("/api/match", json={"interest_answers": [3] * 10})
        self.assertEqual(r.status_code, 400)

    def test_match_from_areas_and_ratings(self):
        r = self.client.post("/api/match", json={
            "preferences": {"data_ai": 90, "web_ux": 20}, "cv_areas": {"data_ai": 60},
            "skill_ratings": {"SK020": 4}, "technologies": ["SK145"], "top": 3})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.json["results"]), 3)
        self.assertEqual(r.json["best"], "data_ai")
        self.assertEqual(r.json["sources_used"], ["preference", "cv"])
        self.assertEqual(len(r.json["areas"]), 6)
        first = r.json["results"][0]
        self.assertIn("area", first["components"])
        self.assertIn("skill_detail", first)

    def test_match_from_interest_answers(self):
        items = self.client.get("/api/questionnaire").json["items"]
        answers = [5 if i["type"] in "IC" else 2 for i in items]
        r = self.client.post("/api/match", json={"interest_answers": answers, "top": 2})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json["sources_used"], ["preference"])
        self.assertIsNotNone(r.json["results"][0]["components"]["interest"]["score"])

    def test_match_regrades_the_skills_test(self):
        seed = self.client.get("/api/assessment/start").json["seed"]
        r = self.client.post("/api/match", json={"test": {"seed": seed, "responses": {}}})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json["sources_used"], ["test"])
        bad = self.client.post("/api/match", json={"test": {"seed": "x"}})
        self.assertEqual(bad.status_code, 400)

    def test_match_rejects_bad_area_scores(self):
        for body in ({"preferences": {"gardening": 50}}, {"cv_areas": {"data_ai": 150}},
                     {"test_areas": {"data_ai": True}}, {"preferences": [1, 2]}):
            self.assertEqual(self.client.post("/api/match", json=body).status_code, 400, body)

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
        r = self.client.post("/api/match", json={"skills": {"SK999": 3}})
        self.assertEqual(r.status_code, 400)
        r = self.client.post("/api/match", json={"technologies": ["SK001"]})
        self.assertEqual(r.status_code, 400)
        empty = self.client.post("/api/match", json={})  # nothing answered yet: skill and trend only
        self.assertEqual(empty.status_code, 200)
        self.assertEqual(empty.json["sources_used"], [])

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
