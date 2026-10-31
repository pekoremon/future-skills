import base64
import io
import json
import sys
import unittest
import zipfile
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
sys.path.insert(0, str(ROOT / "src"))

import main  # noqa: E402
import project_check  # noqa: E402

SAMPLES = ROOT / "samples" / "prove_it"


def b64(path):
    return base64.b64encode(path.read_bytes()).decode()


def make_zip(files):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        for name, text in files.items():
            z.writestr(name, text)
    return base64.b64encode(buf.getvalue()).decode()


class TestUpload(unittest.TestCase):
    def test_sample_zip_read_without_top_folder(self):
        files, _ = project_check.upload_files({"zip_base64": b64(SAMPLES / "todo_app_pass.zip")})
        paths = {f["path"] for f in files}
        self.assertIn("app.py", paths)
        self.assertIn("tests/test_app.py", paths)
        self.assertIn("README.md", paths)

    def test_secrets_and_junk_not_read(self):
        files, other = project_check.upload_files({"zip_base64": make_zip({
            "app/main.py": "KEY = 'sk-abcdefghijklmnopqrstuvwx'\nprint('hello world, this is my app')\n",
            "app/.env": "PASSWORD=hunter2",
            "app/node_modules/x/index.js": "module.exports = 1",
            "app/logo.png": "not text"})})
        self.assertEqual([f["path"] for f in files], ["main.py"])
        self.assertIn("[key removed]", files[0]["text"])
        self.assertNotIn("hunter2", json.dumps(files))
        self.assertIn("app/.env", other)

    def test_personal_details_removed(self):
        files, _ = project_check.upload_files({"file": {"name": "notes.md", "text": "Contact me at aina@example.com or 012-345 6789 for this project."}})
        self.assertNotIn("aina@example.com", files[0]["text"])

    def test_limits(self):
        with self.assertRaisesRegex(project_check.ProjectError, "2 MB"):
            project_check.upload_files({"zip_base64": "A" * (project_check.MAX_UPLOAD_BYTES * 2)})
        with self.assertRaisesRegex(project_check.ProjectError, "limit is"):
            project_check.upload_files({"zip_base64": make_zip({f"f{i}.py": "x = 1" for i in range(project_check.MAX_ZIP_ENTRIES + 1)})})
        with self.assertRaisesRegex(project_check.ProjectError, "not a valid .zip"):
            project_check.upload_files({"zip_base64": base64.b64encode(b"plain text").decode()})
        with self.assertRaisesRegex(project_check.ProjectError, "no readable"):
            project_check.upload_files({"file": {"name": "a.txt", "text": "hi"}})

    def test_path_outside_the_zip_ignored(self):
        files, _ = project_check.upload_files({"zip_base64": make_zip({
            "../evil.py": "print('outside the folder, should be skipped')",
            "ok.py": "print('this file is inside the zip and is read')"})})
        self.assertEqual([f["path"] for f in files], ["ok.py"])


class TestCheck(unittest.TestCase):
    @mock.patch.object(project_check.explain, "api_key", return_value="")
    def test_basic_checks_without_llm(self, _):
        good = project_check.check({"project_id": "PR01", "zip_base64": b64(SAMPLES / "todo_app_pass.zip")})
        self.assertTrue(good["passed"])
        self.assertEqual(good["method"], "basic")
        bad = project_check.check({"project_id": "PR01", "zip_base64": b64(SAMPLES / "todo_app_incomplete.zip")})
        self.assertFalse(bad["passed"])
        self.assertEqual([c["met"] for c in bad["basic_checks"]], [True, False, False])  # no README, no tests

    @mock.patch.object(project_check.explain, "api_key", return_value="test-key")
    def test_met_needs_a_real_file(self, _):
        reply = {"summary": "A to-do app.", "next_steps": [], "requirements": [
            {"requirement": "Users sign up", "met": True, "file": "app.py", "note": "signup route"},
            {"requirement": "Tests", "met": True, "file": "made_up.py", "note": ""}]}
        with mock.patch.object(project_check, "_call_llm", return_value=reply):
            r = project_check.check({"project_id": "PR01", "zip_base64": b64(SAMPLES / "todo_app_pass.zip")})
        self.assertEqual(r["method"], "llm")
        self.assertEqual([x["met"] for x in r["requirements"]], [True, False])
        self.assertFalse(r["passed"])

    @mock.patch.object(project_check.explain, "api_key", return_value="test-key")
    def test_llm_failure_falls_back(self, _):
        with mock.patch.object(project_check, "_call_llm", side_effect=ValueError("bad json")):
            r = project_check.check({"project_id": "PR01", "zip_base64": b64(SAMPLES / "todo_app_pass.zip")})
        self.assertEqual(r["method"], "basic")
        self.assertIn("unexpected LLM reply", r["reason"])

    def test_unknown_project(self):
        with self.assertRaises(project_check.ProjectError):
            project_check.check({"project_id": "nope", "file": {"name": "a.py", "text": "print('x' * 100)"}})

    @mock.patch.object(project_check.explain, "api_key", return_value="")
    def test_api_route(self, _):
        r = main.dispatch("POST", "/api/project/check", json.dumps(
            {"project_id": "PR01", "zip_base64": b64(SAMPLES / "todo_app_incomplete.zip")}).encode())
        self.assertEqual(r.status, 200)
        self.assertFalse(json.loads(r.body)["passed"])
        r = main.dispatch("POST", "/api/project/check", json.dumps({"project_id": "PR01"}).encode())
        self.assertEqual(r.status, 400)


if __name__ == "__main__":
    unittest.main()
