# Skills each role needs (snapshot)

Generated on 2026-10-31 from `data/roles.csv`, `data/skills.csv` and `data/role_skills.csv`.
This is a snapshot: when those files change, this page does not update by itself.

**Where the mapping comes from.** Every role is linked to one O*NET-SOC occupation (`onet_soc` in
`roles.csv`). `scripts/build_role_skills.py` then copies, from the O*NET 31.0 database:

- every O*NET skill and knowledge area whose **importance is 3.0 or more** (O*NET scale 1-5), with
  O*NET's **level** (0-7), the level the app compares the student's rating with; and
- every technology O*NET marks **In Demand** for that occupation (from employer job postings).

Below: the top skills/knowledge by importance (all of them are in the file) and the In Demand technologies.

## Software engineering

### IT01 Software Developers
O*NET [15-1252.00 Software Developers](https://www.onetonline.org/link/summary/15-1252.00) · 20 skills/knowledge · 30 In Demand technologies

| Skill or knowledge | Type | Importance (1-5) | Level needed (0-7) |
|---|---|---|---|
| Computers and Electronics | knowledge | 4.75 | 6.23 |
| Programming | skill | 4.00 | – |
| Critical Thinking | skill | 3.88 | 4.12 |
| Judgment and Decision Making | skill | 3.62 | 3.75 |
| Mathematics (knowledge) | knowledge | 3.57 | 4.55 |
| Customer and Personal Service | knowledge | 3.56 | 4.12 |
| Reading Comprehension | skill | 3.50 | 4.25 |
| Active Learning | skill | 3.50 | 3.62 |
| Systems Analysis | skill | 3.50 | 3.88 |
| Active Listening | skill | 3.38 | 3.88 |
| *+ 10 more* | | | |

In Demand technologies: Amazon Web Services AWS software, Apache Kafka, Atlassian JIRA, C, C#, C++, Cascading style sheets CSS, Docker, Git, GitHub, Go, Google Angular, Hypertext markup language HTML, IBM Terraform, JavaScript, Jenkins CI, Kubernetes, Linux, Microsoft Azure software, Node.js, NoSQL, Oracle Java, PostgreSQL, Python, React, RESTful API, Spring Boot, Spring Framework, Structured query language SQL, TypeScript.

### IT02 Computer Programmers
O*NET [15-1251.00 Computer Programmers](https://www.onetonline.org/link/summary/15-1251.00) · 24 skills/knowledge · 19 In Demand technologies

| Skill or knowledge | Type | Importance (1-5) | Level needed (0-7) |
|---|---|---|---|
| Computers and Electronics | knowledge | 4.87 | 6.16 |
| Programming | skill | 4.75 | 4.88 |
| Active Listening | skill | 3.75 | 4.00 |
| Critical Thinking | skill | 3.75 | 3.88 |
| Complex Problem Solving | skill | 3.75 | 3.88 |
| Mathematics (knowledge) | knowledge | 3.53 | 4.54 |
| Quality Control Analysis | skill | 3.50 | 3.50 |
| Engineering and Technology | knowledge | 3.47 | 4.15 |
| English Language | knowledge | 3.41 | 3.78 |
| Reading Comprehension | skill | 3.38 | 3.50 |
| *+ 14 more* | | | |

In Demand technologies: C#, C++, Cascading style sheets CSS, Extensible markup language XML, Git, Hypertext markup language HTML, JavaScript, Linux, Microsoft Azure software, Microsoft Excel, Microsoft Office software, Microsoft PowerPoint, Microsoft SQL Server, Microsoft Visual Studio, Oracle Java, Python, R, SAS, Structured query language SQL.

### IT03 Software Quality Assurance Analysts and Testers
O*NET [15-1253.00 Software Quality Assurance Analysts and Testers](https://www.onetonline.org/link/summary/15-1253.00) · 22 skills/knowledge · 24 In Demand technologies

| Skill or knowledge | Type | Importance (1-5) | Level needed (0-7) |
|---|---|---|---|
| Computers and Electronics | knowledge | 4.41 | 5.47 |
| Reading Comprehension | skill | 4.00 | 4.12 |
| Active Listening | skill | 3.88 | 4.00 |
| Speaking | skill | 3.88 | 4.00 |
| Critical Thinking | skill | 3.88 | 3.88 |
| English Language | knowledge | 3.79 | 4.09 |
| Writing | skill | 3.75 | 3.88 |
| Monitoring | skill | 3.62 | 3.75 |
| Programming | skill | 3.62 | 3.75 |
| Complex Problem Solving | skill | 3.38 | 3.12 |
| *+ 12 more* | | | |

In Demand technologies: Amazon Web Services AWS software, Apache JMeter, Appium, Atlassian JIRA, C#, C++, Git, GitHub, JavaScript, Jenkins CI, Linux, Microsoft Azure DevOps Services, Microsoft Azure software, Microsoft Excel, Microsoft Office software, Microsoft Playwright, Oracle Java, Postman, Python, REST Assured, RESTful API, Selenium, Structured query language SQL, TestNG.

### IT04 Blockchain Engineers
O*NET [15-1299.07 Blockchain Engineers](https://www.onetonline.org/link/summary/15-1299.07) · 21 skills/knowledge · 20 In Demand technologies

| Skill or knowledge | Type | Importance (1-5) | Level needed (0-7) |
|---|---|---|---|
| Computers and Electronics | knowledge | 4.53 | 6.38 |
| Engineering and Technology | knowledge | 4.27 | 6.19 |
| Reading Comprehension | skill | 4.00 | 4.12 |
| Active Listening | skill | 3.75 | 3.75 |
| Critical Thinking | skill | 3.75 | 4.00 |
| Mathematics (knowledge) | knowledge | 3.67 | 5.06 |
| Complex Problem Solving | skill | 3.62 | 4.00 |
| Active Learning | skill | 3.50 | 3.62 |
| Judgment and Decision Making | skill | 3.50 | 3.75 |
| Programming | skill | 3.38 | 3.50 |
| *+ 11 more* | | | |

In Demand technologies: Amazon Web Services AWS software, C#, C++, Docker, Git, Go, JavaScript, Kubernetes, Microsoft Azure software, MongoDB, Node.js, Oracle Java, PostgreSQL, Python, React, RESTful API, Rust programming language, Solidity, Structured query language SQL, TypeScript.

## Data & AI

### IT05 Data Scientists
O*NET [15-2051.00 Data Scientists](https://www.onetonline.org/link/summary/15-2051.00) · 15 skills/knowledge · 21 In Demand technologies

| Skill or knowledge | Type | Importance (1-5) | Level needed (0-7) |
|---|---|---|---|
| Mathematics (knowledge) | knowledge | 4.52 | 5.68 |
| Mathematics (skill) | skill | 4.38 | 5.00 |
| Critical Thinking | skill | 4.25 | 4.62 |
| Computers and Electronics | knowledge | 4.24 | 5.84 |
| Reading Comprehension | skill | 3.88 | 4.62 |
| Complex Problem Solving | skill | 3.75 | 4.12 |
| Programming | skill | 3.75 | – |
| Speaking | skill | 3.62 | 3.75 |
| Active Learning | skill | 3.62 | 4.38 |
| Active Listening | skill | 3.50 | 3.75 |
| *+ 5 more* | | | |

In Demand technologies: Amazon Web Services AWS software, Apache Hadoop, Apache Spark, C++, Git, Microsoft Azure software, Microsoft Excel, Microsoft Power BI, Microsoft PowerPoint, NumPy, pandas, Python, PyTorch, R, SAS, Scikit-learn, Snowflake, Structured query language SQL, Tableau, TensorFlow, The MathWorks MATLAB.

### IT06 Computer and Information Research Scientists
O*NET [15-1221.00 Computer and Information Research Scientists](https://www.onetonline.org/link/summary/15-1221.00) · 28 skills/knowledge · 34 In Demand technologies

| Skill or knowledge | Type | Importance (1-5) | Level needed (0-7) |
|---|---|---|---|
| Computers and Electronics | knowledge | 4.57 | 6.11 |
| Mathematics (knowledge) | knowledge | 4.06 | 5.43 |
| Critical Thinking | skill | 4.00 | 4.25 |
| Complex Problem Solving | skill | 4.00 | 4.38 |
| Judgment and Decision Making | skill | 4.00 | 4.62 |
| Engineering and Technology | knowledge | 3.95 | 4.84 |
| English Language | knowledge | 3.89 | 4.47 |
| Reading Comprehension | skill | 3.75 | 4.50 |
| Active Listening | skill | 3.75 | 4.12 |
| Systems Analysis | skill | 3.75 | 4.38 |
| *+ 18 more* | | | |

In Demand technologies: Amazon Web Services AWS SageMaker, Amazon Web Services AWS software, Ansible software, Apache Hadoop, Apache Kafka, Apache Spark, Bash, C, C++, Docker, Git, GitHub, Go, Grafana Labs Grafana Cloud, Hugging Face, IBM Terraform, JavaScript, Jenkins CI, Kubernetes, LangChain, Linux, Microsoft Azure software, Oracle Java, pandas, Prometheus, Python, PyTorch, R, Scala, Scikit-learn, Snowflake, Structured query language SQL, TensorFlow, Vector database software.

### IT07 Business Intelligence Analysts
O*NET [15-2051.01 Business Intelligence Analysts](https://www.onetonline.org/link/summary/15-2051.01) · 22 skills/knowledge · 14 In Demand technologies

| Skill or knowledge | Type | Importance (1-5) | Level needed (0-7) |
|---|---|---|---|
| Computers and Electronics | knowledge | 4.29 | 5.41 |
| Reading Comprehension | skill | 4.00 | 4.25 |
| Active Listening | skill | 3.88 | 4.00 |
| Speaking | skill | 3.88 | 4.00 |
| Critical Thinking | skill | 3.88 | 4.25 |
| Active Learning | skill | 3.88 | 4.12 |
| Mathematics (knowledge) | knowledge | 3.82 | 4.67 |
| English Language | knowledge | 3.77 | 4.41 |
| Writing | skill | 3.75 | 4.00 |
| Judgment and Decision Making | skill | 3.62 | 4.00 |
| *+ 12 more* | | | |

In Demand technologies: Amazon Web Services AWS software, Microsoft Azure software, Microsoft Excel, Microsoft Office software, Microsoft Power BI, Microsoft PowerPoint, Python, R, Salesforce software, SAP software, SAS, Snowflake, Structured query language SQL, Tableau.

### IT08 Database Administrators
O*NET [15-1242.00 Database Administrators](https://www.onetonline.org/link/summary/15-1242.00) · 25 skills/knowledge · 38 In Demand technologies

| Skill or knowledge | Type | Importance (1-5) | Level needed (0-7) |
|---|---|---|---|
| Computers and Electronics | knowledge | 4.79 | 6.11 |
| English Language | knowledge | 3.96 | 4.15 |
| Customer and Personal Service | knowledge | 3.93 | 4.75 |
| Critical Thinking | skill | 3.88 | 4.00 |
| Complex Problem Solving | skill | 3.88 | 4.12 |
| Reading Comprehension | skill | 3.75 | 4.25 |
| Active Listening | skill | 3.75 | 3.88 |
| Judgment and Decision Making | skill | 3.75 | 4.00 |
| Mathematics (knowledge) | knowledge | 3.55 | 4.63 |
| Telecommunications | knowledge | 3.54 | 3.33 |
| *+ 15 more* | | | |

In Demand technologies: Amazon Redshift, Amazon Web Services AWS software, Apache Airflow, Apache Hadoop, Apache Kafka, Apache Spark, Atlassian JIRA, Git, GitHub, IBM Terraform, Informatica software, Kubernetes, Linux, Microsoft Access, Microsoft Azure Data Factory, Microsoft Azure software, Microsoft Power BI, Microsoft PowerShell, Microsoft SQL Server, Microsoft SQL Server Integration Services SSIS, MongoDB, MySQL, NoSQL, Oracle Database, Oracle Java, Oracle PL/SQL, PostgreSQL, PySpark, Python, Relational database management system software, Salesforce software, Scala, Shell script, Snowflake, Structured query language SQL, Tableau, Transact-SQL, UNIX.

### IT09 Database Architects
O*NET [15-1243.00 Database Architects](https://www.onetonline.org/link/summary/15-1243.00) · 24 skills/knowledge · 13 In Demand technologies

| Skill or knowledge | Type | Importance (1-5) | Level needed (0-7) |
|---|---|---|---|
| Computers and Electronics | knowledge | 4.30 | 6.00 |
| Engineering and Technology | knowledge | 3.95 | 5.19 |
| Reading Comprehension | skill | 3.88 | 4.12 |
| Critical Thinking | skill | 3.88 | 3.88 |
| Complex Problem Solving | skill | 3.88 | 4.00 |
| Judgment and Decision Making | skill | 3.88 | 3.88 |
| Systems Analysis | skill | 3.75 | 3.75 |
| Design | knowledge | 3.71 | 4.67 |
| Mathematics (knowledge) | knowledge | 3.67 | 4.81 |
| Active Listening | skill | 3.50 | 3.75 |
| *+ 14 more* | | | |

In Demand technologies: Amazon Web Services AWS software, Apache Kafka, Apache Spark, Microsoft Azure software, Microsoft Excel, Microsoft Office software, Microsoft Power BI, Microsoft PowerPoint, Oracle Java, Python, Snowflake, Structured query language SQL, Tableau.

### IT10 Data Warehousing Specialists
O*NET [15-1243.01 Data Warehousing Specialists](https://www.onetonline.org/link/summary/15-1243.01) · 18 skills/knowledge · 10 In Demand technologies

| Skill or knowledge | Type | Importance (1-5) | Level needed (0-7) |
|---|---|---|---|
| Computers and Electronics | knowledge | 4.26 | 5.61 |
| Reading Comprehension | skill | 3.88 | 4.00 |
| Critical Thinking | skill | 3.88 | 3.88 |
| Programming | skill | 3.75 | 3.75 |
| Complex Problem Solving | skill | 3.62 | 3.50 |
| Active Listening | skill | 3.50 | 3.62 |
| Systems Analysis | skill | 3.50 | 3.50 |
| Speaking | skill | 3.38 | 3.62 |
| Judgment and Decision Making | skill | 3.38 | 3.62 |
| Writing | skill | 3.25 | 3.38 |
| *+ 8 more* | | | |

In Demand technologies: Microsoft Access, Microsoft Excel, Microsoft Office software, Microsoft Outlook, Microsoft Power BI, Microsoft PowerPoint, Operational Data Store ODS software, Python, Structured query language SQL, Tableau.

### IT27 Statisticians
O*NET [15-2041.00 Statisticians](https://www.onetonline.org/link/summary/15-2041.00) · 19 skills/knowledge · 11 In Demand technologies

| Skill or knowledge | Type | Importance (1-5) | Level needed (0-7) |
|---|---|---|---|
| Mathematics (skill) | skill | 4.88 | 5.38 |
| Mathematics (knowledge) | knowledge | 4.67 | 6.24 |
| Computers and Electronics | knowledge | 4.19 | 5.57 |
| Reading Comprehension | skill | 4.00 | 4.88 |
| Critical Thinking | skill | 4.00 | 4.50 |
| English Language | knowledge | 3.90 | 4.81 |
| Active Listening | skill | 3.88 | 4.00 |
| Speaking | skill | 3.88 | 4.25 |
| Complex Problem Solving | skill | 3.88 | 4.12 |
| Writing | skill | 3.75 | 4.25 |
| *+ 9 more* | | | |

In Demand technologies: Microsoft Excel, Microsoft Office software, Python, R, SAS, Structured query language SQL, Tableau, IBM SPSS Statistics, SAS JMP, StataCorp Stata, Statistical software.

## Cybersecurity

### IT11 Information Security Analysts
O*NET [15-1212.00 Information Security Analysts](https://www.onetonline.org/link/summary/15-1212.00) · 23 skills/knowledge · 14 In Demand technologies

| Skill or knowledge | Type | Importance (1-5) | Level needed (0-7) |
|---|---|---|---|
| Computers and Electronics | knowledge | 4.35 | 5.97 |
| English Language | knowledge | 4.26 | 4.20 |
| Reading Comprehension | skill | 4.00 | 4.12 |
| Critical Thinking | skill | 3.88 | 4.12 |
| Active Listening | skill | 3.75 | 3.88 |
| Complex Problem Solving | skill | 3.75 | 3.62 |
| Administration and Management | knowledge | 3.68 | 3.79 |
| Engineering and Technology | knowledge | 3.64 | 3.88 |
| Telecommunications | knowledge | 3.64 | 3.95 |
| Speaking | skill | 3.62 | 3.75 |
| *+ 13 more* | | | |

In Demand technologies: Amazon Web Services AWS software, eMASS, Firewall software, Linux, Microsoft Azure software, Microsoft Excel, Microsoft Office software, Microsoft PowerPoint, Microsoft PowerShell, MITRE ATT&CK software, Python, Splunk Enterprise, Tenable Nessus, UNIX.

### IT12 Penetration Testers
O*NET [15-1299.04 Penetration Testers](https://www.onetonline.org/link/summary/15-1299.04) · 26 skills/knowledge · 22 In Demand technologies

| Skill or knowledge | Type | Importance (1-5) | Level needed (0-7) |
|---|---|---|---|
| Computers and Electronics | knowledge | 4.95 | 6.55 |
| Critical Thinking | skill | 4.38 | 4.38 |
| Telecommunications | knowledge | 4.15 | 5.20 |
| Reading Comprehension | skill | 4.00 | 4.50 |
| Writing | skill | 4.00 | 4.12 |
| Engineering and Technology | knowledge | 3.95 | 5.10 |
| Active Listening | skill | 3.88 | 4.00 |
| Complex Problem Solving | skill | 3.88 | 3.88 |
| Programming | skill | 3.88 | 4.12 |
| English Language | knowledge | 3.80 | 4.20 |
| *+ 16 more* | | | |

In Demand technologies: Amazon Web Services AWS software, Bash, C, C#, C++, Firewall software, JavaScript, Kali Linux, Linux, Metasploit, Microsoft Active Directory, Microsoft Azure software, Microsoft PowerShell, MITRE ATT&CK software, Nmap, Oracle Java, Portswigger BurP Suite, Python, Qualys Cloud Platform, Splunk Enterprise, Tenable Nessus, UNIX.

### IT13 Digital Forensics Analysts
O*NET [15-1299.06 Digital Forensics Analysts](https://www.onetonline.org/link/summary/15-1299.06) · 17 skills/knowledge · 8 In Demand technologies

| Skill or knowledge | Type | Importance (1-5) | Level needed (0-7) |
|---|---|---|---|
| Computers and Electronics | knowledge | 4.68 | 6.07 |
| Reading Comprehension | skill | 3.75 | 3.75 |
| Law and Government | knowledge | 3.72 | 4.27 |
| English Language | knowledge | 3.70 | 4.59 |
| Active Listening | skill | 3.50 | 3.50 |
| Writing | skill | 3.50 | 3.88 |
| Speaking | skill | 3.50 | 3.75 |
| Judgment and Decision Making | skill | 3.50 | 3.38 |
| Active Learning | skill | 3.38 | 3.25 |
| Complex Problem Solving | skill | 3.38 | 3.25 |
| *+ 7 more* | | | |

In Demand technologies: Amazon Web Services AWS software, Firewall software, Linux, Microsoft PowerShell, MITRE ATT&CK software, Python, Splunk Enterprise, Structured query language SQL.

### IT14 Information Security Engineers
O*NET [15-1299.05 Information Security Engineers](https://www.onetonline.org/link/summary/15-1299.05) · 22 skills/knowledge · 13 In Demand technologies

| Skill or knowledge | Type | Importance (1-5) | Level needed (0-7) |
|---|---|---|---|
| Computers and Electronics | knowledge | 4.63 | 5.94 |
| Reading Comprehension | skill | 4.12 | 4.38 |
| Critical Thinking | skill | 4.00 | 4.12 |
| Engineering and Technology | knowledge | 4.00 | 4.56 |
| Active Listening | skill | 3.88 | 4.12 |
| Writing | skill | 3.62 | 4.12 |
| Monitoring | skill | 3.62 | 3.88 |
| English Language | knowledge | 3.53 | 3.63 |
| Speaking | skill | 3.50 | 4.12 |
| Quality Control Analysis | skill | 3.38 | – |
| *+ 12 more* | | | |

In Demand technologies: Amazon Web Services AWS software, Bash, Firewall software, IBM Terraform, Kubernetes, Linux, Microsoft Active Directory, Microsoft Azure software, Microsoft PowerShell, Oracle Java, Python, Single sign-on SSO, Splunk Enterprise.

## Cloud & networking

### IT15 Network and Computer Systems Administrators
O*NET [15-1244.00 Network and Computer Systems Administrators](https://www.onetonline.org/link/summary/15-1244.00) · 29 skills/knowledge · 18 In Demand technologies

| Skill or knowledge | Type | Importance (1-5) | Level needed (0-7) |
|---|---|---|---|
| Computers and Electronics | knowledge | 4.63 | 5.76 |
| Active Listening | skill | 4.00 | 4.00 |
| Troubleshooting | skill | 4.00 | 4.12 |
| Judgment and Decision Making | skill | 4.00 | 4.12 |
| Systems Analysis | skill | 4.00 | 4.00 |
| Systems Evaluation | skill | 4.00 | 4.38 |
| Reading Comprehension | skill | 3.88 | 4.00 |
| Critical Thinking | skill | 3.88 | 4.00 |
| Monitoring | skill | 3.88 | 4.00 |
| Complex Problem Solving | skill | 3.88 | 4.00 |
| *+ 19 more* | | | |

In Demand technologies: Amazon Web Services AWS software, Ansible software, Bash, Firewall software, Linux, Microsoft Active Directory, Microsoft Azure software, Microsoft Excel, Microsoft Office software, Microsoft Outlook, Microsoft PowerShell, Microsoft SharePoint, Microsoft Windows Server, Python, Red Hat Enterprise Linux, ServiceNow, Structured query language SQL, UNIX.

### IT16 Computer Network Architects
O*NET [15-1241.00 Computer Network Architects](https://www.onetonline.org/link/summary/15-1241.00) · 32 skills/knowledge · 13 In Demand technologies

| Skill or knowledge | Type | Importance (1-5) | Level needed (0-7) |
|---|---|---|---|
| Computers and Electronics | knowledge | 4.68 | 6.05 |
| Engineering and Technology | knowledge | 4.25 | 5.00 |
| Telecommunications | knowledge | 4.25 | 5.00 |
| Critical Thinking | skill | 4.12 | 4.12 |
| Reading Comprehension | skill | 4.00 | 4.12 |
| Complex Problem Solving | skill | 3.88 | 4.12 |
| Programming | skill | 3.88 | 3.62 |
| Systems Evaluation | skill | 3.88 | 3.88 |
| English Language | knowledge | 3.80 | 4.05 |
| Active Listening | skill | 3.75 | 3.88 |
| *+ 22 more* | | | |

In Demand technologies: Amazon Web Services AWS software, Ansible software, Border Gateway Protocol BGP, Firewall software, IBM Terraform, Linux, Microsoft Azure software, Microsoft Excel, Microsoft Office software, Microsoft PowerShell, Oracle Java, Python, Structured query language SQL.

### IT17 Computer Network Support Specialists
O*NET [15-1231.00 Computer Network Support Specialists](https://www.onetonline.org/link/summary/15-1231.00) · 20 skills/knowledge · 10 In Demand technologies

| Skill or knowledge | Type | Importance (1-5) | Level needed (0-7) |
|---|---|---|---|
| Computers and Electronics | knowledge | 4.96 | 6.58 |
| Telecommunications | knowledge | 3.79 | 4.69 |
| Critical Thinking | skill | 3.75 | 3.75 |
| Active Listening | skill | 3.50 | 3.62 |
| Customer and Personal Service | knowledge | 3.45 | 3.78 |
| Engineering and Technology | knowledge | 3.40 | 4.12 |
| Reading Comprehension | skill | 3.38 | 3.88 |
| Judgment and Decision Making | skill | 3.38 | 3.38 |
| English Language | knowledge | 3.31 | 3.35 |
| Speaking | skill | 3.25 | 3.50 |
| *+ 10 more* | | | |

In Demand technologies: Apple macOS, Firewall software, Linux, Microsoft Active Directory, Microsoft Excel, Microsoft Office software, Microsoft Outlook, Microsoft Windows, Microsoft Windows Server, ServiceNow.

### IT18 Computer User Support Specialists
O*NET [15-1232.00 Computer User Support Specialists](https://www.onetonline.org/link/summary/15-1232.00) · 28 skills/knowledge · 12 In Demand technologies

| Skill or knowledge | Type | Importance (1-5) | Level needed (0-7) |
|---|---|---|---|
| Computers and Electronics | knowledge | 4.93 | 5.89 |
| Customer and Personal Service | knowledge | 4.12 | 5.62 |
| Reading Comprehension | skill | 4.00 | 4.00 |
| Active Listening | skill | 4.00 | 4.00 |
| Speaking | skill | 4.00 | 4.00 |
| Telecommunications | knowledge | 3.85 | 4.64 |
| English Language | knowledge | 3.79 | 4.42 |
| Critical Thinking | skill | 3.75 | 3.88 |
| Education and Training | knowledge | 3.72 | 4.54 |
| Mechanical | knowledge | 3.66 | 4.42 |
| *+ 18 more* | | | |

In Demand technologies: Apple iOS, Apple macOS, Firewall software, Linux, Microsoft Active Directory, Microsoft Azure software, Microsoft Excel, Microsoft Office software, Microsoft Outlook, Microsoft Windows, ServiceNow, Structured query language SQL.

### IT19 Computer Systems Engineers/Architects
O*NET [15-1299.08 Computer Systems Engineers/Architects](https://www.onetonline.org/link/summary/15-1299.08) · 30 skills/knowledge · 22 In Demand technologies

| Skill or knowledge | Type | Importance (1-5) | Level needed (0-7) |
|---|---|---|---|
| Computers and Electronics | knowledge | 4.91 | 6.32 |
| English Language | knowledge | 4.09 | 3.38 |
| Reading Comprehension | skill | 4.00 | 4.00 |
| Active Listening | skill | 4.00 | 4.00 |
| Critical Thinking | skill | 4.00 | 4.00 |
| Telecommunications | knowledge | 3.95 | 4.41 |
| Writing | skill | 3.88 | 4.00 |
| Speaking | skill | 3.88 | 4.00 |
| Systems Analysis | skill | 3.88 | 4.00 |
| Systems Evaluation | skill | 3.88 | 4.12 |
| *+ 20 more* | | | |

In Demand technologies: Amazon Web Services AWS CloudFormation, Amazon Web Services AWS software, Ansible software, Atlassian JIRA, Bash, C++, Docker, Firewall software, Git, GitHub, Go, IBM Terraform, JavaScript, Jenkins CI, Kubernetes, Linux, Microsoft Active Directory, Microsoft Azure software, Microsoft PowerShell, Oracle Java, Python, Structured query language SQL.

## Web & interface design

### IT20 Web Developers
O*NET [15-1254.00 Web Developers](https://www.onetonline.org/link/summary/15-1254.00) · 19 skills/knowledge · 37 In Demand technologies

| Skill or knowledge | Type | Importance (1-5) | Level needed (0-7) |
|---|---|---|---|
| Computers and Electronics | knowledge | 4.38 | 5.75 |
| Programming | skill | 4.12 | 4.25 |
| Critical Thinking | skill | 3.75 | 3.88 |
| Reading Comprehension | skill | 3.62 | 4.00 |
| Complex Problem Solving | skill | 3.62 | 3.62 |
| Operations Analysis | skill | 3.62 | 4.00 |
| English Language | knowledge | 3.54 | 4.00 |
| Active Listening | skill | 3.50 | 3.50 |
| Active Learning | skill | 3.50 | 3.62 |
| Judgment and Decision Making | skill | 3.38 | 3.38 |
| *+ 9 more* | | | |

In Demand technologies: Amazon Web Services AWS software, Apache Kafka, Atlassian JIRA, C#, Cascading style sheets CSS, Docker, Git, GitHub, Go, Google Angular, GraphQL, Hypertext markup language HTML, JavaScript, JavaScript framework software, JavaScript Object Notation JSON, Jenkins CI, jQuery, Kubernetes, Linux, Microsoft Azure software, MongoDB, MySQL, Node.js, NoSQL, Oracle Java, PHP, PostgreSQL, Python, React, RESTful API, Spring Boot, Spring Framework, Structured query language SQL, TypeScript, Vue.js, Web application software, WordPress.

### IT21 Web and Digital Interface Designers
O*NET [15-1255.00 Web and Digital Interface Designers](https://www.onetonline.org/link/summary/15-1255.00) · 16 skills/knowledge · 12 In Demand technologies

| Skill or knowledge | Type | Importance (1-5) | Level needed (0-7) |
|---|---|---|---|
| Computers and Electronics | knowledge | 3.96 | 5.54 |
| English Language | knowledge | 3.84 | 4.95 |
| Reading Comprehension | skill | 3.75 | 3.75 |
| Customer and Personal Service | knowledge | 3.57 | 4.36 |
| Critical Thinking | skill | 3.50 | 3.50 |
| Judgment and Decision Making | skill | 3.50 | 3.38 |
| Active Listening | skill | 3.38 | 3.50 |
| Active Learning | skill | 3.38 | 3.38 |
| Complex Problem Solving | skill | 3.38 | 3.50 |
| Programming | skill | 3.25 | – |
| *+ 6 more* | | | |

In Demand technologies: Adobe Creative Cloud software, Adobe Illustrator, Adobe Photoshop, Adobe XD, Atlassian JIRA, Cascading style sheets CSS, Figma, Google Angular, Hypertext markup language HTML, JavaScript, React, TypeScript.

### IT22 Video Game Designers
O*NET [15-1255.01 Video Game Designers](https://www.onetonline.org/link/summary/15-1255.01) · 25 skills/knowledge · 7 In Demand technologies

| Skill or knowledge | Type | Importance (1-5) | Level needed (0-7) |
|---|---|---|---|
| Design | knowledge | 4.26 | 5.25 |
| Computers and Electronics | knowledge | 4.15 | 5.15 |
| Programming | skill | 4.00 | 3.88 |
| Active Listening | skill | 3.88 | 3.88 |
| Reading Comprehension | skill | 3.75 | 4.00 |
| Critical Thinking | skill | 3.75 | 3.88 |
| Complex Problem Solving | skill | 3.62 | 3.88 |
| Judgment and Decision Making | skill | 3.62 | 3.62 |
| Active Learning | skill | 3.50 | 3.62 |
| Communications and Media | knowledge | 3.47 | 4.35 |
| *+ 15 more* | | | |

In Demand technologies: Adobe Photoshop, Autodesk Maya, C#, C++, Python, Unity Technologies Unity, Unreal Technology Unreal Engine.

### IT23 Web Administrators
O*NET [15-1299.01 Web Administrators](https://www.onetonline.org/link/summary/15-1299.01) · 25 skills/knowledge · 22 In Demand technologies

| Skill or knowledge | Type | Importance (1-5) | Level needed (0-7) |
|---|---|---|---|
| Computers and Electronics | knowledge | 4.15 | 5.35 |
| English Language | knowledge | 4.10 | 4.60 |
| Communications and Media | knowledge | 4.10 | 4.20 |
| Critical Thinking | skill | 4.00 | 4.12 |
| Reading Comprehension | skill | 3.88 | 4.12 |
| Active Listening | skill | 3.75 | 3.88 |
| Complex Problem Solving | skill | 3.75 | 3.88 |
| Customer and Personal Service | knowledge | 3.55 | 4.40 |
| Monitoring | skill | 3.38 | 3.50 |
| Judgment and Decision Making | skill | 3.38 | 3.38 |
| *+ 15 more* | | | |

In Demand technologies: Adobe Photoshop, Cascading style sheets CSS, Content management systems CMS, Drupal, Google Analytics, Hypertext markup language HTML, JavaScript, Microsoft Access, Microsoft Active Directory, Microsoft Internet Information Services (IIS), Microsoft Internet Information Services (IIS) Manager, Microsoft Office software, Microsoft SharePoint, Microsoft SQL Server, Oracle Java, PHP, Software development tools, Structured query language SQL, Web application framework software, Web application software, Web server software, WordPress.

### IT28 Special Effects Artists and Animators
O*NET [27-1014.00 Special Effects Artists and Animators](https://www.onetonline.org/link/summary/27-1014.00) · 18 skills/knowledge · 18 In Demand technologies

| Skill or knowledge | Type | Importance (1-5) | Level needed (0-7) |
|---|---|---|---|
| Computers and Electronics | knowledge | 4.95 | 5.15 |
| English Language | knowledge | 4.38 | 3.79 |
| Design | knowledge | 4.22 | 4.28 |
| Communications and Media | knowledge | 4.11 | 4.57 |
| Customer and Personal Service | knowledge | 3.94 | 3.64 |
| Active Listening | skill | 3.88 | 3.88 |
| Sales and Marketing | knowledge | 3.87 | 3.79 |
| Reading Comprehension | skill | 3.75 | 4.00 |
| Critical Thinking | skill | 3.75 | 3.75 |
| Telecommunications | knowledge | 3.45 | 2.74 |
| *+ 8 more* | | | |

In Demand technologies: Adobe Creative Cloud software, Adobe Illustrator, Adobe Photoshop, Autodesk Maya, Cascading style sheets CSS, Figma, Hypertext markup language HTML, Microsoft Excel, Microsoft Office software, Microsoft PowerPoint, Unity Technologies Unity, Unreal Technology Unreal Engine, Adobe After Effects, Adobe InDesign, Adobe Premiere Pro, Canva, Maxon Cinema 4D, SideFX Houdini.
