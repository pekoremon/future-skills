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

    def test_vendor_or_plain_word_alone_is_not_a_tool(self):
        self.assertEqual(names("Google Data Analytics Professional Certificate"), [])
        self.assertEqual(names("Skills: Adobe Photoshop"), ["Adobe Photoshop"])  # not Adobe XD too
        self.assertEqual(sorted(names("Google Analytics, Adobe XD")), ["Adobe XD", "Google Analytics"])


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


AREA_IDS = {a["id"] for a in matching.load_areas()}
INTERN = "Cleaned 3 years of crop yield records in Python and SQL and built a Power BI dashboard"
PROJECT = "Clinic queue tracker: a React and Node.js web app with a PostgreSQL database"
LLM_REPLY = {"summary": "You are a final-year student with a CGPA of 3.62.", "skills": ["Python"],
             "qualifications": [],
             "evidence": [{"area": "data_ai", "kind": "internship", "quote": INTERN},
                          {"area": "web_ux", "kind": "personal_project", "quote": PROJECT},
                          {"area": "cybersecurity", "kind": "work", "quote": "Led the bank's penetration testing team"}]}


class TestEvidence(unittest.TestCase):
    def test_quote_must_be_in_cv(self):
        items = [{"area": "data_ai", "kind": "internship", "quote": "  CLEANED 3 years of crop\n yield records  "},
                 {"area": "data_ai", "kind": "internship", "quote": "Cleaned 5 years of crop yield records"},
                 {"area": "data_ai", "kind": "internship", "quote": "Built a machine learning model for clinics"}]
        kept, dropped = cv_reader.checked_evidence(items, SAMPLE, AREA_IDS)
        self.assertEqual([e["quote"] for e in kept], ["CLEANED 3 years of crop\n yield records"])
        self.assertEqual(dropped, 2)

    def test_area_kind_length_and_repeats_checked(self):
        items = [{"area": "gardening", "kind": "internship", "quote": INTERN},
                 {"area": "data_ai", "kind": "hobby", "quote": INTERN},
                 {"area": "data_ai", "kind": "coursework", "quote": "Python"},
                 {"area": "data_ai", "kind": "internship", "quote": INTERN},
                 {"area": "data_ai", "kind": "internship", "quote": INTERN.upper()},
                 {"area": "software_dev", "kind": "internship", "quote": INTERN}]
        kept, dropped = cv_reader.checked_evidence(items, SAMPLE, AREA_IDS)
        self.assertEqual([(e["area"], e["points"]) for e in kept], [("data_ai", 35), ("software_dev", 35)])
        self.assertEqual(dropped, 4)

    def test_points_and_cap(self):
        p = cv_reader.EVIDENCE_POINTS
        self.assertLess(p["coursework"], p["personal_project"])
        self.assertEqual(p["personal_project"], p["competition"])
        self.assertEqual(p["competition"], p["certification"])
        self.assertLess(p["certification"], p["internship"])
        self.assertEqual(p["internship"], p["work"])
        ev = [{"area": "data_ai", "kind": k, "points": p[k]} for k in ("coursework", "certification", "internship")]
        scores, why = cv_reader.evidence_area_scores(ev, sorted(AREA_IDS))
        self.assertEqual(scores["data_ai"], 10 + 20 + 35)
        self.assertEqual(scores["web_ux"], 0)
        self.assertIn("3 CV evidence items", why["data_ai"])
        many = [{"area": "data_ai", "kind": "work", "points": p["work"]}] * 5
        self.assertEqual(cv_reader.evidence_area_scores(many, ["data_ai"])[0]["data_ai"], cv_reader.EVIDENCE_CAP)

    @mock.patch.object(cv_reader.explain, "api_key", return_value="")
    def test_fallback_scores_from_technologies(self, _):
        r = cv_reader.summarise({"text": SAMPLE}, SKILLS)
        self.assertEqual(r["cv_areas_method"], "technologies")
        self.assertEqual(r["evidence"], [])
        data = matching.load_data()
        expected, _ = matching.cv_area_scores([t["skill_id"] for t in r["technologies"]], data)
        self.assertEqual(r["cv_areas"], expected)
        self.assertEqual(max(r["cv_areas"], key=r["cv_areas"].get), "data_ai")

    @mock.patch.object(cv_reader.explain, "api_key", return_value="")
    def test_no_technologies_no_scores(self, _):
        r = cv_reader.summarise({"text": "Final-year student. Enjoys hiking and reading. " * 3}, SKILLS)
        self.assertEqual(r["cv_areas"], {})
        self.assertIsNone(r["cv_areas_method"])

    @mock.patch.object(cv_reader.explain, "api_key", return_value="test-key")
    def test_llm_evidence_scored_by_our_code(self, _):
        with mock.patch.object(cv_reader, "_call_llm", return_value=json.loads(json.dumps(LLM_REPLY))):
            r = cv_reader.summarise({"text": SAMPLE}, SKILLS)
        self.assertEqual(r["source"], "llm")
        self.assertEqual(r["cv_areas_method"], "llm_evidence")
        self.assertEqual(r["evidence_dropped"], 1)  # the invented penetration testing job
        self.assertEqual(r["cv_areas"], {"software_dev": 0, "data_ai": 35, "cybersecurity": 0,
                                         "cloud_infra": 0, "web_ux": 20, "it_mgmt": 0})

    @mock.patch.object(cv_reader.explain, "api_key", return_value="test-key")
    def test_llm_with_no_true_quote_falls_back_to_technologies(self, _):
        reply = {**LLM_REPLY, "evidence": [LLM_REPLY["evidence"][2]]}
        with mock.patch.object(cv_reader, "_call_llm", return_value=reply):
            r = cv_reader.summarise({"text": SAMPLE}, SKILLS)
        self.assertEqual(r["source"], "llm")
        self.assertEqual(r["cv_areas_method"], "technologies")
        self.assertEqual(r["evidence"], [])
        with mock.patch.object(cv_reader, "_call_llm", side_effect=TimeoutError):
            r = cv_reader.summarise({"text": SAMPLE}, SKILLS)
        self.assertEqual((r["source"], r["cv_areas_method"]), ("fallback", "technologies"))


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

    @mock.patch.object(cv_reader.explain, "api_key", return_value="test-key")
    def test_cv_areas_returned_and_used_by_match(self, _):
        with mock.patch.object(cv_reader, "_call_llm", return_value=json.loads(json.dumps(LLM_REPLY))):
            status, data = self.post({"text": SAMPLE})
        self.assertEqual(status, 200)
        self.assertEqual(data["cv_areas"]["data_ai"], 35)
        self.assertEqual([e["area"] for e in data["evidence"]], ["data_ai", "web_ux"])
        res = main.dispatch("POST", "/api/match", json.dumps({"cv_areas": data["cv_areas"], "top": 3}).encode())
        match = json.loads(res.body)
        self.assertEqual(res.status, 200)
        self.assertEqual(match["sources_used"], ["cv"])
        self.assertEqual(match["best"], "data_ai")
        area = next(a for a in match["areas"] if a["id"] == "data_ai")
        self.assertEqual(area["parts"]["cv"]["score"], 35)
        self.assertIn("from your CV", area["explain"])

    def test_tools_raise_cv_evidence_never_lower_it(self):
        data = matching.load_data()
        tools, _ = matching.cv_area_scores(["SK145"], data)
        merged, why = main.cv_and_tools({"web_ux": 70, "data_ai": 0}, ["SK145"], data)
        self.assertEqual(merged["web_ux"], max(70, tools["web_ux"]))
        self.assertEqual(merged["data_ai"], tools["data_ai"])
        self.assertIn("most-listed tools", why["data_ai"])
        self.assertEqual(main.cv_and_tools(None, [], data), ({}, {}))


    def test_bad_requests(self):
        self.assertEqual(self.post({})[0], 400)
        self.assertEqual(self.post({"text": "too short"})[0], 400)
        self.assertEqual(self.post({"docx_base64": "%%%"})[0], 400)


if __name__ == "__main__":
    unittest.main()
