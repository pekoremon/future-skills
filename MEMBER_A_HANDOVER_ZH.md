# 成员 A · 趋势数据交付说明（IT 岗位）

更新日期：2026-10-23 · 状态：趋势层按 **IT 细分大类**（团队草案）来做，已接上 B 的 `data/roles.csv`（26 个角色）。输出是 `trend_signals.csv`（每个信号给出方向和可信度），不再有 0–100 分。

范围：只有 IT 岗位。马来西亚的数字来自 DOSM 和 MyCOL（TalentCorp）。arXiv 是全球研究信号，不代表马来西亚的需求。

> 本文件是 [MEMBER_A_HANDOVER.md](MEMBER_A_HANDOVER.md) 的中文版。数据和脚本都是英文，以英文版为准。

---

## 1. 趋势层的结构

| 层 | 内容 | 来源 | 参与评分？ |
|---|---|---|---|
| **细分大类** | 6 个 IT 细分大类 + 1 个可选（`data/subdomains.csv`，团队草案） | MyCOL（马来西亚官方）、arXiv（全球）、DOSM 网上职位数（只有 DOSM 有数据的才用） | 是 |
| **角色** | 每个角色的 MyCOL yes / near / no（26 个角色） | MyCOL + B 的 `data/roles.csv` | 是 |
| **行业背景** | DOSM ICT 行业（MSIC J）：就业、薪资、广告占比 | DOSM / OpenDOSM | 否：所有 IT 角色都一样 |
| **参考** | 整个 MASCO 第 2、3 大组 | DOSM | 否：不只是 IT |

DOSM 的数据是按行业和 MASCO 大组给的，几乎没有细到角色。所有 IT 角色都属于同一个行业（“信息与通信”），所以 DOSM 区分不了细分大类，也区分不了角色。**能**区分的马来西亚真实数据是 MyCOL。

### 细分大类（草案，待团队确认）

| ID | 代码 | 细分大类 | arXiv 类别 | `data/roles.csv`（B）里的角色 | 这些角色对应的 MyCOL 职业 | DOSM 网上职位数 |
|---|---|---|---|---|---|---|
| `software_engineering` | SE | 软件工程 | cs.SE | IT01–IT04 | Software Developers；Application Programmers | 软件开发员（MASCO 2512） |
| `data_ai` | DA | 数据与 AI | cs.DB、cs.LG | IT05–IT10 | Data Professionals；Database Designers and Administrators | 无数据 |
| `cybersecurity` | CS | 网络安全 | cs.CR | IT11–IT14 | Cyber Security Professionals | 无数据 |
| `cloud_infra_networks` | CI | 云端与基础设施 / 网络 | cs.NI、cs.DC | IT15–IT19 | IT System Administrators；Software Developers（IT19） | 无数据 |
| `web_interface_design` | WD | Web 与界面设计 | cs.HC | IT20–IT23 | Software and Application Developers and Analysts NEC；Creative Contents Designer Professionals；Digital Games and E-Sport Professionals | 无数据 |
| `it_management_analysis` | IM | IT 管理与分析 | 无（没有对应类别） | IT24–IT26 | Computer Systems Analysts；ICT Managers | 无数据 |
| `hardware_embedded` | HW | 硬件与嵌入式（可选） | cs.AR | 暂无 | 无 | 无数据 |

`data/subdomains.csv` 里的 `subfield_code` 用来和 B 的 `subfield_code` 对接。角色 → MyCOL 的对应关系只放在 `data/roles.csv`（B 的文件）里；脚本每次运行都会读它，如果里面的 MyCOL 名称和官方清单对不上，脚本会停下来报错。名称比对时忽略大小写、空格和标点，并把 “NEC” 当作 “Not Elsewhere Classified”，所以 B 从完整报告抄的写法（“Cybersecurity Professionals”、“…NEC”）也能对上小册子清单。

---

## 2. 文件和运行方法

```
future-skills/
  data/subdomains.csv        IT 细分大类 + subfield_code + 对应的 arXiv / DOSM（团队草案，在这里改）
  data/roles.csv             B 提供的 26 个 IT 角色（角色 -> MyCOL yes / near / no），由 B 维护
  data/trends.csv            趋势输入，92 行（脚本生成，不要手改）
  data/trend_signals.csv     趋势信号，57 行（脚本生成）
  raw/dosm_manual.csv        从 DOSM 发布稿手抄的 12 行
  raw/dosm/                  DOSM 数据表和 PDF（证据）
  raw/mycol/                 MyCOL 2024/2025 清单（66 个职业）+ TalentCorp 小册子和完整报告 PDF（证据）
  scripts/update_trends.py   “更新数据”按钮：重建 trends.csv，然后运行 trend_signals.py
  scripts/trend_signals.py   信号规则
```

