"""Extract skills and RIASEC interest codes for our roles from the O*NET database.

Input:  the O*NET database ZIP (text files) unpacked under raw/, and data/roles.csv
        for the list of O*NET-SOC codes to keep.
Output: rows for data/skills.csv and data/role_skills.csv, and the riasec_code
        column of data/roles.csv.

O*NET is CC BY 4.0: keep source_name = "O*NET <version>" and the download date
on every row this script writes.
"""


def main() -> None:
    # TODO (member B): read Skills, Technology Skills, Knowledge and Interests
    # for the onet_soc codes in roles.csv.
    raise NotImplementedError("onet_extract.py is not written yet")


if __name__ == "__main__":
    main()
