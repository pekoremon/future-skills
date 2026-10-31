import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

import clarity_kpi as k  # noqa: E402

HEADER = ["Timestamp", "Year of study and programme", k.Q_JOB, k.Q_SKILLS, k.Q_COURSE, k.Q_CONF,
          "Which IT area are you strongest in?", k.Q_JOB, k.Q_SKILLS, k.Q_COURSE, k.Q_CONF]


def row(before: tuple, after: tuple) -> list[str]:
    return ["2026/10/31", "Year 3, CS", *before, "Software", *after]


class TestClarity(unittest.TestCase):
    def test_answers(self):
        self.assertFalse(k.real("Not sure"))
        self.assertFalse(k.real("  idk. "))
        self.assertTrue(k.real("Data Analyst"))
        self.assertEqual(k.skill_count("SQL and Power BI"), 2)
        self.assertEqual(k.skill_count("Python, not sure"), 1)
        self.assertEqual(k.skill_count("Python"), 1)

    def test_before_and_after(self):
        rows = [HEADER,
                row(("not sure", "not sure", "not sure", "2"), ("Data Analyst", "SQL, Power BI", "Google Data Analytics", "4")),
                row(("Software Developer", "Java, Git", "CS50", "3"), ("Software Developer", "Docker and AWS", "AWS Skill Builder", "5")),
                row(("not sure", "Python", "not sure", "1"), ("Cloud engineer", "Linux", "not sure", "3")),
                ["", "", "", "", "", "", "", "", "", "", ""]]
        r = k.measure(rows)
        self.assertEqual(r["n"], 3)
        self.assertAlmostEqual(r["before"], 100 / 3)
        self.assertAlmostEqual(r["after"], 200 / 3)
        self.assertEqual(r["conf_before"], 2.0)
        self.assertEqual(r["conf_after"], 4.0)

    def test_needs_before_and_after_columns(self):
        with self.assertRaises(SystemExit):
            k.measure([[k.Q_JOB, k.Q_SKILLS, k.Q_COURSE, k.Q_CONF]])


if __name__ == "__main__":
    unittest.main()
