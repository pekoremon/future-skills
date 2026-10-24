import csv
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

from validate_data import validate

SOURCE = "DOSM,https://www.dosm.gov.my/,2026-08-18"


class TestValidateData(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        shutil.copytree(ROOT / "data", self.tmp, dirs_exist_ok=True)

    def tearDown(self):
        shutil.rmtree(self.tmp)

    def append(self, table: str, line: str) -> None:
        with (self.tmp / table).open("a", encoding="utf-8") as f:
            f.write(line + "\n")

    def add(self, table: str, **values: str) -> None:
        """Append a row by column name; columns not given are left empty."""
        path = self.tmp / table
        with path.open(encoding="utf-8-sig", newline="") as f:
            header = next(csv.reader(f))
        values = {**dict(zip(["source_name", "source_url", "source_date"], SOURCE.split(","))), **values}
        with path.open("a", encoding="utf-8", newline="") as f:
            csv.writer(f).writerow([values.get(c, "") for c in header])

    def add_valid_role(self, **values: str) -> None:
        self.add("roles.csv", **{"role_id": "R99", "subfield": "Data and AI", "subfield_code": "DA",
                                 "role_name_en": "Data Scientists", "onet_soc": "15-2051.00",
                                 "job_zone": "4", "masco_4digit_mycol": "2524", "is_mycol": "no",
                                 **values})

    def test_update_job_inputs_are_in_the_repo(self):
        # "Update data" on Replit can only re-read what the repository ships.
        for path in ("raw/dosm_manual.csv", "raw/dosm/jmi_data_2026q2.xlsx", "raw/mycol/mycol_2024_2025.csv"):
            self.assertTrue((ROOT / path).is_file(), path)

    def test_repo_data_passes(self):
        self.assertEqual(validate(ROOT / "data"), [])

    def test_valid_rows_pass(self):
        self.add_valid_role()
        self.add("skills.csv", skill_id="SK999", skill_name="Test Skill", skill_type="technology",
                 onet_source_type="technology_skills", is_in_demand_tech="Y")
        self.add("role_skills.csv", role_id="R99", skill_id="SK001", importance="4.12", level="3.5",
                 row_type="skill_knowledge")
        self.add("role_skills.csv", role_id="R99", skill_id="SK999", row_type="in_demand_tech")
        self.add("sdg_map.csv", entity_type="role", entity_id="R99", sdg_target="2.4",
                 link_strength="indirect", rationale="Improves farm productivity")
        self.assertEqual(validate(self.tmp), [])

    def test_missing_source_fails(self):
        self.add("skills.csv", skill_id="SK999", skill_name="Test Skill", skill_type="technology",
                 is_in_demand_tech="Y", source_name="", source_url="", source_date="")
        errors = validate(self.tmp)
        self.assertTrue(any("'source_name' is empty" in e for e in errors))
        self.assertTrue(any("'source_date' is empty" in e for e in errors))

    def test_bad_date_fails(self):
        self.add("skills.csv", skill_id="SK999", skill_name="Test Skill", skill_type="technology",
                 is_in_demand_tech="Y", source_date="18/08/2026")
        self.assertTrue(any("YYYY-MM-DD" in e for e in validate(self.tmp)))

    def test_unknown_reference_fails(self):
        self.add("role_skills.csv", role_id="ghost_role", skill_id="python", importance="3",
                 row_type="skill_knowledge")
        errors = validate(self.tmp)
        self.assertTrue(any("unknown role 'ghost_role'" in e for e in errors))
        self.assertTrue(any("unknown skill 'python'" in e for e in errors))

    def test_bad_role_codes_fail(self):
        self.add_valid_role(subfield_code="HW", onet_soc="15-2051", masco_4digit_mycol="",
                            is_mycol="maybe")
        errors = validate(self.tmp)
        self.assertTrue(any("'subfield_code' = 'HW'" in e for e in errors))
        self.assertTrue(any("'onet_soc' = '15-2051'" in e for e in errors))
        self.assertTrue(any("'is_mycol' = 'maybe'" in e for e in errors))

    def test_bad_role_skill_values_fail(self):
        self.add("role_skills.csv", role_id="IT01", skill_id="SK001", importance="6", level="3",
                 row_type="skill_knowledge")
        self.add("role_skills.csv", role_id="IT01", skill_id="SK002", row_type="skill_knowledge")
        self.add("role_skills.csv", role_id="IT01", skill_id="SK003", importance="3",
                 row_type="in_demand_tech")
        errors = validate(self.tmp)
        self.assertTrue(any("'importance' = '6'" in e for e in errors))
        self.assertTrue(any("'importance' is empty" in e for e in errors))
        self.assertTrue(any("must not have importance or level" in e for e in errors))

    def test_bad_certification_fails(self):
        self.append("certifications.csv",
                    f"CERT99,R99,Some Cert,Issuer,diploma,,,,RM480,USD,unknown,https://example.org,2026-10-01,,{SOURCE}")
        errors = validate(self.tmp)
        self.assertTrue(any("unknown role 'R99'" in e for e in errors))
        self.assertTrue(any("'cert_type' = 'diploma'" in e for e in errors))
        self.assertTrue(any("'cost_amount' = 'RM480'" in e for e in errors))

    def test_bad_sdg_target_fails(self):
        self.add_valid_role()
        self.add("sdg_map.csv", entity_type="role", entity_id="R99", sdg_target="SDG 2",
                 link_strength="indirect", rationale="Improves farm productivity")
        self.assertTrue(any("not a UN target" in e for e in validate(self.tmp)))


if __name__ == "__main__":
    unittest.main()
