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
  cloud_infra: "Cloud, Infrastructure & Networking", web_ux: "Web & Interface Design", it_mgmt: "IT Management & Analysis" };
const SUBFIELD_AREA = { SE: "software_dev", DA: "data_ai", CS: "cybersecurity", CI: "cloud_infra", WD: "web_ux", IM: "it_mgmt" };
const RATING = ["None", "Basic", "Some", "Good", "Strong", "Expert"];
const ZONES = { 3: "Diploma", 4: "Bachelor's degree", 5: "Master's degree or higher" };
const FLAGS = {
  needs_extra_education: "Needs further study",
  needs_extra_qualification: "Needs extra qualification",
  not_for_it_graduates: "Licensed profession, reference only",
  no_trend_data: "No trend data (neutral 50)",
};
const QUIET_FLAGS = ["area_not_scored", "interest_not_scored"];  // explained once at the top of the page
const PART_LABEL = { area: "IT area fit", interest: "Interest fit", skill: "Skill fit", trend: "AI-era trend" };
const PART_NAMES = { my_demand: "Malaysian demand", ai_momentum: "AI momentum" };
const STORE_KEY = "future-skills-v1";
// The 51 O*NET skills and knowledge areas, grouped so a student rates 21 groups instead.
// A group's rating is copied to every O*NET skill in it, so matching still runs per skill.
const SKILL_GROUPS = {
  general: [
    ["Communication", "Reading, writing, listening and speaking", ["SK001", "SK002", "SK003", "SK004"]],
    ["Maths and science", "Using maths and scientific methods to solve problems", ["SK005", "SK006"]],
    ["Problem solving", "Critical thinking, complex problems, judgement and decisions", ["SK007", "SK017", "SK027"]],
    ["Learning and teaching", "Picking up new things fast and teaching others", ["SK008", "SK009", "SK015"]],
    ["Working with people", "Reading people, coordinating with others, helping customers", ["SK011", "SK012", "SK016"]],
    ["Persuading and negotiating", "Changing minds and reaching agreements", ["SK013", "SK014"]],
    ["Programming and design", "Writing code, designing technology, working out what users need", ["SK018", "SK019", "SK020"]],
    ["Systems and quality", "Analysing and evaluating systems, monitoring performance, testing quality", ["SK010", "SK026", "SK028", "SK029"]],
    ["Running and watching systems", "Operating systems and watching how they perform", ["SK021", "SK022"]],
    ["Troubleshooting and repair", "Finding faults, maintaining and fixing equipment", ["SK023", "SK024", "SK025"]],
    ["Managing time, money and people", "Planning time, budgets, materials and staff", ["SK030", "SK031", "SK032", "SK033"]],
  ],
  domain_knowledge: [
    ["Business and management", "Running organisations, office administration, HR", ["SK034", "SK035", "SK039"]],
    ["Finance and economics", "Accounting, banking, economics", ["SK036"]],
    ["Sales and customer service", "Marketing, selling, serving customers", ["SK037", "SK038"]],
    ["Computers and telecoms", "Hardware, software, networks, telecommunications", ["SK040", "SK050"]],
    ["Engineering and mechanics", "Engineering, technology and machines", ["SK041", "SK043"]],
    ["Mathematics", "Maths knowledge: algebra, statistics, calculus", ["SK044"]],
    ["Psychology", "How people think, learn and behave", ["SK045"]],
    ["Education and training", "Teaching and designing training", ["SK046"]],
    ["Language, media and design", "English, media and design", ["SK042", "SK047", "SK051"]],
    ["Law and public safety", "Law, government, security", ["SK048", "SK049"]],
  ],
};
// Older saved answers rated single skills; show the group at its highest member rating.
const groupRating = (ids) => Math.max(0, ...ids.map((id) => state.ratings[id] || 0));


const app = document.getElementById("app");
const cache = {};
const QUIZ_ITEMS = 36;
let state = loadState();

