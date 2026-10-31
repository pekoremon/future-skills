import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
sys.path.insert(0, str(ROOT / "src"))

import main  # noqa: E402
import matching  # noqa: E402
import whatif  # noqa: E402

DATA_FILES = ["trends.csv", "roles.csv", "trend_signals.csv", "trend_scores.csv"]
NO_CHANGE = {"inputs": {}, "mycol": {}}


def post(path, body):
    res = main.dispatch("POST", path, json.dumps(body).encode("utf-8"))
    return res.status, json.loads(res.body)


def listed(roles, groups):
    """The order the Matches page shows (app.js listedRoles): best-fit areas' roles, then can-do's."""
    group = {a["id"]: a["group"] for a in groups["areas"]}
    eligible = sorted((m for m in roles if not {"needs_extra_education", "not_for_it_graduates"} & set(m["flags"])),
                      key=lambda m: -m["total"])
    if groups["mode"] == "none":
        return eligible
    return [m for g in ("best_fit", "can_do") for m in eligible if group[m["it_area"]] == g]


class TestPipeline(unittest.TestCase):
    def test_unchanged_inputs_rebuild_the_data_files(self):
        """The what-if runs the same code as the real data: with no change it gives the files back."""
        signals, scores, _ = whatif.run(NO_CHANGE)
        for built, name in ((signals, "trend_signals.csv"), (scores, "trend_scores.csv")):
            rows = whatif.read(name)
            self.assertEqual(len(built), len(rows), name)
            for a, b in zip(built, rows):
                for k in b:
                    if k != "computed_date":
                        self.assertEqual(str(a[k]), b[k], f"{name} {k}")

    def test_every_example_changes_a_trend_score(self):
        data = matching.load_data()
        examples = whatif.examples()
        self.assertGreaterEqual(len(examples), 5)
        for e in examples:
            changes = whatif.validate(e["changes"])
            self.assertTrue(whatif.changed(changes), e["id"])
            _, scores, roles = whatif.run(changes)
            moved = whatif.score_changes(data, whatif.data_with(data, scores, roles), "baseline")
            self.assertTrue(moved, f"{e['id']} changes no trend score")

    def test_a_small_change_crosses_no_threshold_and_moves_the_score_a_little(self):
        item = next(i for i in whatif.editable() if i["area"] == "web_ux" and i["metric"] == "arxiv_ai_papers")
        signals, scores, roles = whatif.run({"inputs": {item["id"]: item["value"] + 10}, "mycol": {}})
        changed = whatif.signal_changes(signals, roles)
        self.assertEqual([s["direction_changed"] for s in changed], [False])
        data = matching.load_data()
        area = next(c for c in whatif.score_changes(data, whatif.data_with(data, scores, roles), "baseline")
                    if c["key"] == "web_ux")
        self.assertLess(abs(area["after"]["score"] - area["before"]["score"]), 1)

    def test_mycol_status_flows_into_the_role_score(self):
        data = matching.load_data()
        _, scores, roles = whatif.run({"inputs": {}, "mycol": {"IT01": "no"}})
        after = whatif.data_with(data, scores, roles)
        self.assertLess(after["trend_scores"]["IT01"], data["trend_scores"]["IT01"])
        self.assertEqual(next(r for r in after["roles"] if r["role_id"] == "IT01")["is_mycol"], "no")


class TestValidate(unittest.TestCase):
    def setUp(self):
        self.items = whatif.editable()
        self.ai = next(i for i in self.items if i["area"] == "data_ai" and i["metric"] == "arxiv_ai_papers")

    def test_rejects_bad_changes(self):
        for bad in ({"inputs": {"T0001": 5}},                       # not an editable input
                    {"inputs": {self.ai["id"]: -1}},                 # below 0
                    {"inputs": {self.ai["id"]: self.ai["max"] + 1}},  # more AI papers than papers
                    {"inputs": {self.ai["id"]: "12000"}},            # not a number
                    {"inputs": {self.ai["id"]: True}},
                    {"mycol": {"IT01": "maybe"}}, {"mycol": {"XX99": "yes"}},
                    {"inputs": [1]}, {"other": {}}, "x"):
            with self.subTest(bad=bad), self.assertRaises(whatif.WhatIfError):
                whatif.validate(bad, self.items)

    def test_drops_entries_equal_to_the_data(self):
        out = whatif.validate({"inputs": {self.ai["id"]: self.ai["value"]}, "mycol": {"IT01": "yes"}}, self.items)
        self.assertEqual(out, NO_CHANGE)
        self.assertFalse(whatif.changed(out))
        self.assertEqual(whatif.validate(None), NO_CHANGE)


