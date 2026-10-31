/* The page a student takes to a career advisor (#/advisor): best IT area, top 3 jobs, the
   skills to work on first with a free course each, learning so far and questions to ask.
   Built from the same /api/match and /api/learn answers as the jobs page, to print or save
   as a PDF; nothing is sent anywhere. Loaded before app.js, whose helpers it calls. */
"use strict";

const SOURCE_NAMES = { test: "Skills test", preference: "Interests", cv: "Your CV" };
const CLEAR_LEAD = 10;  // matching.CLEAR_LEAD: area-fit points the best area needs over the next one

// Up to 2 questions from what the results say (sources that disagree, two areas close
// together, a top job whose rank depends on the future, an area the student likes but
// cannot do yet), then the next step for the top job.
function advisorQuestions(res, top) {
  const areaName = (id) => (res.areas.find((a) => a.id === id) || {}).name || id;
  const [first, second] = res.areas;
  const mismatch = res.insights.find((i) => i.type === "mismatch");
  const ranks = top[0] && top[0].scenario_ranks ? Object.values(top[0].scenario_ranks) : [];
  const grow = res.groups.areas.find((a) => a.group === "grow_into");
  const asks = [
    mismatch && `My results point to ${areaName(mismatch.areas[0])} and to ${areaName(mismatch.areas[1])}. Which jobs use both?`,
    !mismatch && second && first.fit !== null && second.fit !== null && first.fit - second.fit < CLEAR_LEAD
      && `${first.name} and ${second.name} are close for me. How do I choose?`,
    ranks.length > 0 && Math.max(...ranks) > Math.min(...ranks)
      && `${top[0].role_name} ranks #${Math.min(...ranks)} to #${Math.max(...ranks)} across the 3 future scenarios. Is it a safe choice?`,
    grow && `I like ${grow.name}, but my skills are not there yet. Is it worth working towards?`,
  ].filter(Boolean).slice(0, 2);
  return top[0] ? [...asks, `For ${top[0].role_name}, which internship or project should I aim for?`] : asks;
}

