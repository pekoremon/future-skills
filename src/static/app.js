/* Future Skills web app: hash-routed pages over the JSON API in src/main.py. */
"use strict";

const TYPES = {
  R: { name: "Realistic", desc: "Hands-on work with tools, machines, materials or living things, often outdoors or in workshops: engineering, electronics, construction, agriculture." },
  I: { name: "Investigative", desc: "Studying and solving problems with ideas, data and research: science, medicine, mathematics, statistics and information technology." },
  A: { name: "Artistic", desc: "Creating designs, media, writing, music or performances, and applying artistic ideas to products and interfaces." },
  S: { name: "Social", desc: "Helping, teaching, counselling or caring for people: education, health care and community services." },
  E: { name: "Enterprising", desc: "Leading, persuading, selling and managing: business, marketing, finance, management and law." },
  C: { name: "Conventional", desc: "Organising information and following clear procedures: administration, accounting, data, IT operations and finance." },
};
const ORDER = ["R", "I", "A", "S", "E", "C"];
const AREA_NAMES = { software_dev: "Software Engineering", data_ai: "Data & AI", cybersecurity: "Cybersecurity",
  cloud_infra: "Cloud, Infrastructure & Networking", web_ux: "Web & Interface Design" };
const SUBFIELD_AREA = { SE: "software_dev", DA: "data_ai", CS: "cybersecurity", CI: "cloud_infra", WD: "web_ux" };
const ZONES = { 3: "Diploma", 4: "Bachelor's degree", 5: "Master's degree or higher" };
const FLAGS = {
  needs_extra_education: "Needs further study",
  needs_extra_qualification: "Needs extra qualification",
  not_for_it_graduates: "Licensed profession, reference only",
  no_trend_data: "No trend data (neutral 50)",
};
const QUIET_FLAGS = ["area_not_scored", "interest_not_scored"];  // explained once at the top of the page
const PART_LABEL = { area: "IT area fit", interest: "Interest fit", skill: "Skill fit", trend: "AI-era trend" };
const STORE_KEY = "future-skills-v1";


const app = document.getElementById("app");
const cache = {};
const QUIZ_ITEMS = 36;
let state = loadState();

// Answers and learning progress are kept in this browser's localStorage, so they survive
// closing the tab; nothing is saved on the server. readSaved also picks up answers saved
// in sessionStorage by older versions of the app.
function readSaved(key) {
  try { return JSON.parse(localStorage.getItem(key) || sessionStorage.getItem(key) || "null"); } catch (e) { return null; }
}
function writeSaved(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage off: keep in memory */ }
}

function loadState() {
  const base = { answers: Array(QUIZ_ITEMS).fill(null), quizSkipped: false, cvSkipped: false, ratings: {}, techs: [], zone: 4, demo: null, cvAreas: null,
    scenario: "baseline", hoursPerWeek: 5 };
  try {
    const saved = Object.assign(base, readSaved(STORE_KEY) || {});
    if (saved.answers.length !== QUIZ_ITEMS) saved.answers = Array(QUIZ_ITEMS).fill(null);  // older 30-item questionnaire
    const scores = saved.cvAreas && saved.cvAreas.scores;  // saved with an area the app no longer has
    if (scores) for (const a of Object.keys(scores)) if (!(a in AREA_NAMES)) delete scores[a];
    return saved;
  } catch (e) {
    return base;
  }
}
function saveState() {
  writeSaved(STORE_KEY, state);
}
function clearSaved() {
  for (const key of [STORE_KEY, PLAN_KEY, PROGRESS_KEY]) {
    try { localStorage.removeItem(key); sessionStorage.removeItem(key); } catch (e) { /* storage off */ }
  }
}

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const safeUrl = (u) => (/^https?:\/\//i.test(u || "") ? esc(u) : "#");
// Area and role names in the interface language (i18n.js); English if it did not load.
const nameIn = (s) => (window.trName ? window.trName(s) : s);
const fmt = (n, d = 1) => (n === null || n === undefined || n === "" ? "–" : Number(n).toFixed(d));

async function api(path, opts) {
  const res = await fetch(path, opts && opts.body ? { method: "POST", headers: { "Content-Type": "application/json" }, ...opts } : opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
async function cached(path) {
  if (!cache[path]) cache[path] = api(path).catch((e) => { delete cache[path]; throw e; });
  return cache[path];
}

function render(html) {
  app.innerHTML = html;
}
function showError(e) {
  const offline = e instanceof TypeError;  // fetch() rejects with TypeError when the server cannot be reached
  render(`<div class="warn stack" role="alert" style="gap: 10px">
    <p>${offline ? "Cannot reach the Future Skills server. It may have stopped or be restarting." : `Something went wrong: ${esc(e.message)}.`}</p>
    <div class="row"><button class="btn" type="button" id="retry">Try again</button><a href="#/">Back to start</a></div>
  </div>`);
  document.getElementById("retry").onclick = route;
}

const testDone = () => Boolean(state.test && state.test.result);

const interestResult = () => api("/api/questionnaire/score", { body: JSON.stringify({ answers: state.answers }) });
const quizDone = () => state.answers.every((a) => a !== null);
const skillsDone = () => Object.keys(state.ratings).length > 0 || state.techs.length > 0 || Boolean(state.cvAreas);

// The guided path: every step page shows where the student is and links to the next step.
// CV first and interests second, so the skills test only checks the areas they point to.
const JOURNEY = [
  { id: "cv", label: "Your CV", href: "#/cv", done: skillsDone },
  { id: "quiz", label: "Interests", href: "#/quiz", done: quizDone },
  { id: "test", label: "Skills test", href: "#/test", done: testDone },
  { id: "results", label: "Your jobs", href: "#/results", done: () => false },
];
const skipped = (s) => (s.id === "cv" && state.cvSkipped) || (s.id === "quiz" && state.quizSkipped);
const nextStep = (id) => JOURNEY[Math.min(JOURNEY.findIndex((s) => s.id === id) + 1, JOURNEY.length - 1)];
function stepBar(current) {
  return `<ol class="journey" aria-label="Your progress">${JOURNEY.map((s, i) => `
    <li class="${s.done() ? "done" : ""}"${s.id === current ? ' aria-current="step"' : ""}>
      <a href="${s.href}"><span class="num" aria-hidden="true">${s.done() ? "✓" : i + 1}</span>${esc(s.label)}${s.done() ? '<span class="visually-hidden"> (done)</span>' : ""}</a>
    </li>`).join("")}</ol>`;
}

/* ---------- pages ---------- */

// The first page: where IT jobs are heading (dashboard.js), then where the student fits in.
function pageHome() {
  render(`
  <div class="stack">
    <div class="viz-hero">
    <section class="stack" style="gap: 10px">
      <p class="eyebrow">AI-era job trends for IT students in Malaysia</p>
      <h1>Where IT jobs are heading</h1>
      <p class="muted">Official Malaysian data and global AI research in one place. The charts follow the data, and every number shows its source and date.</p>
      <div class="row">
        <button class="btn primary" type="button" id="to-start">Find where I fit &darr;</button>
        <a class="btn ghost" href="#/trends">All signals, data and sources &rarr;</a>
      </div>
    </section>
    <div id="home-jobs" class="viz-hero-chart"></div>
    </div>
    <div id="home-dash" class="stack"><p class="muted" role="status">Loading the trend data…</p></div>
    <div class="row"><a class="btn" href="#/whatif">What if the trend data changed? Try it &rarr;</a></div>
    <section class="card stack" id="start" style="gap: 12px">
      <h2>Where do you fit in?</h2>
      <p class="muted">Find the IT area that suits you and which of 25 IT roles to aim for, with the skills you still need and free courses to learn them.</p>
      <div class="row trust" style="gap: 6px"><span class="chip">Free</span><span class="chip">No login</span><span class="chip">Nothing saved on our server</span><span class="chip">English · Bahasa Melayu · 中文</span></div>
      <div class="row">
        <a class="btn primary" href="${(JOURNEY.find((st) => !st.done() && !skipped(st)) || JOURNEY[3]).href}">${JOURNEY.some((st) => st.done() || skipped(st)) ? "Continue where I left off" : "Start: step 1, your CV"}</a>
        <a class="btn" href="#/skills" id="quick">Quick start: about 2 minutes</a>
        <button class="btn" type="button" id="demo">Try the demo student (fictional)</button>
      </div>
      <p class="muted small">The full path takes about 20 minutes and gives the most accurate result. Quick start takes about 2 minutes: tick your technologies, see your jobs at once, and add the rest later.</p>
      <p class="muted small lang-note">Test questions, O*NET skill names, course titles and AI-written text stay in English, as in most IT workplaces.</p>
      <p class="muted small">Your progress is saved in this browser.</p>
      ${JOURNEY.some((st) => st.done() || skipped(st)) || trackedPaths().length ? '<div class="row"><button class="btn ghost small" type="button" id="forget">Clear my saved answers and progress</button></div>' : ""}
    </section>
  </div>`);
  document.getElementById("demo").onclick = () => { state.demo = "P01"; saveState(); location.hash = "#/results"; };
  document.getElementById("quick").onclick = () => { state.quick = true; saveState(); };
  const forget = document.getElementById("forget");
  if (forget) forget.onclick = () => {
    if (!confirm("Clear your answers, test and learning progress from this browser? This cannot be undone.")) return;
    clearSaved();
    state = loadState();
    progress = loadProgress();
    cvResult = null;
    pageHome();
  };
  document.getElementById("to-start").onclick = () => document.getElementById("start").scrollIntoView({ behavior: "smooth", block: "start" });
  Promise.all([api("/api/trends"), cached("/api/roles")]).then(([t, roles]) => {
    const dash = document.getElementById("home-dash");
    if (!dash) return;  // the student has moved on to another page
    const jobs = document.getElementById("home-jobs");
    jobs.innerHTML = trendHeroChart(t);
    dash.innerHTML = trendDashboard(t, roles);
    wireDashboard(jobs);
    wireDashboard(dash);
  }).catch(() => {
    const dash = document.getElementById("home-dash");
    if (dash) dash.innerHTML = '<p class="warn">Could not load the trend data. <a href="#/trends">Open the Trends page</a></p>';
  });
}

async function pageQuizIntro() {
  render(`
  <div class="quiz stack">
    ${stepBar("quiz")}
    <p class="eyebrow">Step 2 of 4 · Interests</p>
    <h1>What kind of work do you actually enjoy?</h1>
    <div class="row"><span class="chip">36 items</span><span class="chip">About 8 minutes</span><span class="chip">Skip any time</span></div>
    <div class="card stack" style="gap: 6px">
      <h3>A proven interest test</h3>
      <p class="muted">Built on Holland's RIASEC model, the interest model career services use worldwide, including the US Department of Labor's O*NET.</p>
    </div>
    <p class="muted small">Answer by what you would enjoy, not what you are already good at.</p>
    <div class="stack">
      <button class="btn primary" type="button" id="start">${state.answers.some((a) => a !== null) ? "Continue questionnaire" : "Start questionnaire"}</button>
      <button class="btn" type="button" id="skip">Skip to step 3: the skills test</button>
    </div>
    <p class="attribution">Questions written by the team, based on Holland's RIASEC interest types as used by <a href="https://www.onetonline.org/find/descriptor/browse/1.B.1">O*NET</a>.</p>
  </div>`);
  document.getElementById("start").onclick = () => {
    const first = state.answers.indexOf(null);
    location.hash = `#/quiz/${first === -1 ? 1 : first + 1}`;
  };
  document.getElementById("skip").onclick = () => { state.quizSkipped = true; state.demo = null; saveState(); location.hash = "#/test"; };
}

async function pageQuizItem(n) {
  const q = await cached("/api/questionnaire");
  const idx = Math.min(Math.max(n, 1), q.items.length) - 1;
  const item = q.items[idx];
  const opts = Object.entries(q.scale).map(([v, label]) =>
    `<button type="button" data-v="${esc(v)}" aria-pressed="${state.answers[idx] === Number(v)}">${esc(label)}</button>`).join("");
  render(`
  <div class="quiz stack">
    <div class="row" style="justify-content: space-between">
      <a class="btn ghost" href="${idx ? `#/quiz/${idx}` : "#/quiz"}" aria-label="Previous item">&larr; Back</a>
      <span class="muted small">Item ${idx + 1} of ${q.items.length}</span>
      <a class="btn ghost" href="#/quiz">Pause</a>
    </div>
    <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${q.items.length}" aria-valuenow="${idx + 1}"><div style="width: ${Math.round(((idx + 1) / q.items.length) * 100)}%"></div></div>
    <p class="muted small">${esc(q.stem)}</p>
    <div class="card item" id="item-text">${esc(item.text)}</div>
    <div class="options" role="group" aria-labelledby="item-text">${opts}</div>
    <p class="attribution">${esc(q.attribution)}</p>
  </div>`);
  app.querySelectorAll(".options button").forEach((b) => {
    b.onclick = () => {
      state.answers[idx] = Number(b.dataset.v);
      state.quizSkipped = false;
      state.demo = null;
      saveState();
      location.hash = idx + 1 < q.items.length ? `#/quiz/${idx + 2}` : "#/interests";
    };
  });
}

async function pageInterests() {
  if (!quizDone()) { location.hash = "#/quiz"; return; }
  const [r, areas] = await Promise.all([interestResult(), cached("/api/questionnaire")]);
  const top = r.code.split("");
  const bar = (label, value, max, on) => `
    <div class="stack" style="gap: 4px">
      <div class="row" style="justify-content: space-between"><span${on ? ' style="font-weight:700"' : ' class="muted"'}>${label}</span><span class="muted">${fmt(value, 0)} / ${max}</span></div>
      <div class="bar"><div class="${on ? "on" : ""}" style="width: ${(value / max) * 100}%"></div></div>
    </div>`;
  const types = ORDER.map((k) => bar(`${k} · ${TYPES[k].name}`, r.riasec[k], 30, top.includes(k))).join("");
  const areaNames = Object.fromEntries((state.test && state.test.domains || []).map((d) => [d.id, d.name]));
  const ranked = Object.entries(r.area_items).sort((a, b) => b[1] - a[1]);
  const areaBars = ranked.map(([id, v], i) => bar(areaNames[id] || AREA_NAMES[id] || id, v, 100, i === 0)).join("");
  const cards = top.map((k) => `
    <div class="card row" style="align-items: flex-start; flex-wrap: nowrap">
      <span class="letter">${k}</span>
      <div><h3>${TYPES[k].name}</h3><p class="muted small">${TYPES[k].desc}</p></div>
    </div>`).join("");
  render(`
  <div class="quiz stack">
    ${stepBar("quiz")}
    <p class="eyebrow">Step 2 of 4 · Your interest results</p>
    ${r.warnings.map((w) => `<div class="warn">${esc(w.text)}</div>`).join("")}
    <div><p class="muted small">Your interest code (Holland code)</p><div class="big" style="letter-spacing: 0.12em">${esc(r.code)}</div></div>
    <div class="card stack" style="gap: 12px"><h3>Which IT areas you would enjoy</h3><p class="muted small">From the 4 questions about each area (0–100).</p>${areaBars}</div>
    <div class="card stack" style="gap: 12px"><h3>Scores for the six interest types</h3>${types}</div>
    <h2>Your three strongest interests</h2>
    ${cards}
    <div class="note">This is a direction, not a verdict. Interests change with experience. In your matches they sit next to the skills test and your CV.</div>
    <div class="stack">
      <a class="btn primary" href="#/test">Next: step 3, the skills test</a>
      <button class="btn" type="button" id="redo">Answer again</button>
    </div>
    <p class="attribution">${esc(areas.attribution)} Type descriptions written by the team, based on <a href="https://www.onetonline.org/find/descriptor/browse/1.B.1">O*NET Career Interest Types</a>.</p>
  </div>`);
  document.getElementById("redo").onclick = () => { state.answers = Array(QUIZ_ITEMS).fill(null); saveState(); location.hash = "#/quiz/1"; };
}

// Step 1 ends here with or without a CV: the student ticks the technologies they use.
// The most common ones (listed by the most roles) show first; search finds the rest.
const TECH_COMMON = 20;

async function pageSkills() {
  const skills = await cached("/api/skills");
  const techs = skills.filter((s) => s.skill_type === "technology")
    .sort((a, b) => b.role_count - a.role_count || a.skill_name.localeCompare(b.skill_name));
  const common = new Set(techs.slice(0, TECH_COMMON).map((s) => s.skill_id));
  const hasCV = Boolean(cvResult || state.cvAreas);
  const quick = Boolean(state.quick);
  const next = '<a class="btn primary" href="#/quiz" id="go">Next: step 2, interests</a>';
  const see = `<a class="btn${quick ? " primary" : ""}" href="#/results" id="see">See my jobs now</a>`;
  render(`
  <div class="stack">
    ${stepBar("cv")}
    <p class="eyebrow">Step 1 of 4 · Your technologies</p>
    <h1>Which technologies do you use?</h1>
    ${hasCV ? '<p class="muted">Ticked from your CV. Add or remove any.</p>' : `
    <div class="note row" style="justify-content: space-between">
      <p><strong>Have a CV?</strong> AI ticks these for you.</p>
      <a class="btn primary" href="#/cv">Upload my CV</a>
    </div>`}
    <section class="card stack" style="gap: 12px">
      <h2>Technologies</h2>
      <input id="tech-search" class="search" type="search" placeholder="Search, e.g. Python, SQL, Figma" aria-label="Search technologies" autocomplete="off">
      <div class="techs" id="techs">
        ${techs.map((s) => `<button type="button" data-tech="${esc(s.skill_id)}" data-name="${esc(s.skill_name.toLowerCase())}" aria-pressed="${state.techs.includes(s.skill_id)}">${esc(s.skill_name)}</button>`).join("")}
      </div>
      <p class="muted small" id="tech-none" hidden>Not in the list.</p>
      <button class="btn ghost small" type="button" id="tech-all">Show all ${techs.length}</button>
    </section>
    <div class="sticky-actions row">
      ${quick ? see + next.replace("btn primary", "btn") : next + see}
      <span class="muted small" id="count"></span>
    </div>
  </div>`);
  let showAll = false;
  const all = document.getElementById("tech-all");
  const search = document.getElementById("tech-search");
  // Picked and common ones always show; a search shows every match; "Show all" shows the rest.
  const filter = () => {
    const q = search.value.trim().toLowerCase();
    let shown = 0;
    app.querySelectorAll("[data-tech]").forEach((b) => {
      b.hidden = q ? !b.dataset.name.includes(q) : !(showAll || common.has(b.dataset.tech) || b.getAttribute("aria-pressed") === "true");
      if (!b.hidden) shown++;
    });
    document.getElementById("tech-none").hidden = shown > 0;
    all.hidden = Boolean(q) || showAll;
  };
  const count = () => { document.getElementById("count").textContent = `${state.techs.length} picked`; };
  filter(); count();
  app.querySelectorAll("[data-tech]").forEach((b) => {
    b.onclick = () => {
      const id = b.dataset.tech;
      state.techs = state.techs.includes(id) ? state.techs.filter((x) => x !== id) : [...state.techs, id];
      b.setAttribute("aria-pressed", String(state.techs.includes(id)));
      saveState(); count();
    };
  });
  search.oninput = filter;
  all.onclick = () => { showAll = true; filter(); };
  const leave = () => { state.demo = null; state.cvSkipped = !hasCV; saveState(); };
  document.getElementById("go").onclick = leave;
  document.getElementById("see").onclick = leave;
}

// The CV summary lives in memory only: it is never saved to the browser's storage. Only the
// 0-100 evidence score per IT area (state.cvAreas) is kept, for /api/match.
let cvResult = null;
const cvAreasOf = (r) => (Object.keys(r.cv_areas || {}).length ? { scores: r.cv_areas, method: r.cv_areas_method } : null);
const CV_MAX_BYTES = 2_000_000;
const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";

function loadPdfJs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = PDFJS + "pdf.min.js";
    s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + "pdf.worker.min.js"; resolve(window.pdfjsLib); };
    s.onerror = () => reject(new Error("could not load the PDF reader; try a .docx or .txt file"));
    document.head.appendChild(s);
  });
}

