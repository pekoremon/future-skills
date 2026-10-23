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
  const base = { answers: Array(QUIZ_ITEMS).fill(null), quizSkipped: false, ratings: {}, techs: [], zone: 4, demo: null,
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

/* ---------- pages ---------- */

function pageHome() {
  render(`
  <div class="stack">
    <p class="eyebrow">Future-ready careers for IT students</p>
    <h1>Find the part of IT that suits you, and the job to aim for.</h1>
    <p class="muted">Future Skills combines an interest questionnaire, an IT skills test and your CV to show which of 6 IT areas fits you best, then ranks 26 IT roles, explains every score, shows the skills you still need, and links each role to the UN Sustainable Development Goals.</p>
    <div class="steps">
      <div class="card"><h3>Your interests</h3><p class="muted small">36 quick statements about IT work you would enjoy. About 8 minutes.</p></div>
      <div class="card"><h3>Your skills</h3><p class="muted small">Rate the skills you have and pick the tools you use, or let AI read your CV.</p></div>
      <div class="card"><h3>Your matches</h3><p class="muted small">Ranked roles with the score split, skill gaps, trends and SDG links.</p></div>
    </div>
    <div class="note stack" style="gap: 8px">
      <p><strong>New: IT skills test.</strong> 24 questions, about 25 minutes. Find out which of 6 IT areas you are strongest in: software engineering, data &amp; AI, cybersecurity, cloud &amp; networking, web &amp; interface design, or IT management.</p>
      <div class="row"><a class="btn primary" href="#/test">Take the IT skills test</a></div>
    </div>
    <div class="row">
      <a class="btn" href="#/quiz">Start with interests</a>
      <button class="btn" type="button" id="demo">Try the demo student (fictional)</button>
      <a class="btn ghost" href="#/trends">See the AI-trend data</a>
    </div>
  </div>`);
  document.getElementById("demo").onclick = () => { state.demo = "P01"; saveState(); location.hash = "#/results"; };
}

async function pageQuizIntro() {
  render(`
  <div class="quiz stack">
    <p class="eyebrow">Optional step · Interests</p>
    <h1>What kind of work do you actually enjoy?</h1>
    <div class="row"><span class="chip">36 items</span><span class="chip">About 8 minutes</span><span class="chip">Skip any time</span></div>
    <div class="card stack">
      <div><h3>Why</h3><p class="muted">Finds the kind of IT work you enjoy most: building, analysing, designing, helping, leading or organising, and which of the 6 IT areas it points to.</p></div>
      <div><h3>How it is used</h3><p class="muted">It is one of three views of you, next to the skills test and your CV. It helps you explore; it never hides a role.</p></div>
      <div><h3>Your data</h3><p class="muted">Answers stay in this browser tab and are only used to compute your matches.</p></div>
    </div>
    <p class="muted small">Each item starts with "I would enjoy...". Say how much you agree, based on what you would enjoy, not what you are already good at.</p>
    <div class="stack">
      <button class="btn primary" type="button" id="start">${state.answers.some((a) => a !== null) ? "Continue questionnaire" : "Start questionnaire"}</button>
      <button class="btn" type="button" id="skip">Skip for now</button>
    </div>
    <p class="attribution">Questions written by the team, based on Holland's RIASEC interest types as used by <a href="https://www.onetonline.org/find/descriptor/browse/1.B.1">O*NET</a>.</p>
  </div>`);
  document.getElementById("start").onclick = () => {
    const first = state.answers.indexOf(null);
    location.hash = `#/quiz/${first === -1 ? 1 : first + 1}`;
  };
  document.getElementById("skip").onclick = () => { state.quizSkipped = true; state.demo = null; saveState(); location.hash = "#/skills"; };
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
    <p class="eyebrow">Your interest results</p>
    ${r.warnings.map((w) => `<div class="warn">${esc(w.text)}</div>`).join("")}
    <div><p class="muted small">Your interest code (Holland code)</p><div class="big" style="letter-spacing: 0.12em">${esc(r.code)}</div></div>
    <div class="card stack" style="gap: 12px"><h3>Which IT areas you would enjoy</h3><p class="muted small">From the 4 questions about each area (0–100).</p>${areaBars}</div>
    <div class="card stack" style="gap: 12px"><h3>Scores for the six interest types</h3>${types}</div>
    <h2>Your three strongest interests</h2>
    ${cards}
    <div class="note">This is a direction, not a verdict. Interests change with experience. In your matches they sit next to the skills test and your CV.</div>
    <div class="stack">
      <a class="btn primary" href="#/test">Next: the IT skills test</a>
      <a class="btn" href="#/results">See my matches</a>
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
    <p class="eyebrow">Your skills</p>
    <h1>What can you already do?</h1>
    <p class="muted">Rate only what you know; anything left at “–” counts as not yet learned. Scale: 1 Basic · 2 Some · 3 Good · 4 Strong · 5 Expert.</p>
    <p class="small"><a href="#/cv">Have a CV? Let AI read it</a> to summarise your skills and fill in your technologies.</p>
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
      <a class="btn primary" href="#/results" id="go">See my matches</a>
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

// The CV summary lives in memory only: it is never saved to sessionStorage.
let cvResult = null;
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
    </section>`;
}

async function pageCV() {
  render(`
  <div class="stack">
    <p class="eyebrow">Optional step · Your CV</p>
    <h1>Let AI read your CV</h1>
    <p class="muted">Upload your CV to get a short summary of your skills and qualifications, and to fill in the technologies you use on the Skills page.</p>
    <div class="drop" id="drop">
      <label for="cv-file"><strong>Choose your CV</strong> <span class="muted small">PDF, Word (.docx) or text, up to 2 MB</span></label>
      <input id="cv-file" type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain">
      <button class="btn ghost" type="button" id="cv-sample">Try a sample CV (fictional)</button>
    </div>
    <p class="small muted">Your CV is sent to our server and, when AI is on, to Fireworks AI to write the summary. It is not saved. Leave out your IC number, address and phone if you prefer.</p>
    <div id="cv-status" role="status" aria-live="polite"></div>
    <div id="cv-out" class="stack"></div>
    <div class="row"><a class="btn" href="#/skills">Go to my skills</a></div>
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
      location.hash = "#/skills";
    };
  };
  const run = async (getBody, what) => {
    status.className = "small muted";
    status.textContent = `Reading ${what}…`;
    out.innerHTML = "";
    try {
      cvResult = await api("/api/cv/summary", { body: JSON.stringify(await getBody()) });
      status.textContent = `Read ${cvResult.chars_read.toLocaleString()} characters from ${what}.`;
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
          ${flags}
        </div>
      </div>
    </div>
    ${splitBar(m)}
    <div class="row" style="gap: 6px">${sdg}</div>
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
        <div class="role-extra small muted">Loading role details…</div>
        ${m.sdg.map((s) => `<p class="small"><strong>SDG ${esc(s.target)}</strong> (${esc(s.link_strength)} link): ${esc(s.rationale)}</p>`).join("")}
      </div>
    </details>
  </article>`;
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

async function pageResults() {
  const demo = state.demo;
  if (!demo && !testDone() && !quizDone() && !state.quizSkipped && !Object.keys(state.ratings).length) {
    render(`<div class="stack"><h1>No answers yet</h1><p class="muted">Answer the interest questions or rate your skills first, or try the fictional demo student.</p>
      <div class="row"><a class="btn primary" href="#/quiz">Start</a><button class="btn" type="button" id="demo">Try the demo student</button></div></div>`);
    document.getElementById("demo").onclick = () => { state.demo = "P01"; saveState(); pageResults(); };
    return;
  }
  render('<p class="muted" role="status">Scoring IT roles…</p>');
  let body;
  const options = { top: 35, scenario: state.scenario, hours_per_week: Number(state.hoursPerWeek) };
  if (demo) {
    body = { profile_id: demo, ...options };
  } else {
    const test = testDone() ? { seed: state.test.seed, responses: state.test.responses } : undefined;
    body = { test, interest_answers: quizDone() ? state.answers : undefined, skill_ratings: state.ratings, technologies: state.techs, education_job_zone: Number(state.zone), ...options };
  }
  const [res, scenarios] = await Promise.all([api("/api/match", { body: JSON.stringify(body) }), cached("/api/scenarios")]);
  lastMatchBody = body;
  const sc = res.scenario;
  const scenarioCard = `
    <section class="card stack" style="gap: 10px" aria-labelledby="sc-title">
      <h2 id="sc-title">Future scenario</h2>
      <div class="tabs" role="group" aria-label="Future scenario">
        ${scenarios.map((s) => `<button type="button" data-scenario="${esc(s.id)}" aria-pressed="${s.id === sc.id}">${esc(s.name)}</button>`).join("")}
      </div>
      <p class="small">${esc(sc.description)}</p>
      <p class="small muted">Trend score weights: Malaysian demand ${Math.round(sc.demand * 100)}% · AI momentum ${Math.round(sc.ai * 100)}%. Area scores:
        ${Object.entries(sc.trend_scores).filter(([k]) => AREA_NAMES[k]).map(([k, v]) => `${esc(AREA_NAMES[k])} ${fmt(v)}`).join(" · ")}. An area with only one measured part keeps the same score.</p>
      <label class="row small">Study time per week
        <select id="hpw">${[3, 5, 10, 15, 20].map((h) => `<option value="${h}"${h === Number(state.hoursPerWeek) ? " selected" : ""}>${h} hours</option>`).join("")}</select>
      </label>
    </section>`;
  const profiles = demo ? await cached("/api/profiles") : [];
  const who = demo ? profiles.find((p) => p.profile_id === demo) : null;
  const noArea = !res.sources_used.length;
  const best = res.results.filter(isBestMatch).sort((x, y) => y.total - x.total);
  let shown = 10;
  const draw = () => {
    document.getElementById("list").innerHTML = best.length
      ? best.slice(0, shown).map((m, i) => matchCard(m, i + 1)).join("")
      : '<p class="muted">No roles match your education level yet. Try a higher education level on the skills page.</p>';
    document.getElementById("more").hidden = shown >= best.length;
    app.querySelectorAll("details.more").forEach((d) => d.addEventListener("toggle", () => d.open && loadRoleExtra(d.closest(".match"))));
    app.querySelectorAll("[data-explain]").forEach((b) => { b.onclick = () => explainRole(b); });
  };
  render(`
  <div class="stack">
    <p class="eyebrow">Your matches${who ? ` · demo: ${esc(who.name)}` : ""}</p>
    <h1>Best matches for your level</h1>
    ${noArea ? '<div class="warn">IT area fit is not included because you have not taken the skills test. <a href="#/test">Take it now</a> to update the ranking.</div>' : `<div class="card stack" style="gap: 6px"><h2>Your IT areas</h2>${res.areas.map((a) => `<p class="small"><strong>${esc(a.name)}</strong> ${a.fit === null ? "not scored" : fmt(a.fit)} <span class="muted">· ${esc(a.explain)}</span></p>`).join("")}${res.insights.map((i) => `<p class="note">${esc(i.text)}</p>`).join("")}</div>`}
    <div class="card stack" style="gap: 8px">
      <p class="small">Match score = ${Math.round(res.weights.area * 100)}% fit with the role's IT area + ${Math.round(res.weights.interest * 100)}% interest fit with the role + ${Math.round(res.weights.skill * 100)}% skill fit + ${Math.round(res.weights.trend * 100)}% AI-era trend of the role. The weights are the team's design choice. Roles are ranked by match score, highest first. Roles that need a higher qualification than yours, or a professional licence, are not shown.</p>
      <div class="legend"><span><i class="k-area"></i>IT area fit</span><span><i class="k-interest"></i>Interest fit</span><span><i class="k-skill"></i>Skill fit</span><span><i class="k-trend"></i>AI-era trend</span></div>
    </div>
    ${scenarioCard}
    <div id="list" class="stack"></div>
    <button class="btn" type="button" id="more">Show all ${best.length} roles</button>
    <div class="row">
      ${demo ? '<a class="btn primary" href="#/quiz">Start with your own answers</a>' : '<a class="btn" href="#/skills">Change my skills</a>'}
      <a class="btn ghost" href="#/trends">How the trend score works</a>
    </div>
  </div>`);
  document.getElementById("more").onclick = () => { shown = best.length; draw(); };
  app.querySelectorAll("[data-scenario]").forEach((b) => {
    b.onclick = () => { state.scenario = b.dataset.scenario; saveState(); pageResults().catch(showError); };
  });
  document.getElementById("hpw").onchange = (e) => { state.hoursPerWeek = Number(e.target.value); saveState(); pageResults().catch(showError); };
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
    <p class="muted">Malaysian demand comes from the official MyCOL 2024/2025 critical-occupations list (TalentCorp) and DOSM online job ads; AI momentum from arXiv paper counts (global research). Every signal lists its source and dates. Scores computed ${esc(t.computed_date)}.</p>
    <div class="grid">${scoreCards}</div>
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
    const label = { idle: "", running: "Updating…", done: `Updated ${s.finished ? new Date(s.finished).toLocaleString() : ""}`, failed: "Update failed; previous data kept." };
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
const testInProgress = () => state.test && !state.test.result;
// Question counts come from the bank's selection rules, so changing them needs no code change.
const screenCount = (t) => t.selection.screen_per_domain * t.domains.length;
const testLength = (t) => screenCount(t) + t.selection.deep_domains * (t.selection.deep_per_domain + t.selection.practical_per_domain);
const domainName = (id) => (state.test.domains.find((d) => d.id === id) || {}).name || id;

async function startTest() {
  const t = await api("/api/assessment/start");
  state.test = { seed: t.seed, domains: t.domains, selection: t.selection, questions: t.questions, responses: {},
    code: {}, runs: {}, deepDomains: null, result: null };
  saveState();
  location.hash = "#/test/1";
}

function pageTestIntro() {
  const going = testInProgress();
  const answered = going ? Object.keys(state.test.responses).length : 0;
  render(`
  <div class="quiz stack">
    <p class="eyebrow">IT skills test</p>
    <h1>Which IT area are you strongest in?</h1>
    <div class="row"><span class="chip">24 questions</span><span class="chip">About 25 minutes</span><span class="chip">6 IT areas</span></div>
    <div class="card stack">
      <div><h3>1 · Quick check</h3><p class="muted">3 questions in each area, so every area gets the same fair chance: software engineering, data &amp; AI, cybersecurity, cloud, infrastructure &amp; networking, web &amp; interface design, and IT management &amp; analysis.</p></div>
      <div><h3>2 · In depth</h3><p class="muted">Your 2 strongest areas get 2 harder questions and 1 hands-on task each: write code or SQL, analyse logs, or plan a project.</p></div>
      <div><h3>3 · Your result</h3><p class="muted">All 6 areas ranked for you, a readiness score for your top 2, the matching jobs, the skills to work on, and an explanation for every answer.</p></div>
    </div>
    <p class="muted small">Code runs in your browser, in Python. The first coding question downloads Python (about 10 MB) once.</p>
    <div class="stack">
      ${going ? `<a class="btn primary" href="#/test/${Math.min(answered + 1, state.test.questions.length)}">Continue (${answered} answered)</a>` : ""}
      ${state.test && state.test.result ? `<a class="btn primary" href="#/test/result">See your last result</a>` : ""}
      <button class="btn${going || (state.test && state.test.result) ? "" : " primary"}" type="button" id="start">${state.test ? "Start a new test" : "Start the test"}</button>
    </div>
  </div>`);
  document.getElementById("start").onclick = (e) => { e.target.disabled = true; startTest().catch(showError); };
}

function questionBody(q) {
  const r = state.test.responses[q.id];
  if (q.type === "mcq" || q.type === "multi") {
    const on = (i) => (q.type === "mcq" ? r === i : Array.isArray(r) && r.includes(i));
    return `${q.type === "multi" ? '<p class="muted small">Select all that apply.</p>' : ""}
      <div class="options" role="group" aria-label="Answer options">${q.options.map((o, i) =>
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
      const next = await api("/api/assessment/next", { body: JSON.stringify({ seed: t.seed, responses: t.responses }) });
      t.deepDomains = next.domains;
      t.questions = t.questions.concat(next.questions);
      saveState();
      location.hash = `#/test/${idx + 2}`;
    } else {
      button.textContent = "Scoring…";
      t.result = await api("/api/assessment/result", { body: JSON.stringify({ seed: t.seed, responses: t.responses }) });
      saveState();
      location.hash = "#/test/result";
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
    ${idx === screenCount(t) && t.deepDomains ? `<p class="note">Your strongest areas so far: <strong>${t.deepDomains.map((d) => esc(domainName(d))).join(" and ")}</strong>. These questions go deeper.</p>` : ""}
    <div class="row"><span class="chip">${esc(domainName(q.domain))}</span><span class="chip plain">${esc(STAGE_LABEL[q.stage])}</span><span class="muted small">about ${Math.max(1, Math.round(q.time_s / 60))} min</span></div>
    <h2 id="q-text">${esc(q.prompt)}</h2>
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

function pageTestResult() {
  const r = state.test && state.test.result;
  if (!r) { location.hash = "#/test"; return; }
  const deep = r.domains.filter((d) => d.tested_in_depth).sort((a, b) => b.readiness - a.readiness || b.profile - a.profile);
  const best = r.domains.find((d) => d.id === r.recommended);
  const domainCard = (d) => `
    <div class="card stack" style="gap: 10px">
      <div class="row" style="justify-content: space-between"><h3>${esc(d.name)}</h3><span class="chip${d.level.min >= 75 ? "" : d.level.min >= 50 ? " plain" : " warn-chip"}">${esc(d.level.label)}</span></div>
      <div class="row" style="align-items: baseline; gap: 6px"><span class="big">${d.readiness}</span><span class="muted">/ 100 readiness</span></div>
      <div class="bar"><div class="on" style="width: ${d.readiness}%"></div></div>
      <div><p class="muted small">Jobs in this area (O*NET):</p>
        <ul class="quals small">${d.roles.map((x) => `<li><a href="https://www.onetonline.org/link/summary/${esc(x.onet_soc)}" target="_blank" rel="noopener">${esc(x.title)}</a></li>`).join("")}</ul></div>
    </div>`;
  const profile = r.domains.slice().sort((a, b) => b.profile - a.profile).map((d) => `
    <div class="stack" style="gap: 4px">
      <div class="row" style="justify-content: space-between"><span${d.tested_in_depth ? ' style="font-weight:700"' : ""}>${esc(d.name)} <span class="muted small">${esc(d.name_zh)}</span></span><span class="muted">${d.profile} / 100</span></div>
      <div class="bar"><div class="${d.tested_in_depth ? "on" : ""}" style="width: ${d.profile}%"></div></div>
    </div>`).join("");
  const gaps = r.skills_to_improve.length
    ? `<ul class="quals">${r.skills_to_improve.map((g) => `<li><strong>${esc(g.skill)}</strong> <span class="muted small">· ${esc(domainName(g.domain))}</span></li>`).join("")}</ul>`
    : '<p class="muted">Nothing: every answer was right.</p>';
  const review = r.items.map((i, n) => `
    <details class="more card review">
      <summary><span class="${i.correct ? "pass" : "fail"}">${i.correct ? "Right" : i.points > 0 ? "Partly right" : "Wrong"}</span>&nbsp;· Q${n + 1} · ${esc(i.skill)} <span class="muted small">&nbsp;${i.points} / ${i.max}</span></summary>
      <div class="stack" style="gap: 8px">
        <p>${esc(i.prompt)}</p>
        ${i.answered ? "" : '<p class="muted small">Not answered.</p>'}
        <p><strong>Answer:</strong> ${esc(answerText(i))}</p>
        <p class="muted">${esc(i.explanation)}</p>
        <p class="small">Source: ${i.refs.map((x) => `<a href="${safeUrl(x.url)}" target="_blank" rel="noopener">${esc(x.name)}</a>`).join(" · ")}</p>
      </div>
    </details>`).join("");
  render(`
  <div class="stack">
    <p class="eyebrow">IT skills test · Your result</p>
    <h1>Your strongest IT area: ${esc(best.name)}</h1>
    <p class="muted">${esc(r.disclaimer)}</p>
    <div class="card stack" style="gap: 12px"><h2>Your IT profile</h2>
      <p class="muted small">Quick-check score in each area: the same number of questions per area, so you can compare them. Your top 2 (highlighted) were then tested in depth.</p>
      ${profile}</div>
    <h2>Your top 2, tested in depth</h2>
    <p class="muted small">Readiness counts the in-depth and hands-on questions in that area.</p>
    <div class="grid">${deep.map(domainCard).join("")}</div>
    <div class="card stack" style="gap: 10px"><h2>Skills to work on</h2>${gaps}</div>
    <div class="stack" style="gap: 10px"><h2>Review every answer</h2>${review}</div>
    <div class="row"><button class="btn primary" type="button" id="again">Take a new test</button><a class="btn ghost" href="#/">Home</a></div>
  </div>`);
  document.getElementById("again").onclick = (e) => { e.target.disabled = true; startTest().catch(showError); };
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
    if (page === "test" && parts[1] === "result") pageTestResult();
    else if (page === "test" && parts[1]) pageTestItem(Number(parts[1]) || 1);
    else if (page === "test") pageTestIntro();
    else if (page === "quiz" && parts[1]) await pageQuizItem(Number(parts[1]) || 1);
    else if (page === "quiz") await pageQuizIntro();
    else if (page === "interests") await pageInterests();
    else if (page === "cv") await pageCV();
    else if (page === "skills") await pageSkills();
    else if (page === "results") await pageResults();
    else if (page === "trends") await pageTrends();
    else pageHome();
  } catch (e) {
    showError(e);
  }
  app.focus({ preventScroll: true });
}
window.addEventListener("hashchange", route);
route();