async function pageAdvisor() {
  if (!hasAnswers()) { location.hash = "#/results"; return; }
  render('<p class="muted" role="status">Making your page…</p>');
  // Always the real trend data, even while a what-if is on: this is the plan to talk through.
  const { trend_changes, ...body } = matchBody();
  const [res, profiles] = await Promise.all([api("/api/match", { body: JSON.stringify(body) }), state.demo ? cached("/api/profiles") : []]);
  lastMatchBody = body;
  const who = state.demo ? profiles.find((p) => p.profile_id === state.demo) : null;
  const top = rankedRoles(res).slice(0, 3);
  const path = top.length ? await learnData(top[0].role_id) : null;
  const best = res.areas.find((a) => a.id === res.best);
  const said = (type) => (res.insights.find((i) => i.type === type) || {}).text;
  const paths = trackedPaths().slice(0, 3);
  const skill = (s) => {
    const r = s.resources[0];
    return `<li class="stack" style="gap: 2px">
      <strong>${esc(s.skill_name)}</strong>
      ${s.your_level !== undefined && s.rated !== false ? `<span class="muted small">you ${fmt(s.your_level)} → need ${fmt(s.level_needed)}</span>` : ""}
      ${r ? `<span class="small"><a href="${safeUrl(r.url)}" target="_blank" rel="noopener">${esc(r.title)}</a> <span class="muted">${resourceFacts(r)}</span></span>`
        : '<span class="muted small">No free course yet.</span>'}
    </li>`;
  };
  render(`
  <div class="stack sheet">
    <div class="row no-print">
      <a class="btn ghost" href="#/results">&larr; Back to my jobs</a>
      <button class="btn primary" type="button" id="print">Print or save as PDF</button>
    </div>
    <div class="stack" style="gap: 4px">
      <p class="eyebrow">For your career advisor</p>
      <h1>Your IT career plan</h1>
      <p class="muted small">${today()}${who ? ` · demo: ${esc(who.name)}` : ""}</p>
      ${state.trendChanges ? '<p class="muted small">Built on the real trend data, not your what-if.</p>' : ""}
    </div>
    ${best ? `<section class="card stack" style="gap: 6px">
      <h2>Your best IT area</h2>
      <p class="sheet-area">${esc(best.name)}</p>
      ${[said("best_area"), said("agreement")].filter(Boolean).map((t) => `<p class="small">${esc(t)}</p>`).join("")}
      <div class="row" style="gap: 6px"><span class="muted small">Based on</span>${res.sources_used.map((k) => `<span class="chip plain">${esc(SOURCE_NAMES[k] || k)}</span>`).join("")}</div>
    </section>` : ""}
    <section class="card stack" style="gap: 10px">
      <h2>Your top jobs</h2>
      ${top.length ? `<ol class="sheet-jobs">${top.map((m, i) => `
        <li>
          <div class="stack" style="gap: 4px">
            <strong><span>${i + 1}.</span> ${esc(m.role_name)}</strong>
            <div class="row" style="gap: 6px"><span class="chip plain">${esc(m.area_name || "Other IT area")}</span>${rangeBadge(m)}</div>
          </div>
          <div class="score" aria-label="Match score ${fmt(m.total)} out of 100">${fmt(m.total)}<small>/ 100</small></div>
        </li>`).join("")}</ol>`
        : '<p class="muted">No roles in your best-fit areas match your education level yet. Try a higher education level on the skills page.</p>'}
      <p class="muted small"><span>${esc(res.scenario.name)}</span> · <span>These are estimates, not predictions.</span></p>
    </section>
    ${path ? `<section class="card stack" style="gap: 10px">
      <div class="row" style="gap: 8px"><h2>Skills to work on first</h2><span class="chip plain">${esc(path.role.name)}</span></div>
      <ol class="sheet-list">${path.skills.slice(0, 3).map(skill).join("")}</ol>
      ${path.total_hours && path.weeks ? `<p class="muted small">Whole path: about ${fmt(path.total_hours, 0)} hours, ${Math.max(1, Math.round(path.weeks))} weeks at ${esc(path.hours_per_week)} h a week.</p>` : ""}
    </section>` : ""}
    ${paths.length ? `<section class="card stack" style="gap: 10px">
      <h2>Your learning so far</h2>
      ${paths.map((p) => `<div class="stack" style="gap: 4px"><strong>${esc(p.name)}</strong>${progressHtml(p, state.hoursPerWeek)}</div>`).join("")}
    </section>` : ""}
    <section class="card stack" style="gap: 8px">
      <h2>Questions to ask</h2>
      <ol class="sheet-list">${advisorQuestions(res, top).map((q) => `<li>${esc(q)}</li>`).join("")}</ol>
    </section>
    <section class="card sheet-notes print-only"><h2>Notes</h2></section>
    <p class="muted small"><span>Made with Future Skills</span> · <a href="${esc(location.origin)}">${esc(location.host)}</a></p>
  </div>`);
  document.getElementById("print").onclick = () => window.print();
}

