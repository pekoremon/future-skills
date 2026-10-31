/* IT Puzzles (#/play): the daily challenge and practice rounds in the 5 IT areas, and the
   5-question check a learning-path video needs before it counts as done. Loaded before app.js
   and uses its helpers (api, cached, esc, render, readSaved) once a page opens. The server
   keeps the answers; the page only learns one after it sends a choice. */
"use strict";

const VIDEO_FORMATS = ["video", "playlist"];
const VIDEO_QUIZ_SIZE = 5;
const VIDEO_PASS_MARK = 4;
const PLAY_KEY = "future-skills-puzzles-v1";
const LETTERS = "ABCD";

// { best: {"area|level": most right in one round}, daily: {"YYYY-MM-DD": {correct, points}} }, in this browser.
let play = null;
const playStore = () => play || (play = (({ best, daily }) => ({ best: best || {}, daily: daily || {} }))(readSaved(PLAY_KEY) || {}));
const savePlay = () => writeSaved(PLAY_KEY, playStore());

// 4 of 4 right: 3 stars; 3: 2 stars; 2: 1 star.
const starsFor = (right, total) => (!total || right < Math.ceil(total / 2) ? 0 : right >= total ? 3 : right >= total - 1 ? 2 : 1);
const starHtml = (n) => `<span class="stars" role="img" aria-label="${n} of 3 stars">${"★".repeat(n)}<span class="stars-off">${"☆".repeat(3 - n)}</span></span>`;

function streak(day) {
  // Days in a row with the daily challenge played, up to today (or yesterday, before today's is played).
  const d = new Date(`${day}T00:00:00Z`);
  const daily = playStore().daily;
  if (!daily[day]) d.setUTCDate(d.getUTCDate() - 1);
  let n = 0;
  while (daily[d.toISOString().slice(0, 10)]) { n += 1; d.setUTCDate(d.getUTCDate() - 1); }
  return n;
}

async function pagePlay(a, b) {
  if (a === "daily") return pageDaily();
  if (a && b) return pageRound(a, b);
  return pagePlayHome();
}

async function pagePlayHome() {
  const [menu, daily] = await Promise.all([cached("/api/puzzles"), cached("/api/puzzles/daily").catch(() => null)]);
  const store = playStore();
  const levels = Object.fromEntries(menu.levels.map((l) => [l.id, l]));
  let points = Object.values(store.daily).reduce((t, d) => t + (d.points || 0), 0);
  let stars = 0;
  let maxStars = 0;
  for (const a of menu.areas) {
    for (const l of menu.levels) {
      const best = store.best[`${a.id}|${l.id}`] || 0;
      points += best * l.points;
      stars += starsFor(best, a.counts[l.id]);
      maxStars += 3;
    }
  }
  const played = daily && store.daily[daily.date];
  const dailyCard = daily ? `
    <section class="card stack daily-card" style="gap: 10px" aria-labelledby="daily-title">
      <div class="row" style="justify-content: space-between; gap: 8px">
        <p class="eyebrow">Daily challenge · ${esc(daily.date)}</p>
        <span class="chip">🔥 ${streak(daily.date)} day streak</span>
      </div>
      <h2 id="daily-title">${esc(nameIn(daily.area_name))} · ${esc(levels[daily.level].label)}</h2>
      <p class="muted small">One puzzle a day, the same for every student, worth double points (${daily.points}). ${daily.source === "llm" ? "Written today by AI." : "From the puzzle bank."} The area changes every day.</p>
      ${played
        ? `<div class="${played.correct ? "note" : "warn"}">${played.correct ? `You solved today's puzzle: +${played.points} points.` : "Not this time."} A new puzzle comes out tomorrow.</div>`
        : '<div class="row"><a class="btn primary" href="#/play/daily">Play today\'s puzzle</a></div>'}
    </section>` : "";
  render(`
  <div class="stack">
    <div class="stack" style="gap: 6px">
      <p class="eyebrow">Practise your IT skills</p>
      <h1>IT Puzzles</h1>
      <p class="lead">Short puzzles in the 5 IT areas: predict the output, spot the bug, read the log. Each round has 4 puzzles; get them all right for 3 stars.</p>
    </div>
    <div class="play-stats">
      <div class="card"><strong>${points}</strong><span class="muted small">points</span></div>
      <div class="card"><strong>${stars} / ${maxStars}</strong><span class="muted small">stars</span></div>
      <div class="card"><strong>${Object.keys(store.daily).length}</strong><span class="muted small">daily puzzles played</span></div>
    </div>
    ${dailyCard}
    <div class="play-areas">${menu.areas.map((a) => `
      <section class="card stack" style="gap: 8px">
        <h2>${esc(nameIn(a.name))}</h2>
        ${menu.levels.map((l) => {
          const best = store.best[`${a.id}|${l.id}`];
          return `<a class="level-row" href="#/play/${esc(a.id)}/${esc(l.id)}">
            <span><strong>${esc(l.label)}</strong> <span class="muted small">${l.points} points each</span></span>
            ${best === undefined ? '<span class="muted small">Play &rarr;</span>' : starHtml(starsFor(best, a.counts[l.id]))}
          </a>`;
        }).join("")}
      </section>`).join("")}
    </div>
    <p class="muted small">Your stars and points are saved in this browser.</p>
  </div>`);
}

