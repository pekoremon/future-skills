# 成员 A · 趋势数据交付说明

更新日期：2026-10-22 · 状态：阶段 1 任务完成，**趋势分数公式为 v0 草案，等 A + B 一起确认**

所有马来西亚数字都只来自 DOSM（DOSM 发布的报告和 OpenDOSM）。arXiv 只用来看“AI 进入各领域的速度”，属于全球信号。

> 本文件是 [MEMBER_A_HANDOVER.md](MEMBER_A_HANDOVER.md) 的中文版。数据和脚本都是英文，以英文版为准。

---

## 1. 任务完成情况

| 时间 | 任务 | 状态 | 产出 |
|---|---|---|---|
| 第 1 天上午 | DOSM Job Market Insights 最近 4 季 → CSV | ✅ 每个数字都和 DOSM 官方 PDF 对过 | `raw/dosm_manual.csv` |
| 第 1 天下午 | 试 OpenDOSM API，找职业空缺数据集 | ✅ 查完整个目录：**没有**按职业分类的空缺数据集 | 改用 `productivity_qtr`、`wages_occupation`、`lfs_month_youth`，缺口用其他 DOSM 报告补 |
| 第 2 天上午 | arXiv API 抓 3 个领域的 AI 论文趋势 | ✅ | 36 行（3 领域 × 12 个月） |
| 第 2 天下午 | 完成 `update_trends.py` | ✅ 已跑通 | `data/trends.csv`（132 行） |
| 第 2 天下午 | 和 B 一起定趋势分数 | 🟡 草案已写好 | `scripts/trend_score.py` → `data/trend_scores.csv` |

**检查结果：** `trends.csv` 132 行，每行都有来源名称、http 链接、YYYY-MM-DD 格式的日期，数值都是数字或 `no data`。

---

## 2. 文件说明

```
future-skills/
  data/trends.csv            趋势信号总表（脚本生成，不要手改）
  data/trend_scores.csv      每个领域的趋势分数（脚本生成）
  raw/dosm_manual.csv        从 DOSM 报告手抄的数字（唯一需要手改的文件）
  raw/dosm/                  这些数字出处的 DOSM PDF（证据）
  scripts/update_trends.py   “更新数据”按钮：拉取 OpenDOSM 和 arXiv，合并手抄数据，再算分数
  scripts/trend_score.py     趋势分数公式（可以单独运行）
```

运行方法：

```bash
python scripts/update_trends.py             # 完整运行，约 2–3 分钟（arXiv 每次请求要间隔 3 秒）
python scripts/update_trends.py --no-arxiv  # 现场 demo 用，几秒完成，保留上一次的 arXiv 数据
python scripts/trend_score.py               # 只重算分数
```

只用 Python 标准库，不需要 `pip install`。某个来源失败或被跳过时，会保留它上一次的数据。

**编辑 `raw/dosm_manual.csv` 的规则：** 备注（note）里有逗号的话，要用双引号把整段备注括起来，否则后面的列会错位。现在 `update_trends.py` 遇到这种情况会报出行号，并保留上一次的数据，不会写入错位的数据。

---

## 3. trends.csv 里有什么

### 数据来源

| 来源 | 提供什么 | 时间段 | `raw/dosm/` 里的证据 |
|---|---|---|---|
| OpenDOSM `productivity_qtr`（API） | 各行业就业同比增长 | 2025 Q1–Q4 | 实时 API |
| OpenDOSM `wages_occupation`（API） | 按 MASCO 职业大类的月薪中位数 | 2024、2025 | 实时 API |
| OpenDOSM `lfs_month_youth`（API） | 青年失业率 | 2026 年 3–6 月 | 实时 API |
| DOSM Labour Market Review 2026 Q1、Q2 | 各行业就业同比增长（表 4.2）；2026 年 3 月各行业月薪中位数（表 5.1） | 2026 Q1–Q2 | `lmr_2026q1.pdf`、`lmr_2026q2.pdf` |
| DOSM Employment Statistics | 职位总数、空缺、新增职位（农业 + 全国） | 2025 Q3 – 2026 Q2 | 发布页 |
| DOSM Big Data Analytics: Job Market Insights | 按职业和行业的网上职位广告数 | 2025 Q3 – 2026 Q2 | `jmi_*.pdf` |
| DOSM Agriculture Census Report 2024 | 农业就业人数、平均年薪 | 2023 | `agriculture_census_2024_report.pdf` |
| arXiv API | 每月 AI 论文数（cs.AI / cs.LG） | 2025-10 至 2026-09 | 实时 API |

