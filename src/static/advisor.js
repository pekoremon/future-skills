/* The page a student takes to a career advisor (#/advisor), laid out for the advisor: what
   the result is based on, interest and skill per IT area, the skills test, technologies and
   self-rated skills, interest type, top 3 jobs with their score parts, the skills to work on
   first, learning so far and questions to ask. Built from the same answers as the jobs page,
   to print, save as a PDF or share; nothing is saved on our server. Loaded before app.js,
   whose helpers it calls. */
"use strict";

const SOURCE_NAMES = { cv: "CV and tools", preference: "Interests", test: "Skills test" };
const GROUP_LABEL = { best_fit: "Best fit", can_do: "Can do", grow_into: "Wants to grow into" };
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

// What the student gave: their own answers, or the demo student's profile.
function advisorInputs(who) {
  if (who) {
    return { answers: who.interest_answers, techs: who.technologies || [], ratings: who.skills || {},
      zone: who.education_job_zone, test: null };
  }
  return { answers: quizDone() ? state.answers : null, techs: state.techs, ratings: state.ratings,
    zone: state.zone, test: testDone() ? state.test.result : null };
}

async function pageAdvisor() {
  if (!hasAnswers()) { location.hash = "#/results"; return; }
  render('<p class="muted" role="status">Making your page…</p>');
  // Always the real trend data, even while a what-if is on: this is the plan to talk through.
  const { trend_changes, ...body } = matchBody();
  const [res, profiles, skills] = await Promise.all([api("/api/match", { body: JSON.stringify(body) }),
    state.demo ? cached("/api/profiles") : [], cached("/api/skills")]);
  lastMatchBody = body;
  const who = state.demo ? profiles.find((p) => p.profile_id === state.demo) : null;
  const input = advisorInputs(who);
  const top = rankedRoles(res).slice(0, 3);
  const [interest, learn] = await Promise.all([
    input.answers ? api("/api/questionnaire/score", { body: JSON.stringify({ answers: input.answers }) }) : null,
    top.length ? learnData(top[0].role_id) : null,
  ]);
  const skillName = Object.fromEntries(skills.map((s) => [s.skill_id, s.skill_name]));
  const groupOf = Object.fromEntries(res.groups.areas.map((a) => [a.id, a.group]));
  const paths = trackedPaths().slice(0, 3);
  const questions = advisorQuestions(res, top);
  const num = (v) => (v === null || v === undefined ? "–" : fmt(v, 0));
  const chips = (names) => names.map((n) => `<span class="chip plain">${esc(n)}</span>`).join("");

  // Based on: which parts the student did, so the advisor knows how far to trust each score.
  const done = Object.keys(SOURCE_NAMES).map((k) => (res.sources_used.includes(k)
    ? `<span class="chip">✓ ${esc(SOURCE_NAMES[k])}</span>` : `<span class="chip warn-chip">✕ ${esc(SOURCE_NAMES[k])}</span>`)).join("");
  const caution = res.groups.mode === "interest_only" ? "Skills not checked yet: this is from interests only."
    : !res.sources_used.includes("test") ? "Skills not tested yet: skill scores come from the CV and technologies only." : "";

  const areaRows = res.areas.map((a) => `<tr>
      <th scope="row">${esc(a.name)}</th>
      <td>${num(a.parts.preference.score)}</td><td>${num(a.parts.test.score)}</td><td>${num(a.parts.cv.score)}</td>
      <td><strong>${num(a.fit)}</strong></td>
      <td>${GROUP_LABEL[groupOf[a.id]] ? `<span class="chip${groupOf[a.id] === "best_fit" ? "" : " plain"}">${esc(GROUP_LABEL[groupOf[a.id]])}</span>` : ""}</td>
    </tr>`).join("");

  const t = input.test;
  const testCard = t ? `<section class="card stack" style="gap: 8px">
      <h2>Skills test result</h2>
      ${t.domains.filter((d) => d.tested_in_depth).map((d) => `<div class="row" style="gap: 8px">
        <strong>${esc(d.name)}</strong><span><strong>${d.readiness}</strong> <span class="muted">/ 100 readiness</span></span>
        <span class="chip${d.level.min >= 75 ? "" : d.level.min >= 50 ? " plain" : " warn-chip"}">${esc(d.level.label)}</span></div>`).join("")}
      ${(() => { const good = [...new Set(t.items.filter((i) => i.correct).map((i) => i.skill))].slice(0, 8);
        return good.length ? `<div class="row" style="gap: 6px"><span class="muted small">Answered well</span>${chips(good)}</div>` : ""; })()}
      ${t.skills_to_improve.length ? `<div class="row" style="gap: 6px"><span class="muted small">To work on</span>${chips([...new Set(t.skills_to_improve.map((g) => g.skill))].slice(0, 6))}</div>` : ""}
    </section>` : "";

  const techNames = input.techs.map((id) => skillName[id]).filter(Boolean).slice(0, 12);
  const strong = Object.entries(input.ratings).filter(([, v]) => v >= 4).map(([id]) => skillName[id]).filter(Boolean).slice(0, 8);
  const usesCard = techNames.length || strong.length ? `<section class="card stack" style="gap: 8px">
      <h2>Technologies and skills</h2>
      ${techNames.length ? `<div class="row" style="gap: 6px"><span class="muted small">Technologies</span>${chips(techNames)}</div>` : ""}
      ${strong.length ? `<div class="row" style="gap: 6px"><span class="muted small">Self-rated 4–5</span>${chips(strong)}</div>` : ""}
    </section>` : "";

  const types = interest && interest.usable ? [...interest.code].filter((k) => TYPES[k]) : [];
  const interestCard = types.length ? `<section class="card stack" style="gap: 8px">
      <h2>Interests</h2>
      <div class="row" style="gap: 8px"><span class="muted small">Holland code</span><strong>${esc(interest.code)}</strong></div>
      <div class="row" style="gap: 6px">${types.map((k) => `<span class="chip plain">${esc(TYPES[k].name)} ${interest.percent[k]}%</span>`).join("")}</div>
    </section>` : "";

  const skill = (s) => {
    const r = s.resources[0];
    return `<li class="stack" style="gap: 2px">
      <strong>${esc(s.skill_name)}</strong>
      ${s.your_level !== undefined && s.rated !== false ? `<span class="muted small">you ${fmt(s.your_level)} → need ${fmt(s.level_needed)}</span>` : ""}
      ${r ? `<span class="small"><a href="${safeUrl(r.url)}" target="_blank" rel="noopener">${esc(r.title)}</a> <span class="muted">${resourceFacts(r)}</span></span>`
        : '<span class="muted small">No free course yet.</span>'}
    </li>`;
  };
  const parts = (m) => ORDER_PARTS.map((k) => `<span><i class="k-${k}"></i>${PART_LABEL[k]} <strong>${m.components[k].score === null ? "–" : fmt(m.components[k].points)}</strong></span>`).join("");

  render(`
  <div class="stack sheet">
    <div class="row no-print">
      <a class="btn ghost" href="#/results">&larr; Back to my jobs</a>
      <button class="btn primary" type="button" id="print">Print or save as PDF</button>
      <button class="btn" type="button" id="share-plan">Share</button>
    </div>
    <p class="muted small no-print" id="share-status" role="status" hidden></p>
    <div class="stack" style="gap: 6px">
      <p class="eyebrow">For your career advisor</p>
      <h1>Your IT career plan</h1>
      <p class="muted small">${today()}${who ? ` · demo: ${esc(who.name)}` : ""}</p>
      <div class="row" style="gap: 6px"><span class="muted small">Based on</span>${done}
        <span class="muted small">Education</span><span class="chip plain">${esc(ZONES[input.zone] || "")}</span>
        <span class="muted small">Study time</span><span class="chip plain">${esc(state.hoursPerWeek)} h a week</span></div>
      ${caution ? `<p class="warn small">${caution}</p>` : ""}
      ${state.trendChanges ? '<p class="muted small">Built on the real trend data, not your what-if.</p>' : ""}
    </div>
    <section class="card stack" style="gap: 8px">
      <h2>Strengths by IT area</h2>
      <div class="table-wrap"><table class="sheet-table">
        <thead><tr><th scope="col">IT area</th><th scope="col">Interest</th><th scope="col">Skills test</th><th scope="col">CV and tools</th><th scope="col">Fit</th><th scope="col"><span class="visually-hidden">Group</span></th></tr></thead>
        <tbody>${areaRows}</tbody>
      </table></div>
      <p class="muted small">Scores 0–100. Fit = interest and skill together.</p>
      ${res.insights.filter((i) => i.type !== "one_source").map((i) => `<p class="small">${esc(i.text)}</p>`).join("")}
    </section>
    ${testCard}
    ${usesCard}
    ${interestCard}
    <section class="card stack" style="gap: 10px">
      <h2>Your top jobs</h2>
      ${top.length ? `<ol class="sheet-jobs">${top.map((m, i) => `
        <li>
          <div class="stack" style="gap: 4px">
            <strong><span>${i + 1}.</span> ${esc(m.role_name)}</strong>
            <div class="row" style="gap: 6px"><span class="chip plain">${esc(m.area_name || "Other IT area")}</span>${rangeBadge(m)}</div>
            <div class="legend parts">${parts(m)}</div>
          </div>
          <div class="score" aria-label="Match score ${fmt(m.total)} out of 100">${fmt(m.total)}<small>/ 100</small></div>
        </li>`).join("")}</ol>`
        : '<p class="muted">No roles in your best-fit areas match your education level yet. Try a higher education level on the skills page.</p>'}
      <p class="muted small"><span>${esc(res.scenario.name)}</span> · <span>These are estimates, not predictions.</span></p>
    </section>
    ${learn ? `<section class="card stack" style="gap: 10px">
      <div class="row" style="gap: 8px"><h2>Skills to work on first</h2><span class="chip plain">${esc(learn.role.name)}</span></div>
      <ol class="sheet-list">${learn.skills.slice(0, 3).map(skill).join("")}</ol>
      ${learn.total_hours && learn.weeks ? `<p class="muted small">Whole path: about ${fmt(learn.total_hours, 0)} hours, ${Math.max(1, Math.round(learn.weeks))} weeks at ${esc(learn.hours_per_week)} h a week.</p>` : ""}
    </section>` : ""}
    ${paths.length ? `<section class="card stack" style="gap: 10px">
      <h2>Your learning so far</h2>
      ${paths.map((p) => `<div class="stack" style="gap: 4px"><strong>${esc(p.name)}</strong>${progressHtml(p, state.hoursPerWeek)}</div>`).join("")}
    </section>` : ""}
    <section class="card stack" style="gap: 8px">
      <h2>Questions to ask</h2>
      <ol class="sheet-list">${questions.map((q) => `<li>${esc(q)}</li>`).join("")}</ol>
    </section>
    <section class="card sheet-notes print-only"><h2>Notes</h2></section>
    <p class="muted small"><span>Made with Future Skills</span> · <a href="${esc(location.origin)}">${esc(location.host)}</a></p>
  </div>`);
  document.getElementById("print").onclick = () => window.print();

  // Share: the plan as plain text in the page's language, through the phone's share sheet
  // (WhatsApp, email…), or copied where there is none.
  const tx = (s) => (LANG === "en" ? s : tr(s));
  const text = [
    tx("Your IT career plan"), today(), "",
    `${tx("Strengths by IT area")} (${tx("Interest")} / ${tx("Skills test")} / ${tx("CV and tools")} / ${tx("Fit")}):`,
    ...res.areas.map((a) => `- ${tx(a.name)}: ${num(a.parts.preference.score)} / ${num(a.parts.test.score)} / ${num(a.parts.cv.score)} / ${num(a.fit)}`), "",
    `${tx("Your top jobs")}:`, ...top.map((m, i) => `${i + 1}. ${tx(m.role_name)} (${fmt(m.total)} / 100)`), "",
    ...(learn ? [`${tx("Skills to work on first")}:`, ...learn.skills.slice(0, 3).map((s) => `- ${s.skill_name}${s.resources[0] ? `: ${s.resources[0].title} ${s.resources[0].url}` : ""}`), ""] : []),
    `${tx("Questions to ask")}:`, ...questions.map((q, i) => `${i + 1}. ${tx(q)}`),
  ].join("\n");
  document.getElementById("share-plan").onclick = async () => {
    const status = document.getElementById("share-status");
    try {
      if (navigator.share) { await navigator.share({ title: tx("Your IT career plan"), text }); return; }
      await navigator.clipboard.writeText(text);
      status.textContent = "Copied. Paste it into WhatsApp or an email to your advisor.";
    } catch (e) {
      if (e.name === "AbortError") return;  // share sheet closed
      status.textContent = "Could not share here. Use Print or save as PDF instead.";
    }
    status.hidden = false;
  };
}