```bash
python scripts/update_trends.py              # 所有来源；arXiv 约 1–2 分钟
python scripts/update_trends.py --no-arxiv   # 演示用：约 2 秒，保留上一次的 arXiv 数据
python scripts/trend_signals.py              # 只重算信号，不动 trends.csv
```

只用 Python 标准库。某个来源失败时会保留上一次的数据；`trend_signals.py` 出错时会保留上一份 `trend_signals.csv`。联网请求 15 秒就超时，断网时按钮不会卡住。

---

## 3. trends.csv 每一行从哪来

| entity_type | 行数 | 来源 | fetch_method |
|---|---|---|---|
| `subdomain` | 25 | arXiv API：每个细分大类的 AI 论文数和全部论文数，最近 6 个完整月和前 6 个月（`it_management_analysis` 只有一行“无数据”） | `api` |
| `mycol_occupation` | 11 | `data/roles.csv` 里有角色对应到（yes / near）的 MyCOL 2024/2025 职业；`entity_id` = `masco_<编码>`，编码来自 B 的文件；清单来自 `raw/mycol/mycol_2024_2025.csv`（从小册子抄录） | `manual_snapshot` |
| `occupation` | 4 | 软件开发员广告（2 个真实值、2 个删失值），来自 DOSM 新闻稿 | `manual_snapshot` |
| `occupation_group` | 24 | MASCO 2 / 3 和全部广告（DOSM “Data JMI” 数据表）；MASCO 2 / 3 和全国薪资（OpenDOSM） | `dosm_file`、`api` |
| `sector` | 28 | ICT 和全国：广告（数据表）、就业增长（OpenDOSM + Labour Market Review）、薪资（Labour Market Review） | `dosm_file`、`api`、`manual_snapshot` |

字段：`value`（删失时留空）、`upper_bound`、`is_proxy`、`is_censored`、`series_break_flag`、`fetch_method`、`release_date`（来源发布日期）、`fetched_date`（我们拉取或抄录的日期）。备注里的百分比都是脚本算出来的。

**MyCOL 说明：** 小册子只有职业名称；MASCO 4 位编码来自 B 的 `data/roles.csv`（B 从完整报告抄的）。MyCOL 没有 “near” 这个类别，“near” 是 B 的定义（见第 6 节）。`release_date` 2026-03-13 是小册子文件的日期；报告本身在 2025 年 5 月由 TalentCorp 公布。

---

## 4. 目前的信号（`data/trend_signals.csv`）

### 细分大类层（参与评分）

| 细分大类 | arXiv AI 论文增长 | MyCOL | DOSM 网上职位数 |
|---|---|---|---|
| 软件工程 | +29.9%，上升，**结构效应** | 4 个角色中 50% 为 yes（2 个 no） | −0.95%，持平（低）；占比 +0.38pp，上升，**结构效应**（低） |
| 数据与 AI | +2.7%，持平 | 6 个角色中 33.3% 为 yes（2 near、2 no） | 无数据 |
| 网络安全 | +31.3%，上升，**结构效应** | 0% yes；4 个角色全是 near | 无数据 |
| 云端与基础设施 / 网络 | +18.8%，上升，**结构效应** | 5 个角色中 20% 为 yes（3 near、1 no） | 无数据 |
| Web 与界面设计 | +0.9%，持平 | 0% yes；4 个角色中 3 near、1 no | 无数据 |
| IT 管理与分析 | 无数据（没有 arXiv 类别） | 3 个角色 100% 为 yes | 无数据 |
| 硬件与嵌入式 | +40.5%，上升，**结构效应** | 无数据（roles.csv 里没有角色） | 无数据 |

**arXiv 的重要发现：** 凡是 AI 论文“增长”的大类，该类别的**全部**论文都增长得更快，所以 AI 论文的占比其实在下降。例如软件工程：AI 论文 +29.9%，全部论文 +37.4%，AI 占比 58.4% → 55.2%。这说明增长来自论文总量变多，而不是 AI 进入这个领域更快了。这些信号都标了 `composition_effect = TRUE`。arXiv 的可信度最高只到中（全球信号，靠关键词匹配）。

**MyCOL 覆盖** = 该大类里 `is_mycol = yes` 的角色比例。方向：有任何 yes → `on_mycol`（+1）；否则有 near → `near_mycol`（0）；否则 `not_on_mycol`（0）。它是状态，不是趋势（只有一期）。

### 角色层（计分）

每个角色一个信号，共 26 个（`mycol_status` = B 的 `is_mycol`）：8 个 yes、12 个 near、6 个 no。每个信号都连到它用到的 MyCOL 职业行（`input_trend_ids`）。

### 行业背景（不评分）

ICT 行业：就业增长比全国高 0.95pp（中）；薪资增长比全国低 2.5pp（低，只有一个月）；ICT 占有行业分类广告的比例 +0.34pp（低，2026 Q2 有 49.1% 广告未分类）。