### 各领域的数据覆盖（马来西亚）

| 数据 | 农业 | 金融 | 医疗 | 通用科技（ICT） |
|---|---|---|---|---|
| 就业同比增长，2025 Q3 – 2026 Q2 | ✅ | ✅ | **无数据** | ✅ |
| 月薪中位数，2026 年 3 月 | ✅ RM2,327 | ✅ RM7,700 | **无数据** | ✅ RM6,000 |
| 职位空缺（Employment Statistics） | ✅ 4 季 | 没有单独列出 | 没有单独列出 | 没有单独列出 |
| 网上职位广告（Job Market Insights） | **无数据** | 只有 2026 Q2 | **无数据** | 软件开发员：2026 Q1、Q2 |
| 就业规模 | ✅ 173.5 万人（2023，农业普查） | — | — | — |

### 重点数字（给 pitch 用，都能追溯到具体行）

- **最新一季（2026 Q2）就业同比增长：** ICT +3.5%、金融 +2.1%、全国 +1.1%、农业 +0.1%
- **月薪中位数（2026 年 3 月）：** 金融 RM7,700、ICT RM6,000、全国 RM3,027、农业 RM2,327（同比 +5.8%）
- **农业职位空缺：** 每季约 3.2 万个，占全国空缺约 16%，但农业职位只占全国约 5.4%
- **网上职位广告总数：** 58.8 万（2025 Q3）→ 58.8 万（Q4）→ 62.7 万（2026 Q1，+6.6%）→ 55.6 万（Q2，−11.4%）
- **专业人员占网上广告的比例：** 45.6% → 46.4% → 50.4% → 51.5%，连续 4 季上升
- **软件开发员广告：** 20,089（2026 Q1）→ 19,899（Q2），在总量下降 11.4% 的情况下基本持平
- **AI 论文增长（最近 6 个月比前 6 个月）：** 金融 +30.6%、医疗 +14.0%、农业 −6.6%
- **青年（15–24 岁）失业率：** 10.2%（2026 年 3–6 月）

---

## 4. 趋势分数 v0（需要 B 确认）

| 领域 | 趋势分数 | 马来西亚需求分 | AI 进入速度分 | 缺失项 |
|---|---|---|---|---|
| 金融 | 66.0 | 51.5 | 80.6 | — |
| 医疗 | 64.0 | 无数据 | 64.0 | 马来西亚需求 |
| 通用科技（对照组） | 59.5 | 59.5 | 无数据 | AI 进入速度 |
| 农业 | 40.1 | 36.8 | 43.4 | — |

**公式**

- **马来西亚需求分** = 50 + 10 × （该领域最近 4 季平均就业增长 − 全国平均）。和全国一样是 50 分，每高 1 个百分点加 10 分。最近 4 季 = 2025 Q3、Q4（OpenDOSM）+ 2026 Q1、Q2（Labour Market Review）。同一季两个来源都有时，用 OpenDOSM 的（它是修订后的数据）。
- **AI 进入速度分** = 50 + 100 × （最近 6 个月论文数 ÷ 前 6 个月 − 1）。持平是 50 分，增长 10% 是 60 分。
- **趋势分数** = 有数据的分项取平均，限制在 0–100 之间。缺数据的分项不补数字，写进 `missing` 列。
- 每一行都记录了用到哪些 `trend_id`（`input_trend_ids` 列）。

**需要 A + B 一起决定的问题**

1. **权重：** 现在各占 50%。如果要回答评委“和马来西亚有什么关系”，可以考虑把马来西亚需求调到 60–70%。
2. **医疗只有一个分项：** 我们查过的 DOSM 报告都没有把医疗单独列出来（见第 5 节）。可以在界面上标“低可信度”，或者不放进排名。
3. **农业职位空缺要不要算进分数？** 农业空缺占全国 16%，职位却只占 5.4%，这是需求信号；但这些主要是种植园工作，不是科技岗位。目前没有算进分数。
4. **假设要在提案里写明：** “AI 论文增长快 → 更需要‘科技 + 行业知识’的人才”是我们的假设，不是数据结论。
5. **农业分数最低：** 要决定 pitch 怎么讲，比如“还没人做、有空间”，而不是“正在上升”。