async function pdfText(file) {
  const pdfjs = await loadPdfJs();
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages = [];
  for (let i = 1; i <= Math.min(doc.numPages, 10); i++) {
    const content = await (await doc.getPage(i)).getTextContent();
    pages.push(content.items.map((it) => it.str + (it.hasEOL ? "\n" : " ")).join(""));
  }
  return pages.join("\n");
}

// PDF and text files are read here in the browser; a .docx goes to the server as base64.
async function cvRequestBody(file) {
  const name = file.name.toLowerCase();
  if (file.size > CV_MAX_BYTES) throw new Error("the file is larger than 2 MB");
  if (name.endsWith(".pdf")) return { text: await pdfText(file) };
  if (name.endsWith(".txt")) return { text: await file.text() };
  if (name.endsWith(".docx")) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return { docx_base64: btoa(bin) };
  }
  throw new Error("use a .pdf, .docx or .txt file (old .doc files cannot be read)");
}

function cvResultHtml(r) {
  const label = r.source === "llm"
    ? "Written by AI. It can make mistakes, so check it against your CV."
    : "AI summary not available right now, so this summary lists what our matcher found in your CV.";
  const quals = r.qualifications.map((q) => `<li><strong>${esc(q.title)}</strong>${q.institution ? ` · ${esc(q.institution)}` : ""}${q.year ? ` · ${esc(q.year)}` : ""}</li>`).join("");
  const zone = ZONES[r.education_job_zone];
  return `
    <section class="card stack" style="gap: 12px" aria-labelledby="cv-sum">
      <h2 id="cv-sum">Summary</h2>
      <p>${esc(r.summary)}</p>
      <p class="small muted" title="${esc(r.reason || "")}">${label}</p>
    </section>
    <section class="card stack" style="gap: 10px">
      <h2>Skills</h2>
      ${r.skills.length ? `<div class="row" style="gap: 6px">${r.skills.map((s) => `<span class="chip plain">${esc(s)}</span>`).join("")}</div>` : '<p class="muted small">No skills found.</p>'}
    </section>
    <section class="card stack" style="gap: 10px">
      <h2>Qualifications</h2>
      ${quals ? `<ul class="quals">${quals}</ul>` : '<p class="muted small">No degree, diploma or certificate found.</p>'}
    </section>
    <section class="card stack" style="gap: 12px">
      <h2>Use it for your matches</h2>
      <p class="small muted">Technologies found by matching words in your CV against the app's list (O*NET In Demand technologies), not by AI. Untick anything that is wrong.</p>
      ${r.technologies.length ? `<div class="check-list" id="cv-techs">${r.technologies.map((t) => `<label title="Matched “${esc(t.matched)}” in your CV"><input type="checkbox" value="${esc(t.skill_id)}" checked>${esc(t.skill_name)}</label>`).join("")}</div>` : '<p class="small">None of the tracked technologies were found.</p>'}
      ${zone ? `<label class="row small"><input type="checkbox" id="cv-zone" checked> Set highest education to <strong>${esc(zone)}</strong></label>` : ""}
      <div class="row"><button class="btn primary" type="button" id="cv-apply">Add to my technologies</button><span id="cv-added" role="status" aria-live="polite"></span></div>
    </section>
    ${cvEvidenceHtml(r)}`;
}

// Evidence per IT area: the scores the matches use as "CV and tools", and the CV lines behind them.
function cvEvidenceHtml(r) {
  const areas = Object.entries(r.cv_areas || {}).sort((a, b) => b[1] - a[1]);
  if (!areas.length) {
    return `<section class="card stack" style="gap: 10px"><h2>Evidence per IT area</h2>
      <p class="muted small">No evidence found: AI could not read it right now and none of the tracked technologies are in your CV. Your matches use your test and questionnaire instead.</p></section>`;
  }
  const p = r.evidence_points;
  const how = r.cv_areas_method === "llm_evidence"
    ? `AI picked these lines from your CV and said which IT area each shows. Our code kept only quotes that really are in your CV${r.evidence_dropped ? ` (${r.evidence_dropped} not found, so left out)` : ""} and scored them itself: coursework ${p.coursework} points; a personal project, competition or certification ${p.personal_project}; an internship or job ${p.internship}; up to 100 per area. These points are the team's choice.`
    : `${r.source === "llm" ? "AI found no lines it could quote from your CV" : "AI is not available right now"}, so these scores come from the technologies your CV names: how many of the tools that each area's roles list most often (O*NET) you use.`;
  const kind = (k) => k.replace("_", " ");
  const rows = areas.map(([id, v], i) => {
    const quotes = (r.evidence || []).filter((e) => e.area === id);
    return `<div class="stack" style="gap: 4px">
      <div class="row" style="justify-content: space-between"><span${i === 0 && v > 0 ? ' style="font-weight:700"' : ' class="muted"'}>${esc(AREA_NAMES[id] || id)}</span><span class="muted">${fmt(v, 0)} / 100</span></div>
      <div class="bar"><div class="${i === 0 && v > 0 ? "on" : ""}" style="width: ${v}%"></div></div>
      ${quotes.length ? `<ul class="evidence">${quotes.map((e) => `<li><span class="chip plain">${esc(kind(e.kind))} +${e.points}</span> “${esc(e.quote)}”</li>`).join("")}</ul>`
        : `<p class="small muted">${esc((r.cv_areas_why || {})[id] || "")}</p>`}
    </div>`;
  }).join("");
  return `<section class="card stack" style="gap: 12px" aria-labelledby="cv-ev">
      <h2 id="cv-ev">Evidence per IT area</h2>
      <p class="small muted">${how}</p>
      ${rows}
    </section>`;
}

async function pageCV() {
  render(`
  <div class="stack">
    ${stepBar("cv")}
    <p class="eyebrow">Step 1 of 4 · Your CV · optional, about 1 minute</p>
    <h1>Let AI read your CV</h1>
    <p class="muted">Upload your CV to get a short summary of your skills and qualifications. The IT areas it shows evidence for are checked in your skills test, so the test stays short.</p>
    <div class="drop" id="drop">
      <div class="warn stack" style="gap: 6px; align-self: stretch">
        <strong>Before you upload</strong>
        <ul class="privacy">
          <li>Remove your IC number, home address and phone number.</li>
          <li>Your CV goes to our server and an AI service to write the summary. It is not saved.</li>
        </ul>
      </div>
      <label for="cv-file"><strong>Choose your CV</strong> <span class="muted small">PDF, Word (.docx) or text, up to 2 MB</span></label>
      <input id="cv-file" type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain">
      <button class="btn ghost" type="button" id="cv-sample">Try a sample CV (fictional)</button>
    </div>
    <div id="cv-status" role="status" aria-live="polite"></div>
    <div id="cv-out" class="stack"></div>
    <div class="row"><a class="btn primary" href="#/skills">Next: pick your technologies</a><a class="btn ghost" href="#/skills">No CV? Skip</a></div>
  </div>`);
  const status = document.getElementById("cv-status");
  const out = document.getElementById("cv-out");
  const show = (r) => {
    out.innerHTML = cvResultHtml(r);
    document.getElementById("cv-apply").onclick = () => {
      const picked = [...out.querySelectorAll("#cv-techs input:checked")].map((i) => i.value);
      state.techs = [...new Set([...state.techs, ...picked])];
      const z = document.getElementById("cv-zone");
      if (z && z.checked) state.zone = r.education_job_zone;
      state.demo = null;
      saveState();
      const added = document.getElementById("cv-added");
      added.className = picked.length ? "ok-text" : "small muted";
      added.textContent = picked.length ? `✓ Added ${picked.length} technologies to your list` : "Tick at least one technology first";
    };
  };
  const run = async (getBody, what) => {
    status.className = "small muted";
    status.textContent = `Reading ${what}…`;
    out.innerHTML = "";
    cvResult = null;
    state.cvAreas = null;  // a new CV replaces the old evidence, even if reading it fails
    saveState();
    try {
      cvResult = await api("/api/cv/summary", { body: JSON.stringify(await getBody()) });
      status.textContent = `Read ${cvResult.chars_read.toLocaleString()} characters from ${what}.`;
      state.cvAreas = cvAreasOf(cvResult);
      if (state.cvAreas) state.demo = null;
      saveState();
      show(cvResult);
    } catch (e) {
      status.className = "warn";
      status.textContent = `Could not read the CV: ${e.message}`;
    }
  };
  const input = document.getElementById("cv-file");
  input.onchange = () => input.files[0] && run(() => cvRequestBody(input.files[0]), input.files[0].name);
  document.getElementById("cv-sample").onclick = () => run(async () => ({ text: await (await fetch("/static/sample_cv.txt")).text() }), "the sample CV");
  const drop = document.getElementById("drop");
  drop.ondragover = (e) => { e.preventDefault(); drop.classList.add("over"); };
  drop.ondragleave = () => drop.classList.remove("over");
  drop.ondrop = (e) => {
    e.preventDefault();
    drop.classList.remove("over");
    const f = e.dataTransfer.files[0];
    if (f) run(() => cvRequestBody(f), f.name);
  };
  if (cvResult) show(cvResult);
}

function splitBar(m) {
  return `<div class="split" role="img" aria-label="${ORDER_PARTS.map((k) => `${PART_LABEL[k]} ${fmt(m.components[k].points)} points`).join(", ")}">
    ${ORDER_PARTS.map((k) => `<span class="k-${k}" style="width: ${m.components[k].points || 0}%"></span>`).join("")}
  </div>`;
}
const ORDER_PARTS = ["area", "interest", "skill", "trend"];

// Roles that need more study than the student's level, or a licence, are left out of the list.
const isBestMatch = (m) => !m.flags.includes("not_for_it_graduates") && !m.flags.includes("needs_extra_education");

// The list the Matches page shows: best-fit areas' roles first, then can-do areas'; each keeps
// the score order. With no area scores at all every role is listed, as before.
function listedRoles(results, g) {
  const groupOf = Object.fromEntries(g.areas.map((a) => [a.id, a.group]));
  const eligible = results.filter(isBestMatch).sort((x, y) => y.total - x.total);
  return g.mode === "none" ? eligible : ["best_fit", "can_do"].flatMap((name) => eligible.filter((m) => groupOf[m.it_area] === name));
}

const hasAnswers = () => Boolean(state.demo) || testDone() || quizDone() || state.quizSkipped || skillsDone();

// The /api/match request for the student's answers (or a demo student), with the page options
// and the changed trend data of a what-if, if one is on.
function matchBody(demo = state.demo) {
  const options = { top: 35, scenario: state.scenario, hours_per_week: Number(state.hoursPerWeek) };
  if (state.trendChanges) options.trend_changes = state.trendChanges;
  if (demo) return { profile_id: demo, ...options };
  const test = testDone() ? gradedTest(state.test) : undefined;
  return { test, interest_answers: quizDone() ? state.answers : undefined, skill_ratings: state.ratings, technologies: state.techs, cv_areas: state.cvAreas ? state.cvAreas.scores : undefined, education_job_zone: Number(state.zone), ...options };
}