// One puzzle at a time: the student picks an option, the server says if it is right and why.
function runPuzzles({ title, list, check, done }) {
  const results = [];
  const show = (i) => {
    const p = list[i];
    render(`
    <div class="stack play">
      <a class="btn ghost" href="#/play" style="align-self: flex-start">&larr; All puzzles</a>
      <div class="row" style="justify-content: space-between; gap: 8px">
        <p class="eyebrow">${esc(title)}</p>
        <span class="muted small">Puzzle ${i + 1} of ${list.length}</span>
      </div>
      <div class="progress" role="progressbar" aria-label="Round progress" aria-valuemin="0" aria-valuemax="${list.length}" aria-valuenow="${i}"><div style="width: ${(i / list.length) * 100}%"></div></div>
      <section class="card stack" style="gap: 12px">
        ${puzzleHtml(p)}
        <div id="feedback" aria-live="polite"></div>
      </section>
    </div>`);
    wireOptions(app, async (choice, buttons) => {
      const r = await check(p, choice);
      results.push(r);
      markAnswer(buttons, choice, r);
      const last = i + 1 === list.length;
      document.getElementById("feedback").innerHTML = `
        <div class="stack" style="gap: 10px">
          <div class="${r.correct ? "note" : "warn"}"><strong>${r.correct ? `Right! +${r.points} points` : "Not quite."}</strong>${r.correct ? "" : ` The answer is ${LETTERS[r.answer]}.`}</div>
          <p class="small">${esc(r.explain)}</p>
          <div class="row"><button class="btn primary" type="button" id="next">${last ? "See your result" : "Next puzzle"} &rarr;</button></div>
        </div>`;
      const next = document.getElementById("next");
      next.onclick = () => (last ? done(results) : show(i + 1));
      next.focus();
    });
  };
  show(0);
}

function puzzleHtml(p, n) {
  return `
    <span class="chip plain" style="align-self: flex-start">${esc(p.kind)}</span>
    <h2 class="puzzle-q">${n ? `${n}. ` : ""}${esc(p.prompt)}</h2>
    ${p.code ? `<pre class="code" data-no-i18n>${esc(p.code)}</pre>` : ""}
    <div class="options puzzle-options" role="group" aria-label="Answers" data-no-i18n>${p.options.map((o, i) => `
      <button type="button" data-i="${i}"><span class="opt-letter">${LETTERS[i]}</span><span>${esc(o)}</span></button>`).join("")}
    </div>`;
}

// Calls pick(choice, buttons) once, on the first option clicked inside root.
function wireOptions(root, pick) {
  const buttons = [...root.querySelectorAll(".puzzle-options button")];
  buttons.forEach((b) => {
    b.onclick = async () => {
      buttons.forEach((x) => { x.disabled = true; });
      b.setAttribute("aria-pressed", "true");
      try {
        await pick(Number(b.dataset.i), buttons);
      } catch (e) {
        buttons.forEach((x) => { x.disabled = false; });
        b.removeAttribute("aria-pressed");
        alert(`Could not check the answer: ${e.message}`);
      }
    };
  });
}

function markAnswer(buttons, choice, r) {
  buttons.forEach((x, i) => {
    x.removeAttribute("aria-pressed");
    if (i === r.answer) x.classList.add("is-right");
    else if (i === choice) x.classList.add("is-wrong");
  });
}

