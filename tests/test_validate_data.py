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

    def test_repo_data_passes(self):
        self.assertEqual(validate(ROOT / "data"), [])

    def test_valid_rows_pass(self):
        self.append("roles.csv", f"agri_analyst,I,6,Agri Data Analyst,I,ICR,15-2051.00,2524,,,no,yes,low,{SOURCE},")
        self.append("skills.csv", f"python,Python,,tech,yes,{SOURCE}")
        self.append("role_skills.csv", f"agri_analyst,python,4,{SOURCE}")
        self.append("sdg_map.csv", f"role,agri_analyst,2.4,Improves farm productivity,{SOURCE}")
        self.assertEqual(validate(self.tmp), [])

    def test_missing_source_fails(self):
        self.append("skills.csv", "python,Python,,tech,yes,,,")
        errors = validate(self.tmp)
        self.assertTrue(any("'source_name' is empty" in e for e in errors))
        self.assertTrue(any("'source_date' is empty" in e for e in errors))

    def test_bad_date_fails(self):
        self.append("skills.csv", "python,Python,,tech,yes,DOSM,https://www.dosm.gov.my/,18/08/2026")
        self.assertTrue(any("YYYY-MM-DD" in e for e in validate(self.tmp)))

    def test_unknown_reference_fails(self):
        self.append("role_skills.csv", f"ghost_role,python,3,{SOURCE}")
        errors = validate(self.tmp)
        self.assertTrue(any("unknown role 'ghost_role'" in e for e in errors))
        self.assertTrue(any("unknown skill 'python'" in e for e in errors))

    def test_bad_role_codes_fail(self):
        self.append("roles.csv", f"agri_analyst,I,6,Agri Data Analyst,I,IIC,15-2051,,,,maybe,yes,,{SOURCE},")
        errors = validate(self.tmp)
        self.assertTrue(any("'riasec_code_onet' = 'IIC'" in e for e in errors))
        self.assertTrue(any("'onet_soc' = '15-2051'" in e for e in errors))
        self.assertTrue(any("'is_mycol' = 'maybe'" in e for e in errors))

    def test_bad_certification_fails(self):
        self.append("certifications.csv",
                    f"CERT99,R99,Some Cert,Issuer,diploma,,,,RM480,USD,unknown,https://example.org,2026-10-01,,{SOURCE}")
        errors = validate(self.tmp)
        self.assertTrue(any("unknown role 'R99'" in e for e in errors))
        self.assertTrue(any("'cert_type' = 'diploma'" in e for e in errors))
        self.assertTrue(any("'cost_amount' = 'RM480'" in e for e in errors))

    def test_bad_sdg_target_fails(self):
        self.append("roles.csv", f"agri_analyst,I,6,Agri Data Analyst,I,ICR,15-2051.00,2524,,,no,yes,low,{SOURCE},")
        self.append("sdg_map.csv", f"role,agri_analyst,SDG 2,Improves farm productivity,{SOURCE}")
        self.assertTrue(any("not a UN target" in e for e in validate(self.tmp)))


if __name__ == "__main__":
    unittest.main()
