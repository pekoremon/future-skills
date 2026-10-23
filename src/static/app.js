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
const RATING = ["None", "Basic", "Some", "Good", "Strong", "Expert"];
const ZONES = { 3: "Diploma", 4: "Bachelor's degree", 5: "Master's degree or higher" };
const DOMAINS = { generic_tech: "ICT", agriculture: "Agriculture", finance: "Finance", healthcare: "Healthcare", overall: "Malaysia overall", services: "Services" };
const FLAGS = {
  needs_extra_education: "Needs further study",
  needs_extra_qualification: "Needs extra qualification",
  not_for_it_graduates: "Licensed profession, reference only",
  no_domain_trend: "No domain trend data (neutral 50)",
  interest_not_scored: "Interest not included",
};
const PART_LABEL = { interest: "Interest fit", skill: "Skill fit", trend: "AI-era trend" };
const PART_NAMES = { my_demand: "Malaysian demand", ai_momentum: "AI momentum" };
const domainText = (t) => String(t).replace(/\b(generic_tech|agriculture|finance|healthcare) domain\b/g, (_, d) => `${DOMAINS[d]} field`);
const STORE_KEY = "future-skills-v1";
// The 65 O*NET skills and knowledge areas, grouped so a student rates 22 groups instead.
// A group's rating is copied to every O*NET skill in it, so matching still runs per skill.
const SKILL_GROUPS = {
  general: [
    ["Communication", "Reading, writing, listening and speaking", ["SK001", "SK002", "SK003", "SK004"]],
    ["Maths and science", "Using maths and scientific methods to solve problems", ["SK005", "SK006"]],
    ["Problem solving", "Critical thinking, complex problems, judgement and decisions", ["SK007", "SK017", "SK029"]],
    ["Learning and teaching", "Picking up new things fast and teaching others", ["SK008", "SK009", "SK015"]],
    ["Working with people", "Reading people, coordinating with others, helping customers", ["SK011", "SK012", "SK016"]],
    ["Persuading and negotiating", "Changing minds and reaching agreements", ["SK013", "SK014"]],
    ["Programming and design", "Writing code, designing technology, working out what users need", ["SK018", "SK019", "SK022"]],
    ["Systems and quality", "Analysing and evaluating systems, monitoring performance, testing quality", ["SK010", "SK028", "SK030", "SK031"]],
    ["Setting up and running equipment", "Choosing, installing, operating and watching machines or systems", ["SK020", "SK021", "SK023", "SK024"]],
    ["Troubleshooting and repair", "Finding faults, maintaining and fixing equipment", ["SK025", "SK026", "SK027"]],
    ["Managing time, money and people", "Planning time, budgets, materials and staff", ["SK032", "SK033", "SK034", "SK035"]],
  ],
  domain_knowledge: [
    ["Business and management", "Running organisations, office administration, HR", ["SK036", "SK037", "SK041"]],
    ["Finance and economics", "Accounting, banking, economics", ["SK038"]],
    ["Sales and customer service", "Marketing, selling, serving customers", ["SK039", "SK040"]],
    ["Computers and telecoms", "Hardware, software, networks, telecommunications", ["SK044", "SK064"]],
    ["Engineering and manufacturing", "Engineering, mechanics, construction, production", ["SK042", "SK045", "SK047", "SK048"]],
    ["Maths and physical sciences", "Mathematics, physics, chemistry", ["SK049", "SK050", "SK051"]],
    ["Biology, food and agriculture", "Living things, crops, livestock, food production", ["SK043", "SK052"]],
    ["Health and medicine", "Medicine, therapy, psychology", ["SK053", "SK056", "SK057"]],
    ["Society and education", "Sociology, geography, philosophy, teaching", ["SK054", "SK055", "SK058", "SK061"]],
    ["Language, media and design", "English, media, design, fine arts", ["SK046", "SK059", "SK060", "SK065"]],
    ["Law and public safety", "Law, government, security", ["SK062", "SK063"]],
  ],
};
// Older saved answers rated single skills; show the group at its highest member rating.
const groupRating = (ids) => Math.max(0, ...ids.map((id) => state.ratings[id] || 0));


const app = document.getElementById("app");
const cache = {};
let state = loadState();

