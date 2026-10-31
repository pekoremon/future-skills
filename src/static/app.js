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
    scenario: "baseline", hoursPerWeek: 5, sdgGoals: [] };
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
  for (const key of [STORE_KEY, PLAN_KEY, PROGRESS_KEY, PLAY_KEY]) {
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

// "Where do you fit in?": the way into the student path, shown on the Trends page (the landing page).
function startCard() {
  return `
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
`;
}

function wireStartCard() {
  document.getElementById("demo").onclick = () => { state.demo = "P01"; saveState(); location.hash = "#/results"; };
  document.getElementById("quick").onclick = () => { state.quick = true; saveState(); };
  const forget = document.getElementById("forget");
  if (forget) forget.onclick = () => {
    if (!confirm("Clear your answers, test and learning progress from this browser? This cannot be undone.")) return;
    clearSaved();
    state = loadState();
    progress = loadProgress();
    cvResult = null;
    route();
  };
  document.getElementById("to-start").onclick = () => document.getElementById("start").scrollIntoView({ behavior: "smooth", block: "start" });
}

async function pageQuizIntro() {
  render(`
  <div class="quiz stack">
    ${stepBar("quiz")}
    <p class="eyebrow">Step 2 of 4 · Interests</p>
    <h1>Set sail: which crew role is yours?</h1>
    <div class="row"><span class="chip">36 items</span><span class="chip">About 8 minutes</span><span class="chip">Skip any time</span></div>
    <div class="card crew-intro">
      ${sailorSVG({ cls: "act-nod" })}
      <p>Every answer trains your sailor. At the end, they become one of six crew roles.</p>
    </div>
    <div class="crew-legend">${CREW_ORDER.map((k) => `<div><span aria-hidden="true">${CREW[k].icon}</span><span>${CREW[k].role}</span></div>`).join("")}</div>
    <p class="muted small">Answer by what you would enjoy, not what you are already good at. No role is better than another.</p>
    <div class="card stack" style="gap: 6px">
      <h3>A proven interest test</h3>
      <p class="muted">Built on Holland's RIASEC model, the interest model career services use worldwide, including the US Department of Labor's O*NET.</p>
    </div>
    <div class="stack">
      <button class="btn primary" type="button" id="begin">${state.answers.some((a) => a !== null) ? "Continue the voyage" : "Start the voyage"}</button>
      <button class="btn" type="button" id="skip">Skip to step 3: the skills test</button>
    </div>
    <p class="attribution">Questions written by the team, based on Holland's RIASEC interest types as used by <a href="https://www.onetonline.org/find/descriptor/browse/1.B.1">O*NET</a>.</p>
  </div>`);
  document.getElementById("begin").onclick = () => {
    const first = state.answers.indexOf(null);
    location.hash = `#/quiz/${first === -1 ? 1 : first + 1}`;
  };
  document.getElementById("skip").onclick = () => { state.quizSkipped = true; state.demo = null; saveState(); location.hash = "#/test"; };
}

// The last answer, played back on the next item: the hexagon grows from `from` and the sailor reacts.
let crewLast = null;
let crewFinished = false;  // the results page plays the sailor's evolution once, right after item 36

async function pageQuizItem(n) {
  const q = await cached("/api/questionnaire");
  const idx = Math.min(Math.max(n, 1), q.items.length) - 1;
  const item = q.items[idx];
  const now = crewScores(q.items, state.answers);
  const last = crewLast;
  crewLast = null;
  const acted = last && last.action === last.type;
  const opts = Object.entries(q.scale).map(([v, label]) =>
    `<button type="button" data-v="${esc(v)}" aria-pressed="${state.answers[idx] === Number(v)}">${esc(label)}</button>`).join("");
  render(`
  <div class="voyage">
    <div class="v-top stack" style="gap: 10px">
      <div class="row" style="justify-content: space-between">
        <a class="btn ghost" href="${idx ? `#/quiz/${idx}` : "#/quiz"}" aria-label="Previous item">&larr; Back</a>
        <span class="muted small">Item ${idx + 1} of ${q.items.length}</span>
        <a class="btn ghost" href="#/quiz">Pause</a>
      </div>
      <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${q.items.length}" aria-valuenow="${idx + 1}"><div style="width: ${Math.round(((idx + 1) / q.items.length) * 100)}%"></div></div>
    </div>
    <section class="v-q stack">
      <p class="muted small">${esc(q.stem)}</p>
      <div class="card item" id="item-text">${esc(item.text)}</div>
      <div class="options" role="group" aria-labelledby="item-text">${opts}</div>
    </section>
    <aside class="card v-hex"><p class="v-label">Your interest map</p>${crewHex(now, acted ? last.type : null)}</aside>
    <aside class="card v-crew"><p class="v-label">Your sailor</p>${sailorSVG()}
      ${acted ? `<div class="crew-toast"><span aria-hidden="true">${CREW[last.type].icon} +</span> <span>${CREW[last.type].role}</span></div>` : ""}</aside>
    <p class="attribution v-foot">${esc(q.attribution)}</p>
  </div>`);
  if (last) {
    crewHexGrow(app.querySelector(".crew-hex"), last.from, now);
    sailorAct(app.querySelector(".v-crew .sailor"), last.action);
  }
  app.querySelectorAll(".options button").forEach((b) => {
    b.onclick = () => {
      const v = Number(b.dataset.v);
      crewLast = { from: crewScores(q.items, state.answers), type: item.type, action: crewReaction(item.type, v) };
      state.answers[idx] = v;
      state.quizSkipped = false;
      state.demo = null;
      saveState();
      crewFinished = idx + 1 >= q.items.length;
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
  const [lead, second] = top;
  const reveal = CREW[lead] ? `
    <section class="card crew-reveal">
      ${sailorSVG({ role: lead, hold: second, cls: crewFinished ? "evolve" : "" })}
      <div class="stack" style="gap: 8px">
        <p class="muted small">Your crew role</p>
        <h1 class="crew-title">${esc(crewTitle(lead, second))}</h1>
        <p>${esc(CREW[lead].desc)}</p>
        <p class="small"><strong>IT paths to look at:</strong> <span>${esc(CREW[lead].it)}</span></p>
        <p class="muted small">No role is better than another.</p>
      </div>
    </section>` : "";
  crewFinished = false;
  if (CREW[lead] && (!state.crew || state.crew.lead !== lead || state.crew.second !== second)) {
    state.crew = { lead, second };  // the sailor sails the IT test in this outfit
    saveState();
  }
  render(`
  <div class="quiz stack">
    ${stepBar("quiz")}
    <p class="eyebrow">Step 2 of 4 · Your interest results</p>
    ${r.warnings.map((w) => `<div class="warn">${esc(w.text)}</div>`).join("")}
    ${reveal}
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
  const drop = document.getElementById("drop");
  const busy = (on) => {
    drop.classList.toggle("busy", on);
    drop.querySelectorAll("input, button").forEach((el) => { el.disabled = on; });
  };
  let stageTimer = null;
  const run = async (getBody, what) => {
    clearInterval(stageTimer);
    busy(true);
    status.className = "cv-wait";
    status.innerHTML = `<span class="spinner" aria-hidden="true"></span>
      <div class="stack" style="gap: 6px; flex: 1">
        <strong id="cv-what"></strong>
        <span class="small" id="cv-stage">Opening your file</span>
        <div class="wait-bar" aria-hidden="true"><div></div></div>
      </div>`;
    document.getElementById("cv-what").textContent = `Reading ${what}…`;
    const stages = ["Opening your file", "Finding your skills", "Writing your summary", "Almost done"];
    let i = 0;
    stageTimer = setInterval(() => {
      const el = document.getElementById("cv-stage");
      if (!el || i >= stages.length - 1) return;
      el.textContent = stages[++i];
      el.style.animation = "none";
      void el.offsetWidth;  // restart the fade so each new stage is noticed
      el.style.animation = "";
    }, 2500);
    out.innerHTML = "";
    cvResult = null;
    state.cvAreas = null;  // a new CV replaces the old evidence, even if reading it fails
    saveState();
    try {
      cvResult = await api("/api/cv/summary", { body: JSON.stringify(await getBody()) });
      status.className = "small muted";
      status.textContent = `Read ${cvResult.chars_read.toLocaleString()} characters from ${what}.`;
      state.cvAreas = cvAreasOf(cvResult);
      if (state.cvAreas) state.demo = null;
      saveState();
      show(cvResult);
    } catch (e) {
      status.className = "warn";
      status.textContent = `Could not read the CV: ${e.message}`;
    } finally {
      clearInterval(stageTimer);
      busy(false);
    }
  };
  const input = document.getElementById("cv-file");
  input.onchange = () => input.files[0] && run(() => cvRequestBody(input.files[0]), input.files[0].name);
  document.getElementById("cv-sample").onclick = () => run(async () => ({ text: await (await fetch("/static/sample_cv.txt")).text() }), "the sample CV");
  drop.ondragover = (e) => { e.preventDefault(); drop.classList.add("over"); };
  drop.ondragleave = () => drop.classList.remove("over");
  drop.ondrop = (e) => {
    e.preventDefault();
    drop.classList.remove("over");
    const f = e.dataTransfer.files[0];
    if (f && !drop.classList.contains("busy")) run(() => cvRequestBody(f), f.name);
  };
  if (cvResult) show(cvResult);
}

function splitBar(m) {
  const bonus = m.sdg_choice ? m.total - m.sdg_choice.total_without : 0;  // capped at 100
  return `<div class="split" role="img" aria-label="${ORDER_PARTS.map((k) => `${PART_LABEL[k]} ${fmt(m.components[k].points)} points`).join(", ")}${bonus ? `, your global goals ${fmt(bonus)} points` : ""}">
    ${ORDER_PARTS.map((k) => `<span class="k-${k}" style="width: ${m.components[k].points || 0}%"></span>`).join("")}${bonus ? `<span class="k-sdg" style="width: ${bonus}%"></span>` : ""}
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

// listedRoles with each role's rank, and its rank under every scenario within this grouped
// list (the groups do not depend on the scenario): the jobs page and the advisor page.
function rankedRoles(res) {
  const g = res.groups;
  const best = listedRoles(res.results, g);
  const groupOf = Object.fromEntries(g.areas.map((a) => [a.id, a.group]));
  const gi = (m) => (g.mode === "none" || groupOf[m.it_area] === "best_fit" ? 0 : 1);
  // The rank each job would have without the student's global goals, so the page can show what they moved.
  [...best].sort((a, b) => gi(a) - gi(b) || b.sdg_choice.total_without - a.sdg_choice.total_without)
    .forEach((m, i) => { m.rank_without_goals = i + 1; });
  if (g.mode !== "none" && best.length) {
    const ranks = {};
    Object.keys(best[0].scenario_ranks || {}).forEach((s) => [...best].sort((a, b) => gi(a) - gi(b) || a.scenario_ranks[s] - b.scenario_ranks[s])
      .forEach((m, i) => { (ranks[m.role_id] = ranks[m.role_id] || {})[s] = i + 1; }));
    best.forEach((m, i) => { m.scenario_ranks = ranks[m.role_id]; m.rank = i + 1; m.baseline_rank = ranks[m.role_id] && ranks[m.role_id].baseline; });
  }
  return best;
}

const hasAnswers = () => Boolean(state.demo) || testDone() || quizDone() || state.quizSkipped || skillsDone();

// The /api/match request for the student's answers (or a demo student), with the page options
// and the changed trend data of a what-if, if one is on.
function matchBody(demo = state.demo) {
  const options = { top: 35, scenario: state.scenario, hours_per_week: Number(state.hoursPerWeek) };
  if ((state.sdgGoals || []).length) options.sdg_goals = state.sdgGoals;
  if (state.trendChanges) options.trend_changes = state.trendChanges;
  if (demo) return { profile_id: demo, ...options };
  const test = testDone() ? gradedTest(state.test) : undefined;
  return { test, interest_answers: quizDone() ? state.answers : undefined, skill_ratings: state.ratings, technologies: state.techs, cv_areas: state.cvAreas ? state.cvAreas.scores : undefined, education_job_zone: Number(state.zone), ...options };
}

// One job: rank, name, IT area, SDG, the score and its parts, and "Why this job?" in short.
// Learn next lists technologies only: the student no longer rates skills.
function jobCard(m, rank) {
  const flags = m.flags.filter((f) => !QUIET_FLAGS.includes(f)).map((f) => `<span class="chip warn-chip">${esc(FLAGS[f] || f)}${f === "needs_extra_education" ? ` (Job Zone ${m.job_zone})` : ""}</span>`).join("");
  // Short SDG chips on the same row as the IT area; the goal names and reasons are under "Why this job?"
  const sdg = m.sdg.map((s) => `<span class="chip sdg-chip" title="${esc(s.goal_name)}: ${esc(s.rationale)}"><img class="sdg-mini" src="/static/sdg/${encodeURIComponent(String(s.target).split(".")[0])}.webp" width="20" height="20" loading="lazy" alt="">SDG ${esc(s.target)}</span>`).join("");
  const next = m.skill_detail.tech_missing.slice(0, 2).map((t) => t.skill_name);
  const parts = ORDER_PARTS.map((k) => {
    const c = m.components[k];
    return `<span title="${PART_LABEL[k]}: ${c.score === null ? "not scored" : `${fmt(c.score)} / 100 × ${Math.round(c.weight * 100)}%`}"><i class="k-${k}"></i>${PART_LABEL[k]} <strong>${c.score === null ? "–" : fmt(c.points)}</strong></span>`;
  }).join("") + (m.sdg_choice && m.sdg_choice.bonus ? `<span title="Supports a global goal you picked"><i class="k-sdg"></i>Your global goals <strong>+${fmt(m.total - m.sdg_choice.total_without)}</strong></span>` : "");
  return `
    <li class="top-card${rank === 1 ? " first" : ""}" data-role="${esc(m.role_id)}">
      <div class="top-main">
        <h3>${rank}. ${esc(m.role_name)} ${moveBadge(m)} ${goalBadge(m, rank)}</h3>
        <div class="row" style="gap: 6px">
          <span class="chip plain">${esc(m.area_name || "Other IT area")}</span>
          ${rangeBadge(m)}
          ${m.sdg_choice && m.sdg_choice.goals.length ? `<span class="chip sdg-pick" title="Supports the global goal you picked, so it gets ${fmt(m.sdg_choice.bonus)} extra points">Your goal: SDG ${m.sdg_choice.goals.map(esc).join(", ")}</span>` : ""}
          ${sdg}
          ${flags}
        </div>
        ${next.length ? `<p class="small"><span class="muted">Learn next:</span> ${next.map(esc).join(", ")}</p>` : ""}
      </div>
      <div class="top-side">
        <div class="score" aria-label="Match score ${fmt(m.total)} out of 100">${fmt(m.total)}<small>/ 100</small></div>
        <a class="btn primary" href="#/learn/${esc(m.role_id)}">Learning path${pathProgressLabel(m.role_id)} &rarr;</a>
      </div>
      <div class="job-parts">${splitBar(m)}<div class="legend parts">${parts}</div></div>
      <details class="why"><summary>Why this job?</summary><div class="explain-out small" aria-live="polite"></div>${sdgWhy(m.sdg)}</details>
    </li>`;
}

// Under "Why this job?": one line per UN goal on how this job helps, so the SDG chips mean something.
function sdgWhy(sdg) {
  if (!sdg.length) return "";
  return `<div class="sdg-why stack">
    <strong class="small">How this job helps the world</strong>
    ${sdg.map((s) => `<div class="sdg-why-row"><img class="sdg-mini" src="/static/sdg/${encodeURIComponent(String(s.target).split(".")[0])}.webp" width="20" height="20" loading="lazy" alt="">
      <span class="small"><strong>SDG ${esc(s.target)} · ${esc(s.goal_name)}</strong><br><span class="muted">${esc(s.rationale)}</span></span></div>`).join("")}
  </div>`;
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

// How the student's global goals moved this job: up for a job that supports one, down for one passed by those.
function goalBadge(m, rank) {
  if (!(state.sdgGoals || []).length || !m.rank_without_goals || m.rank_without_goals === rank) return "";
  const up = m.rank_without_goals - rank;
  return `<span class="chip ${up > 0 ? "sdg-pick" : "plain"}" title="Rank without your global goals: ${m.rank_without_goals}">${up > 0 ? "▲" : "▼"} ${Math.abs(up)} from your goals</span>`;
}

// "Global goals you care about": one button per UN goal an IT job here supports.
function drawGoalPick(res) {
  const box = document.getElementById("goal-pick");
  if (!box) return;
  const picked = new Set(state.sdgGoals || []);
  box.innerHTML = res.sdg_goals.map((g) => `<button type="button" data-goal="${esc(g.goal)}" aria-pressed="${picked.has(g.goal)}">
    ${sdgTile(g.goal, g.goal_name)}<span><strong data-no-i18n>SDG ${esc(g.goal)}</strong> <span>${esc(g.goal_name)}</span><small><span data-no-i18n>${g.roles}</span> <span>${g.roles === 1 ? "IT job" : "IT jobs"}</span></small></span></button>`).join("");
  box.querySelectorAll("[data-goal]").forEach((b) => {
    b.onclick = () => {
      const goals = new Set(state.sdgGoals || []);
      goals.has(b.dataset.goal) ? goals.delete(b.dataset.goal) : goals.add(b.dataset.goal);
      state.sdgGoals = [...goals].sort((x, y) => x - y);
      saveState();
      b.setAttribute("aria-pressed", String(goals.has(b.dataset.goal)));
      drawJobs().catch(showError);
    };
  });
}

let lastMatchBody = null;

// Learning paths, kept per role and match body. The jobs page loads its listed roles' paths in
// the background, so "Learning path" opens at once even when the host is slow to answer.
const learnCache = {};
function learnData(roleId) {
  const body = lastMatchBody ? JSON.stringify({ ...lastMatchBody, role_id: roleId }) : null;
  const key = body || roleId;
  if (!learnCache[key]) {
    learnCache[key] = (body ? api("/api/learn", { body }) : api(`/api/learn/${encodeURIComponent(roleId)}`))
      .catch((e) => { delete learnCache[key]; throw e; });
  }
  return learnCache[key];
}
async function prefetchLearn(roleIds) {
  if (isLite()) return;  // Lite mode: a path loads when it is opened, not before
  for (const id of roleIds) await learnData(id).catch(() => {});  // one at a time; errors retry on open
}

// "Why this job?": two sentences from the AI on why the role suits the student, loaded on open.
async function whyJob(card) {
  const out = card.querySelector(".explain-out");
  if (out.dataset.done) return;
  out.dataset.done = "1";
  out.className = "explain-out small muted";
  out.textContent = "Writing…";
  try {
    const r = await api("/api/explain", { body: JSON.stringify({ ...lastMatchBody, role_id: card.dataset.role, short: true }) });
    const label = r.source === "llm" ? "Written by AI from your scores. It can be wrong." : "AI not available, so this is a plain summary of your scores.";
    out.className = "explain-out small";
    out.innerHTML = `<p>${esc(r.text)}</p><p class="muted" style="margin-top: 4px" title="${esc(r.reason || "")}">${label}</p>`;
  } catch (e) {
    delete out.dataset.done;
    out.className = "explain-out small warn";
    out.textContent = `Could not explain: ${e.message}`;
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
  const [scenarios, profiles] = await Promise.all([cached("/api/scenarios"), demo ? cached("/api/profiles") : []]);
  const who = demo ? profiles.find((p) => p.profile_id === demo) : null;
  const whatIfBanner = state.trendChanges ? `
    <section class="warn stack" style="gap: 8px" role="status">
      <p><strong>You are looking at changed trend data</strong> (a what-if). Only your copy changed; the real data stay the same.</p>
      <div class="row"><a class="btn" href="#/whatif">Change it again</a><button class="btn" type="button" id="wi-off">Back to the real data</button></div>
    </section>` : "";
  // The scenario comes first; switching it only redraws the jobs below it (#jobs).
  render(`
  <div class="stack">
    ${demo ? "" : stepBar("results")}
    <p class="eyebrow">${demo ? "" : "Step 4 of 4 · "}Your matches${who ? ` · demo: ${esc(who.name)}` : ""}</p>
    <h1>Best matches for your level</h1>
    ${whatIfBanner}
    <section class="card stack" style="gap: 10px" aria-labelledby="sc-title">
      <h2 id="sc-title">Future scenario</h2>
      <div class="tabs" role="group" aria-label="Future scenario">
        ${scenarios.map((s) => `<button type="button" data-scenario="${esc(s.id)}" aria-pressed="${s.id === state.scenario}">${esc(s.name)}</button>`).join("")}
      </div>
      <p class="small" id="sc-desc"></p>
      <p class="small"><strong>These are estimates, not predictions.</strong></p>
      <details class="fold"><summary>About these estimates</summary><div class="stack" style="gap: 8px">
      <p class="small">Nobody knows how fast AI will change jobs. Each scenario is a different assumption about the future, built from public data (DOSM, MyCOL, arXiv) and weights the team chose. Compare them: a role that ranks high in all three is a safer choice than one that ranks high in only one. The decision is yours.</p>
      <p class="small muted" id="sc-weights"></p>
      </div></details>
      <div class="row"><a class="btn" href="#/whatif">What if the trend data changed? Try it &rarr;</a></div>
    </section>
    <section class="card stack" style="gap: 10px" aria-labelledby="goal-title">
      <h2 id="goal-title">Global goals you care about</h2>
      <p class="small">Pick the UN Sustainable Development Goals you want your work to help. A job that supports one gets 5 extra points, so it moves up your list. Pick none to rank on fit and trends only.</p>
      <div class="goal-pick" id="goal-pick" role="group" aria-label="Global goals you care about"></div>
    </section>
    <div id="jobs" class="stack"></div>
  </div>`);
  app.querySelectorAll("[data-scenario]").forEach((b) => {
    b.onclick = () => {
      if (state.scenario === b.dataset.scenario) return;
      state.scenario = b.dataset.scenario;
      saveState();
      app.querySelectorAll("[data-scenario]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      drawJobs().catch(showError);
    };
  });
  const off = document.getElementById("wi-off");
  if (off) off.onclick = () => { delete state.trendChanges; whatIfEdits = null; saveState(); pageResults().catch(showError); };
  await drawJobs();
}

// The jobs part of the results page, for the chosen scenario.
async function drawJobs() {
  const demo = state.demo;
  const jobs = document.getElementById("jobs");
  jobs.classList.add("loading");
  const body = matchBody();
  const res = await api("/api/match", { body: JSON.stringify(body) });
  if (body.scenario !== state.scenario || String(body.sdg_goals || []) !== String(state.sdgGoals || []) || !jobs.isConnected) return;  // switched again, or left the page
  lastMatchBody = body;
  drawGoalPick(res);
  const replan = replanNote(body, res);
  const sc = res.scenario;
  document.getElementById("sc-desc").textContent = sc.description;
  document.getElementById("sc-weights").innerHTML = `Trend score weights: Malaysian demand ${Math.round(sc.demand * 100)}% · AI momentum ${Math.round(sc.ai * 100)}%. Area scores:
    ${Object.entries(sc.trend_scores).filter(([k]) => AREA_NAMES[k]).map(([k, v]) => `${esc(AREA_NAMES[k])} ${fmt(v)}`).join(" · ")}. An area with only one measured part keeps the same score.`;
  const g = res.groups;
  const groupOf = Object.fromEntries(g.areas.map((a) => [a.id, a.group]));
  const best = rankedRoles(res);
  let shown = 6;
  const draw = () => {
    const list = best.slice(0, shown);
    const groups = g.mode === "none" ? [[null, list]]
      : ["best_fit", "can_do"].map((name) => [name, list.filter((m) => groupOf[m.it_area] === name)]).filter(([, ms]) => ms.length);
    document.getElementById("list").innerHTML = best.length
      ? groups.map(([name, ms]) => `${name && groups.length > 1 ? `<h3 class="group-head">${esc(groupTitle(g, name))}</h3>` : ""}
        <ol class="top-list">${ms.map((m) => jobCard(m, best.indexOf(m) + 1)).join("")}</ol>`).join("")
      : '<p class="muted">No roles in your best-fit areas match your education level yet. Try a higher education level on the skills page.</p>';
    document.getElementById("more").hidden = shown >= best.length;
    jobs.querySelectorAll("details.why").forEach((d) => d.addEventListener("toggle", () => d.open && whyJob(d.closest(".top-card"))));
    prefetchLearn(list.map((m) => m.role_id));
  };
  const scored = `<h3>How your IT areas were scored</h3>${res.areas.map((a) => `<p class="small"><strong>${esc(a.name)}</strong> ${a.fit === null ? "not scored" : fmt(a.fit)} <span class="muted">· ${esc(a.explain)}</span></p>`).join("")}${res.insights.map((i) => `<p class="note">${esc(i.text)}</p>`).join("")}`;
  const why = g.mode === "none" ? groupsHtml(g) : `
    <details class="group">
      <summary><span>Why these jobs? Your IT areas and how they were scored</span></summary>
      <div class="group-body stack" style="gap: 12px">${groupsHtml(g)}${scored}</div>
    </details>`;
  jobs.innerHTML = `
    ${accuracyNote(g)}
    ${replan}
    <section class="card stack" style="gap: 10px" aria-labelledby="top-title">
      <h2 id="top-title">Your top jobs</h2>
      <div id="list" class="stack"></div>
      <button class="btn" type="button" id="more">Show all ${best.length} roles</button>
      <details class="fold"><summary>How the match score works</summary>
      <p class="small">Match score = ${Math.round(res.weights.area * 100)}% fit with the role's IT area + ${Math.round(res.weights.interest * 100)}% interest fit with the role + ${Math.round(res.weights.skill * 100)}% skill fit + ${Math.round(res.weights.trend * 100)}% AI-era trend of the role. The weights are the team's design choice. Roles are ranked by match score, highest first. Roles that need a higher qualification than yours, or a professional licence, are not shown.</p>
      <p class="small">If you pick global goals, a job that supports one of them gets 5 extra points (at most 100 in total). The goals each job supports come from the UN SDG targets in our data, with a reason for each.</p></details>
    </section>
    ${best.length ? `<section class="note row" style="justify-content: space-between">
      <p><strong>Seeing a career advisor?</strong> Take one page with your top jobs, skills to work on and questions to ask.</p>
      <a class="btn primary" href="#/advisor">Make my page</a>
    </section>` : ""}
    ${why}
    ${!demo && testDone() ? moreAreasHtml(state.test.result) : ""}
    <div class="row">
      ${demo ? '<a class="btn primary" href="#/cv">Start with your own answers</a>' : `<a class="btn" href="#/skills">Change my technologies</a>${testDone() ? "" : '<a class="btn" href="#/test">Take the skills test</a>'}`}
      <a class="btn ghost" href="#/trends">How the trend score works</a>
    </div>`;
  jobs.classList.remove("loading");
  document.getElementById("more").onclick = () => { shown = best.length; draw(); };
  wireMoreAreas("#/results");
  draw();
}

async function pageTrends() {
  const [t, status, roles] = await Promise.all([api("/api/trends"), api("/api/trends/update"), cached("/api/roles")]);
  render(`
  <div class="stack">
    <section class="stack" style="gap: 6px">
    <h1>Malaysia’s IT Students: What’s Next?</h1>
    <p class="muted" style="font-size: 14px">Many IT students in Malaysia are unsure which career path suits them, which tech fields will be in demand, and how AI may affect their future jobs. Our platform helps students understand their interests and skills, explore Malaysia’s IT job market trends, and find a career direction that fits them.</p>
    </section>
    <div class="viz-hero">
    <section class="stack" style="gap: 10px">
    <p class="eyebrow">AI-era trend signals</p>
    <h2>MALAYSIA IT STUDENT MARKET INSIGHTS</h2>
    <div class="row"><button class="btn primary" type="button" id="to-start">Find where I fit &darr;</button><button class="btn" type="button" id="update">Update data now</button><span class="small muted" id="upd-status" role="status"></span></div>
    <p class="small muted">Based on recent data, not a forecast.</p>
    </section>
    <div id="trend-jobs" class="viz-hero-chart"></div>
    </div>
    <div id="trend-dash" class="stack"></div>
${startCard()}
    <section class="card stack" style="gap: 8px">
      <h2>What if this data changed?</h2>
      <p class="small">Change an arXiv paper count or the DOSM job ad count, and see the signals, the trend scores and your job ranking move. Only your copy changes.</p>
      <div class="row"><a class="btn primary" href="#/whatif">Change the trend data</a></div>
    </section>
    <details class="card fold-card" id="compare">
      <summary><h2>How is this different from JobStreet, LinkedIn or Coursera?</h2></summary>
      <ul class="stack small" style="gap: 10px; margin: 0; padding-left: 18px">
        <li><strong>Job sites: JobStreet, Hiredly, LinkedIn Jobs</strong><br><span>They list today's job ads and match the keywords on your profile.</span> <span class="muted">They do not say which part of IT suits you, which skills you are missing for a job, or how AI is changing demand.</span></li>
        <li><strong>Government portals: MyFutureJobs, MyMahir, TalentCorp's MyCOL list</strong><br><span>They publish official jobs and labour-market facts.</span> <span class="muted">The facts are the same for everyone: no ranking for you, no reasons and no idea how sure they are.</span></li>
        <li><strong>Course platforms: Coursera, Udemy, edX, LinkedIn Learning</strong><br><span>They offer thousands of courses, many of them paid.</span> <span class="muted">They do not tell you which course closes your biggest gap for a job Malaysia needs.</span></li>
        <li><strong>Yearly reports: LinkedIn Jobs on the Rise, WEF Future of Jobs</strong><br><span>They name growing jobs once a year.</span> <span class="muted">One list for everyone, for the world or a whole country, with no confidence and no update in between.</span></li>
      </ul>
      <p class="small" style="margin-top: 10px">What Future Skills adds: it puts these sources together for one student. Your area fit and skill gaps come from your own test, interests and CV. The trend score is rebuilt from DOSM, MyCOL and arXiv whenever you press “Update data now”, every number shows its source, its confidence and how much your ranking changes across three futures, and the global goals you pick change the order of your jobs. Then it gives you free courses for your biggest gaps.</p>
    </details>
    <p class="small muted"><span>See every record:</span> <a href="#/trends/data/ict">ICT sector background</a> (${t.signals.filter((r) => r.scored !== "TRUE").length}) · <a href="#/trends/data/inputs">All input data with sources</a> (${t.inputs.length})</p>
  </div>`);
  const dash = document.getElementById("trend-dash"), jobs = document.getElementById("trend-jobs");
  jobs.innerHTML = trendHeroChart(t);
  dash.innerHTML = trendDashboard(t, roles);
  wireDashboard(jobs);
  wireDashboard(dash);
  wireStartCard();
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
    else if (location.hash === "#/trends") { delete cache["/api/match"]; delete cache["/api/whatif"]; setTimeout(() => pageTrends().catch(showError), 1500); }
  };
  show(status);
  if (status.status === "running") setTimeout(poll, 2000);
  btn.onclick = async () => {
    btn.disabled = true;
    try {
      show(await api("/api/trends/update", { body: JSON.stringify({ arxiv: true }) }));
      setTimeout(poll, 2000);
    } catch (e) {
      document.getElementById("upd-status").textContent = e.message;
      btn.disabled = false;
    }
  };
}

// Every record behind the Trends page, linked from its foot: the ICT sector signals that are
// context only, and each input value with its source. focus = "ict" or "inputs" scrolls there.
async function pageTrendData(focus) {
  const t = await api("/api/trends");
  const context = t.signals.filter((r) => r.scored !== "TRUE");
  const sigRows = context.map((r) => `
    <tr><td>${esc(r.entity_label)}</td><td>${esc(r.signal.replace(/_/g, " "))}</td><td>${esc(r.direction.replace(/_/g, " "))}</td>
    <td>${esc(r.confidence)}</td><td class="small">${esc(r.detail)}<br><span class="muted">${esc(r.confidence_reason)}</span></td></tr>`).join("");
  const inRows = t.inputs.map((r) => `
    <tr><td>${esc(r.entity_type)} · ${esc(r.entity_id)}</td><td>${esc(r.metric.replace(/_/g, " "))}</td><td class="num">${r.value ? esc(r.value) : `≤ ${esc(r.upper_bound)}`} ${esc(r.unit === "percent" ? "%" : r.unit)}</td>
    <td>${esc(r.period_start)}${r.period_end && r.period_end !== r.period_start ? ` – ${esc(r.period_end)}` : ""}</td>
    <td><a href="${safeUrl(r.source_url)}" rel="noopener" target="_blank">${esc(r.source_name)}</a><br><span class="muted">released ${esc(r.release_date)} · fetched ${esc(r.fetched_date)}</span></td></tr>`).join("");
  render(`
  <div class="stack">
    <p><a href="#/trends">← Back to trends</a></p>
    <section class="card stack" id="data-ict" style="gap: 10px; scroll-margin-top: 80px">
      <h2>ICT sector background (not scored) <span class="muted small">(${context.length})</span></h2>
      <p class="small muted">The whole ICT sector, not only IT roles, so these are context only and do not change any trend score.</p>
      <div class="table-wrap"><table><thead><tr><th>For</th><th>Signal</th><th>Direction</th><th>Confidence</th><th>Detail</th></tr></thead><tbody>${sigRows}</tbody></table></div>
    </section>
    <section class="card stack" id="data-inputs" style="gap: 10px; scroll-margin-top: 80px">
      <h2>All input data with sources <span class="muted small">(${t.inputs.length})</span></h2>
      <p class="small muted">Every value the trend scores are built from. Scores computed ${esc(t.computed_date)}.</p>
      <div class="table-wrap"><table><thead><tr><th>Entity</th><th>Metric</th><th>Value</th><th>Period</th><th>Source</th></tr></thead><tbody>${inRows}</tbody></table></div>
    </section>
  </div>`);
  const target = document.getElementById(`data-${focus}`);
  if (target) target.scrollIntoView();
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
      <button class="btn${going || (state.test && state.test.result) ? "" : " primary"}" type="button" id="begin">${state.test ? "Start a new test" : "Start the test"}</button>
      <a class="btn ghost" href="#/results">Skip to step 4, my jobs</a>
    </div>
  </div>`);
  document.getElementById("begin").onclick = (e) => { e.target.disabled = true; startTest(plan.areas).catch(showError); };
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
  if (q.type === "code" && t.responses[q.id] !== null && (!t.runs[q.id] || t.runs[q.id].code !== (t.code[q.id] ?? q.starter))) {
    button.textContent = "Running your tests…";
    await runCode(q);  // grade the latest code, not an older run
  }
  if (t.questions.filter((x) => x.domain === q.domain && x.stage === "screen").every((x) => x.id in t.responses)) testCoins("island", q.domain);
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
      testCoins("finish", "first");
      chestsClosed = !back;
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
    ${seaMap(t, idx)}
    ${(t.added || []).includes(q.domain) && !(t.added || []).includes((t.questions[idx - 1] || {}).domain) ? `<p class="note">Extra quick check: <strong>${esc(nameList(t.added.filter((a) => !(t.result && (t.result.added || []).includes(a)))))}</strong>. Your earlier answers stay as they are.</p>` : ""}
    ${idx === screenCount(t) && t.deepDomains ? `<p class="note">Your strongest areas so far: <strong>${t.deepDomains.map((d) => esc(domainName(d))).join(" and ")}</strong>. These questions go deeper.</p>` : ""}
    <div class="row"><span class="chip">${esc(domainName(q.domain))}</span><span class="chip plain">${esc(STAGE_LABEL[q.stage])}</span><span class="muted small">about ${Math.max(1, Math.round(q.time_s / 60))} min</span></div>
    <h2 id="q-text" data-no-i18n>${esc(q.prompt)}</h2>
    ${q.code ? `<pre class="code" aria-label="Code or log for this question">${esc(q.code)}</pre>` : ""}
    ${questionBody(q)}
    <div class="sticky-actions row" style="flex-wrap: nowrap">
      <button class="btn dunno" type="button" id="dunno" aria-pressed="${t.responses[q.id] === null}">I don't know yet</button>
      <button class="btn primary" type="button" id="next" style="flex: 1">${idx + 1 === total ? "See my result" : lastScreen ? "Continue to in-depth questions" : "Next"}</button>
    </div>
  </div>`);
  seaSail(app.querySelector(".sea"));
  wireAnswer(q);
  const next = document.getElementById("next");
  next.onclick = () => nextFromItem(idx, next);
  // Counts as a wrong answer (the server scores an empty answer 0), without a guess.
  document.getElementById("dunno").onclick = () => {
    t.responses[q.id] = null;
    saveState();
    nextFromItem(idx, next);
  };
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
let chestsClosed = false;  // right after the last question the chests open in front of the student

// One chest per area tested in depth (gold, silver or wood by level); quick-check-only areas get a flag.
function treasureHtml(r) {
  const tested = r.domains.filter((d) => d.tested !== false);
  const cell = (d) => (d.tested_in_depth
    ? `<div class="chest-cell">${chestSVG(chestTier(d.level), chestsClosed)}<strong>${esc(d.name)}</strong><span class="chip${d.level.min >= 75 ? "" : d.level.min >= 50 ? " plain" : " warn-chip"}">${esc(d.level.label)}</span></div>`
    : `<div class="chest-cell scouted"><span class="flag-ico" aria-hidden="true">🚩</span><strong>${esc(d.name)}</strong><span class="muted small">Quick check only</span></div>`);
  return `<section class="card stack treasure" style="gap: 10px">
    <h2>Your treasure</h2>
    <div class="chests">${tested.sort((a, b) => b.tested_in_depth - a.tested_in_depth).map(cell).join("")}</div>
    <p class="muted small">Gold chest: job-ready. Silver: developing. Wood: build the basics first.</p>
  </section>`;
}

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
  const dunno = (i) => state.test.responses[i.id] === null;  // "I don't know yet"
  const review = r.items.map((i, n) => `
    <details class="more card review">
      <summary><span class="${i.correct ? "pass" : "fail"}">${i.correct ? "Right" : i.points > 0 ? "Partly right" : dunno(i) ? "Not learned yet" : "Wrong"}</span>&nbsp;· Q${n + 1} · ${esc(i.skill)} <span class="muted small">&nbsp;${i.points} / ${i.max}</span></summary>
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
    ${treasureHtml(r)}
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
  chestsClosed = false;
  document.getElementById("share").onclick = (e) => shareResult(e.target);
  wireMoreAreas("#/test/result");
  document.getElementById("share-url").onfocus = (e) => e.target.select();
}

/* ---------- learning path page ---------- */

const FORMAT_LABEL = { video: "▶ YouTube video", playlist: "▶ YouTube playlist", course: "Free course" };

// A tick box for one item on a learning path. The same course ticked on one path counts on
// every path that lists it, so items are keyed by URL (certifications by their id).
// Videos and playlists only count as done after a short quiz on their topic (play.js).
function doneBox(key, title, format = "") {
  const quiz = VIDEO_FORMATS.includes(format);
  return `<label class="done-box" title="${quiz ? `Tick when you have finished it, then pass a ${VIDEO_QUIZ_SIZE}-question check` : "Tick when you have finished it"}">
    <input type="checkbox" data-done="${esc(key)}"${quiz ? ` data-quiz="${esc(title)}"` : ""}${progress.done[key] ? " checked" : ""}>
    <span class="visually-hidden">Finished: ${esc(title)}</span><span aria-hidden="true">Done</span>
  </label>`;
}

const resourceFacts = (r) => [esc(r.provider), r.hours ? `${fmt(r.hours)} h` : "self-paced", r.cost_myr ? `RM ${fmt(r.cost_myr, 0)}` : "", r.level ? esc(r.level) : ""].filter(Boolean).join(" · ");
function resourceHtml(r) {
  return `<li class="res${progress.done[r.url] ? " is-done" : ""}">
    <div class="res-top"><span class="chip plain res-kind">${FORMAT_LABEL[r.format] || esc(r.format)}</span>${doneBox(r.url, r.title, r.format)}</div>
    <a href="${safeUrl(r.url)}" target="_blank" rel="noopener">${esc(r.title)}</a>
    <span class="muted small">${resourceFacts(r)}</span>
  </li>`;
}

// The UN's official icon for each of the 17 Sustainable Development Goals (src/static/sdg/).
const sdgTile = (goal, name) => `<img class="sdg-tile" src="/static/sdg/${encodeURIComponent(goal)}.webp" width="64" height="64" loading="lazy" alt="SDG ${esc(goal)}: ${esc(name)}">`;

/* ---------- learning progress ---------- */

// { done: {itemKey: "YYYY-MM-DD"}, paths: {roleId: {name, area, personal, items: {itemKey: hours|null}, titles: {itemKey: title},
//   updated, start, missed: [Monday "YYYY-MM-DD"]}}, quizzes: {videoUrl: {score, total, date}} (the video's quiz was passed),
//   learner: random id for the SDG tally, calendar: {day: 0-6 from Monday, time: "HH:MM"} }
// A path is tracked from the first item ticked on it; its item list is refreshed on every visit.
const PROGRESS_KEY = "future-skills-progress-v1";
let progress = loadProgress();

function loadProgress() {
  const saved = readSaved(PROGRESS_KEY) || {};
  return { done: saved.done || {}, paths: saved.paths || {}, quizzes: saved.quizzes || {}, learner: saved.learner || null, calendar: saved.calendar || null };
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
  render(`<div class="card stack" role="status" style="gap: 10px">
      <div class="row" style="gap: 12px"><span class="spinner" aria-hidden="true"></span><strong>Building your learning path…</strong></div>
      <div class="wait-bar" aria-hidden="true"><div></div></div>
    </div>`);
  const p = await learnData(roleId);
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
      <a class="small" href="#/impact">What every student's hours add up to →</a>
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
  // meta: what My learning's level map shows for each item (title, kind and link), in path order.
  const items = {}, titles = {}, meta = {};
  for (const r of [...p.stages.flatMap((st) => st.resources), ...p.skills.flatMap((k) => k.resources)]) {
    items[r.url] = r.hours || null; titles[r.url] = r.title;
    meta[r.url] = { title: r.title, kind: r.format, url: r.url };
  }
  for (const x of p.projects) { items[`project:${x.id}`] = null; titles[`project:${x.id}`] = x.title; meta[`project:${x.id}`] = { title: x.title, kind: "project", url: x.guide.url }; }
  for (const c of p.certifications) { items[`cert:${c.cert_id}`] = null; titles[`cert:${c.cert_id}`] = c.cert_name; meta[`cert:${c.cert_id}`] = { title: c.cert_name, kind: "certification", url: c.url }; }
  // start and missed weeks are kept across visits: the study plan (dates, re-planning) is built on them
  const track = () => {
    const was = progress.paths[roleId] || {};
    progress.paths[roleId] = { name: p.role.name, area: p.role.area_name, personal: p.personal, items, titles, meta, updated: today(),
      start: was.start || ymd(new Date()), missed: was.missed || [] };
  };
  if (progress.paths[roleId]) { track(); saveProgress(); reportPath(roleId); }
  const planNow = () => (progress.paths[roleId] ? planHtml(roleId) : calendarHtml(roleId));
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
      <div id="learn-plan">${planNow()}</div>
      <p class="small muted">Videos count once you pass a ${VIDEO_QUIZ_SIZE}-question check. Every right answer earns 🪙 coins. <a href="#/progress">See your level map &rarr;</a></p>
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
      if (box.checked && box.dataset.quiz !== undefined && !progress.quizzes[key]) {  // a video: done once its quiz is passed
        box.checked = false;
        videoQuiz(key, box.dataset.quiz, (result) => {
          progress.quizzes[key] = { score: result.score, total: result.total, date: today() };
          box.checked = true;
          box.onchange();
        });
        return;
      }
      if (box.checked) progress.done[key] = today(); else delete progress.done[key];
      track();
      saveProgress();
      reportPath(roleId);
      // the same item can appear twice on a page (a foundation course that also teaches a skill)
      app.querySelectorAll(`[data-done="${CSS.escape(key)}"]`).forEach((b) => {
        b.checked = box.checked;
        b.closest(".res").classList.toggle("is-done", box.checked);
      });
      document.getElementById("learn-progress").innerHTML = progressHtml(pathStats(items), p.hours_per_week);
      document.getElementById("learn-plan").innerHTML = planNow();
    };
  });
  // Before the first tick the path is not tracked yet: the calendar still works from this page's items.
  learnPreview = { id: roleId, name: p.role.name, items, titles };
  const planBox = document.getElementById("learn-plan");
  wirePlan(planBox, () => { planBox.innerHTML = planNow(); });
}