function loadState() {
  const base = { answers: Array(QUIZ_ITEMS).fill(null), quizSkipped: false, cvSkipped: false, ratings: {}, techs: [], zone: 4, demo: null, cvAreas: null,
    scenario: "baseline", hoursPerWeek: 5 };
  try {
    const saved = Object.assign(base, JSON.parse(sessionStorage.getItem(STORE_KEY) || "{}"));
    if (saved.answers.length !== QUIZ_ITEMS) saved.answers = Array(QUIZ_ITEMS).fill(null);  // older 30-item questionnaire
    return saved;
  } catch (e) {
    return base;
  }
}
function saveState() {
  try { sessionStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* storage off: keep in memory */ }
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

function pageHome() {
  render(`
  <div class="stack">
    <p class="eyebrow">Future-ready careers for IT students</p>
    <h1>Find the part of IT that suits you, and the job to aim for.</h1>
    <p class="muted">Future Skills combines your CV, an interest questionnaire and a short IT skills test to show which of 6 IT areas fits you best, then ranks 26 IT roles, explains every score, shows the skills you still need, and links each role to the UN Sustainable Development Goals.</p>
    <div class="steps">
      <div class="card"><h3>Your CV</h3><p class="muted small">Optional. Upload it, or rate your skills instead. About 1 minute.</p></div>
      <div class="card"><h3>Your interests</h3><p class="muted small">36 quick statements about IT work you would enjoy. About 8 minutes.</p></div>
      <div class="card"><h3>Skills test</h3><p class="muted small">Only the 3 to 6 IT areas your CV and interests point to, with code you run in the browser.</p></div>
      <div class="card"><h3>Your jobs</h3><p class="muted small">Grouped by what you enjoy and what you can do: ranked roles, the skills you still need and free courses.</p></div>
    </div>
    <p class="muted small">Every step is optional and you can go back any time; the more you do, the better the result.</p>
    <p class="muted small lang-note">Test questions, O*NET skill names, course titles and AI-written text stay in English, as in most IT workplaces.</p>
    <div class="row">
      <a class="btn primary" href="${(JOURNEY.find((st) => !st.done() && !skipped(st)) || JOURNEY[3]).href}">${JOURNEY.some((st) => st.done() || skipped(st)) ? "Continue where I left off" : "Start: step 1, your CV"}</a>
      <button class="btn" type="button" id="demo">Try the demo student (fictional)</button>
      <a class="btn ghost" href="#/trends">See the AI-trend data</a>
    </div>
  </div>`);
  document.getElementById("demo").onclick = () => { state.demo = "P01"; saveState(); location.hash = "#/results"; };
}

async function pageQuizIntro() {
  render(`
  <div class="quiz stack">
    ${stepBar("quiz")}
    <p class="eyebrow">Step 2 of 4 · Interests</p>
    <h1>What kind of work do you actually enjoy?</h1>
    <div class="row"><span class="chip">36 items</span><span class="chip">About 8 minutes</span><span class="chip">Skip any time</span></div>
    <div class="card stack">
      <div><h3>Why</h3><p class="muted">Finds the kind of IT work you enjoy most: building, analysing, designing, helping, leading or organising, and which of the 6 IT areas it points to.</p></div>
      <div><h3>How it is used</h3><p class="muted">Your top 3 interest areas are always in your skills test, so the test checks what you care about. In your results, interest and skill together decide which areas' jobs come first.</p></div>
      <div><h3>Your data</h3><p class="muted">Answers stay in this browser tab and are only used to compute your matches.</p></div>
    </div>
    <p class="muted small">Each item starts with "I would enjoy...". Say how much you agree, based on what you would enjoy, not what you are already good at.</p>
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

async function pageSkills() {
  const skills = await cached("/api/skills");
  const groups = [
    ["general", "General skills", "Skills used in most jobs, rated by O*NET for each role. Similar skills are grouped together."],
    ["domain_knowledge", "Knowledge areas", "Subjects you have studied or worked with."],
  ];
  const known = new Set(skills.map((s) => s.skill_id));
  const allGroups = Object.values(SKILL_GROUPS).flat();
  const rated = () => allGroups.filter(([, , ids]) => groupRating(ids) > 0).length;
  const groupHtml = groups.map(([type, title, hint], gi) => {
    const rows = SKILL_GROUPS[type].map(([name, covers, ids]) => [name, covers, ids.filter((id) => known.has(id))])
      .filter(([, , ids]) => ids.length).map(([name, covers, ids]) => `
      <div class="skill-row">
        <span class="skill-name">${esc(name)}<span class="muted small">${esc(covers)}</span></span>
        <span class="rating" role="group" aria-label="${esc(name)} level">
          ${RATING.map((label, v) => `<button type="button" data-skills="${ids.join(" ")}" data-v="${v}" aria-pressed="${groupRating(ids) === v}" title="${label}" aria-label="${label}">${v === 0 ? "–" : v}</button>`).join("")}
        </span>
      </div>`).join("");
    return `<details class="group"${gi === 0 ? " open" : ""}><summary><span>${title} <span class="muted small">(${SKILL_GROUPS[type].length})</span></span></summary>
      <div class="group-body"><p class="muted small">${hint}</p>${rows}</div></details>`;
  }).join("");
  const techs = skills.filter((s) => s.skill_type === "technology");
  render(`
  <div class="stack">
    ${stepBar("cv")}
    <p class="eyebrow">Step 1 of 4 · Your skills (no CV needed)</p>
    <h1>What can you already do?</h1>
    <div class="note stack" style="gap: 8px">
      <p><strong>Fastest: upload your CV.</strong> AI reads it and ticks the technologies you use; then check the list below.</p>
      <div class="row"><a class="btn primary" href="#/cv">Upload my CV</a></div>
    </div>
    <p class="muted">Or rate what you know below; anything left at “–” counts as not yet learned. Scale: 1 Basic · 2 Some · 3 Good · 4 Strong · 5 Expert.</p>
    <div class="card row">
      <label for="zone"><strong>Highest education (finished or about to finish)</strong></label>
      <select id="zone">${Object.entries(ZONES).map(([z, l]) => `<option value="${z}"${Number(z) === Number(state.zone) ? " selected" : ""}>${l}</option>`).join("")}</select>
    </div>
    ${groupHtml}
    <details class="group" open><summary><span>Technologies you use <span class="muted small">(${techs.length} that O*NET marks In Demand)</span></span></summary>
      <div class="group-body">
        <label class="small muted" for="tech-search">Search technologies</label>
        <input id="tech-search" class="search" type="search" placeholder="e.g. Python, SQL, Figma" autocomplete="off">
        <div class="techs" id="techs" style="margin-top: 10px">
          ${techs.map((s) => `<button type="button" data-tech="${esc(s.skill_id)}" data-name="${esc(s.skill_name.toLowerCase())}" aria-pressed="${state.techs.includes(s.skill_id)}">${esc(s.skill_name)}</button>`).join("")}
        </div>
      </div>
    </details>
    <div class="sticky-actions row">
      <a class="btn primary" href="#/quiz" id="go">Next: step 2, interests</a>
      <span class="muted small" id="count"></span>
    </div>
  </div>`);
  const count = () => { document.getElementById("count").textContent = `${rated()} of ${allGroups.length} skill groups rated · ${state.techs.length} technologies`; };
  count();
  document.getElementById("zone").onchange = (e) => { state.zone = Number(e.target.value); saveState(); };
  app.querySelectorAll(".rating button").forEach((b) => {
    b.onclick = () => {
      const v = Number(b.dataset.v);
      b.dataset.skills.split(" ").forEach((id) => { if (v) state.ratings[id] = v; else delete state.ratings[id]; });
      b.parentElement.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      saveState(); count();
    };
  });
  app.querySelectorAll("[data-tech]").forEach((b) => {
    b.onclick = () => {
      const id = b.dataset.tech;
      state.techs = state.techs.includes(id) ? state.techs.filter((x) => x !== id) : [...state.techs, id];
      b.setAttribute("aria-pressed", String(state.techs.includes(id)));
      saveState(); count();
    };
  });
  document.getElementById("tech-search").oninput = (e) => {
    const q = e.target.value.trim().toLowerCase();
    app.querySelectorAll("[data-tech]").forEach((b) => { b.hidden = q && !b.dataset.name.includes(q); });
  };
  document.getElementById("go").onclick = () => { state.demo = null; saveState(); };
}

// The CV summary lives in memory only: it is never saved to sessionStorage. Only the
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
    ? `Summary written by AI (${esc(r.model.split("/").pop())} on Fireworks AI) from your CV. It can make mistakes, so check it against your CV.`
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
      <div class="row"><button class="btn primary" type="button" id="cv-apply">Add to my skills</button><span class="small muted">You still rate the general skills yourself.</span></div>
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
      <div class="row small">${state.cvAreas
        ? 'Your matches use these scores as your CV evidence.<button class="btn ghost" type="button" id="cv-use" data-use="">Do not use them</button>'
        : 'Not used in your matches.<button class="btn ghost" type="button" id="cv-use" data-use="1">Use them</button>'}</div>
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
      <label for="cv-file"><strong>Choose your CV</strong> <span class="muted small">PDF, Word (.docx) or text, up to 2 MB</span></label>
      <input id="cv-file" type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain">
      <button class="btn ghost" type="button" id="cv-sample">Try a sample CV (fictional)</button>
    </div>
    <p class="small muted">Your CV is sent to our server and, when AI is on, to Fireworks AI to write the summary. It is not saved. Leave out your IC number, address and phone if you prefer.</p>
    <div id="cv-status" role="status" aria-live="polite"></div>
    <div id="cv-out" class="stack"></div>
    <div class="row"><a class="btn primary" href="#/quiz">Next: step 2, interests</a><a class="btn" href="#/skills">No CV? Rate your skills instead</a><button class="btn ghost" type="button" id="cv-skip">Skip this step</button></div>
  </div>`);
  document.getElementById("cv-skip").onclick = () => { state.cvSkipped = true; saveState(); location.hash = "#/quiz"; };
  const status = document.getElementById("cv-status");
  const out = document.getElementById("cv-out");
  const show = (r) => {
    out.innerHTML = cvResultHtml(r);
    const use = document.getElementById("cv-use");
    if (use) use.onclick = () => { state.cvAreas = use.dataset.use ? cvAreasOf(r) : null; saveState(); show(r); };
    document.getElementById("cv-apply").onclick = () => {
      const picked = [...out.querySelectorAll("#cv-techs input:checked")].map((i) => i.value);
      state.techs = [...new Set([...state.techs, ...picked])];
      const z = document.getElementById("cv-zone");
      if (z && z.checked) state.zone = r.education_job_zone;
      state.demo = null;
      saveState();
      location.hash = "#/skills";
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
          ${m.is_mycol === "yes" ? '<span class="chip">On MyCOL critical list</span>' : m.is_mycol === "near" ? '<span class="chip">Related MyCOL occupation</span>' : ""}
          ${rangeBadge(m)}
          ${flags}
        </div>
      </div>
    </div>
    ${splitBar(m)}
    <div class="row" style="gap: 6px">${sdg}</div>
    <a class="btn primary learn-link" href="#/learn/${esc(m.role_id)}">How to get there: learning path &rarr;</a>
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
      ? `Written by AI (${esc(r.model.split("/").pop())} on Fireworks AI) from your scores above. It may still be wrong; the numbers above are the source of truth.`
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
  try { before = JSON.parse(sessionStorage.getItem(PLAN_KEY) || "null"); } catch (e) { /* storage off */ }
  try { sessionStorage.setItem(PLAN_KEY, JSON.stringify(now)); } catch (e) { /* storage off */ }
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
    const missing = g.mode === "interest_only"
      ? '<p class="small">Your skills are not checked yet, so this is from your interests only.</p><div class="row"><a class="btn primary" href="#/test">Take the skills test</a><a class="btn ghost" href="#/cv">Add your CV</a></div>'
      : '<p class="small">Your interests are not checked yet, so this is from your skills only.</p><div class="row"><a class="btn primary" href="#/quiz">Answer the interest questions (8 min)</a></div>';
    return section("best_fit", groupTitle(g, "best_fit"), `Your top ${g.top} areas. Their roles are listed below.`, missing) + hiddenHtml;
  }
  return `<div class="stack" style="gap: 12px">
    <p class="small muted">Each IT area is placed by your interest (from the questionnaire) and your skill (your skills test and CV evidence). "High" means among your top ${g.top}.</p>
    ${section("best_fit", ...GROUPS.best_fit)}
    ${section("can_do", ...GROUPS.can_do)}
    ${grow ? `<section class="stack" style="gap: 8px"><h2>${GROUPS.grow_into[0]}</h2><p class="small muted">${GROUPS.grow_into[1]}</p>${grow}</section>` : ""}
    ${hiddenHtml}
  </div>`;
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
      <div class="note small"><strong>These are estimates, not predictions.</strong> Nobody knows how fast AI will change jobs. Each scenario is a different assumption about the future, built from public data (DOSM, MyCOL, arXiv) and weights the team chose. Compare them: a role that ranks high in all three is a safer choice than one that ranks high in only one. The decision is yours.</div>
      <p class="small muted">Trend score weights: Malaysian demand ${Math.round(sc.demand * 100)}% · AI momentum ${Math.round(sc.ai * 100)}%. Area scores:
        ${Object.entries(sc.trend_scores).filter(([k]) => AREA_NAMES[k]).map(([k, v]) => `${esc(AREA_NAMES[k])} ${fmt(v)}`).join(" · ")}. An area with only one measured part keeps the same score.</p>
      <label class="row small">Study time per week
        <select id="hpw">${[3, 5, 10, 15, 20].map((h) => `<option value="${h}"${h === Number(state.hoursPerWeek) ? " selected" : ""}>${h} hours</option>`).join("")}</select>
      </label>
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
  let shown = 10;
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
  render(`
  <div class="stack">
    ${demo ? "" : stepBar("results")}
    <p class="eyebrow">${demo ? "" : "Step 4 of 4 · "}Your matches${who ? ` · demo: ${esc(who.name)}` : ""}</p>
    <h1>Best matches for your level</h1>
    ${whatIfBanner}
    ${groupsHtml(g)}
    ${!demo && testDone() ? moreAreasHtml(state.test.result) : ""}
    ${g.mode === "none" ? "" : `<details class="group"><summary><span>How your IT areas were scored</span></summary><div class="group-body stack" style="gap: 6px">${res.areas.map((a) => `<p class="small"><strong>${esc(a.name)}</strong> ${a.fit === null ? "not scored" : fmt(a.fit)} <span class="muted">· ${esc(a.explain)}</span></p>`).join("")}${res.insights.map((i) => `<p class="note">${esc(i.text)}</p>`).join("")}</div></details>`}
    <div class="card stack" style="gap: 8px">
      <p class="small">Match score = ${Math.round(res.weights.area * 100)}% fit with the role's IT area + ${Math.round(res.weights.interest * 100)}% interest fit with the role + ${Math.round(res.weights.skill * 100)}% skill fit + ${Math.round(res.weights.trend * 100)}% AI-era trend of the role. The weights are the team's design choice. Roles are ranked by match score, highest first. Roles that need a higher qualification than yours, or a professional licence, are not shown.</p>
      <div class="legend"><span><i class="k-area"></i>IT area fit</span><span><i class="k-interest"></i>Interest fit</span><span><i class="k-skill"></i>Skill fit</span><span><i class="k-trend"></i>AI-era trend</span></div>
    </div>
    ${replan}
    ${scenarioCard}
    <div id="list" class="stack"></div>
    <button class="btn" type="button" id="more">Show all ${best.length} roles</button>
    <div class="row">
      ${demo ? '<a class="btn primary" href="#/cv">Start with your own answers</a>' : `<a class="btn" href="#/skills">Change my skills</a>${testDone() ? "" : '<a class="btn" href="#/test">Take the skills test</a>'}`}
      <a class="btn ghost" href="#/trends">How the trend score works</a>
    </div>
  </div>`);
  document.getElementById("more").onclick = () => { shown = best.length; draw(); };
  app.querySelectorAll("[data-scenario]").forEach((b) => {
    b.onclick = () => { state.scenario = b.dataset.scenario; saveState(); pageResults().catch(showError); };
  });
  document.getElementById("hpw").onchange = (e) => { state.hoursPerWeek = Number(e.target.value); saveState(); pageResults().catch(showError); };
  const off = document.getElementById("wi-off");
  if (off) off.onclick = () => { delete state.trendChanges; whatIfEdits = null; saveState(); pageResults().catch(showError); };
  wireMoreAreas("#/results");
  draw();
}

let trendTab = "software_dev";
async function pageTrends() {
  const t = await api("/api/trends");
  const status = await api("/api/trends/update");
  const scoreCards = t.scores.filter((s) => !s.role_id).map((s) => `
    <div class="card stack" style="gap: 6px">
      <span class="muted small">${esc(AREA_NAMES[s.it_area] || s.it_area)}</span>
      <span class="big">${esc(s.trend_score)}</span>
      <span class="small">Malaysian demand: <strong>${esc(s.my_demand_score)}</strong> · AI momentum: <strong>${esc(s.ai_momentum_score)}</strong></span>
      ${s.missing ? `<span class="chip warn-chip">No data: ${esc(s.missing.split(";").map((k) => PART_NAMES[k] || k).join(", "))}</span>` : ""}
    </div>`).join("");
  const sub = t.subdomains.find((d) => SUBFIELD_AREA[d.subfield_code] === trendTab) || {};
  const roleIds = new Set(t.scores.filter((s) => s.role_id && s.it_area === trendTab).map((s) => s.role_id));
  const signals = t.signals.filter((r) => (r.layer === "subdomain" && r.entity_id === sub.subdomain_id) || (r.layer === "role" && roleIds.has(r.entity_id)));
  const context = t.signals.filter((r) => r.scored !== "TRUE");
  const sigRows = (list) => list.map((r) => `
    <tr><td>${esc(r.entity_label)}</td><td>${esc(r.signal.replace(/_/g, " "))}</td><td>${esc(r.direction.replace(/_/g, " "))}${r.composition_effect === "TRUE" ? ' <span class="chip warn-chip" title="All papers in the category grew faster, so the AI share did not rise">composition effect</span>' : ""}</td>
    <td>${esc(r.confidence)}</td><td class="small">${esc(r.detail)}<br><span class="muted">${esc(r.confidence_reason)}</span></td></tr>`).join("");
  const inRows = t.inputs.map((r) => `
    <tr><td>${esc(r.entity_type)} · ${esc(r.entity_id)}</td><td>${esc(r.metric.replace(/_/g, " "))}</td><td class="num">${r.value ? esc(r.value) : `≤ ${esc(r.upper_bound)}`} ${esc(r.unit === "percent" ? "%" : r.unit)}</td>
    <td>${esc(r.period_start)}${r.period_end && r.period_end !== r.period_start ? ` – ${esc(r.period_end)}` : ""}</td>
    <td><a href="${safeUrl(r.source_url)}">${esc(r.source_name)}</a><br><span class="muted">released ${esc(r.release_date)} · fetched ${esc(r.fetched_date)}</span></td></tr>`).join("");
  const head = "<tr><th>For</th><th>Signal</th><th>Direction</th><th>Confidence</th><th>Detail</th></tr>";
  render(`
  <div class="stack">
    <p class="eyebrow">AI-era trend signals</p>
    <h1>Which IT areas does Malaysia need, and how fast is AI entering them?</h1>
    <div class="note small"><strong>These signals describe the recent past; they do not predict the future.</strong> Each one compares 1 to 4 data points, so the trend scores built from them are estimates. See the confidence of each signal below, and the three future scenarios on your jobs page.</div>
    <p class="muted">Malaysian demand comes from the official MyCOL 2024/2025 critical-occupations list (TalentCorp) and DOSM online job ads; AI momentum from arXiv paper counts (global research). Every signal lists its source and dates. Scores computed ${esc(t.computed_date)}.</p>
    <div class="grid">${scoreCards}</div>
    <section class="card stack" style="gap: 8px">
      <h2>What if this data changed?</h2>
      <p class="small">Change an arXiv paper count, the DOSM job ad count or a role's MyCOL status, and see the signals, the trend scores and your job ranking move. Only your copy changes.</p>
      <div class="row"><a class="btn primary" href="#/whatif">Change the trend data</a></div>
    </section>
    <div class="card stack" style="gap: 8px">
      <h2>How the trend score works</h2>
      <p class="small">Each signal has a direction (up or on MyCOL = +1; flat, near or not on MyCOL = 0) and a confidence (high, medium, low). Each part = 50 + 50 × the confidence-weighted average direction. <strong>Malaysian demand</strong>: MyCOL coverage of the area, DOSM online ads where DOSM has a series, and, for a role, whether it is on MyCOL. <strong>AI momentum</strong>: growth in AI papers in the area's arXiv categories. Trend score = 50% demand + 50% AI momentum; a part with no data is left out, never estimated. The weights are team choices; the future scenarios on the Matches page change them.</p>
      <p class="small muted">Limits: DOSM publishes ads for only one IT occupation (Software Developers), MyCOL is one edition (a status, not a trend), and arXiv is global. Where AI papers grew only because all papers grew, the signal is marked "composition effect".</p>
    </div>
    <div class="card stack" style="gap: 10px">
      <h2>Update data</h2>
      <p class="small muted">Fetches the latest OpenDOSM figures (and optionally arXiv, about 2 minutes), then recomputes the signals and scores. If a source fails, its previous data is kept.</p>
      <label class="row small"><input type="checkbox" id="arxiv"> Also refresh arXiv paper counts</label>
      <div class="row"><button class="btn primary" type="button" id="update">Update data now</button><span class="small muted" id="upd-status" role="status"></span></div>
      <pre class="log" id="log" hidden></pre>
    </div>
    <h2>Signals by IT area</h2>
    <div class="tabs" role="group" aria-label="IT area">${Object.keys(AREA_NAMES).map((d) => `<button type="button" data-tab="${d}" aria-pressed="${d === trendTab}">${esc(AREA_NAMES[d])}</button>`).join("")}</div>
    <div class="table-wrap"><table><thead>${head}</thead><tbody>${sigRows(signals)}</tbody></table></div>
    <details class="group"><summary><span>ICT sector background (not scored) <span class="muted small">(${context.length})</span></span></summary>
      <div class="group-body"><div class="table-wrap"><table><thead>${head}</thead><tbody>${sigRows(context)}</tbody></table></div></div></details>
    <details class="group"><summary><span>All input data with sources <span class="muted small">(${t.inputs.length})</span></span></summary>
      <div class="group-body"><div class="table-wrap"><table><thead><tr><th>Entity</th><th>Metric</th><th>Value</th><th>Period</th><th>Source</th></tr></thead><tbody>${inRows}</tbody></table></div></div></details>
  </div>`);
  app.querySelectorAll("[data-tab]").forEach((b) => { b.onclick = () => { trendTab = b.dataset.tab; pageTrends().catch(showError); }; });
  const btn = document.getElementById("update");
  const show = (s) => {
    const label = { idle: "", running: "Updating…", done: `Updated ${s.finished ? new Date(s.finished).toLocaleString() : ""}. Your jobs page will re-check your plan with the new data.`, failed: "Update failed; previous data kept." };
    document.getElementById("upd-status").textContent = s.status in label ? label[s.status] : s.status;
    btn.disabled = s.status === "running";
    const log = document.getElementById("log");
    log.hidden = !s.log;
    log.textContent = s.log || "";
  };
  const poll = async () => {
    const s = await api("/api/trends/update");
    show(s);
    if (s.status === "running") setTimeout(poll, 2000);
    else if (location.hash.startsWith("#/trends")) { delete cache["/api/match"]; setTimeout(() => pageTrends().catch(showError), 1500); }
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
const MYCOL_NAMES = { yes: "On MyCOL critical list", near: "Related MyCOL occupation", no: "Not on MyCOL" };
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
  const mycol = (r) => {
    const v = whatIfEdits.mycol[r.id] ?? r.value;
    return `
    <div class="wi-row wi-mycol${v !== r.value ? " changed" : ""}">
      <label for="wi-${esc(r.id)}">${esc(r.label)}</label>
      <select id="wi-${esc(r.id)}" data-mycol="${esc(r.id)}">${r.options.map((o) => `<option value="${o}"${o === v ? " selected" : ""}>${MYCOL_NAMES[o]}</option>`).join("")}</select>
      <span class="small muted"><span>Real:</span> <span>${MYCOL_NAMES[r.value]}</span></span>
    </div>`;
  };
  const numbers = items.filter((i) => i.kind === "number"), roles = items.filter((i) => i.kind === "mycol");
  const src = roles[0];
  return `
    ${numbers.length ? numbers.map(number).join("") : '<p class="small muted">No arXiv category matches this area, so its trend has no AI momentum part. Only MyCOL can change it.</p>'}
    <h3>MyCOL critical-occupation status</h3>
    <p class="small muted">TalentCorp's list of occupations Malaysia is short of. A role on the list adds to its area's Malaysian demand.${src && src.source_url ? ` <span>Source:</span> <a href="${safeUrl(src.source_url)}" rel="noopener" target="_blank">${esc(src.source_name)}</a>` : ""}</p>
    <div class="stack" style="gap: 6px">${roles.map(mycol).join("")}</div>`;
}

function whatIfHtml(r) {
  const roleName = Object.fromEntries(r.before.map((m) => [m.role_id, m.role_name]));
  const changeRow = (c) => (c.kind === "mycol"
    ? `<li><strong>${esc(c.label)}</strong> · <span>MyCOL status</span>: <span>${MYCOL_NAMES[c.before]}</span> → <strong>${MYCOL_NAMES[c.after]}</strong></li>`
    : `<li><strong>${esc(AREA_NAMES[c.area])}</strong> · <span>${INPUT_NAMES[c.metric]}</span> <span class="muted">(${esc(c.scope)})</span>: ${num0(c.before)} → <strong>${num0(c.after)}</strong></li>`);
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
      <div class="row" style="gap: 8px">${w.examples.map((e) => `<button class="btn" type="button" data-example="${esc(e.id)}">${esc(e.name)}</button>`).join("")}</div>
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

// "Your CV shows X, your interests point to Y — we'll check these N areas (about M minutes)."
function planText(p) {
  const hasCv = p.cv_scores && Object.keys(p.cv_scores).length;
  const said = [];
  if (p.from_cv.length) said.push(`your CV shows ${nameList(p.from_cv)}`);
  else if (hasCv) said.push(`your CV shows no IT area at ${p.cv_min_score} or more yet`);
  if (p.from_interest.length) said.push(`your interests point to ${nameList(p.from_interest)}`);
  let text = said.length ? said.join(", ") : "you have not added a CV or answered the interest questions, so nothing narrows the test down yet";
  if (p.filled.length) text += `; to compare at least ${p.min_areas} areas we add ${nameList(p.filled)}`;
  const n = p.areas.length === 6 ? "all 6" : `these ${p.areas.length}`;
  return `${text[0].toUpperCase()}${text.slice(1)} — we'll check ${n} areas (${p.question_count} questions, about ${p.minutes} minutes).`;
}

async function pageTestIntro() {
  const going = testInProgress();
  const answered = going ? Object.keys(state.test.responses).length : 0;
  const open = going ? state.test.questions.findIndex((q) => !(q.id in state.test.responses)) : -1;
  const nextOpen = going ? (open === -1 ? state.test.questions.length - 1 : open) : 0;
  const plan = await testPlan();
  const missing = [!skillsDone() && '<a href="#/cv">add your CV</a>', !quizDone() && '<a href="#/quiz">answer the interest questions</a>'].filter(Boolean);
  const others = Object.keys(AREA_NAMES).filter((id) => !plan.areas.includes(id));
  render(`
  <div class="quiz stack">
    ${stepBar("test")}
    <p class="eyebrow">Step 3 of 4 · IT skills test</p>
    <h1>Can you do the work in the areas that fit you?</h1>
    <div class="note stack" style="gap: 8px">
      <p><strong>${esc(planText(plan))}</strong></p>
      <div class="row" style="gap: 6px">${plan.areas.map((id) => `<span class="chip">${esc(AREA_NAMES[id] || id)}</span>`).join("")}</div>
      ${others.length ? `<p class="small muted">Not checked: ${esc(nameList(others))}. They get no test score; your results use your CV and interests for them.</p>` : ""}
      ${missing.length ? `<p class="small">To focus the test, first ${missing.join(" or ")}.</p>` : ""}
    </div>
    <div class="card stack">
      <div><h3>1 · Quick check</h3><p class="muted">${plan.areas.length * 3} questions: 3 in each of these ${plan.areas.length} areas, so each gets the same fair chance.</p></div>
      <div><h3>2 · In depth</h3><p class="muted">Your 2 strongest of these get 2 harder questions and 1 hands-on task each: write code or SQL, analyse logs, or plan a project.</p></div>
      <div><h3>3 · Your result</h3><p class="muted">These areas ranked for you, a readiness score for your top 2, the skills to work on, and an explanation for every answer.</p></div>
    </div>
    <p class="muted small">Code runs in your browser, in Python. The first coding question downloads Python (about 10 MB) once.</p>
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

/* Radar chart of 3-6 0-100 scores (one corner each), first item at the top, then clockwise.
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
   hash never reaches the server. Links made before areas were chosen have no areas: all 6. */
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
      <div class="bar"><div class="on" style="width: ${d.readiness}%"></div></div>
      ${d.area_score === undefined ? "" : `<p class="small">Area score <strong>${d.area_score}</strong> <span class="muted">= 40% quick check (${d.profile}) + 60% readiness (${d.readiness})</span></p>`}
      <div><p class="muted small">Jobs in this area (O*NET):</p>
        <ul class="quals small">${d.roles.map((x) => `<li><a href="https://www.onetonline.org/link/summary/${esc(x.onet_soc)}" target="_blank" rel="noopener">${esc(x.title)}</a></li>`).join("")}</ul></div>
    </div>`;
  const tested = r.domains.filter((d) => d.tested !== false);  // results from before areas were chosen tested all 6
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
      </div>
    </details>`).join("");
  render(`
  <div class="stack">
    ${stepBar("test")}
    <p class="eyebrow">Step 3 of 4 · IT skills test result</p>
    <h1>Your strongest IT area: ${esc(best.name)}</h1>
    <p class="muted">${esc(r.disclaimer)}</p>
    <div class="row"><button class="btn" type="button" id="share">Share my result</button></div>
    <div class="card stack" id="share-box" style="gap: 6px" hidden>
      <label class="small muted" for="share-url">Anyone with this link sees your IT profile, top 2 areas and skills to work on; the page does not show your answers, but the link itself carries them (that is how the result is rebuilt), so share it only with people you choose. Nothing is saved on our server.</label>
      <input class="search" id="share-url" type="text" readonly>
    </div>
    <div class="card stack" style="gap: 12px"><h2>Your IT profile</h2>
      <p class="muted small">Quick-check score in each tested area (0–100): the same number of questions per area, so you can compare them. Your top 2 (bold) were then tested in depth.</p>
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

function resourceHtml(r) {
  const facts = [esc(r.provider), r.hours ? `${fmt(r.hours)} h` : "self-paced", r.cost_myr === 0 || r.cost_myr === null ? "Free" : `RM ${fmt(r.cost_myr, 0)}`, r.level ? esc(r.level) : ""].filter(Boolean);
  return `<li class="res">
    <span class="chip plain res-kind">${FORMAT_LABEL[r.format] || esc(r.format)}</span>
    <a href="${safeUrl(r.url)}" target="_blank" rel="noopener">${esc(r.title)}</a>
    <span class="muted small">${facts.join(" · ")}${r.notes ? ` · ${esc(r.notes)}` : ""}</span>
  </li>`;
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
  const list = (rs) => rs.length ? `<ul class="res-list">${rs.map(resourceHtml).join("")}</ul>` : '<p class="muted small">No checked free resource in our list yet.</p>';
  const skills = p.skills.map((s) => `
    <div class="stack learn-skill" style="gap: 6px">
      <h3>${esc(s.skill_name)} <span class="muted small">· ${s.kind === "technology" ? "technology" : "skill"}${s.your_level !== undefined ? (s.rated === false ? ` · not rated yet · needed ${fmt(s.level_needed)} (O*NET 0–7)` : ` · you ${fmt(s.your_level)} → needed ${fmt(s.level_needed)} (O*NET 0–7)`) : ""}</span></h3>
      ${s.sdg && s.sdg.length ? `<div class="row" style="gap: 6px">${s.sdg.map((x) => `<span class="chip plain small" title="${esc(x.goal_name)}">SDG ${esc(x.target)}</span>`).join("")}</div>` : ""}
      ${list(s.resources)}
    </div>`).join("");
  const certs = p.certifications.length
    ? `<ul class="res-list">${p.certifications.map((c) => `<li class="res"><span class="chip plain res-kind">Certification</span>
        <a href="${safeUrl(c.url)}" target="_blank" rel="noopener">${esc(c.cert_name)}</a>
        <span class="muted small">${esc(c.issuer)}${c.cost_amount ? ` · ${esc(c.cost_currency)} ${esc(c.cost_amount)}` : ""} · ${esc(c.how_to_get)}</span></li>`).join("")}</ul>`
    : '<p class="muted small">No certification listed for this role yet. A portfolio of the projects from the courses above is the best proof.</p>';
  const sdgRows = p.sdg.map((t) => `
    <div class="stack sdg-row" style="gap: 4px">
      <p><strong>SDG ${esc(t.target)}</strong> · ${esc(t.goal_name)}</p>
      ${t.role ? `<p class="small">This job (${esc(t.role.link_strength)} link): ${esc(t.role.rationale)}</p>` : ""}
      ${t.skills.length ? `<p class="small muted">${t.role ? "Also built by" : "Built by"} ${t.skills.length} skill${t.skills.length > 1 ? "s" : ""} on this path: ${t.skills.map((k) => `<span title="${esc(k.link_strength)} link: ${esc(k.rationale)}">${esc(k.skill_name)}</span>`).join(", ")}</p>` : ""}
    </div>`).join("");
  const sdgCard = p.sdg.length ? `
    <section class="card stack" style="gap: 10px" aria-labelledby="sdg-title">
      <h2 id="sdg-title">What this path contributes to</h2>
      <p class="muted small">The UN Sustainable Development Goal targets this job serves, and the skills on this path that build them. The links are the team's judgement (data/sdg_map.csv), not UN text; hover a skill to see why.</p>
      ${sdgRows}
    </section>` : "";
  const hrd = p.hrd_corp_options.length ? `
    <section class="card stack" style="gap: 10px" aria-labelledby="hrd-title">
      <h2 id="hrd-title">Working already? Courses your employer can claim</h2>
      <p class="muted small">Paid courses whose provider page says they are claimable under HRD Corp. Only an employer registered and paying the HRD Corp levy can claim, and it must apply before the course starts. Check with the provider and your HR first. Not part of the free plan above or its hours.</p>
      <ul class="res-list">${p.hrd_corp_options.map((c) => `<li class="res">
        <span class="chip res-kind">HRD Corp claimable</span>
        <a href="${safeUrl(c.url)}" target="_blank" rel="noopener">${esc(c.title)}</a>
        <span class="muted small">${esc(c.provider)} · RM ${fmt(c.cost_myr, 0)} · for ${c.skills.map(esc).join(", ")} · checked ${esc(c.verified_date)}</span>
        ${c.notes && !/^Same course as/.test(c.notes) ? `<span class="small muted">${esc(c.notes)}</span>` : ""}
      </li>`).join("")}</ul>
    </section>` : "";
  const time = p.total_hours ? `About <strong>${fmt(p.total_hours)} hours</strong> of free material, or <strong>${fmt(p.weeks)} weeks</strong> at ${esc(p.hours_per_week)} hours a week${p.resources_without_hours ? `, plus ${p.resources_without_hours} self-paced course${p.resources_without_hours > 1 ? "s" : ""}` : ""}.` : "";
  render(`
  <div class="stack">
    <a class="btn ghost" href="#/results" style="align-self: flex-start">&larr; Back to my jobs</a>
    <p class="eyebrow">Learning path${p.personal ? " · built on your skill gaps" : ""}</p>
    <h1>${esc(p.role.name)}: how to get there</h1>
    <div class="row" style="gap: 6px">
      <span class="chip plain">${esc(p.role.area_name || "IT")}</span>
      ${p.role.is_mycol === "yes" ? '<span class="chip">On MyCOL critical list</span>' : p.role.is_mycol === "near" ? '<span class="chip">Related MyCOL occupation</span>' : ""}
      <a class="chip plain" href="https://www.onetonline.org/link/summary/${esc(p.role.onet_soc)}" target="_blank" rel="noopener">What the job involves (O*NET)</a>
    </div>
    <div class="note">${time} Everything here is free. We opened every link and checked its title, channel and length; videos open on YouTube in a new tab.</div>
    ${stage(1, p.stages[0].title, "Start here: the basics every student in this area needs.", list(p.stages[0].resources))}
    ${p.stages[1].resources.length ? stage(2, p.stages[1].title, "Courses aimed at this exact job.", list(p.stages[1].resources)) : ""}
    ${stage(p.stages[1].resources.length ? 3 : 2, p.personal ? "Close your skill gaps" : "Skills and tools this job uses",
      p.personal ? "Your biggest gaps for this role, with where to learn each one. Skills you have not rated yet come last; <a href=\"#/skills\">rate them</a> to see your real gaps." : "From O*NET, tools first. Take the steps on the home page to see only the ones you are missing.",
      skills + (p.skills_not_shown ? `<p class="muted small">Plus ${p.skills_not_shown} more skill${p.skills_not_shown > 1 ? "s" : ""} without a free resource in our list yet.</p>` : ""))}
    ${stage(p.stages[1].resources.length ? 4 : 3, "Prove it", "A recognised certificate or a portfolio shows employers what you can do.", certs)}
    ${hrd}
    ${sdgCard}
    <div class="row"><a class="btn primary" href="#/results">Back to my jobs</a></div>
  </div>`);
}

/* ---------- router ---------- */

async function route() {
  const parts = location.hash.replace(/^#\/?/, "").split("/");
  const page = parts[0] || "";
  document.querySelectorAll("[data-nav]").forEach((a) => {
    const on = a.dataset.nav === page || (page === "interests" && a.dataset.nav === "quiz");
    if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
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
    else pageHome();
  } catch (e) {
    showError(e);
  }
  app.focus({ preventScroll: true });
}
window.addEventListener("hashchange", route);
route();