function matchCard(m, rank) {
  const d = m.skill_detail;
  const flags = m.flags.filter((f) => !QUIET_FLAGS.includes(f)).map((f) => `<span class="chip warn-chip">${esc(FLAGS[f] || f)}${f === "needs_extra_education" ? ` (Job Zone ${m.job_zone})` : ""}</span>`).join("");
  const sdg = m.sdg.map((s) => `<span class="chip" title="${esc(s.rationale)}">SDG ${esc(s.target)} · ${esc(s.goal_name)}</span>`).join("");
  const gaps = d.gaps.slice(0, 6).map((g) => `
    <div class="gap-row">
      <span>${esc(g.skill_name)} <span class="muted small">· importance ${fmt(g.importance, 2)}/5</span></span>
      <span class="stack" style="gap: 2px">
        <span class="levels" aria-hidden="true"><span class="have" style="width: ${(g.your_level / 7) * 100}%"></span><span class="need" style="left: calc(${(g.level_needed / 7) * 100}% - 1px)"></span></span>
        <span class="muted small">you ${fmt(g.your_level)} → needed ${fmt(g.level_needed)} (O*NET level, 0–7)</span>
      </span>
    </div>`).join("");
  const parts = ORDER_PARTS.map((k) => {
    const c = m.components[k];
    return `<li><strong>${PART_LABEL[k]}:</strong> ${c.score === null ? "not scored" : `${fmt(c.score)} / 100 × weight ${Math.round(c.weight * 100)}% = ${fmt(c.points)} points`}</li>`;
  }).join("");
  return `
  <article class="card match" data-role="${esc(m.role_id)}">
    <div class="match-head">
      <div class="score" aria-label="Match score ${fmt(m.total)} out of 100">${fmt(m.total)}<small>/ 100</small></div>
      <div class="stack" style="gap: 6px; flex: 1">
        <h3>${rank}. ${esc(m.role_name)} ${moveBadge(m)}</h3>
        <div class="row" style="gap: 6px">
          <span class="chip plain">${esc(m.area_name || "Other IT area")}</span>
          ${rangeBadge(m)}
          ${flags}
          ${sdg}
        </div>
      </div>
    </div>
    ${splitBar(m)}
    <a class="btn learn-link" href="#/learn/${esc(m.role_id)}">How to get there: learning path${pathProgressLabel(m.role_id)} &rarr;</a>
    <details class="more">
      <summary>Why this score, and what to learn</summary>
      <div class="stack" style="gap: 14px">
        <div class="explain stack" style="gap: 8px">
          <button class="btn" type="button" data-explain="${esc(m.role_id)}">Explain this for me</button>
          <div class="explain-out" aria-live="polite" hidden></div>
        </div>
        <ul style="margin: 0; padding-left: 18px">${parts}</ul>
        <p class="small muted">${esc(m.explain.area)}. ${esc(m.explain.interest)}. ${esc(m.explain.trend)}. Skill fit = 70% rated skills (${fmt(d.rated_score)}) + 30% technologies (${fmt(d.tech_score)}).</p>
        ${gaps ? `<div><h3>Biggest skill gaps</h3>${gaps}</div>` : '<p class="note">You meet the level O*NET lists for every rated skill of this role.</p>'}
        ${d.tech_missing.length ? `<div class="stack" style="gap: 8px"><h3>Technologies to learn</h3><div class="row" style="gap: 6px">${d.tech_missing.map((t) => `<span class="chip plain">${esc(t.skill_name)}</span>`).join("")}</div></div>` : ""}
        ${d.tech_used.length ? `<p class="small muted">You already use: ${d.tech_used.map((t) => esc(t.skill_name)).join(", ")}</p>` : ""}
        ${pathHtml(m.pathway)}
        <a class="btn" href="#/learn/${esc(m.role_id)}">See the full learning path, with videos</a>
        <div class="role-extra small muted">Loading role details…</div>
        ${m.sdg.map((s) => `<p class="small"><strong>SDG ${esc(s.target)}</strong> (${esc(s.link_strength)} link): ${esc(s.rationale)}</p>`).join("")}
      </div>
    </details>
  </article>`;
}

// How much the rank depends on the scenario: the same rank in all three, or a range.
function rangeBadge(m) {
  const r = m.scenario_ranks && Object.values(m.scenario_ranks);
  if (!r || !r.length) return "";
  const lo = Math.min(...r), hi = Math.max(...r);
  return lo === hi
    ? `<span class="chip plain" title="The rank does not change between the three future scenarios">Same rank in all 3 scenarios</span>`
    : `<span class="chip plain" title="Rank under each future scenario: ${Object.entries(m.scenario_ranks).map(([k, v]) => `${k.replace(/_/g, " ")} ${v}`).join(", ")}">#${lo}–${hi} across 3 scenarios</span>`;
}

function moveBadge(m) {
  if (state.scenario === "baseline" || !m.baseline_rank || m.baseline_rank === m.rank) return "";
  const up = m.baseline_rank - m.rank;
  return `<span class="chip ${up > 0 ? "" : "plain"}" title="Rank under current trends: ${m.baseline_rank}">${up > 0 ? "▲" : "▼"} ${Math.abs(up)} vs current trends</span>`;
}

// What to learn next for a role, in the learning path's own order: the biggest gap in a skill
// the student rated or showed in the test, then the first missing technology. Skills nobody
// rated are left out here: an unrated skill always looks like a big gap.
function learnNext(m) {
  const d = m.skill_detail;
  const gap = d.gaps.find((x) => x.rated !== false && x.level_needed - x.your_level >= 0.5);
  return [gap, d.tech_missing[0]].filter(Boolean).map((x) => x.skill_name);
}

// One job in short: the summary at the top of the results page and the home page example.
function topCard(m, rank) {
  const next = learnNext(m);
  return `
    <li class="top-card">
      <div class="top-main">
        <h3>${rank}. ${esc(m.role_name)}</h3>
        <div class="row" style="gap: 6px">
          <span class="chip plain">${esc(m.area_name || "Other IT area")}</span>
          ${rangeBadge(m)}
        </div>
        ${next.length ? `<p class="small"><span class="muted">Learn next:</span> ${next.map(esc).join(", ")}</p>` : ""}
      </div>
      <div class="top-side">
        <div class="score" aria-label="Match score ${fmt(m.total)} out of 100">${fmt(m.total)}<small>/ 100</small></div>
        <a class="btn primary" href="#/learn/${esc(m.role_id)}">Learning path &rarr;</a>
      </div>
    </li>`;
}

function pathHtml(p) {
  if (!p.steps.length && !p.gaps_without_course.length) return "";
  const steps = p.steps.map((s) => `
    <li class="step">
      <a href="${safeUrl(s.url)}" rel="noopener" target="_blank">${esc(s.title)}</a>
      <span class="muted small">${esc(s.provider)} · ${s.hours ? `${fmt(s.hours)} h` : "self-paced, no stated length"} · ${s.cost_myr === 0 ? "Free" : `RM ${fmt(s.cost_myr, 0)}`} · checked ${esc(s.verified_date)}</span>
      <span class="small">Covers: ${s.skills.map(esc).join(", ")}</span>
    </li>`).join("");
  const time = p.total_hours
    ? `About <strong>${fmt(p.total_hours)} hours</strong>, or <strong>${fmt(p.weeks)} weeks</strong> at ${esc(p.hours_per_week)} hours a week${p.steps_without_hours ? ` (plus ${p.steps_without_hours} self-paced resource${p.steps_without_hours > 1 ? "s" : ""})` : ""}.`
    : "";
  return `<div class="stack" style="gap: 8px">
    <h3>Your learning path</h3>
    ${p.steps.length ? `<p class="small">${time} Ordered by the biggest gap first; all free.</p><ol class="path">${steps}</ol>` : ""}
    ${p.gaps_without_course.length ? `<p class="small muted">No verified free course in our list yet for: ${p.gaps_without_course.map((g) => esc(g.skill_name)).join(", ")}.</p>` : ""}
    ${p.hrd_corp_options && p.hrd_corp_options.length ? `<p class="small muted">Working already? ${p.hrd_corp_options.length} paid course${p.hrd_corp_options.length > 1 ? "s" : ""} your employer can claim under HRD Corp ${p.hrd_corp_options.length > 1 ? "are" : "is"} on the full learning path page.</p>` : ""}
  </div>`;
}

let lastMatchBody = null;

async function explainRole(button) {
  const out = button.parentElement.querySelector(".explain-out");
  button.disabled = true;
  out.hidden = false;
  out.className = "explain-out small muted";
  out.textContent = "Writing a plain-language explanation…";
  try {
    const r = await api("/api/explain", { body: JSON.stringify({ ...lastMatchBody, role_id: button.dataset.explain }) });
    out.className = "explain-out note";
    const label = r.source === "llm"
      ? `Written by AI (${esc(r.model.split("/").pop())} on ${esc(r.provider || "Fireworks AI")}) from your scores above. It may still be wrong; the numbers above are the source of truth.`
      : "AI explanation not available right now, so this is a plain summary of your scores.";
    out.innerHTML = `<p>${esc(r.text)}</p><p class="small" style="margin-top: 6px; opacity: 0.85" title="${esc(r.reason || "")}">${label}</p>`;
    button.textContent = "Explain again";
  } catch (e) {
    out.className = "explain-out warn";
    out.textContent = `Could not get an explanation: ${e.message}`;
  } finally {
    button.disabled = false;
  }
}

async function loadRoleExtra(card) {
  const box = card.querySelector(".role-extra");
  if (!box || box.dataset.done) return;
  box.dataset.done = "1";
  try {
    const r = await cached(`/api/roles/${encodeURIComponent(card.dataset.role)}`);
    const certs = r.certifications.map((c) => `<li><a href="${safeUrl(c.url)}">${esc(c.cert_name)}</a> · ${esc(c.issuer)}${c.required_to_practise_my === "yes" ? " · <strong>required to practise in Malaysia</strong>" : ""}${c.cost_amount ? ` · ${esc(c.cost_currency)} ${esc(c.cost_amount)}` : ""}</li>`).join("");
    box.innerHTML = `
      ${certs ? `<h3 style="color: var(--text)">Licences and certifications</h3><ul style="margin: 4px 0 0; padding-left: 18px">${certs}</ul>` : ""}
      <p style="margin-top: 8px">O*NET occupation: <a href="https://www.onetonline.org/link/summary/${encodeURIComponent(r.role.onet_soc)}">${esc(r.role.onet_title || r.role.role_name_en)} (${esc(r.role.onet_soc)})</a>${r.role.mycol_occupation ? ` · MyCOL: ${esc(r.role.masco_4digit_mycol)} ${esc(r.role.mycol_occupation)}` : ""}</p>`;
  } catch (e) {
    box.textContent = "Could not load role details.";
  }
}

/* Automatic re-planning: keep the last ranking for the same answers and scenario, with the
   trend data it used. When the "Update data" job writes new trend data, say what moved. */
const PLAN_KEY = "future-skills-last-plan";
function replanNote(body, res) {
  const { scenario, top, hours_per_week, trend_changes, ...answers } = body;
  const who = JSON.stringify(answers) + "|" + scenario;
  const best = res.results.filter(isBestMatch).sort((x, y) => y.total - x.total);
  const now = { who, data: res.trend_data, roles: Object.fromEntries(best.map((m, i) => [m.role_id, { rank: i + 1, name: m.role_name, total: m.total, trend: m.components.trend.score }])) };
  let before = null;
  before = readSaved(PLAN_KEY);
  writeSaved(PLAN_KEY, now);
  if (!before || before.who !== who || !before.data || !now.data || before.data.id === now.data.id) return "";
  const moved = Object.entries(now.roles).filter(([id, r]) => before.roles[id] && (before.roles[id].rank !== r.rank || before.roles[id].trend !== r.trend))
    .sort((a, b) => a[1].rank - b[1].rank).slice(0, 8);
  const rows = moved.map(([id, r]) => {
    const was = before.roles[id], up = was.rank - r.rank;
    return `<li><strong>${esc(r.name)}</strong>: rank ${was.rank} → ${r.rank}${up ? ` (${up > 0 ? "▲" : "▼"} ${Math.abs(up)})` : ""}${was.trend !== r.trend ? `, trend ${fmt(was.trend)} → ${fmt(r.trend)}` : ""}</li>`;
  }).join("");
  const head = now.data.what_if ? "<strong>Your plan was re-checked with the changed trend data</strong>"
    : before.data.what_if ? "<strong>Your plan was re-checked with the real trend data</strong>"
      : `<strong>Your plan was re-checked with new trend data</strong> (computed ${esc(now.data.computed_date || "")}).`;
  return `<section class="note stack" style="gap: 6px" aria-live="polite">
    <p>${head}</p>
    ${moved.length ? `<ul class="small" style="margin: 0; padding-left: 18px">${rows}</ul><p class="small muted">Learning paths below now follow the new ranking.</p>` : '<p class="small">Nothing in your ranking changed.</p>'}
  </section>`;
}

/* Areas grouped by interest x skill (matching.area_groups). Best fit and can do give the role
   list; grow into is shown with its biggest gaps and learning paths, never recommended. */
const GROUPS = {
  best_fit: ["Best fit for you", "High interest and high skill: these areas' roles come first."],
  can_do: ["You can do this, but it may not excite you", "High skill, lower interest: these roles are listed after your best fit."],
  grow_into: ["Want to get there?", "High interest, but your skills are not there yet. Not in your recommended list: here is what to learn first."],
};
function groupTitle(g, name) {
  if (g.mode === "interest_only") return "Best fit for your interests · skills not checked yet";
  if (g.mode === "skill_only") return "Best fit for your skills · interests not checked yet";
  return GROUPS[name][0];
}

function groupsHtml(g) {
  if (g.mode === "none") {
    return '<div class="warn">Your IT areas are not scored yet: <a href="#/cv">add your CV</a>, <a href="#/quiz">answer the interest questions</a> or <a href="#/test">take the skills test</a>. All roles are listed by match score below.</div>';
  }
  const of = (name) => g.areas.filter((a) => a.group === name);
  const line = (a) => `<li><strong>${esc(a.name)}</strong><br><span class="small muted">${esc(a.why)}${a.skill_explain ? ` Skill = ${esc(a.skill_explain)}.` : ""}</span></li>`;
  const section = (name, title, hint, extra = "") => (of(name).length ? `
    <section class="card stack" style="gap: 8px">
      <h2>${esc(title)}</h2><p class="small muted">${hint}</p>
      <ul class="quals">${of(name).map(line).join("")}</ul>${extra}
    </section>` : "");
  const gap = (x) => `<li>${esc(x.skill_name)} <span class="muted small">· ${x.rated === false ? `not rated yet, needed ${fmt(x.level_needed)}` : `you ${fmt(x.your_level)} → needed ${fmt(x.level_needed)}`} (O*NET 0–7)</span></li>`;
  const grow = of("grow_into").map((a) => `
    <section class="card stack" style="gap: 8px">
      <h3>${esc(a.name)}</h3>
      <p class="small muted">${esc(a.why)}${a.skill_explain ? ` Skill = ${esc(a.skill_explain)}.` : ""}</p>
      ${a.gaps.length ? `<div><p class="small"><strong>Biggest skill gaps</strong> for its best-matching roles:</p><ul class="quals small">${a.gaps.map(gap).join("")}</ul></div>` : ""}
      <div class="row" style="gap: 6px">${a.roles.map((r) => `<a class="chip plain" href="#/learn/${esc(r.role_id)}">Learning path: ${esc(r.role_name)} &rarr;</a>`).join("")}</div>
    </section>`).join("");
  const hidden = of("other");
  const hiddenHtml = hidden.length ? `<details class="group"><summary><span>Not shown <span class="muted small">(${hidden.length})</span></span></summary>
    <div class="group-body"><ul class="quals">${hidden.map(line).join("")}</ul></div></details>` : "";
  if (g.mode !== "both") {
    return section("best_fit", groupTitle(g, "best_fit"), `Your top ${g.top} areas. Their roles are listed below.`) + hiddenHtml;
  }
  return `<div class="stack" style="gap: 12px">
    <p class="small muted">Each IT area is placed by your interest (from the questionnaire) and your skill (your skills test and CV evidence). "High" means among your top ${g.top}.</p>
    ${section("best_fit", ...GROUPS.best_fit)}
    ${section("can_do", ...GROUPS.can_do)}
    ${grow ? `<section class="stack" style="gap: 8px"><h2>${GROUPS.grow_into[0]}</h2><p class="small muted">${GROUPS.grow_into[1]}</p>${grow}</section>` : ""}
    ${hiddenHtml}
  </div>`;
}