/* ---------- study plan: finish date, missed weeks, re-planning and calendar ---------- */

// A path's plan: its hours at the student's hours a week, from the day it was first tracked.
// "I didn't study this week" moves the plan one week on; the finish date is worked out again from
// the hours left on every visit, so falling behind (or getting ahead) shows without asking.
const DAY_MS = 86400000;
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fromYmd = (s) => { const [y, m, d] = String(s).split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const midnight = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const weekOf = (d = new Date()) => ymd(addDays(midnight(d), -((d.getDay() + 6) % 7)));  // that week's Monday
const dateText = (d) => d.toLocaleDateString(LANG === "zh" ? "zh-CN" : LANG === "ms" ? "ms-MY" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
const hoursPerWeek = () => Math.max(1, Number(state.hoursPerWeek) || 5);
let learnPreview = null;  // the learning path on screen, for its calendar before anything is ticked

function studyPlan(p, hpw = hoursPerWeek()) {
  const st = pathStats(p.items);
  const now = midnight();
  // paths tracked before plans existed start on their first tick
  const ticked = Object.keys(p.items || {}).map((k) => progress.done[k]).filter(Boolean).sort()[0];
  const start = p.start ? fromYmd(p.start) : ticked ? fromYmd(ticked) : now;
  const missed = p.missed || [];
  // whole weeks from Monday: the plan ends on the Sunday of its last week
  const due = addDays(fromYmd(weekOf(start)), Math.max(1, Math.ceil(st.hoursTotal / hpw)) * 7);
  const left = Math.max(0, st.hoursTotal - st.hoursDone);
  const skipNow = missed.includes(weekOf());
  const from = addDays(fromYmd(weekOf()), skipNow ? 7 : 0);
  const finish = addDays(from, Math.ceil(left / hpw) * 7);
  const late = Math.round((finish - due) / (7 * DAY_MS));
  const weeksToDue = Math.floor((due - from) / (7 * DAY_MS));
  // the hours a week that would still keep the first finish date, when that is within reach
  const keepDue = late > 0 && weeksToDue >= 1 ? Math.ceil((left / weeksToDue) * 2) / 2 : null;
  const keys = Object.keys(p.items || {}).filter((k) => !progress.done[k]);
  const next = keys.find((k) => p.items[k]) || keys[0] || null;
  return { st, start, due: addDays(due, -1), finish: addDays(finish, -1), from: from < now ? now : from, left, late, missed, skipNow,
    keepDue: keepDue && keepDue <= 40 ? keepDue : null, next };
}

function planHtml(roleId) {
  const p = progress.paths[roleId];
  const hpw = hoursPerWeek();
  const plan = studyPlan(p, hpw);
  if (!plan.left) return `<p class="small muted plan-line">All the hours on this path are done.</p>${calendarHtml(roleId)}`;
  const nextTitle = plan.next ? (p.titles && p.titles[plan.next]) || "the next item on your path" : "";
  const nextLink = plan.next && /^https?:/.test(plan.next) ? `<a href="${safeUrl(plan.next)}" target="_blank" rel="noopener">${esc(nextTitle)}</a>` : `<strong>${esc(nextTitle)}</strong>`;
  const status = plan.late > 0
    ? `<p class="plan-line plan-behind"><strong>${plan.late === 1 ? "1 week behind" : `${plan.late} weeks behind`}</strong> · <span>New finish date:</span> <strong data-no-i18n>${esc(dateText(plan.finish))}</strong> <span class="muted">(<span>planned</span> <span data-no-i18n>${esc(dateText(plan.due))}</span>)</span></p>`
    : `<p class="plan-line plan-ok"><strong>${plan.late < 0 ? "Ahead of plan" : "On track"}</strong> · <span>Finish by</span> <strong data-no-i18n>${esc(dateText(plan.finish))}</strong></p>`;
  return `<div class="plan stack" style="gap: 6px" aria-live="polite">
    ${status}
    ${plan.late > 0 && plan.next ? `<p class="small"><span>Catch up first:</span> ${nextLink}${p.items[plan.next] ? ` <span class="muted">(${fmt(p.items[plan.next])} h)</span>` : ""}</p>` : plan.next ? `<p class="small"><span>Next up:</span> ${nextLink}</p>` : ""}
    ${plan.keepDue ? `<p class="small muted"><span>Or keep the planned date: study</span> <strong>${fmt(plan.keepDue)} h</strong> <span>a week instead of</span> ${fmt(hpw)} h.</p>` : ""}
    ${plan.missed.length ? `<p class="small muted"><span>Weeks without study:</span> ${plan.missed.length}</p>` : ""}
    <div class="row" style="gap: 6px">
      ${plan.skipNow
        ? `<button class="btn ghost" type="button" data-missed="${esc(roleId)}" data-undo>Undo: I did study this week</button>`
        : `<button class="btn ghost" type="button" data-missed="${esc(roleId)}">I didn't study this week</button>`}
    </div>
    ${calendarHtml(roleId)}
  </div>`;
}

// Calendar: one study session a week, on the day and time the student picks, until the plan's finish.
const CAL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const calPick = () => ({ day: 5, time: "10:00", ...(progress.calendar || {}) });  // Saturday 10:00

function calendarPath(roleId) {
  return progress.paths[roleId] || (learnPreview && learnPreview.id === roleId ? { ...learnPreview, start: ymd(new Date()) } : null);
}

function calendarWeeks(p, hpw) {
  // Unfinished items with hours fill each week up to the student's hours; a long one runs on.
  const weeks = [];
  let week = [], room = hpw;
  for (const k of Object.keys(p.items).filter((x) => !progress.done[x] && p.items[x])) {
    let need = p.items[k];
    while (need > 0.01) {
      const take = Math.min(need, room);
      week.push({ key: k, title: (p.titles && p.titles[k]) || k, hours: take, more: need - take > 0.01 });
      need -= take; room -= take;
      if (room <= 0.01) { weeks.push(week); week = []; room = hpw; }
    }
  }
  if (week.length) weeks.push(week);
  const rest = Object.keys(p.items).filter((x) => !progress.done[x] && !p.items[x]);
  const title = (k) => (p.titles && p.titles[k]) || k;
  return { weeks, selfPaced: rest.filter((k) => /^https?:/.test(k)).map(title), projects: rest.filter((k) => !/^https?:/.test(k)).map(title) };
}

function calendarFirst(plan) {
  const { day, time } = calPick();
  const [hh, mm] = time.split(":").map(Number);
  const d = new Date(plan.from);
  while ((d.getDay() + 6) % 7 !== day) d.setDate(d.getDate() + 1);
  d.setHours(hh || 0, mm || 0, 0, 0);
  if (d < new Date()) d.setDate(d.getDate() + 7);
  return d;
}

const icsStamp = (d) => `${ymd(d).replace(/-/g, "")}T${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}00`;
const icsText = (s) => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
// Lines longer than 75 bytes (UTF-8) go on over several lines, each after the first starting with a space.
function icsFold(line) {
  const out = [];
  let cur = "", bytes = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (bytes + n > 73) { out.push(cur); cur = " "; bytes = 1; }
    cur += ch; bytes += n;
  }
  out.push(cur);
  return out.join("\r\n");
}

function calendarEvents(roleId) {
  const p = calendarPath(roleId);
  const hpw = hoursPerWeek();
  const plan = studyPlan(p, hpw);
  const { weeks, selfPaced, projects } = calendarWeeks(p, hpw);
  const first = calendarFirst(plan);
  const sessionHours = Math.min(hpw, 8);
  return weeks.map((w, i) => {
    const start = addDays(first, i * 7);
    const last = i === weeks.length - 1;
    const lines = w.map((x) => `- ${x.title} (${fmt(x.hours)} h${x.more ? ", continues next week" : ""})${/^https?:/.test(x.key) ? `\n  ${x.key}` : ""}`);
    if (i === 0 && selfPaced.length) lines.push("", "Self-paced, whenever you have time:", ...selfPaced.map((t) => `- ${t}`));
    if (last && projects.length) lines.push("", "Then build and prove it:", ...projects.map((t) => `- ${t}`));
    return { start, end: new Date(start.getTime() + sessionHours * 3600000),
      title: `Study: ${p.name} (week ${i + 1} of ${weeks.length})`,
      details: `Future Skills learning path, ${fmt(hpw)} h this week.\n\n${lines.join("\n")}` };
  });
}

function downloadIcs(roleId) {
  const p = calendarPath(roleId);
  const events = calendarEvents(roleId);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Future Skills//Learning path//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    ...events.flatMap((e, i) => ["BEGIN:VEVENT", `UID:${roleId}-${icsStamp(e.start)}-${i}@future-skills`, `DTSTAMP:${stamp}`,
      `DTSTART:${icsStamp(e.start)}`, `DTEND:${icsStamp(e.end)}`, `SUMMARY:${icsText(e.title)}`, `DESCRIPTION:${icsText(e.details)}`,
      "BEGIN:VALARM", "ACTION:DISPLAY", "TRIGGER:-PT30M", `DESCRIPTION:${icsText(e.title)}`, "END:VALARM", "END:VEVENT"]),
    "END:VCALENDAR"];
  const blob = new Blob([lines.map(icsFold).join("\r\n") + "\r\n"], { type: "text/calendar;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `future-skills-${String(p.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.ics`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

// Google Calendar takes one event by link: the weekly session, repeated for the plan's weeks.
function googleCalendarUrl(roleId) {
  const events = calendarEvents(roleId);
  if (!events.length) return "";
  const p = calendarPath(roleId), e = events[0];
  const q = new URLSearchParams({ action: "TEMPLATE", text: `Study: ${p.name}`, dates: `${icsStamp(e.start)}/${icsStamp(e.end)}`,
    details: `Future Skills learning path: ${fmt(hoursPerWeek())} h a week for ${events.length} weeks.\n${location.origin}/#/learn/${encodeURIComponent(roleId)}`,
    recur: `RRULE:FREQ=WEEKLY;COUNT=${events.length}` });
  return `https://calendar.google.com/calendar/render?${q}`;
}

function calendarHtml(roleId) {
  const p = calendarPath(roleId);
  if (!p) return "";
  const events = calendarEvents(roleId);
  if (!events.length) return "";
  const pick = calPick();
  return `<details class="fold plan-cal">
    <summary><span>Add my study plan to my calendar</span> <span class="muted">(${events.length} ${events.length === 1 ? "session" : "sessions"})</span></summary>
    <div class="stack" style="gap: 8px; margin-top: 8px">
      <div class="row" style="gap: 8px">
        <label class="stack small" style="gap: 2px"><span class="muted">Day</span>
          <select data-cal-day>${CAL_DAYS.map((d, i) => `<option value="${i}"${i === pick.day ? " selected" : ""}>${d}</option>`).join("")}</select></label>
        <label class="stack small" style="gap: 2px"><span class="muted">Start time</span>
          <input type="time" data-cal-time value="${esc(pick.time)}"></label>
      </div>
      <p class="small muted"><span>A weekly session of</span> ${fmt(Math.min(hoursPerWeek(), 8))} h, <span>first on</span> <span data-no-i18n>${esc(dateText(events[0].start))}</span>, <span>last on</span> <span data-no-i18n>${esc(dateText(events[events.length - 1].start))}</span>. <span>Each one lists what to study that week, with links.</span></p>
      <div class="row" style="gap: 6px">
        <a class="btn" href="${esc(googleCalendarUrl(roleId))}" target="_blank" rel="noopener">Google Calendar ↗</a>
        <button class="btn" type="button" data-ics="${esc(roleId)}">Download .ics (Outlook, Apple)</button>
      </div>
    </div>
  </details>`;
}

// Missed-week buttons and calendar choices inside a plan box; redraw() draws the box again.
function wirePlan(root, redraw) {
  if (!root) return;
  root.addEventListener("click", (ev) => {
    const missed = ev.target.closest("[data-missed]");
    const ics = ev.target.closest("[data-ics]");
    if (missed) {
      const p = progress.paths[missed.dataset.missed];
      const wk = weekOf();
      p.missed = (p.missed || []).filter((w) => w !== wk);
      if (missed.dataset.undo === undefined) p.missed.push(wk);
      saveProgress();
      redraw();
    } else if (ics) downloadIcs(ics.dataset.ics);
  });
  root.addEventListener("change", (ev) => {
    if (!ev.target.matches("[data-cal-day], [data-cal-time]")) return;
    const box = ev.target.closest(".plan-cal");
    progress.calendar = { day: Number(box.querySelector("[data-cal-day]").value), time: box.querySelector("[data-cal-time]").value || "10:00" };
    saveProgress();
    redraw();
    root.querySelectorAll(".plan-cal").forEach((d) => { d.open = true; });
  });
}

/* ---------- SDG contribution, added up over every student ---------- */

// A random id made in this browser: no name or email, only so the server counts each path once.
function learnerId() {
  if (!progress.learner) {
    progress.learner = window.crypto && crypto.randomUUID ? crypto.randomUUID()
      : `fs-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    saveProgress();
  }
  return progress.learner;
}
function reportPath(roleId) {
  const p = progress.paths[roleId];
  if (!p) return;
  const st = pathStats(p.items);
  fetch("/api/sdg/record", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ learner: learnerId(), role_id: roleId, hours_planned: Math.round(st.hoursTotal * 10) / 10,
      hours_done: Math.round(st.hoursDone * 10) / 10, items_done: st.done }) }).catch(() => { /* offline: sent on the next tick */ });
}

async function pageImpact() {
  const s = await api("/api/sdg/summary");
  const mine = trackedPaths().reduce((t, p) => t + p.hoursDone, 0);
  const tile = (t) => `<article class="card stack impact-tile" style="gap: 8px">
      <div class="row" style="gap: 10px; flex-wrap: nowrap">${sdgTile(t.goal, t.goal_name)}<div class="stack" style="gap: 2px"><strong>SDG ${esc(t.target)}</strong><span class="small muted">${esc(t.goal_name)}</span></div></div>
      <p class="impact-num"><strong>${t.students}</strong> <span>${t.students === 1 ? "student" : "students"}</span></p>
      <p class="small"><strong>${fmt(t.hours_done)} h</strong> <span>studied</span> <span class="muted">· ${fmt(t.hours_planned, 0)} h <span>planned</span></span></p>
      <p class="small muted">${esc(t.why)}</p>
    </article>`;
  render(`
  <div class="stack">
    <div class="stack" style="gap: 8px">
      <p class="eyebrow">SDG contribution</p>
      <h1>What every student here adds up to</h1>
      <p class="lead">Every learning path counts towards SDG 4.3, 4.4 and 8.5, and towards the goals of its job. These are the students following one, and the hours they have ticked off.</p>
    </div>
    <div class="impact-grid">${s.headline.map(tile).join("")}</div>
    <section class="card impact-totals">
      <div><strong>${s.students}</strong><span class="small muted">students with a learning path</span></div>
      <div><strong>${s.students_studying}</strong><span class="small muted">have finished at least one course</span></div>
      <div><strong>${fmt(s.hours_done)} h</strong><span class="small muted">studied, of ${fmt(s.hours_planned, 0)} h planned</span></div>
      <div><strong>${fmt(mine)} h</strong><span class="small muted">of them are yours</span></div>
    </section>
    ${s.targets.length ? `<section class="card stack" style="gap: 8px" aria-labelledby="impact-all">
      <h2 id="impact-all">Every SDG target the paths count towards</h2>
      <div class="table-wrap"><table class="impact-table">
        <thead><tr><th scope="col">Target</th><th scope="col">Goal</th><th scope="col">Students</th><th scope="col">Hours studied</th><th scope="col">Hours planned</th></tr></thead>
        <tbody>${s.targets.map((t) => `<tr><th scope="row">${esc(t.target)}</th><td>${esc(t.goal_name)}</td><td>${t.students}</td><td>${fmt(t.hours_done)}</td><td>${fmt(t.hours_planned, 0)}</td></tr>`).join("")}</tbody>
      </table></div>
    </section>` : ""}
    ${s.roles.length ? `<section class="card stack" style="gap: 8px" aria-labelledby="impact-roles">
      <h2 id="impact-roles">Jobs students are learning towards</h2>
      <div class="table-wrap"><table class="impact-table">
        <thead><tr><th scope="col">Job</th><th scope="col">Students</th><th scope="col">Hours studied</th></tr></thead>
        <tbody>${s.roles.map((r) => `<tr><th scope="row"><a href="#/learn/${encodeURIComponent(r.role_id)}">${esc(r.name)}</a></th><td>${r.students}</td><td>${fmt(r.hours_done)}</td></tr>`).join("")}</tbody>
      </table></div>
    </section>` : `<p class="note">No one has ticked a course yet. Open a learning path and tick what you finish: your hours count here.</p>`}
    <details class="card fold-card">
      <summary><h2>How this is counted</h2></summary>
      <p class="small">${esc(s.method)}</p>
      <p class="small muted">${s.since ? `<span>Counting since</span> <span data-no-i18n>${esc(s.since)}</span>. ` : ""}<span>Raw numbers:</span> <a href="/api/sdg/summary" target="_blank" rel="noopener">/api/sdg/summary</a></p>
    </details>
    <div class="row"><a class="btn primary" href="#/progress">My learning</a><a class="btn" href="#/results">My jobs</a></div>
  </div>`);
}

/* ---------- my learning page: the level map, study plan, daily challenge and shop are in play.js ---------- */

/* ---------- router ---------- */

async function route() {
  const parts = location.hash.replace(/^#\/?/, "").split("/");
  const page = parts[0] || "trends";  // the Trends page is the landing page
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
    else if (page === "trends" && parts[1] === "data") await pageTrendData(parts[2]);
    else if (page === "trends") await pageTrends();
    else if (page === "whatif") await pageWhatIf();
    else if (page === "learn" && parts[1]) await pageLearn(decodeURIComponent(parts[1]));
    else if (page === "progress") await pageMyLearning();
    else if (page === "advisor") await pageAdvisor();
    else if (page === "impact") await pageImpact();
    else await pageTrends();
  } catch (e) {
    showError(e);
  }
  app.focus({ preventScroll: true });
}
window.addEventListener("hashchange", route);

/* Lite mode, for students on mobile data: no background animation, photos or line chart (fx.js
   and dashboard.js skip them), no paths loaded ahead. The bar shows what this visit has
   weighs, measured by the browser (Resource Timing), next to the same figure without Lite. */
const LITE_KEY = "future-skills-lite";
const LITE_FULL_KEY = "future-skills-full-bytes";
const isLite = () => Boolean(document.documentElement.dataset.lite);
// What the page weighs (compressed bytes), cached or not: a file the browser already had (304)
// reports no body, so the size it had when it last came down is kept and counted.
const LITE_SIZES_KEY = "future-skills-file-bytes";
function pageBytes() {
  const known = readSaved(LITE_SIZES_KEY) || {};
  const entries = [...performance.getEntriesByType("navigation"), ...performance.getEntriesByType("resource")];
  const total = entries.reduce((t, e) => {
    if (e.encodedBodySize) known[e.name] = e.encodedBodySize;
    return t + (e.encodedBodySize || known[e.name] || e.transferSize || 0);
  }, 0);
  writeSaved(LITE_SIZES_KEY, known);
  return total;
}
const sizeText = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
function showLite() {
  const btn = document.getElementById("lite"), bar = document.getElementById("lite-bar");
  if (!btn || !bar) return;
  btn.setAttribute("aria-pressed", String(isLite()));
  const now = pageBytes();
  if (!isLite()) {
    bar.hidden = true;
    btn.title = `Lite mode: no photos, animation or charts. Page size now: ${sizeText(now)}`;
    return;
  }
  const full = Number(readSaved(LITE_FULL_KEY)) || 0;
  bar.hidden = false;
  bar.innerHTML = `<span><strong>Lite mode</strong> · <span>page size:</span> <strong data-no-i18n>${full > now ? `${sizeText(full)} → ${sizeText(now)}` : sizeText(now)}</strong></span>
    <span class="muted">Photos, animation and charts off.</span>
    <button class="btn ghost" type="button" id="lite-off">Turn off</button>`;
  document.getElementById("lite-off").onclick = () => setLite(false);
}
function setLite(on) {
  if (on) writeSaved(LITE_FULL_KEY, pageBytes());  // what the full page cost, to compare with
  try { if (on) localStorage.setItem(LITE_KEY, "1"); else localStorage.removeItem(LITE_KEY); } catch (e) { /* storage off */ }
  location.reload();  // start again without the photos and the animation
}
document.getElementById("lite")?.addEventListener("click", () => setLite(!isLite()));
// keep the figure current as the page loads more (images, a learning path)
window.addEventListener("load", showLite);
window.addEventListener("hashchange", () => setTimeout(showLite, 1500));
showLite();

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
