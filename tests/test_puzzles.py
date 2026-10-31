import json
import sys
import unittest
from datetime import date
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

import main  # noqa: E402
import puzzles  # noqa: E402

VIDEO = "https://www.youtube.com/playlist?list=PLhQjrBD2T383q7Vn8QnTsVgSvyLpsqL_R"


def call(method, path, payload=None):
    res = main.dispatch(method, path, b"" if payload is None else json.dumps(payload).encode())
    return res.status, json.loads(res.body)


class NoLLM(unittest.TestCase):
    """Every test runs without an API key, so only the bank is used."""

    def setUp(self):
        patcher = mock.patch.object(puzzles.explain, "configured", return_value=False)
        patcher.start()
        self.addCleanup(patcher.stop)
        puzzles._daily.clear()


class TestBank(NoLLM):
    def test_four_puzzles_per_area_and_level(self):
        menu = puzzles.summary()
        self.assertEqual([a["id"] for a in menu["areas"]], puzzles.AREAS)
        for a in menu["areas"]:
            self.assertEqual(a["counts"], {"easy": 4, "medium": 4, "hard": 4}, a["id"])

    def test_every_puzzle_is_well_formed(self):
        ids = set()
        for p in puzzles.load_bank()["puzzles"]:
            self.assertNotIn(p["id"], ids)
            ids.add(p["id"])
            self.assertEqual(puzzles.valid_puzzle(p)["correct"], p["correct"])  # same checks as LLM puzzles

    def test_public_puzzle_hides_the_answer(self):
        _, data = call("GET", "/api/puzzles/round?area=cybersecurity&level=easy")
        self.assertEqual(len(data["puzzles"]), 4)
        for p in data["puzzles"]:
            self.assertFalse({"correct", "wrong", "explain"} & set(p))
            self.assertEqual(len(p["options"]), 4)

    def test_options_are_shuffled_so_the_answer_moves(self):
        spots = {puzzles.shuffled(p, p["id"])[1] for p in puzzles.load_bank()["puzzles"]}
        self.assertEqual(spots, {0, 1, 2, 3})


class TestCheck(NoLLM):
    def test_right_and_wrong_answers(self):
        p = puzzles.by_id()["DA-H2"]
        options, answer = puzzles.shuffled(p, p["id"])
        status, right = call("POST", "/api/puzzles/check", {"id": "DA-H2", "choice": answer})
        self.assertEqual(status, 200)
        self.assertTrue(right["correct"])
        self.assertEqual(right["points"], 30)
        self.assertEqual(options[right["answer"]], "Precision 0.8, recall 0.4")
        _, wrong = call("POST", "/api/puzzles/check", {"id": "DA-H2", "choice": (answer + 1) % 4})
        self.assertFalse(wrong["correct"])
        self.assertEqual(wrong["points"], 0)

    def test_bad_requests(self):
        self.assertEqual(call("POST", "/api/puzzles/check", {"id": "nope", "choice": 0})[0], 400)
        self.assertEqual(call("POST", "/api/puzzles/check", {"id": "SE-E1", "choice": 4})[0], 400)
        self.assertEqual(call("POST", "/api/puzzles/check", {"id": "SE-E1", "choice": True})[0], 400)
        self.assertEqual(call("GET", "/api/puzzles/round?area=games&level=easy")[0], 400)


class TestDaily(NoLLM):
    def test_daily_without_llm_comes_from_the_bank_and_is_stable(self):
        day = date(2026, 11, 1)
        with mock.patch.object(puzzles, "today", return_value=day):
            _, a = call("GET", "/api/puzzles/daily")
            _, b = call("GET", "/api/puzzles/daily")
            self.assertEqual(a, b)
            self.assertEqual(a["source"], "bank")
            self.assertEqual((a["area"], a["level"]), puzzles.daily_plan(day))
            stored = puzzles._daily["2026-11-01"]
            answer = puzzles.shuffled(stored, stored["id"])[1]
            _, r = call("POST", "/api/puzzles/daily/check", {"date": "2026-11-01", "choice": answer})
            self.assertTrue(r["correct"])
            self.assertEqual(r["points"], 2 * puzzles.load_bank()["levels"][a["level"]]["points"])
            self.assertEqual(call("POST", "/api/puzzles/daily/check", {"date": "2026-11-02", "choice": 0})[0], 400)

    def test_area_changes_every_day(self):
        days = [date(2026, 11, d) for d in range(1, 6)]
        self.assertEqual({puzzles.daily_plan(d)[0] for d in days}, set(puzzles.AREAS))

    def test_llm_puzzle_is_validated(self):
        good = {"kind": "Spot the bug", "prompt": "Q?", "code": "", "correct": "A", "wrong": ["B", "C", "D"], "explain": "Why."}
        self.assertEqual(puzzles.valid_puzzle(good)["wrong"], ["B", "C", "D"])
        for bad in ({**good, "wrong": ["B", "C"]}, {**good, "wrong": ["A", "C", "D"]}, {**good, "prompt": ""}, []):
            with self.assertRaises(ValueError):
                puzzles.valid_puzzle(bad)


class TestVideoQuiz(NoLLM):
    def answers(self, quiz_id):
        quiz = puzzles._quizzes[quiz_id]
        return [puzzles.shuffled(q, f"{quiz_id}|{q['id']}")[1] for q in quiz["questions"]]

    def test_five_questions_and_four_to_pass(self):
        status, quiz = call("POST", "/api/puzzles/video", {"url": VIDEO})
        self.assertEqual(status, 200)
        self.assertEqual(len(quiz["questions"]), 5)
        self.assertEqual(quiz["pass_mark"], 4)
        right = self.answers(quiz["quiz_id"])
        one_wrong = [*right[:4], (right[4] + 1) % 4]
        _, r = call("POST", "/api/puzzles/video/check", {"quiz_id": quiz["quiz_id"], "answers": one_wrong})
        self.assertEqual((r["score"], r["passed"]), (4, True))
        two_wrong = [*right[:3], (right[3] + 1) % 4, (right[4] + 1) % 4]
        _, r = call("POST", "/api/puzzles/video/check", {"quiz_id": quiz["quiz_id"], "answers": two_wrong})
        self.assertEqual((r["score"], r["passed"]), (3, False))

    def test_bad_requests(self):
        self.assertEqual(call("POST", "/api/puzzles/video", {"url": "https://example.com"})[0], 400)
        self.assertEqual(call("POST", "/api/puzzles/video/check", {"quiz_id": "nope", "answers": [0] * 5})[0], 400)
        _, quiz = call("POST", "/api/puzzles/video", {"url": VIDEO})
        self.assertEqual(call("POST", "/api/puzzles/video/check", {"quiz_id": quiz["quiz_id"], "answers": [0]})[0], 400)


if __name__ == "__main__":
    unittest.main()