// With only interests or only skills, say what is missing and offer the next step, in view
// near the top (the area groups themselves are folded under "Why these jobs?").
function accuracyNote(g) {
  if (g.mode === "interest_only") {
    return '<div class="note stack" style="gap: 8px"><p class="small">Your skills are not checked yet, so this is from your interests only.</p><div class="row"><a class="btn primary" href="#/test">Take the skills test</a><a class="btn ghost" href="#/cv">Add your CV</a></div></div>';
  }
  if (g.mode === "skill_only") {
    return '<div class="note stack" style="gap: 8px"><p class="small">Your interests are not checked yet, so this is from your skills only.</p><div class="row"><a class="btn primary" href="#/quiz">Answer the interest questions (8 min)</a></div></div>';
  }
  return "";
}

async function pageResults() {
  const demo = state.demo;
  if (!hasAnswers()) {
    render(`<div class="stack">${stepBar("results")}<h1>No answers yet</h1><p class="muted">Do at least one of steps 1 to 3 first, or try the fictional demo student.</p>
      <div class="row"><a class="btn primary" href="#/cv">Start: step 1, your CV</a><button class="btn" type="button" id="demo">Try the demo student</button></div></div>`);
    document.getElementById("demo").onclick = () => { state.demo = "P01"; saveState(); pageResults(); };
    return;
  }
  render('<p class="muted" role="status">Scoring IT roles…</p>');
  const body = matchBody();
  const [res, scenarios] = await Promise.all([api("/api/match", { body: JSON.stringify(body) }), cached("/api/scenarios")]);
  lastMatchBody = body;
  const replan = replanNote(body, res);
  const sc = res.scenario;
  const scenarioCard = `
    <section class="card stack" style="gap: 10px" aria-labelledby="sc-title">
      <h2 id="sc-title">Future scenario</h2>
      <div class="tabs" role="group" aria-label="Future scenario">
        ${scenarios.map((s) => `<button type="button" data-scenario="${esc(s.id)}" aria-pressed="${s.id === sc.id}">${esc(s.name)}</button>`).join("")}
      </div>
      <p class="small">${esc(sc.description)}</p>
      <p class="small"><strong>These are estimates, not predictions.</strong></p>
      <details class="fold"><summary>About these estimates</summary><div class="stack" style="gap: 8px">
      <p class="small">Nobody knows how fast AI will change jobs. Each scenario is a different assumption about the future, built from public data (DOSM, MyCOL, arXiv) and weights the team chose. Compare them: a role that ranks high in all three is a safer choice than one that ranks high in only one. The decision is yours.</p>
      <p class="small muted">Trend score weights: Malaysian demand ${Math.round(sc.demand * 100)}% · AI momentum ${Math.round(sc.ai * 100)}%. Area scores:
        ${Object.entries(sc.trend_scores).filter(([k]) => AREA_NAMES[k]).map(([k, v]) => `${esc(AREA_NAMES[k])} ${fmt(v)}`).join(" · ")}. An area with only one measured part keeps the same score.</p>
      </div></details>
      <div class="row"><a class="btn" href="#/whatif">What if the trend data changed? Try it &rarr;</a></div>
    </section>`;
  const whatIfBanner = state.trendChanges ? `
    <section class="warn stack" style="gap: 8px" role="status">
      <p><strong>You are looking at changed trend data</strong> (a what-if). Only your copy changed; the real data stay the same.</p>
      <div class="row"><a class="btn" href="#/whatif">Change it again</a><button class="btn" type="button" id="wi-off">Back to the real data</button></div>
    </section>` : "";
  const profiles = demo ? await cached("/api/profiles") : [];
  const who = demo ? profiles.find((p) => p.profile_id === demo) : null;
  const g = res.groups;
  const groupOf = Object.fromEntries(g.areas.map((a) => [a.id, a.group]));
  const best = listedRoles(res.results, g);
  if (g.mode !== "none" && best.length) {  // ranks per scenario within this grouped list (groups do not depend on the scenario)
    const gi = (m) => (groupOf[m.it_area] === "best_fit" ? 0 : 1);
    const ranks = {};
    Object.keys(best[0].scenario_ranks || {}).forEach((s) => [...best].sort((a, b) => gi(a) - gi(b) || a.scenario_ranks[s] - b.scenario_ranks[s])
      .forEach((m, i) => { (ranks[m.role_id] = ranks[m.role_id] || {})[s] = i + 1; }));
    best.forEach((m, i) => { m.scenario_ranks = ranks[m.role_id]; m.rank = i + 1; m.baseline_rank = ranks[m.role_id] && ranks[m.role_id].baseline; });
  }
  let shown = 6;
  const draw = () => {
    let last = null;
    document.getElementById("list").innerHTML = best.length
      ? best.slice(0, shown).map((m, i) => {
        const head = g.mode !== "none" && groupOf[m.it_area] !== last ? `<h2 class="group-head">${esc(groupTitle(g, groupOf[m.it_area]))}</h2>` : "";
        last = groupOf[m.it_area];
        return head + matchCard(m, i + 1);
      }).join("")
      : '<p class="muted">No roles in your best-fit areas match your education level yet. Try a higher education level on the skills page.</p>';
    document.getElementById("more").hidden = shown >= best.length;
    app.querySelectorAll("details.more").forEach((d) => d.addEventListener("toggle", () => d.open && loadRoleExtra(d.closest(".match"))));
    app.querySelectorAll("[data-explain]").forEach((b) => { b.onclick = () => explainRole(b); });
  };
  // The jobs come first; how the IT areas were placed and scored is one tap away.
  const topJobs = best.length ? `
    <section class="card stack" style="gap: 10px" aria-labelledby="top-title">
      <div class="row" style="justify-content: space-between">
        <h2 id="top-title">Your top jobs</h2>
        <button class="btn ghost" type="button" id="to-list">See all roles and why &darr;</button>
      </div>
      <ol class="top-list">${best.slice(0, 3).map((m, i) => topCard(m, i + 1)).join("")}</ol>
    </section>` : "";
  const scored = `<h3>How your IT areas were scored</h3>${res.areas.map((a) => `<p class="small"><strong>${esc(a.name)}</strong> ${a.fit === null ? "not scored" : fmt(a.fit)} <span class="muted">· ${esc(a.explain)}</span></p>`).join("")}${res.insights.map((i) => `<p class="note">${esc(i.text)}</p>`).join("")}`;
  const why = g.mode === "none" ? groupsHtml(g) : `
    <details class="group">
      <summary><span>Why these jobs? Your IT areas and how they were scored</span></summary>
      <div class="group-body stack" style="gap: 12px">${groupsHtml(g)}${scored}</div>
    </details>`;
  render(`
  <div class="stack">
    ${demo ? "" : stepBar("results")}
    <p class="eyebrow">${demo ? "" : "Step 4 of 4 · "}Your matches${who ? ` · demo: ${esc(who.name)}` : ""}</p>
    <h1>Best matches for your level</h1>
    ${whatIfBanner}
    ${topJobs}
    ${accuracyNote(g)}
    ${replan}
    ${why}
    ${!demo && testDone() ? moreAreasHtml(state.test.result) : ""}
    ${scenarioCard}
    <div class="card stack" style="gap: 8px">
      <div class="legend"><span><i class="k-area"></i>IT area fit</span><span><i class="k-interest"></i>Interest fit</span><span><i class="k-skill"></i>Skill fit</span><span><i class="k-trend"></i>AI-era trend</span></div>
      <details class="fold"><summary>How the match score works</summary>
      <p class="small">Match score = ${Math.round(res.weights.area * 100)}% fit with the role's IT area + ${Math.round(res.weights.interest * 100)}% interest fit with the role + ${Math.round(res.weights.skill * 100)}% skill fit + ${Math.round(res.weights.trend * 100)}% AI-era trend of the role. The weights are the team's design choice. Roles are ranked by match score, highest first. Roles that need a higher qualification than yours, or a professional licence, are not shown.</p></details>
    </div>
    <div id="list" class="stack"></div>
    <button class="btn" type="button" id="more">Show all ${best.length} roles</button>
    <div class="row">
      ${demo ? '<a class="btn primary" href="#/cv">Start with your own answers</a>' : `<a class="btn" href="#/skills">Change my technologies</a>${testDone() ? "" : '<a class="btn" href="#/test">Take the skills test</a>'}`}
      <a class="btn ghost" href="#/trends">How the trend score works</a>
    </div>
  </div>`);
  document.getElementById("more").onclick = () => { shown = best.length; draw(); };
  const toList = document.getElementById("to-list");
  if (toList) toList.onclick = () => document.getElementById("list").scrollIntoView({ behavior: "smooth", block: "start" });
  app.querySelectorAll("[data-scenario]").forEach((b) => {
    b.onclick = () => { state.scenario = b.dataset.scenario; saveState(); pageResults().catch(showError); };
  });
  const off = document.getElementById("wi-off");
  if (off) off.onclick = () => { delete state.trendChanges; whatIfEdits = null; saveState(); pageResults().catch(showError); };
  wireMoreAreas("#/results");
  draw();
}

async function pageTrends() {
  const [t, status, roles] = await Promise.all([api("/api/trends"), api("/api/trends/update"), cached("/api/roles")]);
  render(`
  <div class="stack">
    <div class="viz-hero">
    <section class="stack" style="gap: 10px">
    <p class="eyebrow">AI-era trend signals</p>
    <h1>Which IT areas does Malaysia need, and how fast is AI entering them?</h1>
    <div class="note small"><strong>These signals describe the recent past; they do not predict the future.</strong> Each one compares 1 to 4 data points, so the trend scores built from them are estimates. See the three future scenarios on your jobs page.</div>
    </section>
    <div id="trend-jobs" class="viz-hero-chart"></div>
    </div>
    <div id="trend-dash" class="stack"></div>
    <section class="card stack" style="gap: 8px">
      <h2>What if this data changed?</h2>
      <p class="small">Change an arXiv paper count or the DOSM job ad count, and see the signals, the trend scores and your job ranking move. Only your copy changes.</p>
      <div class="row"><a class="btn primary" href="#/whatif">Change the trend data</a></div>
    </section>
    <div class="card stack" style="gap: 10px">
      <h2>Update data</h2>
      <p class="small muted">Fetches the latest OpenDOSM figures (and optionally arXiv, about 2 minutes), then recomputes the signals and scores. If a source fails, its previous data is kept.</p>
      <label class="row small"><input type="checkbox" id="arxiv"> Also refresh arXiv paper counts</label>
      <div class="row"><button class="btn primary" type="button" id="update">Update data now</button><span class="small muted" id="upd-status" role="status"></span></div>
    </div>
  </div>`);
  const dash = document.getElementById("trend-dash"), jobs = document.getElementById("trend-jobs");
  jobs.innerHTML = trendHeroChart(t);
  dash.innerHTML = trendDashboard(t, roles);
  wireDashboard(jobs);
  wireDashboard(dash);
  const btn = document.getElementById("update");
  const show = (s) => {
    const label = { idle: "", running: "Updating…", done: `Updated ${s.finished ? new Date(s.finished).toLocaleString() : ""}. Your jobs page will re-check your plan with the new data.`, failed: "Update failed; previous data kept." };
    document.getElementById("upd-status").textContent = s.status in label ? label[s.status] : s.status;
    btn.disabled = s.status === "running";
  };
  const poll = async () => {
    const s = await api("/api/trends/update");
    show(s);
    if (s.status === "running") setTimeout(poll, 2000);
    else if (location.hash.startsWith("#/trends")) { delete cache["/api/match"]; delete cache["/api/whatif"]; setTimeout(() => pageTrends().catch(showError), 1500); }
  };
  show(status);
  if (status.status === "running") setTimeout(poll, 2000);
  btn.onclick = async () => {
    btn.disabled = true;
    try {
      show(await api("/api/trends/update", { body: JSON.stringify({ arxiv: document.getElementById("arxiv").checked }) }));
      setTimeout(poll, 2000);
    } catch (e) {
      document.getElementById("upd-status").textContent = e.message;
      btn.disabled = false;
    }
  };
}

/* ---------- what if: change the trend data ---------- */

/* The student (or a judge) changes a raw trend input on a private copy; the server runs the
   same pipeline as the real data (signals -> trend scores -> matching) and returns what moved.
   "Show all my matches" keeps the copy for this tab, so every page uses it until reset. */
const INPUT_NAMES = { arxiv_ai_papers: "AI papers on arXiv", online_job_ads: "Online job ads (DOSM)" };
const INPUT_RULES = {
  arxiv_ai_papers: "Growth of more than +10% counts as up, less than −10% as down, otherwise flat.",
  online_job_ads: "A change of more than +5% counts as up, less than −5% as down. The share of all online ads is checked the same way (±0.25 points).",
};
const SIGNAL_NAMES = { arxiv_ai_paper_growth: "AI paper growth (arXiv)", dosm_online_ads: "Online job ads (DOSM)",
  dosm_online_ad_share: "Share of all online job ads (DOSM)", mycol_coverage: "Roles on MyCOL in this area", mycol_status: "MyCOL status" };
const DIRECTIONS = { up: "up", down: "down", flat: "flat", on_mycol: "on MyCOL", near_mycol: "near MyCOL", not_on_mycol: "not on MyCOL",
  yes: "on MyCOL", near: "near MyCOL", no: "not on MyCOL", no_data: "no data" };