// This page's words in Bahasa Melayu and Chinese, added to i18n.js's tables (words other
// pages already translate keep their translation).
const addWords = (dict, words) => { for (const k of Object.keys(words)) if (!(k in dict)) dict[k] = words[k]; };
addWords(MS, {
  "Seeing a career advisor?": "Akan berjumpa penasihat kerjaya?",
  "Take one page with your top jobs, skills to work on and questions to ask.": "Bawa satu halaman berisi pekerjaan teratas, kemahiran untuk diusahakan dan soalan untuk ditanya.",
  "Make my page": "Sediakan halaman saya", "Making your page…": "Sedang menyediakan halaman anda…",
  "Print or save as PDF": "Cetak atau simpan sebagai PDF", "For your career advisor": "Untuk penasihat kerjaya anda",
  "Your IT career plan": "Pelan kerjaya IT anda", "Built on the real trend data, not your what-if.": "Dibina daripada data trend sebenar, bukan senario bagaimana-jika anda.",
  "Based on": "Berdasarkan", "Education": "Pendidikan", "Study time": "Masa belajar",
  "Skills not checked yet: this is from interests only.": "Kemahiran belum disemak: ini daripada minat sahaja.",
  "Skills not tested yet: skill scores come from the CV and technologies only.": "Kemahiran belum diuji: skor kemahiran hanya daripada CV dan teknologi.",
  "Strengths by IT area": "Kekuatan mengikut bidang IT", "Interest": "Minat", "CV and tools": "CV dan alat", "Fit": "Kesesuaian",
  "Group": "Kumpulan", "Best fit": "Paling sesuai", "Can do": "Boleh buat", "Wants to grow into": "Mahu berkembang ke arah ini",
  "Scores 0–100. Fit = interest and skill together.": "Skor 0–100. Kesesuaian = minat dan kemahiran bersama.",
  "Skills test result": "Keputusan ujian kemahiran", "Answered well": "Dijawab dengan baik", "To work on": "Perlu diperbaiki",
  "Technologies and skills": "Teknologi dan kemahiran", "Self-rated 4–5": "Penilaian sendiri 4–5", "Holland code": "Kod Holland",
  "Skills to work on first": "Kemahiran untuk diusahakan dahulu", "Your learning so far": "Pembelajaran anda setakat ini",
  "Questions to ask": "Soalan untuk ditanya", "Notes": "Catatan", "Made with Future Skills": "Dibuat dengan Future Skills", "Share": "Kongsi",
  "Copied. Paste it into WhatsApp or an email to your advisor.": "Disalin. Tampal dalam WhatsApp atau e-mel kepada penasihat anda.",
  "Could not share here. Use Print or save as PDF instead.": "Tidak dapat dikongsi di sini. Gunakan Cetak atau simpan sebagai PDF.",
});
PATTERNS_MS.push(
  [/^My results point to (.+) and to (.+)\. Which jobs use both\?$/, (m) => `Keputusan saya menunjuk kepada ${names(m[1])} dan ${names(m[2])}. Pekerjaan mana yang menggunakan kedua-duanya?`],
  [/^(.+) and (.+) are close for me\. How do I choose\?$/, (m) => `${names(m[1])} dan ${names(m[2])} hampir sama bagi saya. Bagaimana saya patut memilih?`],
  [/^(.+) ranks #(\d+) to #(\d+) across the 3 future scenarios\. Is it a safe choice\?$/, (m) => `${names(m[1])} berada di kedudukan #${m[2]} hingga #${m[3]} dalam 3 senario masa depan. Adakah ia pilihan yang selamat?`],
  [/^I like (.+), but my skills are not there yet\. Is it worth working towards\?$/, (m) => `Saya meminati ${names(m[1])}, tetapi kemahiran saya belum mencukupi. Adakah ia berbaloi untuk diusahakan?`],
  [/^For (.+), which internship or project should I aim for\?$/, (m) => `Untuk ${names(m[1])}, latihan industri atau projek apakah yang patut saya sasarkan?`],
  [/^Whole path: about (\d+) hours, (\d+) weeks at ([\d.]+) h a week\.$/, (m) => `Seluruh laluan: kira-kira ${m[1]} jam, ${m[2]} minggu pada ${m[3]} jam seminggu.`],
  [/^([\d.]+) h a week$/, (m) => `${m[1]} jam seminggu`],
  [/^✓ (.+)$/, (m) => `✓ ${tr(m[1])}`], [/^✕ (.+)$/, (m) => `✕ ${tr(m[1])}`],
  [/^(Realistic|Investigative|Artistic|Social|Enterprising|Conventional) (\d+)%$/, (m) => `${tr(m[1])} ${m[2]}%`],
);
addWords(ZH, {
  "Seeing a career advisor?": "要见职业顾问吗？",
  "Take one page with your top jobs, skills to work on and questions to ask.": "带上一页纸：你的首选职位、要补的技能和可以问的问题。",
  "Make my page": "生成我的页面", "Making your page…": "正在生成你的页面……",
  "Print or save as PDF": "打印或存为 PDF", "For your career advisor": "给你的职业顾问",
  "Your IT career plan": "你的 IT 职业规划", "Built on the real trend data, not your what-if.": "按真实趋势数据生成，不是你的假设情况。",
  "Based on": "依据", "Education": "学历", "Study time": "学习时间",
  "Skills not checked yet: this is from interests only.": "技能尚未检查：这只根据兴趣。",
  "Skills not tested yet: skill scores come from the CV and technologies only.": "技能尚未测验：技能分数只来自履历和技术。",
  "Strengths by IT area": "各 IT 领域的强项", "Interest": "兴趣", "CV and tools": "履历与工具", "Fit": "契合度",
  "Group": "分组", "Best fit": "最适合", "Can do": "能做", "Wants to grow into": "想往这里发展",
  "Scores 0–100. Fit = interest and skill together.": "分数 0–100。契合度 = 兴趣和技能合起来。",
  "Skills test result": "技能测验结果", "Answered well": "答得好", "To work on": "要加强",
  "Technologies and skills": "技术和技能", "Self-rated 4–5": "自评 4–5 分", "Holland code": "Holland 代码",
  "Skills to work on first": "先补这些技能", "Your learning so far": "目前的学习进度",
  "Questions to ask": "可以问顾问的问题", "Notes": "笔记", "Made with Future Skills": "由 Future Skills 生成", "Share": "分享",
  "Copied. Paste it into WhatsApp or an email to your advisor.": "已复制。贴到 WhatsApp 或电邮里发给你的顾问。",
  "Could not share here. Use Print or save as PDF instead.": "这里无法分享。请改用「打印或存为 PDF」。",
});
PATTERNS_ZH.push(
  [/^My results point to (.+) and to (.+)\. Which jobs use both\?$/, (m) => `我的结果同时指向${names(m[1])}和${names(m[2])}。哪些职位两者都用得上？`],
  [/^(.+) and (.+) are close for me\. How do I choose\?$/, (m) => `${names(m[1])}和${names(m[2])}对我来说很接近。我该怎么选？`],
  [/^(.+) ranks #(\d+) to #(\d+) across the 3 future scenarios\. Is it a safe choice\?$/, (m) => `${names(m[1])}在 3 个未来情景中排第 ${m[2]} 到第 ${m[3]} 名。这是稳妥的选择吗？`],
  [/^I like (.+), but my skills are not there yet\. Is it worth working towards\?$/, (m) => `我对${names(m[1])}有兴趣，但技能还不够。值得朝这个方向努力吗？`],
  [/^For (.+), which internship or project should I aim for\?$/, (m) => `想做${names(m[1])}，我应该争取哪种实习或项目？`],
  [/^Whole path: about (\d+) hours, (\d+) weeks at ([\d.]+) h a week\.$/, (m) => `整条路径：约 ${m[1]} 小时，按每周 ${m[3]} 小时约需 ${m[2]} 周。`],
  [/^([\d.]+) h a week$/, (m) => `每周 ${m[1]} 小时`],
  [/^✓ (.+)$/, (m) => `✓ ${tr(m[1])}`], [/^✕ (.+)$/, (m) => `✕ ${tr(m[1])}`],
  [/^(Realistic|Investigative|Artistic|Social|Enterprising|Conventional) (\d+)%$/, (m) => `${tr(m[1])} ${m[2]}%`],
);