async function pageRound(area, level) {
  const [menu, round] = await Promise.all([cached("/api/puzzles"), api(`/api/puzzles/round?area=${encodeURIComponent(area)}&level=${encodeURIComponent(level)}`)]);
  const areaInfo = menu.areas.find((a) => a.id === area);
  const levelIds = menu.levels.map((l) => l.id);
  const levelInfo = menu.levels.find((l) => l.id === level);
  const title = `${nameIn(areaInfo.name)} · ${levelInfo.label}`;
  runPuzzles({
    title,
    list: round.puzzles,
    check: (p, choice) => api("/api/puzzles/check", { body: JSON.stringify({ id: p.id, choice }) }),
    done: (results) => {
      const right = results.filter((r) => r.correct).length;
      const total = results.length;
      const key = `${area}|${level}`;
      const store = playStore();
      const before = store.best[key];
      if (before === undefined || right > before) { store.best[key] = right; savePlay(); }
      const next = levelIds[levelIds.indexOf(level) + 1];
      render(`
      <div class="stack play">
        <section class="card stack round-result" style="gap: 12px">
          <p class="eyebrow">${esc(title)}</p>
          <h1>${right} of ${total} right</h1>
          <div class="big-stars">${starHtml(starsFor(right, total))}</div>
          <p>${right === total ? "Perfect round!" : right >= total - 1 ? "Nearly perfect. One more try for 3 stars?" : right >= total / 2 ? "Good start. Read the explanations and try again." : "This one is tricky. Try the round again, or start one level lower."}
            +${results.reduce((t, r) => t + r.points, 0)} points${before !== undefined && right <= before ? ` (your best is still ${before} of ${total})` : ""}.</p>
          <div class="row">
            ${next && right >= total - 1 ? `<a class="btn primary" href="#/play/${esc(area)}/${esc(next)}">Try ${esc(menu.levels.find((l) => l.id === next).label)} &rarr;</a>` : ""}
            <button class="btn${next && right >= total - 1 ? "" : " primary"}" type="button" id="again">Play again</button>
            <a class="btn ghost" href="#/play">All puzzles</a>
          </div>
        </section>
        <section class="card stack" style="gap: 6px">
          <h2>Use it on your career path</h2>
          <p class="small muted">Puzzles are practice only; the IT skills test is what counts towards your job matches.</p>
          <div class="row"><a class="btn" href="#/test">Take the IT skills test</a><a class="btn ghost" href="#/results">My job matches</a></div>
        </section>
      </div>`);
      document.getElementById("again").onclick = () => pageRound(area, level);
    },
  });
}

async function pageDaily() {
  render('<div class="card row" role="status"><span class="spinner" aria-hidden="true"></span><strong>Getting today\'s puzzle…</strong></div>');
  const daily = await cached("/api/puzzles/daily");
  const store = playStore();
  if (store.daily[daily.date]) { location.hash = "#/play"; return; }
  const level = (await cached("/api/puzzles")).levels.find((l) => l.id === daily.level);
  runPuzzles({
    title: `Daily challenge · ${daily.date} · ${nameIn(daily.area_name)} · ${level.label}`,
    list: [daily.puzzle],
    check: (p, choice) => api("/api/puzzles/daily/check", { body: JSON.stringify({ date: daily.date, choice }) }),
    done: ([r]) => {
      store.daily[daily.date] = { correct: r.correct, points: r.points };
      savePlay();
      render(`
      <div class="stack play">
        <section class="card stack round-result" style="gap: 12px">
          <p class="eyebrow">Daily challenge · ${esc(daily.date)}</p>
          <h1>${r.correct ? "Solved!" : "Not this time"}</h1>
          <p>${r.correct ? `+${r.points} points. ` : ""}🔥 ${streak(daily.date)} day streak. A new puzzle comes out tomorrow.</p>
          ${daily.source === "llm" ? '<p class="muted small">Today\'s puzzle was written by AI. If you think its answer is wrong, tell your lecturer or the Future Skills team.</p>' : ""}
          <div class="row"><a class="btn primary" href="#/play">Practise more puzzles</a></div>
        </section>
      </div>`);
    },
  });
}

/* ---------- video check: 5 questions, 4 right to mark a video done ---------- */