### 参考（不评分）

MASCO 2：广告 +6.61%，占比 +5.87pp，薪资增长和全国持平。MASCO 3：广告 −13.91%，占比 −1.51pp，薪资增长比全国高 3.52pp。

阈值草案（A + B 确认）：AI 论文增长 ±10%、广告数量 ±5%、广告占比 ±0.25pp、与全国的差距 ±0.5pp。如果匹配需要一个数值，就用 `direction_code` 乘以可信度权重。公式版本 `v4-it-roles`。

---

## 5. 已知限制（要写进提案）

1. **DOSM 区分不了细分大类和角色。** 只有软件工程有 DOSM 数据（软件开发员，2 个真实数据点），其他大类都显示“无数据”。
2. **arXiv 是全球数据，靠关键词匹配**，而且它的增长主要是类别本身论文变多（见第 4 节）。
3. **MyCOL 只有一期**（2024/2025）：是状态不是趋势；角色和职业怎么对应、什么算 “near”，都是 B 的判断。
4. **数据点少**：只能做描述性对比。
5. **DOSM 的问题：** 网上广告在 2025 Q3 有断点（原因未证实）；2026 Q2 有 49% 广告没有行业分类；OpenDOSM `productivity_qtr` 更新延迟（最后更新 2026-02-23，原定 2026-05-21）；就业增长会被修订（2025 Q1 全国首发 3.0%，现在是 1.8%）。演示时不要依赖 API 刷新，改为展示数据日期。
6. **重建 trends.csv 时 `trend_id` 会变。** 其他文件不要直接写 `T00xx`（已提议改成固定编号）。

---

## 6. 其他成员要做的事

**B：`data/roles.csv`**（已收到，26 个角色）。脚本用到的字段：

| 字段 | 用途 |
|---|---|
| `role_id` | 角色信号的 `entity_id` |
| `role_name_en` | 角色信号的名称 |
| `subfield_code` | 把角色连到细分大类（必须是 `data/subdomains.csv` 里的 `subfield_code`） |
| `is_mycol` | `yes` / `near` / `no`（填别的脚本会停下来） |
| `mycol_occupation`、`masco_4digit_mycol` | yes / near 时对应的 MyCOL 职业（名称要对得上官方清单；同一个职业只能有一个 MASCO 编码） |
| `mycol_matched_title`、`notes` | 显示在角色信号的 `detail` 里 |

B 改了这个文件后，重新跑 `python scripts/update_trends.py --no-arxiv`（约 2 秒）。

**团队：** 确认 `data/subdomains.csv` 里的大类（可选的“硬件与嵌入式”要不要保留：B 没有这一类的角色）、“near” 的定义，以及阈值草案。

**A 还没做的：** 如果团队需要，人工读取 MyMahir 各职业页面上的指标图标（职位空缺、缺口是否持续）；下一季 DOSM（2026 Q3 发布，预计 2026-11-17）：下载新的 “Data JMI” 数据表，改 `update_trends.py` 里的 `JMI_*` 常量。

**C：** GitHub repo、`validate_data.py`、`SOURCES.md`；`matching.py` 要读取新的 `layer` / `scored` / `direction_code` / `confidence` 字段。

---

## 7. 给 SOURCES.md 的条目（交给 C 合并）

| 来源 | 链接 | 说明 |
|---|---|---|
| TalentCorp, MyMahir Malaysia Critical Occupations List (MyCOL) 2024/2025 小册子 | https://www.talentcorp.com.my/images/uploads/publication/205/MyMahir-MyCOL-20242025-Brochure-1773377416.pdf | 66 个职业；只有名称，没有 MASCO 编码 |
| arXiv API | https://info.arxiv.org/help/api/tou.html | 只用论文数量（元数据），符合 arXiv API 使用条款；请求间隔至少 3 秒 |
| DOSM Job Market Insights 数据表 “Data JMI Q2 2026” | https://www.dosm.gov.my/portal-main/release-document-log?release_document_id=20742 | DOSM 官方，引用时注明“Source: Department of Statistics Malaysia” |
| DOSM Job Market Insights 发布稿（2025 Q3 – 2026 Q2） | https://www.dosm.gov.my/portal-main/release-content/big-data-analytics-job-market-insights-q22026 | 同上 |
| DOSM Labour Market Review 2025 Q1、2026 Q1、2026 Q2 | https://storage.dosm.gov.my/analysis/lmr_2026-q2_en.pdf | 同上 |
| OpenDOSM `productivity_qtr`、`wages_occupation` | https://open.dosm.gov.my/data-catalogue | CC BY 4.0（C 要到网站页脚确认）；`wages_occupation` 只包括公民雇员，不含奖金 |