const num0 = (n) => Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
const pct = (n, d = 1) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(d)}`;
const fromTo = (b, a, d = 1) => (b === a || fmt(b, d) === fmt(a, d) ? fmt(a, d) : `${fmt(b, d)} → <strong>${fmt(a, d)}</strong>`);

let whatIfArea = "data_ai";
let whatIfEdits = null;  // { inputs: {trend_id: value}, mycol: {role_id: status} }, kept while the tab is open
const editCount = () => Object.keys(whatIfEdits.inputs).length + Object.keys(whatIfEdits.mycol).length;

// The student's answers, or the demo student when there are none yet; always on the real data.
function whatIfBody() {
  const { trend_changes, ...body } = matchBody(hasAnswers() ? state.demo : "P01");
  return body;
}

function whatIfInputs(w) {
  const items = w.inputs.filter((i) => i.area === whatIfArea);
  const growth = (i, v) => {
    const g = 100 * (v / i.previous.value - 1);
    return { text: `${pct(g)}%`, dir: g > i.rule.up_pct ? "up" : g < -i.rule.up_pct ? "down" : "flat" };
  };
  const number = (i) => {
    const v = whatIfEdits.inputs[i.id] ?? i.value, g = growth(i, v);
    return `
    <div class="wi-row stack${v !== i.value ? " changed" : ""}" style="gap: 6px">
      <label for="wi-${esc(i.id)}"><strong>${INPUT_NAMES[i.metric]}</strong> <span class="muted small">${esc(i.scope)} · ${esc(i.period_start)} – ${esc(i.period_end)}</span></label>
      <div class="row" style="gap: 10px">
        <input class="wi-num" type="number" inputmode="numeric" id="wi-${esc(i.id)}" data-input="${esc(i.id)}" min="0" max="${i.max}" step="1" value="${v}">
        <span class="small muted"><span>Real value:</span> ${num0(i.value)}</span>
      </div>
      <p class="small"><span>Compared with</span> ${num0(i.previous.value)} <span class="muted">(${esc(i.previous.period_start)} – ${esc(i.previous.period_end)})</span>: <strong data-growth="${esc(i.id)}">${g.text}</strong> <span class="chip plain" data-dir="${esc(i.id)}">${DIRECTIONS[g.dir]}</span></p>
      <p class="small muted">${INPUT_RULES[i.metric]} <span>Source:</span> <a href="${safeUrl(i.source_url)}" rel="noopener" target="_blank">${esc(i.source_name)}</a> <span>(${esc(i.release_date)})</span></p>
    </div>`;
  };
  const numbers = items.filter((i) => i.kind === "number");
  return `
    ${numbers.length ? numbers.map(number).join("") : '<p class="small muted">No arXiv category matches this area, so there is no number to change here.</p>'}`;
}

function whatIfHtml(r) {
  const roleName = Object.fromEntries(r.before.map((m) => [m.role_id, m.role_name]));
  const changeRow = (c) => (`<li><strong>${esc(AREA_NAMES[c.area])}</strong> · <span>${INPUT_NAMES[c.metric]}</span> <span class="muted">(${esc(c.scope)})</span>: ${num0(c.before)} → <strong>${num0(c.after)}</strong></li>`);
  const value = (s, v) => {
    if (v === null || v === undefined || v === "" || s.signal === "mycol_status") return "";
    const n = Number(v);
    if (s.signal === "dosm_online_ad_share") return `${pct(n, 2)} pp`;
    if (s.signal === "mycol_coverage") return `${fmt(n, 0)}%`;
    return `${pct(n)}%`;
  };
  const sigRow = (s) => `
    <li><strong>${esc(s.layer === "role" ? s.entity_label : AREA_NAMES[s.area] || s.entity_label)}</strong> · <span>${SIGNAL_NAMES[s.signal] || esc(s.signal)}</span>:
      ${value(s, s.before.value)} <span class="chip plain">${DIRECTIONS[s.before.direction] || esc(s.before.direction)}</span> →
      ${value(s, s.after.value)} <span class="chip${s.direction_changed ? "" : " plain"}">${DIRECTIONS[s.after.direction] || esc(s.after.direction)}</span>
      ${s.direction_changed ? "" : '<span class="small muted">(direction unchanged)</span>'}</li>`;
  const scoreRow = (t) => `
    <tr><td>${t.kind === "area" ? `<strong>${esc(AREA_NAMES[t.key])}</strong>` : esc(roleName[t.key] || t.key)}</td>
      <td class="num">${fromTo(t.before.demand, t.after.demand)}</td><td class="num">${fromTo(t.before.ai, t.after.ai)}</td>
      <td class="num">${fromTo(t.before.score, t.after.score)}</td></tr>`;
  const before = listedRoles(r.before, r.groups), after = listedRoles(r.after, r.groups);
  const was = Object.fromEntries(before.map((m, i) => [m.role_id, { ...m, rank: i + 1 }]));
  const scoreMoved = after.filter((m) => was[m.role_id] && was[m.role_id].total !== m.total).length;
  const rankMoved = after.filter((m, i) => was[m.role_id] && was[m.role_id].rank !== i + 1).length;
  const rankRow = (m, i) => {
    const b = was[m.role_id] || { rank: i + 1, total: m.total, trend: m.trend }, up = b.rank - (i + 1);
    return `<tr${b.total !== m.total ? ' class="hl"' : ""}>
      <td class="num">${up ? `${b.rank} → <strong>${i + 1}</strong> <span class="${up > 0 ? "rank-up" : "rank-down"}">${up > 0 ? "▲" : "▼"}${Math.abs(up)}</span>` : i + 1}</td>
      <td>${esc(m.role_name)}</td><td class="num">${fromTo(b.total, m.total)}</td><td class="num">${fromTo(b.trend, m.trend)}</td></tr>`;
  };
  const step = (n, title, body) => `<li class="stack" style="gap: 8px"><h3><span class="stage-num" aria-hidden="true">${n}</span>${title}</h3>${body}</li>`;
  const scores = r.trend_scores.length
    ? `<div class="table-wrap"><table><thead><tr><th>For</th><th>Malaysian demand</th><th>AI momentum</th><th>Trend score</th></tr></thead><tbody>${r.trend_scores.map(scoreRow).join("")}</tbody></table></div>
       <p class="small muted">Each part = 50 + 50 × the confidence-weighted average direction of its signals. Trend score = Malaysian demand × ${Math.round(r.scenario.demand * 100)}% + AI momentum × ${Math.round(r.scenario.ai * 100)}%.</p>`
    : '<p class="note">No trend score changed: no signal crossed its threshold, so nothing below moves. This is on purpose: a small change in the data should not reorder anyone\'s jobs.</p>';
  const ranks = !r.trend_scores.length ? "" : scoreMoved
    ? `<p class="small"><span>Match scores changed:</span> <strong>${scoreMoved}</strong> · <span>ranks moved:</span> <strong>${rankMoved}</strong></p>
       <div class="table-wrap"><table><thead><tr><th>Rank</th><th>Role</th><th>Match score</th><th>AI-era trend</th></tr></thead><tbody>${after.slice(0, 10).map(rankRow).join("")}</tbody></table></div>
       <p class="small muted"><span>Match score change = trend change ×</span> ${Math.round(r.trend_weight * 100)}%. <span>Your skills, interests and IT area fit stay the same, so only the trend part moves.</span></p>`
    : '<p class="note">None of the roles in your list changed score: the trend scores that moved belong to roles outside your best-fit and can-do areas.</p>';
  return `
  <section class="card stack" style="gap: 12px">
    <h2>What changes</h2>
    <ol class="wi-chain">
      ${step(1, "The data you changed", `<ul class="quals small">${r.changes.map(changeRow).join("")}</ul>`)}
      ${step(2, "Signals", r.signals.length ? `<ul class="quals small">${r.signals.map(sigRow).join("")}</ul>` : '<p class="small">No signal changed.</p>')}
      ${step(3, "Trend scores", scores)}
      ${r.trend_scores.length ? step(4, "Your job ranking", ranks) : ""}
    </ol>
    <div class="row"><button class="btn primary" type="button" id="wi-apply">Show all my matches with this data</button></div>
  </section>`;
}

async function pageWhatIf() {
  const w = await cached("/api/whatif");
  if (!whatIfEdits) whatIfEdits = JSON.parse(JSON.stringify(state.trendChanges || { inputs: {}, mycol: {} }));
  const own = hasAnswers() && !state.demo;
  const profiles = own ? [] : await cached("/api/profiles");
  const demo = own ? null : profiles.find((p) => p.profile_id === (state.demo || "P01"));
  const edited = (a) => w.inputs.some((i) => i.area === a && (i.id in whatIfEdits.inputs || i.id in whatIfEdits.mycol));
  render(`
  <div class="stack">
    <p class="eyebrow">What if?</p>
    <h1>Change the trend data and see what changes</h1>
    <p class="muted">The AI-era trend is ${Math.round(w.trend_weight * 100)}% of every match score. Change a number below, and the same code that builds the real scores runs again on your copy: new signals, new trend scores, new job ranking.</p>
    <div class="note small"><strong>Only your copy changes.</strong> The real data, and what everyone else sees, stay the same.</div>
    <p class="small">${own ? "<span>Ranking for:</span> <strong>your answers</strong>" : `<span>Ranking for the demo student:</span> <strong>${esc(demo ? demo.name : "P01")}</strong>`} · <span>Scenario:</span> <span id="wi-sc"></span></p>
    <section class="card stack" style="gap: 10px">
      <h2>Quick examples</h2>
      <div class="row" style="gap: 8px">${w.examples.filter((e) => !Object.keys(e.changes.mycol).length).map((e) => `<button class="btn" type="button" data-example="${esc(e.id)}">${esc(e.name)}</button>`).join("")}</div>
    </section>
    <section class="card stack" style="gap: 12px">
      <h2>Or change the data yourself</h2>
      <div class="tabs" role="group" aria-label="IT area">${Object.keys(AREA_NAMES).map((a) => `<button type="button" data-area="${a}" aria-pressed="${a === whatIfArea}">${esc(AREA_NAMES[a])}${edited(a) ? '<span aria-hidden="true"> •</span>' : ""}</button>`).join("")}</div>
      <div id="wi-inputs" class="stack" style="gap: 12px">${whatIfInputs(w)}</div>
      <div class="row">
        <button class="btn primary" type="button" id="wi-run">See what changes</button>
        <button class="btn" type="button" id="wi-reset">Reset to the real data</button>
        <span class="small muted"><span>Changes:</span> <strong id="wi-n">${editCount()}</strong></span>
      </div>
    </section>
    <div id="wi-out" aria-live="polite"></div>
  </div>`);
  cached("/api/scenarios").then((list) => {
    const s = list.find((x) => x.id === state.scenario);
    const el = document.getElementById("wi-sc");
    if (el && s) el.textContent = s.name;
  }).catch(() => {});
  const out = document.getElementById("wi-out");
  const run = async () => {
    if (!editCount()) {
      out.innerHTML = '<p class="warn">Change at least one number or MyCOL status first, or pick a quick example.</p>';
      return;
    }
    out.innerHTML = '<p class="muted" role="status">Running the trend pipeline on your copy…</p>';
    try {
      const r = await api("/api/whatif", { body: JSON.stringify({ ...whatIfBody(), trend_changes: whatIfEdits }) });
      out.innerHTML = whatIfHtml(r);
      document.getElementById("wi-apply").onclick = () => {
        state.trendChanges = JSON.parse(JSON.stringify(whatIfEdits));
        if (!hasAnswers()) state.demo = "P01";
        saveState();
        location.hash = "#/results";
      };
      out.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) {
      out.innerHTML = `<p class="warn">${esc(e.message)}</p>`;
    }
  };
  const item = (id) => w.inputs.find((i) => i.id === id);
  const wire = () => {
    app.querySelectorAll("[data-input]").forEach((el) => {
      el.oninput = () => {
        const i = item(el.dataset.input), v = Number(el.value);
        const ok = el.value !== "" && v >= 0 && v <= i.max;
        if (ok && v !== i.value) whatIfEdits.inputs[i.id] = v; else delete whatIfEdits.inputs[i.id];
        el.closest(".wi-row").classList.toggle("changed", ok && v !== i.value);
        el.setCustomValidity(ok ? "" : `0 – ${num0(i.max)}`);
        if (ok) {
          const g = 100 * (v / i.previous.value - 1);
          document.querySelector(`[data-growth="${i.id}"]`).textContent = `${pct(g)}%`;
          document.querySelector(`[data-dir="${i.id}"]`).textContent = DIRECTIONS[g > i.rule.up_pct ? "up" : g < -i.rule.up_pct ? "down" : "flat"];
        }
        document.getElementById("wi-n").textContent = editCount();
      };
    });
    app.querySelectorAll("[data-mycol]").forEach((el) => {
      el.onchange = () => {
        const r = item(el.dataset.mycol);
        if (el.value !== r.value) whatIfEdits.mycol[r.id] = el.value; else delete whatIfEdits.mycol[r.id];
        el.closest(".wi-row").classList.toggle("changed", el.value !== r.value);
        document.getElementById("wi-n").textContent = editCount();
      };
    });
  };
  wire();
  app.querySelectorAll("[data-area]").forEach((b) => {
    b.onclick = () => {
      whatIfArea = b.dataset.area;
      app.querySelectorAll("[data-area]").forEach((x) => {
        x.setAttribute("aria-pressed", String(x === b));
        const dot = x.querySelector("span");
        if (edited(x.dataset.area) && !dot) x.insertAdjacentHTML("beforeend", '<span aria-hidden="true"> •</span>');
        if (!edited(x.dataset.area) && dot) dot.remove();
      });
      document.getElementById("wi-inputs").innerHTML = whatIfInputs(w);
      wire();
    };
  });
  app.querySelectorAll("[data-example]").forEach((b) => {
    b.onclick = () => {
      const e = w.examples.find((x) => x.id === b.dataset.example);
      whatIfEdits = JSON.parse(JSON.stringify(e.changes));
      const first = item(Object.keys(e.changes.inputs)[0] || Object.keys(e.changes.mycol)[0]);
      if (first) whatIfArea = first.area;
      pageWhatIf().then(() => document.getElementById("wi-run").click()).catch(showError);
    };
  });
  document.getElementById("wi-run").onclick = run;
  document.getElementById("wi-reset").onclick = () => {
    whatIfEdits = { inputs: {}, mycol: {} };
    if (state.trendChanges) { delete state.trendChanges; saveState(); }
    pageWhatIf().catch(showError);
  };
}

/* ---------- IT skills test ---------- */

const STAGE_LABEL = { screen: "Quick check", deep: "In depth", practical: "Hands-on" };
const PYODIDE = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/";
const RUN_TIMEOUT_MS = 8000;
// Runs inside the Web Worker: loads Python once, then runs one question's tests per message.
const PY_WORKER = `
importScripts("${PYODIDE}pyodide.js");
const ready = loadPyodide({ indexURL: "${PYODIDE}" });
ready.then(() => postMessage({ ready: true }), (e) => postMessage({ ready: false, error: String(e) }));
const HARNESS = \`
import builtins, json
_tests, _blocked = json.loads(TESTS_JSON), set(json.loads(BLOCKED_JSON))
_real_import = builtins.__import__
def _guard(name, *a, **k):
    if name.split(".")[0] in _blocked:
        raise ImportError(f"'{name}' is not allowed in this question")
    return _real_import(name, *a, **k)
_out = []
builtins.__import__ = _guard
try:
    _ns = {}
    try:
        exec(SRC, _ns)
        _fn = _ns.get(FN)
        _setup = None if callable(_fn) else f"define a function called {FN}"
    except Exception as e:
        _setup = f"{type(e).__name__}: {e}"
    for _t in _tests:
        if _setup:
            _out.append({"ok": False, "error": _setup}); continue
        try:
            _got = _fn(*json.loads(json.dumps(_t["args"])))
            if "raises" in _t:
                _out.append({"ok": False, "got": repr(_got)[:300], "error": "expected " + _t["raises"]})
            else:
                _out.append({"ok": json.loads(json.dumps(_got)) == _t["expected"], "got": repr(_got)[:300]})
        except Exception as e:
            _ok = "raises" in _t and type(e).__name__ == _t["raises"]
            _out.append({"ok": _ok, "got": type(e).__name__, "error": None if _ok else f"{type(e).__name__}: {e}"})
finally:
    builtins.__import__ = _real_import
json.dumps(_out)
\`;
onmessage = async (e) => {
  const py = await ready;
  try {
    py.globals.set("SRC", e.data.code);
    py.globals.set("FN", e.data.fn);
    py.globals.set("TESTS_JSON", JSON.stringify(e.data.tests));
    py.globals.set("BLOCKED_JSON", JSON.stringify(e.data.blocked || []));
    postMessage({ ok: true, results: JSON.parse(py.runPython(HARNESS)) });
  } catch (err) {
    postMessage({ ok: false, error: String(err) });
  }
};`;

let pyWorker = null;
let pyReady = null;
function startPython() {
  pyWorker = new Worker(URL.createObjectURL(new Blob([PY_WORKER], { type: "text/javascript" })));
  pyReady = new Promise((resolve, reject) => {
    pyWorker.onmessage = (e) => (e.data.ready ? resolve() : reject(new Error(e.data.error)));
    pyWorker.onerror = () => reject(new Error("Could not load Python in the browser. Check your internet connection."));
  });
  pyReady.catch(() => { pyWorker.terminate(); pyWorker = null; });
}
async function runPython(q, code) {
  if (!pyWorker) startPython();
  await pyReady;
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pyWorker.terminate();
      pyWorker = null;  // the next run loads a fresh worker
      resolve({ ok: false, error: `Stopped after ${RUN_TIMEOUT_MS / 1000} s. Is there an infinite loop?` });
    }, RUN_TIMEOUT_MS);
    pyWorker.onmessage = (e) => { clearTimeout(timer); resolve(e.data); };
    pyWorker.postMessage({ code, fn: q.function, tests: q.tests, blocked: q.forbidden_imports });
  });
}