function videoQuiz(url, title, onPass) {
  const dialog = document.createElement("dialog");
  dialog.className = "quiz-dialog";
  dialog.setAttribute("aria-labelledby", "quiz-title");
  document.body.appendChild(dialog);
  dialog.addEventListener("close", () => dialog.remove());
  const frame = (body) => {
    dialog.innerHTML = `
      <div class="stack" style="gap: 14px">
        <div class="row" style="justify-content: space-between; gap: 8px; align-items: flex-start">
          <div class="stack" style="gap: 2px">
            <p class="eyebrow">Quick check before it counts as done</p>
            <h2 id="quiz-title">${esc(title)}</h2>
          </div>
          <button class="btn ghost" type="button" data-close aria-label="Close">✕</button>
        </div>
        ${body}
      </div>`;
    dialog.querySelectorAll("[data-close]").forEach((b) => { b.onclick = () => dialog.close(); });
  };
  const start = async () => {
    frame('<div class="row" role="status"><span class="spinner" aria-hidden="true"></span><strong>Writing your questions…</strong></div>');
    let quiz;
    try {
      quiz = await api("/api/puzzles/video", { body: JSON.stringify({ url }) });
    } catch (e) {
      frame(`<div class="warn">Could not load the quiz: ${esc(e.message)}</div><div class="row"><button class="btn" type="button" data-close>Close</button></div>`);
      return;
    }
    const answers = Array(quiz.questions.length).fill(null);
    frame(`
      <p class="small muted">Answer ${quiz.questions.length} questions on this video's topic${quiz.skills.length ? ` (${esc(quiz.skills.slice(0, 3).join(", "))})` : ""}. Get ${quiz.pass_mark} right and it is marked as done.
        ${quiz.source === "llm" ? "The questions are written by AI from the video's title and skills." : "The questions come from the puzzle bank for this IT area."}</p>
      ${quiz.questions.map((q, i) => `<section class="stack quiz-q" style="gap: 10px" data-q="${i}">${puzzleHtml(q, i + 1)}</section>`).join("")}
      <div class="row"><button class="btn primary" type="button" id="quiz-submit" disabled>Check my answers</button><span class="muted small" id="quiz-left">${quiz.questions.length} left</span></div>`);
    dialog.querySelectorAll("[data-q]").forEach((sec) => {
      const i = Number(sec.dataset.q);
      sec.querySelectorAll(".puzzle-options button").forEach((b) => {
        b.onclick = () => {
          answers[i] = Number(b.dataset.i);
          sec.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
          const left = answers.filter((a) => a === null).length;
          dialog.querySelector("#quiz-left").textContent = left ? `${left} left` : "All answered";
          dialog.querySelector("#quiz-submit").disabled = left > 0;
        };
      });
    });
    dialog.querySelector("#quiz-submit").onclick = async (e) => {
      e.target.disabled = true;
      let r;
      try {
        r = await api("/api/puzzles/video/check", { body: JSON.stringify({ quiz_id: quiz.quiz_id, answers }) });
      } catch (err) {
        e.target.disabled = false;
        alert(`Could not check the answers: ${err.message}`);
        return;
      }
      dialog.querySelectorAll("[data-q]").forEach((sec) => {
        const i = Number(sec.dataset.q);
        const res = r.results[i];
        sec.querySelectorAll(".puzzle-options button").forEach((b) => { b.disabled = true; });
        markAnswer([...sec.querySelectorAll(".puzzle-options button")], answers[i], res);
        sec.insertAdjacentHTML("beforeend", `<p class="small ${res.correct ? "muted" : ""}">${res.correct ? "✓ Right." : `✗ The answer is ${LETTERS[res.answer]}.`} ${esc(res.explain)}</p>`);
      });
      const verdict = `
        <div class="${r.passed ? "note" : "warn"} quiz-verdict" role="status">
          <strong>${r.score} of ${r.total} right.</strong>
          ${r.passed ? "Passed: this video is marked as done." : `You need ${r.pass_mark} to pass. Look again at the parts you missed, then try a new set of questions.`}
        </div>
        <div class="row">${r.passed ? '<button class="btn primary" type="button" data-close>Done</button>' : '<button class="btn primary" type="button" id="quiz-retry">Try new questions</button><button class="btn ghost" type="button" data-close>Later</button>'}</div>`;
      e.target.parentElement.outerHTML = verdict;
      dialog.querySelector(".quiz-verdict").scrollIntoView({ block: "nearest" });
      dialog.querySelectorAll("[data-close]").forEach((b) => { b.onclick = () => dialog.close(); });
      if (r.passed) onPass(r);
      else dialog.querySelector("#quiz-retry").onclick = start;
    };
  };
  dialog.showModal();
  start();
}
