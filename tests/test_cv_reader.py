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

import cv_reader  # noqa: E402
import main  # noqa: E402
import matching  # noqa: E402

SAMPLE = (ROOT / "src" / "static" / "sample_cv.txt").read_text(encoding="utf-8")
SKILLS = matching.load_data()["skills"]


def make_docx(paragraphs):
    ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
    body = "".join(f"<w:p><w:r><w:t>{p}</w:t></w:r></w:p>" for p in paragraphs)
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("word/document.xml", f'<w:document xmlns:w="{ns}"><w:body>{body}</w:body></w:document>')
    return buf.getvalue()


def names(text):
    return [t["matched"] for t in cv_reader.find_technologies(text, SKILLS)]


class TestFindTechnologies(unittest.TestCase):
    def test_sample_cv(self):
        found = names(SAMPLE)
        for term in ("Python", "SQL", "R", "Power BI", "Azure", "PostgreSQL", "Node.js"):
            self.assertIn(term, found)
        self.assertNotIn("Database", found)

    def test_short_names_need_context(self):
        self.assertEqual(names("Grade C in SPM, R&D team, CI/CD, Objective-C, go to market"), [])
        self.assertEqual(sorted(names("Languages: C, C++ and C#. Golang")), ["C", "C#", "C++", "Golang"])

    def test_java_is_not_javascript(self):
        self.assertEqual(names("JavaScript"), ["JavaScript"])
        self.assertEqual(names("GitHub"), ["GitHub"])


class TestSummarise(unittest.TestCase):
    def test_education_zone(self):
        self.assertEqual(cv_reader.education_zone(SAMPLE), 4)
        self.assertEqual(cv_reader.education_zone("Diploma in IT, 2024"), 3)
        self.assertEqual(cv_reader.education_zone("MSc Data Science"), 5)
        self.assertIsNone(cv_reader.education_zone("SPM 2020"))

    def test_docx(self):
        data = make_docx(["Bachelor of IT", "Skills: Python, Docker"])
        self.assertEqual(cv_reader.docx_text(data), "Bachelor of IT\nSkills: Python, Docker")
        with self.assertRaises(cv_reader.CVError):
            cv_reader.docx_text(b"not a zip")

    @mock.patch.object(cv_reader.explain, "api_key", return_value="")
    def test_fallback_without_key(self, _):
        r = cv_reader.summarise({"text": SAMPLE}, SKILLS)
        self.assertEqual(r["source"], "fallback")
        self.assertTrue(r["summary"])
        self.assertTrue(any("Bachelor" in q["title"] for q in r["qualifications"]))

    @mock.patch.object(cv_reader.explain, "api_key", return_value="test-key")
    def test_llm_reply_used(self, _):
        reply = {"summary": "You are a final-year student with a CGPA of 3.62.",
                 "skills": ["Python", "Power BI"],
                 "qualifications": [{"title": "Bachelor of Computer Science", "institution": "Universiti Contoh Malaysia", "year": "2026"}]}
        with mock.patch.object(cv_reader, "_call_llm", return_value=reply):
            r = cv_reader.summarise({"text": SAMPLE}, SKILLS)
        self.assertEqual(r["source"], "llm")
        self.assertEqual(r["skills"], ["Python", "Power BI"])

    @mock.patch.object(cv_reader.explain, "api_key", return_value="test-key")
    def test_llm_reply_with_invented_number_rejected(self, _):
        reply = {"summary": "You have a CGPA of 3.95.", "skills": [], "qualifications": []}
        with mock.patch.object(cv_reader, "_call_llm", return_value=reply):
            r = cv_reader.summarise({"text": SAMPLE}, SKILLS)
        self.assertEqual(r["source"], "fallback")
        self.assertIn("3.95", r["reason"])


class TestCvApi(unittest.TestCase):
    def post(self, payload):
        res = main.dispatch("POST", "/api/cv/summary", json.dumps(payload).encode())
        return res.status, json.loads(res.body)

    @mock.patch.object(cv_reader.explain, "api_key", return_value="")
    def test_text_and_docx(self, _):
        status, data = self.post({"text": SAMPLE})
        self.assertEqual(status, 200)
        self.assertEqual(data["education_job_zone"], 4)
        docx = base64.b64encode(make_docx(SAMPLE.splitlines())).decode()
        status, data = self.post({"docx_base64": docx})
        self.assertEqual(status, 200)
        self.assertIn("SK145", [t["skill_id"] for t in data["technologies"]])

    def test_bad_requests(self):
        self.assertEqual(self.post({})[0], 400)
        self.assertEqual(self.post({"text": "too short"})[0], 400)
        self.assertEqual(self.post({"docx_base64": "%%%"})[0], 400)


if __name__ == "__main__":
    unittest.main()
