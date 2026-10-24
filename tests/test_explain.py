import json
import os
import sys
import unittest
import urllib.error
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

import explain  # noqa: E402
import matching  # noqa: E402


class TestExplain(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        data = matching.load_data()
        profile = json.loads((ROOT / "data" / "sample_profiles.json").read_text(encoding="utf-8"))[0]
        cls.match = next(m for m in matching.rank_roles(matching.with_interest(profile), data)
                         if m["role_id"] == "IT05")
        cls.facts = explain.build_facts(cls.match)

    def setUp(self):
        explain._cache.clear()

    def test_facts_hold_only_computed_values(self):
        self.assertEqual(self.facts["role"], "Data Scientists")
        self.assertEqual(self.facts["match_score"], self.match["total"])
        self.assertLessEqual(len(self.facts["learning_path"]), 3)

    def test_trend_direction_in_words(self):
        # Data Scientists: Malaysian demand above 50 (on MyCOL), AI momentum exactly 50 (flat arXiv growth)
        self.assertEqual(self.match["trend_parts"], {"demand": 100.0, "ai": 50.0})
        self.assertEqual(self.facts["trend_direction"], {"malaysian_demand": "positive", "ai_momentum": "neutral"})
        self.assertEqual([explain.direction(v) for v in (None, 20, 50, 80)],
                         ["no data", "negative", "neutral", "positive"])
        self.assertIn("AI momentum neutral", explain.fallback_text(self.facts))
        self.assertIn("never call it rising", explain.SYSTEM_PROMPT)
        self.assertIn("Do not predict the future", explain.SYSTEM_PROMPT)

    def test_predictions_are_found(self):
        for text in ("Opportunities in this field are likely to keep growing.",
                     "Demand will continue to rise.", "Jobs here keep growing.",
                     "This field is expected to grow in the coming years.", "A future-proof career."):
            self.assertTrue(explain.predictions(text), text)
        for text in ("This course will help you learn Python.", "You can grow your SQL skills.",
                     "The trend score describes recent data and is an estimate."):
            self.assertFalse(explain.predictions(text), text)

    def test_llm_reply_that_predicts_is_rejected(self):
        reply = "AI momentum is rising, so opportunities are likely to keep growing."
        with mock.patch.dict(os.environ, {"FIREWORKS_API_KEY": "test"}), \
                mock.patch.object(explain, "_call_llm", return_value=reply):
            r = explain.explain(self.match)
        self.assertEqual(r["source"], "fallback")
        self.assertIn("predicted the future", r["reason"])

    def test_unknown_numbers(self):
        score = self.facts["match_score"]
        self.assertEqual(explain.unknown_numbers(f"You score {score} of 100 by 2030.", self.facts), [])
        self.assertEqual(explain.unknown_numbers("It pays RM 8500 a month.", self.facts), ["8500"])

    def test_fallback_without_key(self):
        with mock.patch.dict(os.environ, {}, clear=True):
            r = explain.explain(self.match)
        self.assertEqual(r["source"], "fallback")
        self.assertIn("Data Scientists", r["text"])
        self.assertEqual(explain.unknown_numbers(r["text"], self.facts), [])

    def test_llm_reply_used_when_numbers_check_out(self):
        reply = f"Data Scientists fits you well: your match score is {self.facts['match_score']}."
        with mock.patch.dict(os.environ, {"FIREWORKS_API_KEY": "test"}), \
                mock.patch.object(explain, "_call_llm", return_value=reply) as call:
            first = explain.explain(self.match)
            second = explain.explain(self.match)
        self.assertEqual((first["source"], first["text"]), ("llm", reply))
        self.assertTrue(second.get("cached"))
        self.assertEqual(call.call_count, 1)

    def test_llm_reply_with_invented_number_is_rejected(self):
        with mock.patch.dict(os.environ, {"FIREWORKS_API_KEY": "test"}), \
                mock.patch.object(explain, "_call_llm", return_value="Data scientists earn RM 9123."):
            r = explain.explain(self.match)
        self.assertEqual(r["source"], "fallback")
        self.assertIn("9123", r["reason"])

    def test_api_error_falls_back(self):
        err = urllib.error.HTTPError(explain.API_URL, 401, "Unauthorized", None, None)
        with mock.patch.dict(os.environ, {"FIREWORKS_API_KEY": "bad"}), \
                mock.patch.object(explain, "_call_llm", side_effect=err):
            r = explain.explain(self.match)
        self.assertEqual((r["source"], r["reason"]), ("fallback", "LLM API error 401"))

    def test_request_shape(self):
        sent = {}

        class Reply:
            def __enter__(self):
                return self

            def __exit__(self, *a):
                return False

            def read(self):
                return json.dumps({"choices": [{"message": {"content": " Hi. "},
                                                "finish_reason": "stop"}]}).encode()

        def fake_urlopen(req, timeout):
            sent["url"], sent["auth"] = req.full_url, req.get_header("Authorization")
            sent["body"] = json.loads(req.data)
            return Reply()

        with mock.patch.dict(os.environ, {"FIREWORKS_API_KEY": "k", "FIREWORKS_MODEL": "m"}), \
                mock.patch.object(explain.urllib.request, "urlopen", fake_urlopen):
            self.assertEqual(explain._call_llm(self.facts), "Hi.")
        self.assertEqual(sent["url"], explain.API_URL)
        self.assertEqual(sent["auth"], "Bearer k")
        self.assertEqual(sent["body"]["model"], "m")
        self.assertIn("<facts>", sent["body"]["messages"][1]["content"])


if __name__ == "__main__":
    unittest.main()