// Show test values the way Python prints them (None, True), not as JSON.
function pyRepr(v) {
  if (v === null) return "None";
  if (v === true) return "True";
  if (v === false) return "False";
  if (Array.isArray(v)) return `[${v.map(pyRepr).join(", ")}]`;
  if (typeof v === "object") return `{${Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${pyRepr(x)}`).join(", ")}}`;
  return typeof v === "string" ? JSON.stringify(v) : String(v);
}

// Tests saved by an older version of this page (no selection) are dropped.
if (state.test && !state.test.selection) state.test = null;
// Tests saved while the app still had the IT Management area cannot be graded any more.
if (state.test && state.test.domains.some((d) => !(d.id in AREA_NAMES))) state.test = null;
// What-ifs saved when inputs were named by trend_id: "Update data" renumbers those, so drop them.
if (state.trendChanges && Object.keys(state.trendChanges.inputs || {}).some((k) => !k.includes(":"))) delete state.trendChanges;
if (state.test && !state.test.areas) state.test.areas = state.test.domains.map((d) => d.id);  // saved before areas were chosen: the full test
// extending: answering the quick checks of areas added after the result; the old result
// stays in use until the new one is graded.
const testInProgress = () => state.test && (!state.test.result || state.test.extending);
// Question counts come from the bank's selection rules, so changing them needs no code change.
const screenCount = (t) => t.selection.screen_per_domain * t.areas.length;
const testLength = (t) => screenCount(t) + t.selection.deep_domains * (t.selection.deep_per_domain + t.selection.practical_per_domain)
  + t.selection.screen_per_domain * (t.added || []).length;
// The test as last graded: only added areas whose answers were scored count in matches and links.
const gradedTest = (t) => ({ seed: t.seed, areas: t.areas, added: (t.result && t.result.added) || [], responses: t.responses });

/* "Want to test your other IT areas?": the areas the focused test left out, each with its own
   quick check. Earlier answers and the in-depth areas stay as they are. */
function moreAreasHtml(r) {
  const left = (r ? r.domains : []).filter((d) => d.tested === false);
  if (!left.length) return "";
  const total = left.reduce((s, d) => s + (d.quick_check_minutes || 0), 0);
  return `<section class="card stack" style="gap: 10px" aria-labelledby="more-title">
    <h2 id="more-title">Want to test your other IT areas?</h2>
    <p class="small muted">Your test left out ${left.length === 1 ? "this area" : `these ${left.length} areas`}. Add a ${state.test.selection.screen_per_domain}-question quick check for any of them: your earlier answers stay, and your result groups are worked out again with the new scores.</p>
    ${left.map((d) => `<div class="row" style="justify-content: space-between"><span>${esc(d.name)}</span><button class="btn" type="button" data-more="${esc(d.id)}">Test this area too (about ${d.quick_check_minutes} min)</button></div>`).join("")}
    ${left.length > 1 ? `<button class="btn primary" type="button" data-more="${esc(left.map((d) => d.id).join(","))}">Test all remaining areas (about ${total} min)</button>` : ""}
  </section>`;
}

async function addAreas(ids, returnTo) {
  const t = state.test;
  const added = [...new Set([...(t.result.added || []), ...ids])];
  const more = await api("/api/assessment/more", { body: JSON.stringify({ seed: t.seed, areas: t.areas, added }) });
  const have = new Set(t.questions.map((q) => q.id));
  t.questions = t.questions.concat(more.questions.filter((q) => !have.has(q.id)));
  t.added = more.added;
  t.extending = true;
  t.returnTo = returnTo;
  saveState();
  const first = t.questions.findIndex((q) => ids.includes(q.domain) && !(q.id in t.responses));
  location.hash = `#/test/${(first === -1 ? t.questions.length - 1 : first) + 1}`;
}

function wireMoreAreas(returnTo) {
  app.querySelectorAll("[data-more]").forEach((b) => {
    b.onclick = () => { b.disabled = true; addAreas(b.dataset.more.split(","), returnTo).catch(showError); };
  });
}
const domainName = (id) => (state.test.domains.find((d) => d.id === id) || {}).name || id;
const nameList = (ids) => { const n = ids.map((id) => AREA_NAMES[id] || id); return n.length > 1 ? `${n.slice(0, -1).join(", ")} and ${n[n.length - 1]}` : n.join(""); };

async function startTest(areas) {
  const t = await api(`/api/assessment/start?areas=${encodeURIComponent(areas.join(","))}`);
  state.test = { seed: t.seed, areas: t.areas, domains: t.domains, selection: t.selection, questions: t.questions, responses: {},
    code: {}, runs: {}, deepDomains: null, result: null };
  saveState();
  location.hash = "#/test/1";
}

// The areas the test checks, from the student's CV evidence and interests (server rules).
const testPlan = () => api("/api/assessment/plan", { body: JSON.stringify({
  cv_areas: state.cvAreas ? state.cvAreas.scores : undefined, technologies: state.techs,
  interest_answers: quizDone() ? state.answers : undefined }) });

async function pageTestIntro() {
  const going = testInProgress();
  const answered = going ? Object.keys(state.test.responses).length : 0;
  const open = going ? state.test.questions.findIndex((q) => !(q.id in state.test.responses)) : -1;
  const nextOpen = going ? (open === -1 ? state.test.questions.length - 1 : open) : 0;
  const plan = await testPlan();
  const missing = [!skillsDone() && ["#/cv", "add your CV"], !quizDone() && ["#/quiz", "answer the interest questions"]].filter(Boolean)
    .map(([href, text], i) => `<a href="${href}">${i ? text : text[0].toUpperCase() + text.slice(1)}</a>`);
  render(`
  <div class="quiz stack">
    ${stepBar("test")}
    <p class="eyebrow">Step 3 of 4 · IT skills test</p>
    <h1>Test your IT skills</h1>
    ${plan.areas.length === 6 && missing.length ? `<div class="warn stack" role="status" style="gap: 4px">
      <strong>${missing.length === 2 ? "No CV or interest answers yet, so the test covers all 5 areas." : "The test covers all 5 areas."}</strong>
      <span>${missing.join(" or ")} to make it shorter.</span>
    </div>` : ""}
    <div class="card stack" style="gap: 10px">
      <p class="big">About ${plan.minutes} min</p>
      <p class="muted">${plan.question_count} questions</p>
      <div class="row" style="gap: 6px">${plan.areas.map((id) => `<span class="chip">${esc(AREA_NAMES[id] || id)}</span>`).join("")}</div>
      <ul class="quals muted small" style="margin-top: 6px">
        <li>Every question is checked against official docs such as Python, MDN, OWASP and NIST.</li>
        <li>Topics follow certification exams such as CompTIA, AWS and Python Institute.</li>
        <li>Quick questions first, then hands-on code tasks in your 2 strongest areas.</li>
        <li>Graded in your browser, with an explanation for every answer.</li>
      </ul>
    </div>
    <div class="stack">
      ${going ? `<a class="btn primary" href="#/test/${nextOpen + 1}">Continue (${answered} answered)</a>` : ""}
      ${state.test && state.test.result ? `<a class="btn primary" href="#/test/result">See your last result</a>` : ""}
      <button class="btn${going || (state.test && state.test.result) ? "" : " primary"}" type="button" id="start">${state.test ? "Start a new test" : "Start the test"}</button>
      <a class="btn ghost" href="#/results">Skip to step 4, my jobs</a>
    </div>
  </div>`);
  document.getElementById("start").onclick = (e) => { e.target.disabled = true; startTest(plan.areas).catch(showError); };
}

function questionBody(q) {
  const r = state.test.responses[q.id];
  if (q.type === "mcq" || q.type === "multi") {
    const on = (i) => (q.type === "mcq" ? r === i : Array.isArray(r) && r.includes(i));
    return `${q.type === "multi" ? '<p class="muted small">Select all that apply.</p>' : ""}
      <div class="options" role="group" aria-label="Answer options" data-no-i18n>${q.options.map((o, i) =>
        `<button type="button" data-i="${i}" aria-pressed="${on(i)}">${esc(o)}</button>`).join("")}</div>`;
  }
  if (q.type === "numeric" || q.type === "text") {
    return `<label class="stack" style="gap: 6px"><span class="muted small">Your answer</span>
      <input class="search answer" id="answer" ${q.type === "numeric" ? 'type="number" step="any" inputmode="decimal"' : 'type="text" autocomplete="off" spellcheck="false"'} value="${esc(r ?? "")}"></label>`;
  }
  if (q.type === "code") {
    const tests = q.tests.map((t) => `<li><code>${esc(q.function)}(${esc(t.args.map(pyRepr).join(", "))})</code> → <code>${esc("raises" in t ? `raises ${t.raises}` : pyRepr(t.expected))}</code></li>`).join("");
    return `<details class="more"><summary>The ${q.tests.length} tests your function must pass</summary><ol class="tests">${tests}</ol></details>
      ${q.forbidden_imports ? `<p class="muted small">Not allowed: <code>import ${esc(q.forbidden_imports.join(", "))}</code></p>` : ""}
      <label class="stack" style="gap: 6px"><span class="muted small">Your Python code</span>
      <textarea class="code-input" id="answer" rows="12" spellcheck="false" autocapitalize="off">${esc(state.test.code[q.id] ?? q.starter)}</textarea></label>
      <div class="row"><button class="btn" type="button" id="run">Run tests</button><span class="muted small" id="run-status" role="status"></span></div>
      ${pyWorker ? "" : '<p class="muted small">The first run downloads Python into your browser (up to about 10 MB, once per visit). On mobile data, use Wi-Fi if you can.</p>'}
      <div id="run-out"></div>`;
  }
  return `<details class="more"><summary>Tables and data</summary><pre class="code">${esc(q.setup_sql)}</pre></details>
    <label class="stack" style="gap: 6px"><span class="muted small">Your SQL query (SQLite)</span>
    <textarea class="code-input" id="answer" rows="8" spellcheck="false" autocapitalize="off">${esc(r ?? "SELECT ")}</textarea></label>
    <div class="row"><button class="btn" type="button" id="run">Run query</button><span class="muted small" id="run-status" role="status"></span></div>
    <div id="run-out"></div>`;
}

function runResultHtml(q, run) {
  if (!run) return "";
  if (!run.ok) return `<div class="warn">${esc(run.error)}</div>`;
  const passed = run.results.filter((x) => x.ok).length;
  return `<div class="stack" style="gap: 6px"><p><strong>${passed} / ${run.results.length} tests passed</strong></p>
    <ol class="tests">${run.results.map((x, i) => `<li class="${x.ok ? "pass" : "fail"}">${x.ok ? "Pass" : "Fail"}: <code>${esc(q.function)}(${esc(q.tests[i].args.map(pyRepr).join(", "))})</code>${x.ok ? "" : ` gave <code>${esc(x.got ?? "nothing")}</code>${x.error ? ` <span class="muted">(${esc(x.error)})</span>` : ""}`}</li>`).join("")}</ol></div>`;
}

function sqlResultHtml(r) {
  return `<div class="table-wrap"><table><thead><tr>${r.columns.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead>
    <tbody>${r.rows.map((row) => `<tr>${row.map((v) => `<td>${esc(v === null ? "NULL" : v)}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="${r.columns.length}" class="muted">No rows</td></tr>`}</tbody></table></div>
    ${r.truncated ? '<p class="muted small">Showing the first 50 rows.</p>' : ""}`;
}

async function runCode(q) {
  const status = document.getElementById("run-status");
  const code = state.test.code[q.id] ?? q.starter;
  document.getElementById("run").disabled = true;
  status.textContent = pyWorker ? "Running…" : "Loading Python (first time only)…";
  let run;
  try {
    run = await runPython(q, code);
  } catch (e) {
    run = { ok: false, error: e.message };
  }
  state.test.runs[q.id] = { code, ...run };
  const passed = run.ok ? run.results.filter((x) => x.ok).length : 0;
  state.test.responses[q.id] = { passed, total: q.tests.length };
  saveState();
  if (location.hash === `#/test/${state.test.questions.indexOf(q) + 1}`) {
    document.getElementById("run").disabled = false;
    status.textContent = "";
    document.getElementById("run-out").innerHTML = runResultHtml(q, run);
  }
}

function wireAnswer(q) {
  const save = (v) => { state.test.responses[q.id] = v; saveState(); };
  app.querySelectorAll(".options button").forEach((b) => {
    b.onclick = () => {
      const i = Number(b.dataset.i);
      if (q.type === "mcq") {
        save(i);
        app.querySelectorAll(".options button").forEach((x) => x.setAttribute("aria-pressed", x === b));
      } else {
        const now = new Set(state.test.responses[q.id] || []);
        if (now.has(i)) now.delete(i); else now.add(i);
        save([...now].sort((a, c) => a - c));
        b.setAttribute("aria-pressed", now.has(i));
      }
    };
  });
  const input = document.getElementById("answer");
  if (!input) return;
  if (q.type === "numeric") input.oninput = () => (input.value === "" ? (delete state.test.responses[q.id], saveState()) : save(Number(input.value)));
  if (q.type === "text") input.oninput = () => save(input.value);
  if (q.type === "code" || q.type === "sql") {
    input.onkeydown = (e) => {  // Tab indents instead of leaving the editor; Esc then Tab leaves
      if (e.key !== "Tab" || e.shiftKey || input.dataset.escaped) return;
      e.preventDefault();
      input.setRangeText("    ", input.selectionStart, input.selectionEnd, "end");
      input.dispatchEvent(new Event("input"));
    };
    input.onkeyup = (e) => { input.dataset.escaped = e.key === "Escape" ? "1" : ""; };
  }
  if (q.type === "code") {
    input.oninput = () => { state.test.code[q.id] = input.value; saveState(); };
    document.getElementById("run").onclick = () => runCode(q);
    const last = state.test.runs[q.id];
    if (last && last.code === input.value) document.getElementById("run-out").innerHTML = runResultHtml(q, last);
  }
  if (q.type === "sql") {
    input.oninput = () => save(input.value);
    document.getElementById("run").onclick = async () => {
      const out = document.getElementById("run-out");
      try {
        out.innerHTML = sqlResultHtml(await api("/api/assessment/sql", { body: JSON.stringify({ id: q.id, sql: input.value }) }));
      } catch (e) {
        out.innerHTML = `<div class="warn">${esc(e.message)}</div>`;
      }
    };
  }
}

async function nextFromItem(idx, button) {
  const t = state.test;
  const q = t.questions[idx];
  button.disabled = true;
  if (q.type === "code" && (!t.runs[q.id] || t.runs[q.id].code !== (t.code[q.id] ?? q.starter))) {
    button.textContent = "Running your tests…";
    await runCode(q);  // grade the latest code, not an older run
  }
  try {
    if (idx + 1 < t.questions.length) {
      location.hash = `#/test/${idx + 2}`;
    } else if (!t.deepDomains) {
      button.textContent = "Finding your strongest areas…";
      const next = await api("/api/assessment/next", { body: JSON.stringify({ seed: t.seed, areas: t.areas, responses: t.responses }) });
      t.deepDomains = next.domains;
      t.questions = t.questions.concat(next.questions);
      saveState();
      location.hash = `#/test/${idx + 2}`;
    } else {
      button.textContent = "Scoring…";
      t.result = await api("/api/assessment/result", { body: JSON.stringify({ seed: t.seed, areas: t.areas, added: t.added || [], responses: t.responses }) });
      const back = t.extending && t.returnTo;
      t.extending = false;
      saveState();
      location.hash = back || "#/test/result";
    }
  } catch (e) {
    showError(e);
  }
}