// This page's words in Bahasa Melayu and Chinese, added to i18n.js's tables.
Object.assign(MS, {
  "Seeing a career advisor?": "Akan berjumpa penasihat kerjaya?",
  "Take one page with your top jobs, skills to work on and questions to ask.": "Bawa satu halaman berisi pekerjaan teratas, kemahiran untuk diusahakan dan soalan untuk ditanya.",
  "Make my page": "Sediakan halaman saya", "Making your page…": "Sedang menyediakan halaman anda…",
  "Print or save as PDF": "Cetak atau simpan sebagai PDF", "For your career advisor": "Untuk penasihat kerjaya anda",
  "Your IT career plan": "Pelan kerjaya IT anda", "Built on the real trend data, not your what-if.": "Dibina daripada data trend sebenar, bukan senario bagaimana-jika anda.",
  "Your best IT area": "Bidang IT terbaik anda", "Based on": "Berdasarkan", "Skills to work on first": "Kemahiran untuk diusahakan dahulu",
  "Your learning so far": "Pembelajaran anda setakat ini", "Questions to ask": "Soalan untuk ditanya", "Notes": "Catatan",
  "Made with Future Skills": "Dibuat dengan Future Skills",
});
PATTERNS_MS.push(
  [/^My results point to (.+) and to (.+)\. Which jobs use both\?$/, (m) => `Keputusan saya menunjuk kepada ${names(m[1])} dan ${names(m[2])}. Pekerjaan mana yang menggunakan kedua-duanya?`],
  [/^(.+) and (.+) are close for me\. How do I choose\?$/, (m) => `${names(m[1])} dan ${names(m[2])} hampir sama bagi saya. Bagaimana saya patut memilih?`],
  [/^(.+) ranks #(\d+) to #(\d+) across the 3 future scenarios\. Is it a safe choice\?$/, (m) => `${names(m[1])} berada di kedudukan #${m[2]} hingga #${m[3]} dalam 3 senario masa depan. Adakah ia pilihan yang selamat?`],
  [/^I like (.+), but my skills are not there yet\. Is it worth working towards\?$/, (m) => `Saya meminati ${names(m[1])}, tetapi kemahiran saya belum mencukupi. Adakah ia berbaloi untuk diusahakan?`],
  [/^For (.+), which internship or project should I aim for\?$/, (m) => `Untuk ${names(m[1])}, latihan industri atau projek apakah yang patut saya sasarkan?`],
  [/^Whole path: about (\d+) hours, (\d+) weeks at ([\d.]+) h a week\.$/, (m) => `Seluruh laluan: kira-kira ${m[1]} jam, ${m[2]} minggu pada ${m[3]} jam seminggu.`],
);
Object.assign(ZH, {
  "Seeing a career advisor?": "要见职业顾问吗？",
  "Take one page with your top jobs, skills to work on and questions to ask.": "带上一页纸：你的首选职位、要补的技能和可以问的问题。",
  "Make my page": "生成我的页面", "Making your page…": "正在生成你的页面……",
  "Print or save as PDF": "打印或存为 PDF", "For your career advisor": "给你的职业顾问",
  "Your IT career plan": "你的 IT 职业规划", "Built on the real trend data, not your what-if.": "按真实趋势数据生成，不是你的假设情况。",
  "Your best IT area": "最适合你的 IT 领域", "Based on": "依据", "Skills to work on first": "先补这些技能",
  "Your learning so far": "目前的学习进度", "Questions to ask": "可以问顾问的问题", "Notes": "笔记",
  "Made with Future Skills": "由 Future Skills 生成",
});
PATTERNS_ZH.push(
  [/^My results point to (.+) and to (.+)\. Which jobs use both\?$/, (m) => `我的结果同时指向${names(m[1])}和${names(m[2])}。哪些职位两者都用得上？`],
  [/^(.+) and (.+) are close for me\. How do I choose\?$/, (m) => `${names(m[1])}和${names(m[2])}对我来说很接近。我该怎么选？`],
  [/^(.+) ranks #(\d+) to #(\d+) across the 3 future scenarios\. Is it a safe choice\?$/, (m) => `${names(m[1])}在 3 个未来情景中排第 ${m[2]} 到第 ${m[3]} 名。这是稳妥的选择吗？`],
  [/^I like (.+), but my skills are not there yet\. Is it worth working towards\?$/, (m) => `我对${names(m[1])}有兴趣，但技能还不够。值得朝这个方向努力吗？`],
  [/^For (.+), which internship or project should I aim for\?$/, (m) => `想做${names(m[1])}，我应该争取哪种实习或项目？`],
  [/^Whole path: about (\d+) hours, (\d+) weeks at ([\d.]+) h a week\.$/, (m) => `整条路径：约 ${m[1]} 小时，按每周 ${m[3]} 小时约需 ${m[2]} 周。`],
);