---

## 5. 还缺什么，为什么

**医疗（马来西亚需求）：DOSM 没有数据。** 以下来源都查过，都没有把医疗单独列出：
- OpenDOSM 目录（`productivity_qtr`、`productivity_annual` 没有医疗就业；只有“私人医疗”的生产力，而且没有数据）
- DOSM Employment Statistics（只分农业、采矿、制造、建筑、服务业）
- Labour Market Review 里的劳动生产力表（没有列出医疗，可能归在“其他服务”里，范围太大，不能拿来代替）
- DOSM Job Market Insights（医疗从来没进过公布的前 5 名）
- DOSM 劳动力调查季报（公开的只有新闻稿，没有分行业的表）

卫生部（MOH）网站拒绝程序访问，而且我们已经决定只用 DOSM。

**其他缺口**
- 网上职位广告：农业和医疗都没有；金融缺 2025 Q3 – 2026 Q1；软件开发员缺 2025 Q3 – Q4。DOSM 只公布前 5 名职业和行业，可以下载的 PDF 也只是同一份新闻稿。这些都标了 `no data`。
- **按角色和技能对应趋势：** 计划要求“每个角色和技能至少 1 条趋势”。现在只到领域和 MASCO 职业大类这一层。等 B 做好 `roles.csv` 和 `skills.csv`，再把每个角色对应到所属领域的数据和 MASCO 编码（备注写“Proxy: major group data; not role-specific”，即使用职业大类数据代替）。

**数据注意事项（每行的 `note` 里已经写明）**
- 2025 Q3 职位广告环比 +108.8%：很可能是 DOSM 扩大了收录的招聘平台，不是需求真的翻倍。
- 2026 Q2 服务业占网上广告的比例从 78.8% 降到 43.9%：DOSM PDF 原文确认如此，可能改了分类，使用时要小心。
- DOSM 两份调查对“职位”的统计口径不同：Employment Statistics 调查注册私人企业（农业约 50.3 万个职位），劳动力调查（LFS）调查住户（农业约 189 万就业人口）。两者不能直接比较。
- `source_date` 的意思：DOSM 报告的行是发布日期，OpenDOSM 和 arXiv API 的行是抓取日期。要写进 SOURCES.md。
- arXiv 是按摘要关键词计数，数字是近似值。农业的搜索词用 `cropland` 和 `"crop yield"`，不用 `crop`，因为 `crop` 主要搜到图像裁剪类论文。

**这一轮修好的问题**
- 翻译成英文时，`raw/dosm_manual.csv` 里一句没加引号的备注多了一个逗号，导致 12 行 MASCO 职位广告数据错位。已经改正，并重新检查了全部行。
- `--no-arxiv` 原本会删掉 arXiv 数据，现在会保留上一次的数据。

**属于成员 C 的部分**
- GitHub repo、`validate_data.py`、`SOURCES.md` 都还没建。上面的来源检查是手动跑的。

---

## 6. 给 SOURCES.md 的条目（交给 C 合并）

| 来源 | 链接 | 许可 / 说明 |
|---|---|---|
| DOSM Big Data Analytics: Job Market Insights（2025 Q3 – 2026 Q2） | https://www.dosm.gov.my/portal-main/release-content/big-data-analytics-job-market-insights-q22026 | DOSM 官方发布，引用时注明“Source: Department of Statistics Malaysia” |
| DOSM Employment Statistics（2025 Q3 – 2026 Q2） | https://www.dosm.gov.my/portal-main/release-content/employment-statistics-Q22026 | 同上 |
| DOSM Labour Market Review 2026 Q1、Q2 | https://storage.dosm.gov.my/analysis/lmr_2026-q2_en.pdf | 同上 |
| DOSM Agriculture Census Report 2024 | https://www.dosm.gov.my/uploads/release-content/file_20260319122516.pdf | 同上 |
| OpenDOSM `productivity_qtr`、`wages_occupation`、`lfs_month_youth` | https://open.dosm.gov.my/data-catalogue | OpenDOSM 开放数据，CC BY 4.0（C 要到网站页脚再确认一次） |
| arXiv API | https://info.arxiv.org/help/api/tou.html | 只用了论文数量（元数据），符合 arXiv API 使用条款；请求间隔至少 3 秒 |