class TestApi(unittest.TestCase):
    def test_lists_inputs_and_examples(self):
        res = main.dispatch("GET", "/api/whatif")
        d = json.loads(res.body)
        self.assertEqual(res.status, 200)
        kinds = {i["kind"] for i in d["inputs"]}
        self.assertEqual(kinds, {"number", "mycol"})
        self.assertEqual(len([i for i in d["inputs"] if i["kind"] == "mycol"]), 25)
        self.assertTrue(all(i["source_url"].startswith("https://") for i in d["inputs"] if i["kind"] == "number"))
        self.assertEqual(d["trend_weight"], matching.WEIGHTS["trend"])

    def test_data_ai_example_moves_data_scientists_up(self):
        example = next(e for e in whatif.examples() if e["id"] == "data_ai_research_up")
        status, d = post("/api/whatif", {"profile_id": "P01", "trend_changes": example["changes"]})
        self.assertEqual(status, 200)
        before = [m["role_id"] for m in listed(d["before"], d["groups"])]
        after = [m["role_id"] for m in listed(d["after"], d["groups"])]
        self.assertLess(after.index("IT05"), before.index("IT05"))
        b, a = (next(m for m in roles if m["role_id"] == "IT05") for roles in (d["before"], d["after"]))
        # AI papers +2.7% -> +20%: AI momentum 53.4 -> 75, so the trend score gains half of that
        self.assertEqual((b["trend"], a["trend"]), (71.3, 82.2))
        self.assertAlmostEqual(a["total"] - b["total"], (82.2 - 71.3) * matching.WEIGHTS["trend"], places=1)
        self.assertEqual([(s["signal"], s["after"]["direction"]) for s in d["signals"]], [("arxiv_ai_paper_growth", "up")])
        self.assertEqual(d["trend_scores"][0]["key"], "data_ai")

    def test_bad_trend_changes_are_refused(self):
        for bad in ({"inputs": {"T0001": 5}}, {"mycol": {"IT01": "maybe"}}, NO_CHANGE, None):
            with self.subTest(bad=bad):
                status, d = post("/api/whatif", {"profile_id": "P01", "trend_changes": bad})
                self.assertEqual(status, 400)
                self.assertIn("error", d)
        status, _ = post("/api/match", {"profile_id": "P01", "trend_changes": {"inputs": {"T0001": 5}}})
        self.assertEqual(status, 400)

    def test_match_with_changes_is_a_new_trend_data_version(self):
        changes = {"inputs": {}, "mycol": {"IT11": "yes"}}
        _, real = post("/api/match", {"profile_id": "P01"})
        _, what_if = post("/api/match", {"profile_id": "P01", "trend_changes": changes})
        self.assertFalse(real["trend_data"]["what_if"])
        self.assertTrue(what_if["trend_data"]["what_if"])
        self.assertNotEqual(real["trend_data"]["id"], what_if["trend_data"]["id"])
        for path in ("/api/explain", "/api/learn"):
            status, _ = post(path, {"profile_id": "P01", "role_id": "IT11", "trend_changes": changes})
            self.assertEqual(status, 200, path)

    def test_data_files_are_never_written(self):
        before = {n: (whatif.DATA / n).read_bytes() for n in DATA_FILES}
        for e in whatif.examples():
            post("/api/whatif", {"profile_id": "P02", "trend_changes": e["changes"]})
            post("/api/match", {"profile_id": "P02", "trend_changes": e["changes"]})
        self.assertEqual({n: (whatif.DATA / n).read_bytes() for n in DATA_FILES}, before)


if __name__ == "__main__":
    unittest.main()
