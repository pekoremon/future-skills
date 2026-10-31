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

    def test_parts_are_the_card_points(self):
        # the explanation must quote the numbers on the job card (points), not the raw 0-100 scores
        c = self.match["components"]
        self.assertEqual([self.facts[k] for k in ("area_fit", "interest_fit", "skill_fit", "trend_points")],
                         [c[k]["points"] for k in ("area", "interest", "skill", "trend")])
        self.assertAlmostEqual(sum(v for v in self.facts["max_points"].values() if v), 100, delta=0.2)
        with mock.patch.dict(os.environ, {}, clear=True):
            text = explain.explain(self.match)["text"]
        self.assertIn(f"skill fit {self.facts['skill_fit']:g} of {self.facts['max_points']['skill_fit']:g} points", text)

    def test_trend_direction_in_words(self):
        # Data Scientists: Malaysian demand well above 50 (on MyCOL), AI momentum near 50 (+2.7% arXiv growth)
        self.assertEqual(self.match["trend_parts"], {"demand": 89.3, "ai": 53.4})
        self.assertEqual(self.facts["trend_direction"], {"malaysian_demand": "positive", "ai_momentum": "neutral"})
        self.assertEqual([explain.direction(v) for v in (None, 20, 40, 50, 60, 80)],
                         ["no data", "negative", "neutral", "neutral", "neutral", "positive"])
        self.assertIn("AI momentum neutral", explain.fallback_text(self.facts))
        self.assertIn("never call it rising", explain.SYSTEM_PROMPT)
        self.assertIn("Do not predict the future", explain.SYSTEM_PROMPT)

    def test_predictions_are_found(self):
        for text in ("Opportunities in this field are likely to keep growing.",
                     "Demand will continue to rise.", "Jobs here keep growing.",
                     "This field is expected to grow in the coming years.", "A future-proof career.",
                     # a live reply, 2026-10-24
                     "Programmers are in strong demand now and will likely become even more important as AI tools evolve."):
            self.assertTrue(explain.predictions(text), text)
        for text in ("This course will help you learn Python.", "You can grow your SQL skills.",
                     "You will become more confident with SQL after this course.",
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

    def test_short_why_this_job(self):
        reply = f"Data Scientists suits you: your match score is {self.facts['match_score']}."
        with mock.patch.dict(os.environ, {"FIREWORKS_API_KEY": "test"}), \
                mock.patch.object(explain, "_call_llm", return_value=reply) as call:
            r = explain.explain(self.match, short=True)
        self.assertEqual((r["source"], r["text"]), ("llm", reply))
        facts, prompt = call.call_args.args
        self.assertIs(prompt, explain.SHORT_PROMPT)
        self.assertNotIn("biggest_gaps", facts)
        self.assertNotIn("learning_path", facts)
        self.assertIn("Do not predict the future", explain.SHORT_PROMPT)
        explain._cache.clear()
        with mock.patch.dict(os.environ, {}, clear=True):
            r = explain.explain(self.match, short=True)
        self.assertEqual(r["source"], "fallback")
        self.assertIn("strongest part", r["text"])
        self.assertEqual(explain.unknown_numbers(r["text"], self.facts), [])
        with mock.patch.dict(os.environ, {"FIREWORKS_API_KEY": "test"}), \
                mock.patch.object(explain, "_call_llm", return_value="word " * 120):
            self.assertEqual(explain.explain(self.match, short=True)["reason"], "reply too long")

    def test_llm_reply_with_invented_number_is_rejected(self):
        with mock.patch.dict(os.environ, {"FIREWORKS_API_KEY": "test"}), \
                mock.patch.object(explain, "_call_llm", return_value="Data scientists earn RM 9123."):
            r = explain.explain(self.match)
        self.assertEqual(r["source"], "fallback")
        self.assertIn("9123", r["reason"])

    def test_api_error_falls_back(self):
        err = urllib.error.HTTPError(explain.api_url(), 401, "Unauthorized", None, None)
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
        self.assertEqual(sent["url"], explain.DEFAULT_BASE_URL + "/chat/completions")
        self.assertEqual(sent["auth"], "Bearer k")
        self.assertEqual(sent["body"]["model"], "m")
        self.assertIn("<facts>", sent["body"]["messages"][1]["content"])

    def test_reasoning_models_get_their_own_parameters(self):
        msgs = [{"role": "user", "content": "hi"}]
        for model in ("gpt-5.4-mini", "gpt-6-sol", "o3-mini", "openai/gpt-5.5"):
            with mock.patch.dict(os.environ, {"LLM_MODEL": model}, clear=True):
                body = explain.chat_body(msgs, 100, 0.3)
            self.assertEqual((body["max_completion_tokens"], body["model"]), (100, model))
            self.assertNotIn("temperature", body)
            self.assertNotIn("max_tokens", body)
        for model in ("deepseek-v4-flash", "accounts/fireworks/models/gpt-oss-120b", "gpt-4o-mini"):
            with mock.patch.dict(os.environ, {"LLM_MODEL": model}, clear=True):
                body = explain.chat_body(msgs, 100, 0.3)
            self.assertEqual((body["max_tokens"], body["temperature"]), (100, 0.3), model)

    def test_any_openai_compatible_api(self):
        env = {"LLM_API_KEY": "kd", "LLM_BASE_URL": "https://litellm.rapidscreen.io/v1/",
               "LLM_MODEL": "gpt-4o-mini", "FIREWORKS_API_KEY": "fw"}
        with mock.patch.dict(os.environ, env, clear=True):
            self.assertEqual(explain.api_url(), "https://litellm.rapidscreen.io/v1/chat/completions")
            self.assertEqual((explain.api_key(), explain.model_name()), ("kd", "gpt-4o-mini"))
            self.assertEqual(explain.provider(), "litellm.rapidscreen.io")
        with mock.patch.dict(os.environ, {"FIREWORKS_API_KEY": "fw"}, clear=True):
            self.assertEqual((explain.api_key(), explain.model_name()), ("fw", explain.DEFAULT_MODEL))
            self.assertEqual(explain.provider(), "Fireworks AI")


if __name__ == "__main__":
    unittest.main()