function loadState() {
  const base = { answers: Array(30).fill(null), quizSkipped: false, ratings: {}, techs: [], zone: 4, demo: null,
    scenario: "baseline", hoursPerWeek: 5 };
  try {
    return Object.assign(base, JSON.parse(sessionStorage.getItem(STORE_KEY) || "{}"));
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

function riasecTotals() {
  return cached("/api/questionnaire").then((q) => {
    const totals = Object.fromEntries(ORDER.map((k) => [k, 0]));
    q.items.forEach((it, i) => { if (state.answers[i] !== null) totals[it.type] += state.answers[i]; });
    return totals;
  });
}
const topCode = (t) => ORDER.slice().sort((a, b) => t[b] - t[a] || ORDER.indexOf(a) - ORDER.indexOf(b)).slice(0, 3);
const quizDone = () => state.answers.every((a) => a !== null);

/* ---------- pages ---------- */

function pageHome() {
  render(`
  <div class="stack">
    <p class="eyebrow">Future-ready careers for tech graduates</p>
    <h1>AI is changing tech jobs. Find the roles where your tech skills and a domain still win.</h1>
    <p class="muted">Future Skills matches you to tech + domain roles in agriculture, finance and healthcare, explains every score, shows the skills you still need, and links each role to the UN Sustainable Development Goals.</p>
    <div class="steps">
      <div class="card"><h3>Your interests</h3><p class="muted small">30 quick questions from the O*NET Mini Interest Profiler. Optional.</p></div>
      <div class="card"><h3>Your skills</h3><p class="muted small">Rate the skills you have and pick the tools you use, or let AI read your CV.</p></div>
      <div class="card"><h3>Your matches</h3><p class="muted small">Ranked roles with the score split, skill gaps, trends and SDG links.</p></div>
    </div>
    <div class="row">
      <a class="btn primary" href="#/quiz">Start with interests</a>
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
    <div class="row"><span class="chip">30 items</span><span class="chip">Skip any time</span></div>
    <div class="card stack">
      <div><h3>Why</h3><p class="muted">Finds the work types you like most, so you can see directions beyond a generic tech job.</p></div>
      <div><h3>How it is used</h3><p class="muted">Interest is only 20% of the match score. It helps you explore; it never hides a role. The choice is yours.</p></div>
      <div><h3>Your data</h3><p class="muted">Answers stay in this browser tab and are only used to compute your matches.</p></div>
    </div>
    <p class="muted small">Each item is a work activity. Say how much you would like doing it, not whether you can do it or what it pays.</p>
    <div class="stack">
      <button class="btn primary" type="button" id="start">${state.answers.some((a) => a !== null) ? "Continue questionnaire" : "Start questionnaire"}</button>
      <button class="btn" type="button" id="skip">Skip for now</button>
    </div>
    <p class="attribution">Items from the <a href="https://www.onetcenter.org/IP.html">O*NET Interest Profiler (Mini-IP)</a>, USDOL/ETA.</p>
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
    <p class="muted small">How much would you like doing this work activity?</p>
    <div class="card item" id="item-text">${esc(item.text)}</div>
    <div class="options" role="group" aria-labelledby="item-text">${opts}</div>
    <p class="attribution">${esc(q.attribution)} <a href="https://creativecommons.org/licenses/by-nd/4.0/">CC BY-ND 4.0</a>.</p>
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
  const t = await riasecTotals();
  const top = topCode(t);
  const bars = ORDER.map((k) => `
    <div class="stack" style="gap: 4px">
      <div class="row" style="justify-content: space-between"><span${top.includes(k) ? ' style="font-weight:700"' : ' class="muted"'}>${k} · ${TYPES[k].name}</span><span class="muted">${t[k]} / 20</span></div>
      <div class="bar"><div class="${top.includes(k) ? "on" : ""}" style="width: ${(t[k] / 20) * 100}%"></div></div>
    </div>`).join("");
  const cards = top.map((k) => `
    <div class="card row" style="align-items: flex-start; flex-wrap: nowrap">
      <span class="letter">${k}</span>
      <div><h3>${TYPES[k].name}</h3><p class="muted small">${TYPES[k].desc}</p></div>
    </div>`).join("");
  render(`
  <div class="quiz stack">
    <p class="eyebrow">Your interest results</p>
    <div><p class="muted small">Your interest code (Holland code)</p><div class="big" style="letter-spacing: 0.12em">${top.join("")}</div></div>
    <div class="card stack" style="gap: 12px"><h3>Scores for the six interest types</h3>${bars}</div>
    <h2>Your three strongest interests</h2>
    ${cards}
    <div class="note">This is a direction, not a verdict. Interests change with experience, and in your matches interest fit is only part of the score.</div>
    <div class="stack">
      <a class="btn primary" href="#/skills">Next: your skills</a>
      <button class="btn" type="button" id="redo">Answer again</button>
    </div>
    <p class="attribution">Scoring: <a href="https://www.onetcenter.org/dl_files/Mini-IP.pdf">Rounds et al. (2016), O*NET Mini Interest Profiler technical report</a>. Type descriptions written by the team, based on <a href="https://www.onetonline.org/find/descriptor/browse/1.B.1">O*NET Career Interest Types</a>.</p>
  </div>`);
  document.getElementById("redo").onclick = () => { state.answers = Array(30).fill(null); saveState(); location.hash = "#/quiz/1"; };
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
const ORDER_PARTS = ["interest", "skill", "trend"];

// Roles that need more study than the student's level, or a licence, are left out of the list.
const isBestMatch = (m) => !m.flags.includes("not_for_it_graduates") && !m.flags.includes("needs_extra_education");

function matchCard(m, rank) {
  const d = m.skill_detail;
  const flags = m.flags.map((f) => `<span class="chip warn-chip">${esc(FLAGS[f] || f)}${f === "needs_extra_education" ? ` (Job Zone ${m.job_zone})` : ""}</span>`).join("");
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
          <span class="chip plain">${esc(DOMAINS[m.domain] || "Other field")}</span>
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
        <p class="small muted">${esc(m.explain.interest)}. ${esc(domainText(m.explain.trend))}. Skill fit = 70% rated skills (${fmt(d.rated_score)}) + 30% technologies (${fmt(d.tech_score)}).</p>
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
  if (!demo && !quizDone() && !state.quizSkipped && !Object.keys(state.ratings).length) {
    render(`<div class="stack"><h1>No answers yet</h1><p class="muted">Answer the interest questions or rate your skills first, or try the fictional demo student.</p>
      <div class="row"><a class="btn primary" href="#/quiz">Start</a><button class="btn" type="button" id="demo">Try the demo student</button></div></div>`);
    document.getElementById("demo").onclick = () => { state.demo = "P01"; saveState(); pageResults(); };
    return;
  }
  render('<p class="muted" role="status">Scoring 35 roles…</p>');
  let body;
  const options = { top: 35, scenario: state.scenario, hours_per_week: Number(state.hoursPerWeek) };
  if (demo) {
    body = { profile_id: demo, ...options };
  } else {
    const totals = quizDone() ? await riasecTotals() : Object.fromEntries(ORDER.map((k) => [k, 0]));
    body = { riasec: totals, skill_ratings: state.ratings, technologies: state.techs, education_job_zone: Number(state.zone), ...options };
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
      <p class="small muted">Trend score weights: Malaysian demand ${Math.round(sc.demand * 100)}% · AI momentum ${Math.round(sc.ai * 100)}%. Field scores:
        ${Object.entries(sc.trend_scores).map(([d, v]) => `${esc(DOMAINS[d] || d)} ${fmt(v)}`).join(" · ")}. A field with only one measured part keeps the same score.</p>
      <label class="row small">Study time per week
        <select id="hpw">${[3, 5, 10, 15, 20].map((h) => `<option value="${h}"${h === Number(state.hoursPerWeek) ? " selected" : ""}>${h} hours</option>`).join("")}</select>
      </label>
    </section>`;
  const profiles = demo ? await cached("/api/profiles") : [];
  const who = demo ? profiles.find((p) => p.profile_id === demo) : null;
  const noInterest = res.results[0] && res.results[0].flags.includes("interest_not_scored");
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
    ${noInterest ? '<div class="warn">Interest fit is not included because you skipped the questionnaire. <a href="#/quiz">Answer it now</a> to update the ranking.</div>' : `<p class="muted">Your interest code: <strong>${esc(res.riasec_code)}</strong></p>`}
    <div class="card stack" style="gap: 8px">
      <p class="small">Match score = ${Math.round(res.weights.interest * 100)}% interest fit + ${Math.round(res.weights.skill * 100)}% skill fit + ${Math.round(res.weights.trend * 100)}% AI-era trend of the role's field. The weights are the team's design choice. Roles are ranked by match score, highest first. Roles that need a higher qualification than yours, or a professional licence, are not shown.</p>
      <div class="legend"><span><i class="k-interest"></i>Interest fit</span><span><i class="k-skill"></i>Skill fit</span><span><i class="k-trend"></i>AI-era trend</span></div>
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

let trendTab = "agriculture";
async function pageTrends() {
  const t = await api("/api/trends");
  const status = await api("/api/trends/update");
  const scoreCards = t.scores.map((s) => `
    <div class="card stack" style="gap: 6px">
      <span class="muted small">${esc(DOMAINS[s.domain] || s.domain)}</span>
      <span class="big">${esc(s.trend_score)}</span>
      <span class="small">Malaysian demand: <strong>${esc(s.my_demand_score)}</strong> · AI momentum: <strong>${esc(s.ai_momentum_score)}</strong></span>
      ${s.missing ? `<span class="chip warn-chip">No data: ${esc(s.missing.split(";").map((k) => PART_NAMES[k] || k).join(", "))}</span>` : ""}
    </div>`).join("");
  const domains = ["agriculture", "finance", "healthcare", "generic_tech", "overall"];
  const signals = t.signals.filter((r) => r.entity_type === "domain" && r.entity_id === trendTab);
  const other = t.signals.filter((r) => r.entity_type !== "domain");
  const rows = (list) => list.map((r) => `
    <tr><td>${esc(r.metric.replace(/_/g, " "))}</td><td class="num">${esc(r.value)} ${esc(r.unit === "percent" ? "%" : r.unit)}</td>
    <td>${esc(r.period_start)}${r.period_end && r.period_end !== r.period_start ? ` – ${esc(r.period_end)}` : ""}</td>
    <td>${esc(r.note)}</td><td><a href="${safeUrl(r.source_url)}">${esc(r.source_name)}</a><br><span class="muted">${esc(r.source_date)}</span></td></tr>`).join("");
  render(`
  <div class="stack">
    <p class="eyebrow">AI-era trend signals</p>
    <h1>Which fields are growing, and how fast is AI entering them?</h1>
    <p class="muted">Every number below comes from DOSM / OpenDOSM (Malaysia) or the arXiv API (global AI research), with its source and date. Scores computed ${esc(t.computed_date)}.</p>
    <div class="grid">${scoreCards}</div>
    <div class="card stack" style="gap: 8px">
      <h2>How the trend score works</h2>
      <p class="small"><strong>Malaysian demand</strong> = 50 + 10 × (the field's average employment growth over the last 4 quarters − the national average). <strong>AI momentum</strong> = 50 + 100 × (AI papers in the last 6 months ÷ the 6 months before − 1). The trend score is the average of the parts that have data; a missing part is never estimated. Formula version v1; the equal weights are a team choice, and the future scenarios on the Matches page change them.</p>
    </div>
    <div class="card stack" style="gap: 10px">
      <h2>Update data</h2>
      <p class="small muted">Fetches the latest OpenDOSM figures (and optionally arXiv, about 3 minutes), then recomputes the scores. If a source fails, its previous data is kept.</p>
      <label class="row small"><input type="checkbox" id="arxiv"> Also refresh arXiv paper counts</label>
      <div class="row"><button class="btn primary" type="button" id="update">Update data now</button><span class="small muted" id="upd-status" role="status"></span></div>
      <pre class="log" id="log" hidden></pre>
    </div>
    <h2>Signals by field</h2>
    <div class="tabs" role="group" aria-label="Field">${domains.map((d) => `<button type="button" data-tab="${d}" aria-pressed="${d === trendTab}">${esc(DOMAINS[d])}</button>`).join("")}</div>
    <div class="table-wrap"><table><thead><tr><th>Metric</th><th>Value</th><th>Period</th><th>Note</th><th>Source</th></tr></thead><tbody>${rows(signals)}</tbody></table></div>
    <details class="group"><summary><span>Occupation and youth signals <span class="muted small">(${other.length})</span></span></summary>
      <div class="group-body"><div class="table-wrap"><table><thead><tr><th>Metric</th><th>Value</th><th>Period</th><th>Note</th><th>Source</th></tr></thead><tbody>${rows(other)}</tbody></table></div></div></details>
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
    if (page === "quiz" && parts[1]) await pageQuizItem(Number(parts[1]) || 1);
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