function pageTestItem(n) {
  if (!testInProgress()) { location.hash = "#/test"; return; }
  const t = state.test;
  const idx = Math.min(Math.max(n, 1), t.questions.length) - 1;
  const q = t.questions[idx];
  const total = testLength(t);
  const lastScreen = !t.deepDomains && idx === t.questions.length - 1;
  render(`
  <div class="quiz test stack">
    <div class="row" style="justify-content: space-between">
      <a class="btn ghost" href="${idx ? `#/test/${idx}` : "#/test"}" aria-label="Previous question">&larr; Back</a>
      <span class="muted small">Question ${idx + 1} of ${total}</span>
      <a class="btn ghost" href="#/test">Pause</a>
    </div>
    <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${idx + 1}"><div style="width: ${Math.round(((idx + 1) / total) * 100)}%"></div></div>
    ${(t.added || []).includes(q.domain) && !(t.added || []).includes((t.questions[idx - 1] || {}).domain) ? `<p class="note">Extra quick check: <strong>${esc(nameList(t.added.filter((a) => !(t.result && (t.result.added || []).includes(a)))))}</strong>. Your earlier answers stay as they are.</p>` : ""}
    ${idx === screenCount(t) && t.deepDomains ? `<p class="note">Your strongest areas so far: <strong>${t.deepDomains.map((d) => esc(domainName(d))).join(" and ")}</strong>. These questions go deeper.</p>` : ""}
    <div class="row"><span class="chip">${esc(domainName(q.domain))}</span><span class="chip plain">${esc(STAGE_LABEL[q.stage])}</span><span class="muted small">about ${Math.max(1, Math.round(q.time_s / 60))} min</span></div>
    <h2 id="q-text" data-no-i18n>${esc(q.prompt)}</h2>
    ${q.code ? `<pre class="code" aria-label="Code or log for this question">${esc(q.code)}</pre>` : ""}
    ${questionBody(q)}
    <div class="sticky-actions"><button class="btn primary" type="button" id="next" style="width: 100%">${idx + 1 === total ? "See my result" : lastScreen ? "Continue to in-depth questions" : "Next"}</button></div>
  </div>`);
  wireAnswer(q);
  document.getElementById("next").onclick = (e) => nextFromItem(idx, e.currentTarget);
}

function answerText(i) {
  const a = i.correct_answer;
  if (a === null) return "Passes every test (see the explanation)";
  if (Array.isArray(a)) return a.join(", ");
  if (typeof a === "object") return `${a.columns.join(", ")}: ${a.rows.map((r) => r.join(" / ")).join("; ")}`;
  return String(a);
}

/* Label lines of at most `max` characters; "&" starts a line, never ends one. */
function wrapLabel(label, max) {
  const words = label.split(" ").reduce((acc, w) => (acc.length && acc[acc.length - 1] === "&" ? [...acc.slice(0, -1), `& ${w}`] : [...acc, w]), []);
  return words.reduce((lines, w) => {
    const last = lines[lines.length - 1];
    if (last && `${last} ${w}`.length <= max) lines[lines.length - 1] = `${last} ${w}`;
    else lines.push(w);
    return lines;
  }, []);
}

/* Radar chart of 3-5 0-100 scores (one corner each), first item at the top, then clockwise.
   items: [{ label, value, on }]; `on` items get a filled dot and a bold label.
   On a phone the chart is drawn smaller inside a narrower box, so the labels stay readable. */
function hexagonChart(items, caption) {
  const compact = window.innerWidth < 560;
  const W = compact ? 330 : 420, H = compact ? 300 : 330, cx = W / 2, cy = compact ? 148 : 160, R = compact ? 70 : 100;
  const n = items.length, wrap = compact ? 15 : 20, lh = compact ? 16 : 14;  // lh: label line height (font + 2)
  const at = (i, r) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const poly = (r) => items.map((_, i) => at(i, r).map((v) => v.toFixed(1)).join(",")).join(" ");
  const rings = [25, 50, 75, 100].map((p) => `<polygon class="hex-ring" points="${poly((R * p) / 100)}"/>`).join("");
  const spokes = items.map((_, i) => { const [x, y] = at(i, R); return `<line class="hex-ring" x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`; }).join("");
  const shape = items.map((d, i) => at(i, (R * Math.max(0, Math.min(100, d.value))) / 100).map((v) => v.toFixed(1)).join(",")).join(" ");
  const dots = items.map((d, i) => { const [x, y] = at(i, (R * Math.max(0, Math.min(100, d.value))) / 100); return `<circle class="hex-dot${d.on ? " on" : ""}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${d.on ? 5 : 3.5}"/>`; }).join("");
  const labels = items.map((d, i) => {
    const [x, y] = at(i, R + (compact ? 12 : 18));
    const anchor = Math.abs(x - cx) < 1 ? "middle" : x > cx ? "start" : "end";
    const lines = wrapLabel(nameIn(d.label), wrap);  // long names on 2-3 lines
    const top = anchor === "middle" && y < cy ? y - lines.length * lh - 2  // top label: its value sits clear of a 100 dot
      : y < cy - 1 ? y - (lines.length - 1) * lh - 6 : y > cy + 1 ? y + lh - 2 : y - ((lines.length - 1) * lh) / 2 + 4;
    return `<text class="hex-label${d.on ? " on" : ""}" x="${x.toFixed(1)}" y="${top.toFixed(1)}" text-anchor="${anchor}">${lines.map((l, k) => `<tspan x="${x.toFixed(1)}" dy="${k ? lh : 0}">${esc(l)}</tspan>`).join("")}<tspan class="hex-value" x="${x.toFixed(1)}" dy="${lh}">${fmt(d.value, 0)}</tspan></text>`;
  }).join("");
  const summary = items.map((d) => `${nameIn(d.label)} ${fmt(d.value, 0)}`).join(", ");
  return `<svg class="hex${compact ? " compact" : ""}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(caption)}: ${esc(summary)} out of 100">
    ${rings}${spokes}<polygon class="hex-shape" points="${shape}"/>${dots}${labels}</svg>`;
}

/* Share link for a test result: the seed, tested areas and answers, base64url-encoded in the
   hash. Whoever opens it gets the result re-graded by the server; nothing is stored, and the
   hash never reaches the server. Links made before areas were chosen have no areas: all 5. */
function shareToken(t) {
  const g = gradedTest(t);
  const bytes = new TextEncoder().encode(JSON.stringify({ s: g.seed, a: g.areas, x: g.added, r: g.responses }));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function readShareToken(token) {
  const b64 = token.replace(/-/g, "+").replace(/_/g, "/");
  const data = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))));
  return { seed: data.s, areas: data.a, added: data.x, responses: data.r };
}

async function shareResult(button) {
  const url = `${location.origin}${location.pathname}#/shared/${shareToken(state.test)}`;
  const box = document.getElementById("share-box");
  box.hidden = false;
  box.querySelector("input").value = url;
  try {
    if (navigator.share) { await navigator.share({ title: "My IT skills test result", url }); return; }
    await navigator.clipboard.writeText(url);
    button.textContent = "Link copied";
  } catch (e) {
    box.querySelector("input").select();  // share sheet closed or clipboard blocked: the link is in the box
  }
}

async function pageSharedResult(token) {
  render('<p class="muted">Loading the shared result…</p>');
  let r;
  try {
    r = await api("/api/assessment/result", { body: JSON.stringify(readShareToken(token)) });
  } catch (e) {
    render(`<div class="stack"><h1>This share link does not work</h1>
      <p class="muted">It may be cut off, or made with an older version of the test.</p>
      <div class="row"><a class="btn primary" href="#/test">Take the IT skills test</a></div></div>`);
    return;
  }
  pageTestResult(r);
}

// What backs the questions, from the bank: sources, exam links and (once done) review and pilot.
function trustLine(t) {
  if (!t) return "";  // results saved before this line existed
  const done = [t.experts && `reviewed by ${t.experts} IT experts`, t.pilot_students && `tried by ${t.pilot_students} students`].filter(Boolean);
  return `<p class="small muted">Every answer is checked against a cited source, and ${t.with_exam} of ${t.questions} questions match a topic in a known IT certification exam. ${done.length ? `Questions ${done.join(" and ")}.` : "Not yet reviewed by outside experts."}</p>`;
}

/* The student's own result, or with `sharedResult` a read-only view of someone else's. */
function pageTestResult(sharedResult = null) {
  const isShared = Boolean(sharedResult);
  const r = sharedResult || (state.test && state.test.result);
  if (!r) { location.hash = "#/test"; return; }
  const nameOf = (id) => (r.domains.find((d) => d.id === id) || {}).name || id;
  const areaScore = (d) => d.area_score ?? d.readiness;  // results saved before area_score existed
  const deep = r.domains.filter((d) => d.tested_in_depth).sort((a, b) => areaScore(b) - areaScore(a) || b.readiness - a.readiness);
  const best = r.domains.find((d) => d.id === r.recommended);
  const domainCard = (d) => `
    <div class="card stack" style="gap: 10px">
      <div class="row" style="justify-content: space-between"><h3>${esc(d.name)}</h3><span class="chip${d.level.min >= 75 ? "" : d.level.min >= 50 ? " plain" : " warn-chip"}">${esc(d.level.label)}</span></div>
      <div class="row" style="align-items: baseline; gap: 6px"><span class="big">${d.readiness}</span><span class="muted">/ 100 readiness</span></div>
      <div class="bar ranged">${d.readiness_range ? `<div class="band" style="left: ${d.readiness_range[0]}%; width: ${d.readiness_range[1] - d.readiness_range[0]}%"></div>` : ""}<div class="on" style="width: ${d.readiness}%"></div></div>
      ${d.readiness_range ? `<p class="small muted">Likely between ${d.readiness_range[0]} and ${d.readiness_range[1]}: only 3 questions, so it is rough.</p>` : ""}
      ${d.area_score === undefined ? "" : `<p class="small">Area score <strong>${d.area_score}</strong> <span class="muted">= 40% quick check (${d.profile}) + 60% readiness (${d.readiness})</span></p>`}
      <div><p class="muted small">Jobs in this area (O*NET):</p>
        <ul class="quals small">${d.roles.map((x) => `<li><a href="https://www.onetonline.org/link/summary/${esc(x.onet_soc)}" target="_blank" rel="noopener">${esc(x.title)}</a></li>`).join("")}</ul></div>
    </div>`;
  const tested = r.domains.filter((d) => d.tested !== false);  // results from before areas were chosen tested all 5
  const untested = r.domains.filter((d) => d.tested === false);
  // Bank order, not sorted, so the chart keeps the same shape from one attempt to the next.
  // One corner per tested area (3 = triangle ... 6 = hexagon); an untested area is never drawn as a 0.
  const profile = (tested.length >= 3
    ? hexagonChart(tested.map((d) => ({ label: d.name, value: d.profile, on: d.tested_in_depth })), `Quick-check score in each of your ${tested.length} tested IT areas`)
    : tested.map((d) => `<div class="stack" style="gap: 4px">
        <div class="row" style="justify-content: space-between"><span${d.tested_in_depth ? ' style="font-weight:700"' : ' class="muted"'}>${esc(d.name)}</span><span class="muted">${d.profile} / 100</span></div>
        <div class="bar"><div class="${d.tested_in_depth ? "on" : ""}" style="width: ${d.profile}%"></div></div></div>`).join(""))
    + (untested.length ? `<p class="small muted">Not tested: ${esc(untested.map((d) => d.name).join(", "))}. No test score.</p>` : "");
  // Areas whose quick-check score looks as high as the best area's but were held back (not tested in depth)
  const held = tested.filter((d) => !d.tested_in_depth && d.area_score !== undefined && d.profile > d.area_score);
  const heldNote = held.length && best.area_score !== undefined ? `<p class="note small">${esc(held.map((d) => d.name).join(" and "))} also scored ${held.map((d) => d.profile).join(" and ")} in the quick check, but ${held.length > 1 ? "were" : "was"} not tested in depth, so ${held.length > 1 ? "their area scores are" : "its area score is"} held at ${held[0].area_score}, the lower of the top 2. The strongest area is the one with the highest area score: ${esc(best.name)} (${best.area_score}).</p>` : "";
  const gaps = r.skills_to_improve.length
    ? `<ul class="quals">${r.skills_to_improve.map((g) => `<li><strong>${esc(g.skill)}</strong> <span class="muted small">· ${esc(nameOf(g.domain))}</span></li>`).join("")}</ul>`
    : '<p class="muted">Nothing: every answer was right.</p>';
  if (isShared) {
    render(`
  <div class="stack">
    <p class="eyebrow">Shared IT skills test result</p>
    <h1>Strongest IT area: ${esc(best.name)}</h1>
    <p class="muted">Someone shared their Future Skills test result with you. ${esc(r.disclaimer)}</p>
    <div class="card stack" style="gap: 12px"><h2>Their IT profile</h2>
      <p class="muted small">Quick-check score in each tested area (0–100): the same number of questions per area. Their top 2 (bold) were then tested in depth.</p>
      ${profile}${heldNote}</div>
    <h2>Their top 2, tested in depth</h2>
    <div class="grid">${deep.map(domainCard).join("")}</div>
    <div class="card stack" style="gap: 10px"><h2>Skills they are working on</h2>${gaps}</div>
    <div class="note stack" style="gap: 8px">
      <p><strong>Which part of IT suits you?</strong> A free skills test in the IT areas your CV and interests point to.</p>
      <div class="row"><a class="btn primary" href="#/test">Take the IT skills test</a><a class="btn ghost" href="#/">What is Future Skills?</a></div>
    </div>
  </div>`);
    return;
  }
  const review = r.items.map((i, n) => `
    <details class="more card review">
      <summary><span class="${i.correct ? "pass" : "fail"}">${i.correct ? "Right" : i.points > 0 ? "Partly right" : "Wrong"}</span>&nbsp;· Q${n + 1} · ${esc(i.skill)} <span class="muted small">&nbsp;${i.points} / ${i.max}</span></summary>
      <div class="stack" style="gap: 8px">
        <p data-no-i18n>${esc(i.prompt)}</p>
        ${i.answered ? "" : '<p class="muted small">Not answered.</p>'}
        <p><strong>Answer:</strong> <span data-no-i18n>${esc(answerText(i))}</span></p>
        <p class="muted" data-no-i18n>${esc(i.explanation)}</p>
        <p class="small">Source: ${i.refs.map((x) => `<a href="${safeUrl(x.url)}" target="_blank" rel="noopener">${esc(x.name)}</a>`).join(" · ")}</p>
        ${(i.exams || []).map((x) => `<p class="small">Also in: <a href="${safeUrl(x.url)}" target="_blank" rel="noopener" data-no-i18n>${esc(x.name)} (${esc(x.code)})</a> <span class="muted" data-no-i18n>· ${esc(x.section)}</span></p>`).join("")}
      </div>
    </details>`).join("");
  render(`
  <div class="stack">
    ${stepBar("test")}
    <p class="eyebrow">Step 3 of 4 · IT skills test result</p>
    <h1>Your strongest IT area: ${esc(best.name)}</h1>
    <p class="muted">${esc(r.disclaimer)}</p>
    ${trustLine(r.trust)}
    <div class="row"><button class="btn" type="button" id="share">Share my result</button></div>
    <div class="card stack" id="share-box" style="gap: 6px" hidden>
      <label class="small muted" for="share-url">Anyone with this link sees your IT profile, top 2 areas and skills to work on; the page does not show your answers, but the link itself carries them (that is how the result is rebuilt), so share it only with people you choose. Nothing is saved on our server.</label>
      <input class="search" id="share-url" type="text" readonly>
    </div>
    <div class="card stack" style="gap: 12px"><h2>Your IT profile</h2>
      <p class="muted small">Quick-check score in each tested area (0–100): the same number of questions per area, so you can compare them. Your top 2 (bold) were then tested in depth.</p>
      <p class="muted small">Each score comes from 3 questions, so one lucky or unlucky answer moves it by 33 points.</p>
      ${profile}${heldNote}</div>
    <h2>Your top 2, tested in depth</h2>
    <p class="muted small">Readiness counts the in-depth and hands-on questions in that area. Your strongest area has the highest area score; an area seen only in the quick check is never ranked above these two, here or on your jobs page. Right answers also count as skills in your job matches.</p>
    <div class="grid">${deep.map(domainCard).join("")}</div>
    <div class="card stack" style="gap: 10px"><h2>Skills to work on</h2>${gaps}</div>
    ${moreAreasHtml(r)}
    <div class="note stack" style="gap: 8px">
      <p><strong>Next: step 4, your jobs.</strong> Your areas grouped by what you enjoy and what you can do, with ranked roles and the skills you still need.</p>
      <div class="row"><a class="btn primary" href="#/results">Next: step 4, my jobs</a>${skillsDone() ? "" : '<a class="btn ghost" href="#/cv">Add your CV (1 min)</a>'}${quizDone() ? "" : '<a class="btn ghost" href="#/quiz">Do step 2, interests (8 min)</a>'}</div>
    </div>
    <div class="stack" style="gap: 10px"><h2>Review every answer</h2>${review}</div>
    <div class="row"><a class="btn primary" href="#/results">Next: step 4, my jobs</a><a class="btn" href="#/test">Take a new test</a><a class="btn ghost" href="#/">Home</a></div>
  </div>`);
  document.getElementById("share").onclick = (e) => shareResult(e.target);
  wireMoreAreas("#/test/result");
  document.getElementById("share-url").onfocus = (e) => e.target.select();
}

/* ---------- learning path page ---------- */

const FORMAT_LABEL = { video: "▶ YouTube video", playlist: "▶ YouTube playlist", course: "Free course" };

// A tick box for one item on a learning path. The same course ticked on one path counts on
// every path that lists it, so items are keyed by URL (certifications by their id).
function doneBox(key, title) {
  return `<label class="done-box" title="Tick when you have finished it">
    <input type="checkbox" data-done="${esc(key)}"${progress.done[key] ? " checked" : ""}>
    <span class="visually-hidden">Finished: ${esc(title)}</span><span aria-hidden="true">Done</span>
  </label>`;
}

function resourceHtml(r) {
  const facts = [esc(r.provider), r.hours ? `${fmt(r.hours)} h` : "self-paced", r.cost_myr ? `RM ${fmt(r.cost_myr, 0)}` : "", r.level ? esc(r.level) : ""].filter(Boolean);
  return `<li class="res${progress.done[r.url] ? " is-done" : ""}">
    <div class="res-top"><span class="chip plain res-kind">${FORMAT_LABEL[r.format] || esc(r.format)}</span>${doneBox(r.url, r.title)}</div>
    <a href="${safeUrl(r.url)}" target="_blank" rel="noopener">${esc(r.title)}</a>
    <span class="muted small">${facts.join(" · ")}</span>
  </li>`;
}

// The UN's official icon for each of the 17 Sustainable Development Goals (src/static/sdg/).
const sdgTile = (goal, name) => `<img class="sdg-tile" src="/static/sdg/${encodeURIComponent(goal)}.webp" width="64" height="64" loading="lazy" alt="SDG ${esc(goal)}: ${esc(name)}">`;

/* ---------- learning progress ---------- */

// { done: {itemKey: "YYYY-MM-DD"}, paths: {roleId: {name, area, personal, items: {itemKey: hours|null}, updated}} }
// A path is tracked from the first item ticked on it; its item list is refreshed on every visit.
const PROGRESS_KEY = "future-skills-progress-v1";
let progress = loadProgress();

function loadProgress() {
  const saved = readSaved(PROGRESS_KEY) || {};
  return { done: saved.done || {}, paths: saved.paths || {} };
}
const saveProgress = () => writeSaved(PROGRESS_KEY, progress);
const today = () => new Date().toISOString().slice(0, 10);
const trackedPaths = () => Object.entries(progress.paths).map(([id, p]) => ({ id, ...p, ...pathStats(p.items) }))
  .sort((a, b) => (b.updated || "").localeCompare(a.updated || ""));

function pathStats(items) {
  const keys = Object.keys(items || {});
  const done = keys.filter((k) => progress.done[k]);
  const hours = (ks) => ks.reduce((t, k) => t + (items[k] || 0), 0);
  return { total: keys.length, done: done.length, hoursTotal: hours(keys), hoursDone: hours(done),
    pct: keys.length ? Math.round((done.length / keys.length) * 100) : 0 };
}
function pathProgressLabel(roleId) {
  const p = progress.paths[roleId];
  if (!p) return "";
  const st = pathStats(p.items);
  return st.total ? ` (${st.done}/${st.total} done)` : "";
}
function progressHtml(st, hoursPerWeek) {
  const left = Math.max(0, st.hoursTotal - st.hoursDone);
  return `<div class="row" style="justify-content: space-between; gap: 6px">
      <strong>${st.done} / ${st.total} done</strong>
      <span class="muted small">${left && hoursPerWeek ? `about ${fmt(left / hoursPerWeek, 0)} weeks left at ${esc(hoursPerWeek)} h a week` : ""}</span>
    </div>
    <div class="progress learn-progress" role="progressbar" aria-label="Learning path progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${st.pct}"><div style="width: ${st.pct}%"></div></div>`;
}

async function pageLearn(roleId) {
  render('<p class="muted" role="status">Building the learning path…</p>');
  const personal = Boolean(lastMatchBody);
  const p = personal
    ? await api("/api/learn", { body: JSON.stringify({ ...lastMatchBody, role_id: roleId }) })
    : await api(`/api/learn/${encodeURIComponent(roleId)}`);
  const stage = (n, title, hint, body) => `
    <section class="card stack learn-stage" style="gap: 10px">
      <h2><span class="stage-num" aria-hidden="true">${n}</span>${esc(title)}</h2>
      ${hint ? `<p class="muted small">${hint}</p>` : ""}
      ${body}
    </section>`;
  // The first few in view, the rest one tap away, so a long path stays easy to scan.
  const more = (rest, html) => (rest.length ? `<details class="fold"><summary><span>Show more</span> <span class="muted">(${rest.length})</span></summary>${html}</details>` : "");
  const list = (rs, n = 3) => (rs.length
    ? `<ul class="res-list">${rs.slice(0, n).map(resourceHtml).join("")}</ul>${more(rs.slice(n), `<ul class="res-list">${rs.slice(n).map(resourceHtml).join("")}</ul>`)}`
    : '<p class="muted small">No free course yet.</p>');
  const skillHtml = (s) => `
    <div class="stack learn-skill" style="gap: 6px">
      <h3>${esc(s.skill_name)}${s.your_level !== undefined && s.rated !== false ? ` <span class="muted small">you ${fmt(s.your_level)} → need ${fmt(s.level_needed)}</span>` : ""}</h3>
      ${list(s.resources, 2)}
    </div>`;
  const skills = p.skills.slice(0, 3).map(skillHtml).join("") + more(p.skills.slice(3), p.skills.slice(3).map(skillHtml).join(""));
  // Projects to build first (every role has them), then any certification; all can be ticked.
  const proveIt = `<ul class="res-list">${p.projects.map((x) => `<li class="res${progress.done[`project:${x.id}`] ? " is-done" : ""}">
      <div class="res-top"><span class="chip plain res-kind">Project</span>${doneBox(`project:${x.id}`, x.title)}</div>
      <strong>${esc(x.title)}</strong>
      <span class="muted small">${esc(x.description)}</span>
      <a class="small" href="${safeUrl(x.guide.url)}" target="_blank" rel="noopener">Guide: ${esc(x.guide.name)} ↗</a></li>`).join("")}${p.certifications.map((c) => `<li class="res${progress.done[`cert:${c.cert_id}`] ? " is-done" : ""}">
      <div class="res-top"><span class="chip plain res-kind">Certification</span>${doneBox(`cert:${c.cert_id}`, c.cert_name)}</div>
      <a href="${safeUrl(c.url)}" target="_blank" rel="noopener">${esc(c.cert_name)}</a>
      <span class="muted small">${esc(c.issuer)}${c.cost_amount ? ` · ${esc(c.cost_currency)} ${esc(c.cost_amount)}` : ""}</span></li>`).join("")}</ul>`;
  // One row per goal: the goal's icon tile, its name and one line on how this job helps.
  const goals = new Map();  // keeps the server's order: the job's own goals first
  for (const t of p.sdg) {
    const goal = t.target.split(".")[0];
    if (!goals.has(goal)) goals.set(goal, { goal, name: t.goal_name, why: null, skills: [] });
    const g = goals.get(goal);
    if (t.role && !g.why) g.why = t.role.rationale;
    for (const k of t.skills) if (!g.skills.includes(k.skill_name)) g.skills.push(k.skill_name);
  }
  const sdgCard = p.sdg.length ? `
    <section class="card stack" style="gap: 12px" aria-labelledby="sdg-title">
      <h2 id="sdg-title">Global goals this job supports</h2>
      ${[...goals.values()].map((g) => `<div class="sdg-goal">
        ${sdgTile(g.goal, g.name)}
        <div class="stack" style="gap: 2px">
          ${LANG === "en" ? "" : `<strong>${esc(g.name)}</strong>`}
          <span class="small">${g.why ? esc(g.why) : `Built by ${esc(g.skills.slice(0, 3).join(", "))}`}</span>
        </div>
      </div>`).join("")}
    </section>` : "";
  const hrd = p.hrd_corp_options.length ? `
    <details class="card fold-card" aria-labelledby="hrd-title">
      <summary><h2 id="hrd-title">Working already? Courses your employer can claim</h2></summary>
      <p class="muted small">Paid courses your employer may claim under HRD Corp. Ask HR before you sign up.</p>
      <ul class="res-list">${p.hrd_corp_options.map((c) => `<li class="res">
        <span class="chip res-kind">HRD Corp claimable</span>
        <a href="${safeUrl(c.url)}" target="_blank" rel="noopener">${esc(c.title)}</a>
        <span class="muted small">${esc(c.provider)} · RM ${fmt(c.cost_myr, 0)} · ${c.skills.map(esc).join(", ")}</span>
      </li>`).join("")}</ul>
    </details>` : "";
  // Every item on this page that can be ticked, with its hours (projects and certifications have none).
  const items = {};
  for (const r of [...p.stages.flatMap((st) => st.resources), ...p.skills.flatMap((k) => k.resources)]) items[r.url] = r.hours || null;
  for (const x of p.projects) items[`project:${x.id}`] = null;
  for (const c of p.certifications) items[`cert:${c.cert_id}`] = null;
  const track = () => {
    progress.paths[roleId] = { name: p.role.name, area: p.role.area_name, personal: p.personal, items, updated: today() };
  };
  if (progress.paths[roleId]) { track(); saveProgress(); }
  render(`
  <div class="stack">
    <a class="btn ghost" href="#/results" style="align-self: flex-start">&larr; Back to my jobs</a>
    <div class="stack" style="gap: 8px">
      <p class="eyebrow">Learning path${p.personal ? " · built on your skill gaps" : ""}</p>
      <h1 class="job-title">${esc(p.role.name)}</h1>
      ${p.role.summary.en ? `<p class="lead" data-no-i18n>${esc(p.role.summary[LANG] || p.role.summary.en)}</p>` : ""}
      <div class="row" style="gap: 6px">
        <span class="chip plain">${esc(p.role.area_name || "IT")}</span>
      </div>
    </div>
    <section class="card stack" style="gap: 8px" aria-labelledby="progress-title">
      <h2 id="progress-title">Your progress</h2>
      <div id="learn-progress" aria-live="polite">${progressHtml(pathStats(items), p.hours_per_week)}</div>
    </section>
    ${stage(1, p.stages[0].title, "", list(p.stages[0].resources))}
    ${p.stages[1].resources.length ? stage(2, p.stages[1].title, "", list(p.stages[1].resources)) : ""}
    ${stage(p.stages[1].resources.length ? 3 : 2, p.personal ? "Close your skill gaps" : "Skills and tools this job uses", "", skills)}
    ${stage(p.stages[1].resources.length ? 4 : 3, "Prove it", "", proveIt)}
    ${hrd}
    ${sdgCard}
    <div class="row"><a class="btn primary" href="#/results">Back to my jobs</a><a class="btn" href="#/progress">My learning</a></div>
  </div>`);
  app.querySelectorAll("[data-done]").forEach((box) => {
    box.onchange = () => {
      const key = box.dataset.done;
      if (box.checked) progress.done[key] = today(); else delete progress.done[key];
      track();
      saveProgress();
      // the same item can appear twice on a page (a foundation course that also teaches a skill)
      app.querySelectorAll(`[data-done="${CSS.escape(key)}"]`).forEach((b) => {
        b.checked = box.checked;
        b.closest(".res").classList.toggle("is-done", box.checked);
      });
      document.getElementById("learn-progress").innerHTML = progressHtml(pathStats(items), p.hours_per_week);
    };
  });
}

/* ---------- my learning page ---------- */

function pageProgress() {
  const paths = trackedPaths();
  const cards = paths.map((p) => `
    <article class="card stack" style="gap: 10px">
      <div class="row" style="gap: 8px">
        <h2>${esc(p.name)}</h2>
        ${p.pct === 100 ? '<span class="chip">Path complete ✓</span>' : `<span class="chip plain">${esc(p.area || "IT")}</span>`}
      </div>
      ${progressHtml(p, state.hoursPerWeek)}
      <div class="row">
        <a class="btn primary" href="#/learn/${esc(p.id)}">Continue &rarr;</a>
        <button class="btn ghost" type="button" data-untrack="${esc(p.id)}">Stop tracking</button>
      </div>
    </article>`).join("");
  render(`
  <div class="stack">
    <h1>My learning</h1>
    ${paths.length ? `<p class="muted small">Saved in this browser.</p>${cards}`
      : `<p class="muted">Nothing here yet. Open a learning path from your jobs and tick what you finish.</p><div class="row"><a class="btn primary" href="#/results">Go to my jobs &rarr;</a></div>`}
  </div>`);
  app.querySelectorAll("[data-untrack]").forEach((b) => {
    b.onclick = () => {
      delete progress.paths[b.dataset.untrack];  // ticks stay, so they come back if the path is opened again
      saveProgress();
      pageProgress();
    };
  });
}

/* ---------- router ---------- */

async function route() {
  const parts = location.hash.replace(/^#\/?/, "").split("/");
  const page = parts[0] || "";
  document.querySelectorAll("[data-nav]").forEach((a) => {
    const on = a.dataset.nav === page || (page === "interests" && a.dataset.nav === "quiz");
    if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    // On phones the menu is one row that scrolls sideways: keep the current page's tab in view.
    if (on) a.parentElement.scrollLeft = Math.max(0, a.offsetLeft - 40);
  });
  window.scrollTo(0, 0);
  try {
    if (page === "shared" && parts[1]) await pageSharedResult(parts[1]);
    else if (page === "test" && parts[1] === "result") pageTestResult();
    else if (page === "test" && parts[1]) pageTestItem(Number(parts[1]) || 1);
    else if (page === "test") await pageTestIntro();
    else if (page === "quiz" && parts[1]) await pageQuizItem(Number(parts[1]) || 1);
    else if (page === "quiz") await pageQuizIntro();
    else if (page === "interests") await pageInterests();
    else if (page === "cv") await pageCV();
    else if (page === "skills") await pageSkills();
    else if (page === "results") await pageResults();
    else if (page === "trends") await pageTrends();
    else if (page === "whatif") await pageWhatIf();
    else if (page === "learn" && parts[1]) await pageLearn(decodeURIComponent(parts[1]));
    else if (page === "progress") pageProgress();
    else pageHome();
  } catch (e) {
    showError(e);
  }
  app.focus({ preventScroll: true });
}
window.addEventListener("hashchange", route);

// Light / dark: follows the device until the student picks one; the pick is kept in this browser.
// index.html applies the saved pick before the page draws, so there is no flash.
const THEME_KEY = "future-skills-theme";
const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
function isDark() {
  const t = document.documentElement.dataset.theme;
  return t ? t === "dark" : darkQuery.matches;
}
function showThemeButton() {
  const btn = document.getElementById("theme");
  if (!btn) return;
  const dark = isDark();
  btn.textContent = dark ? "☀︎" : "☾︎";
  const label = dark ? "Light mode" : "Dark mode";
  btn.setAttribute("aria-label", label);
  btn.title = label;
}
document.getElementById("theme")?.addEventListener("click", () => {
  const next = isDark() ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* storage off: this page only */ }
  showThemeButton();
});
darkQuery.addEventListener("change", showThemeButton);
showThemeButton();
route();
