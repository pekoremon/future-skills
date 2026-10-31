/* My learning as a game (#/progress): each learning path is a map of levels, the daily
   challenge and the video checks earn coins, and coins buy page backgrounds in the shop.
   A video only counts as done after a 5-question check with 4 right. Loaded before app.js
   and uses its helpers (api, cached, esc, render, progress, ...) once a page opens. The
   server keeps the answers; the page only learns one after it sends a choice. */
"use strict";

const VIDEO_FORMATS = ["video", "playlist"];
const QUIZ_FORMATS = [...VIDEO_FORMATS, "course"];  // these only count as done after the check
const VIDEO_QUIZ_SIZE = 5;
const VIDEO_PASS_MARK = 4;
const PLAY_KEY = "future-skills-puzzles-v1";
const LETTERS = "ABCD";
const COINS = { perRight: 10, perfect: 30, daily: { easy: 30, medium: 40, hard: 50 } };
// The shop. Coins come 30-50 a day from the daily challenge and up to 80 a video, so the first
// colour takes a few days and a special theme a few weeks. Colours tint the background
// (play.css); cursors swap the mouse pointer, and trails add an effect behind it; a special
// theme changes everything: picture, colours, fonts, banner and cursor.
const BACKGROUNDS = [
  { id: "classic", name: "Classic", price: 0 },
  { id: "orange", name: "Orange", price: 200 },
  { id: "pink", name: "Pink", price: 300 },
  { id: "red", name: "Red", price: 400 },
  { id: "purple", name: "Purple", price: 500 },
  { id: "blue", name: "Blue", price: 650 },
  { id: "gold", name: "Gold", price: 1000 },
];
const CURSORS = [
  { id: "arrow", name: "Normal", price: 0, icon: "↖" },
  { id: "coin", name: "Coin", price: 150, icon: "🪙" },
  { id: "star", name: "Star", price: 200, icon: "⭐" },
  { id: "rocket", name: "Rocket", price: 250, icon: "🚀" },
  { id: "cat", name: "Cat", price: 300, icon: "🐱" },
  { id: "sword", name: "Sword", price: 400, icon: "🗡️" },
  { id: "bubbles", name: "Bubble trail", price: 500, icon: "🫧", trail: ["🫧", "○", "◦"] },
  { id: "sparkle", name: "Sparkle trail", price: 600, icon: "✨", trail: ["✨", "⭐", "✦", "·"] },
];
const SPECIALS = [
  { id: "arcade", name: "Arcade", price: 1500, cursor: "👾", font: "Press+Start+2P", sample: "Press Start 2P",
    desc: "Neon grid, pixel font and a space-invader cursor." },
  { id: "space", name: "Outer space", price: 2000, cursor: "🚀", font: "Orbitron:wght@500;700", sample: "Orbitron",
    desc: "Stars, a ringed planet, a sci-fi font and a rocket cursor." },
  { id: "pirate", name: "Pirate ship", price: 2500, cursor: "🗡️", font: "Pirata+One", sample: "Pirata One",
    desc: "A ship at sea, parchment pages, a pirate font and a sword cursor." },
];
// Hints are used up: each one shows what to check first on one daily challenge.
const HINTS = [
  { id: "hint1", name: "1 hint", price: 20, count: 1 },
  { id: "hint3", name: "3 hints", price: 50, count: 3 },
  { id: "hint10", name: "10 hints", price: 150, count: 10 },
];
const SHOP_TABS = [
  { id: "hints", label: "💡 Hints", items: HINTS },
  { id: "colours", label: "Colours", items: BACKGROUNDS },
  { id: "cursors", label: "Cursors & effects", items: CURSORS },
  { id: "specials", label: "Special themes", items: SPECIALS },
];
const KIND = {
  video: { icon: "▶", label: "YouTube video" }, playlist: { icon: "▶", label: "YouTube playlist" },
  course: { icon: "📘", label: "Free course" }, project: { icon: "🛠", label: "Project" },
  certification: { icon: "🏅", label: "Certification" },
};
const ROW = 5;  // levels per row of the map

// { coins, earned, daily: {"YYYY-MM-DD": {correct, coins}}, video: {url: coins earned},
//   owned: [shop item ids], bg, cursor, special (null when off), hints (left to use),
//   hinted: {"YYYY-MM-DD": hint text already paid for} }, in this browser.
let play = null;
function playStore() {
  if (!play) {
    const s = readSaved(PLAY_KEY) || {};
    const sold = (list, id) => list.some((b) => b.id === id);  // items the shop no longer sells are dropped
    const all = [...BACKGROUNDS, ...CURSORS, ...SPECIALS];
    play = { coins: s.coins || 0, earned: s.earned || 0, daily: s.daily || {}, video: s.video || {},
      owned: [...new Set(["classic", "arrow", ...(s.owned || []).filter((id) => sold(all, id))])],
      bg: sold(BACKGROUNDS, s.bg) ? s.bg : "classic", cursor: sold(CURSORS, s.cursor) ? s.cursor : "arrow",
      special: sold(SPECIALS, s.special) ? s.special : null, hints: s.hints || 0, hinted: s.hinted || {} };
    applyLook();
  }
  return play;
}
const savePlay = () => writeSaved(PLAY_KEY, playStore());

function showCoins() {
  const el = document.getElementById("coin-count");
  if (el) el.textContent = playStore().coins;
}
function addCoins(n, why) {
  if (n <= 0) return;
  const s = playStore();
  s.coins += n;
  s.earned += n;
  savePlay();
  showCoins();
  const t = document.createElement("div");
  t.className = "coin-toast";
  t.setAttribute("role", "status");
  t.textContent = `+${n} 🪙 ${why}`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

function streak(day) {
  // Days in a row with the daily challenge played, up to today (or yesterday, before today's is played).
  const d = new Date(`${day}T00:00:00Z`);
  const daily = playStore().daily;
  if (!daily[day]) d.setUTCDate(d.getUTCDate() - 1);
  let n = 0;
  while (daily[d.toISOString().slice(0, 10)]) { n += 1; d.setUTCDate(d.getUTCDate() - 1); }
  return n;
}

/* ---------- the page ---------- */

async function pageMyLearning() {
  const daily = await cached("/api/puzzles/daily").catch(() => null);
  const s = playStore();
  const paths = trackedPaths();
  const cleared = Object.keys(progress.done).length;
  const played = daily && s.daily[daily.date];
  const dailyCard = daily ? `
    <section class="card stack daily-card" style="gap: 10px" aria-labelledby="daily-title">
      <div class="row" style="justify-content: space-between; gap: 8px">
        <p class="eyebrow">Daily challenge · ${esc(daily.date)}</p>
        <span class="chip">🔥 ${streak(daily.date)} day streak</span>
      </div>
      <h2 id="daily-title">${esc(nameIn(daily.area_name))} · ${esc(daily.level_label)}</h2>
      <p class="muted small">One code puzzle a day, the same for every student. Solve it for 🪙 ${COINS.daily[daily.level]} coins. The area changes every day. Stuck? Use a 💡 hint from the shop.</p>
      ${played
        ? `<div class="${played.correct ? "note" : "warn"}">${played.correct ? `Solved today: +${played.coins} 🪙.` : "Not this time."} A new challenge comes out tomorrow.</div>`
        : '<div class="row"><button class="btn primary" type="button" id="daily-go">Play today\'s challenge</button></div>'}
    </section>` : "";
  render(`
  <div class="stack">
    <div class="row" style="justify-content: space-between; align-items: flex-end; gap: 10px">
      <div class="stack" style="gap: 6px">
        <p class="eyebrow">Your learning journey</p>
        <h1>My learning</h1>
      </div>
      <button class="btn shop-btn" type="button" id="shop-open">🛍️ Shop</button>
    </div>
    <div class="play-stats">
      <div class="card"><strong>🪙 ${s.coins}</strong><span class="muted small">coins</span></div>
      <div class="card"><strong>★ ${cleared}</strong><span class="muted small">levels cleared</span></div>
      <div class="card"><strong>🔥 ${daily ? streak(daily.date) : 0}</strong><span class="muted small">day streak</span></div>
    </div>
    ${dailyCard}
    ${paths.length ? paths.map(pathMapHtml).join("") + `
      <a class="card impact-link" href="#/impact">${sdgTile(4, "Quality Education")}<span class="stack" style="gap: 2px"><strong>Your hours count towards SDG 4 and 8</strong><span class="small muted">See what every student here adds up to →</span></span></a>` : `
      <section class="card stack" style="gap: 10px">
        <h2>No learning path yet</h2>
        <p class="muted">Open a learning path from your jobs and tick the first thing you finish. It then shows here as a map of levels.</p>
        <div class="row"><a class="btn primary" href="#/results">Go to my jobs &rarr;</a></div>
      </section>`}
    <p class="muted small">Coins, levels and shop items are saved in this browser.</p>
  </div>`);
  document.getElementById("shop-open").onclick = () => openShop();
  document.getElementById("daily-go")?.addEventListener("click", () => dailyChallenge(daily));
  app.querySelectorAll("[data-level]").forEach((b) => {
    b.onclick = () => levelDialog(b.dataset.path, b.dataset.level, Number(b.dataset.n));
  });
  app.querySelectorAll("[data-plan]").forEach((box) => wirePlan(box, () => { box.innerHTML = planHtml(box.dataset.plan); }));
  app.querySelectorAll("[data-untrack]").forEach((b) => {
    b.onclick = () => {
      delete progress.paths[b.dataset.untrack];  // ticks stay, so they come back if the path is opened again
      saveProgress();
      pageMyLearning();
    };
  });
}

// One path as rows of levels that snake left-right, right-left, joined by a line.
function pathMapHtml(p) {
  const keys = Object.keys(p.items);
  const current = keys.findIndex((k) => !progress.done[k]);
  const node = (k, i) => {
    const m = (p.meta || {})[k] || {};
    const kind = KIND[m.kind] || { icon: "•", label: "Item" };
    const done = Boolean(progress.done[k]);
    const cls = done ? "done" : i === current ? "current" : "todo";
    return `<button type="button" class="lv-node ${cls}" data-path="${esc(p.id)}" data-level="${esc(k)}" data-n="${i + 1}"
      aria-label="Level ${i + 1}: ${esc(m.title || kind.label)}${done ? " (cleared)" : ""}" title="${esc(m.title || kind.label)}">
      <span class="lv-icon" aria-hidden="true">${done ? "★" : kind.icon}</span><span class="lv-num" aria-hidden="true">${i + 1}</span>
    </button>`;
  };
  const rows = [];
  for (let r = 0; r * ROW < keys.length; r += 1) {
    const slice = keys.slice(r * ROW, r * ROW + ROW);
    const cells = [];
    for (let c = 0; c < ROW; c += 1) {
      if (c) cells.push(`<span class="lv-link${c < slice.length && progress.done[slice[c - 1]] ? " on" : ""}${c >= slice.length ? " off" : ""}" aria-hidden="true"></span>`);
      cells.push(c < slice.length ? node(slice[c], r * ROW + c) : '<span class="lv-slot" aria-hidden="true"></span>');
    }
    rows.push(`<div class="lv-row${r % 2 ? " rev" : ""}${(r + 1) * ROW < keys.length ? " more" : ""}">${cells.join("")}</div>`);
  }
  const next = current >= 0 ? (p.meta || {})[keys[current]] : null;
  return `
    <article class="card stack" style="gap: 12px">
      <div class="row" style="justify-content: space-between; gap: 8px">
        <h2>${esc(p.name)}</h2>
        ${p.pct === 100 ? '<span class="chip">All levels cleared 🏆</span>' : `<span class="chip plain">${esc(nameIn(p.area || "IT"))}</span>`}
      </div>
      ${progressHtml(p, state.hoursPerWeek)}
      ${next ? `<p class="small">Next level: <strong>${esc(next.title)}</strong></p>` : ""}
      <div class="lv-map" role="group" aria-label="Levels of ${esc(p.name)}">${rows.join("")}</div>
      <div data-plan="${esc(p.id)}">${planHtml(p.id)}</div>
      <div class="row">
        <a class="btn" href="#/learn/${esc(p.id)}">Open the full path &rarr;</a>
        <button class="btn ghost" type="button" data-untrack="${esc(p.id)}">Stop tracking</button>
      </div>
    </article>`;
}

function levelDialog(pathId, key, n) {
  const p = progress.paths[pathId];
  const m = (p.meta || {})[key] || { title: `Level ${n}`, kind: "", url: "" };
  const kind = KIND[m.kind] || { icon: "•", label: "Item" };
  const isVideo = VIDEO_FORMATS.includes(m.kind);
  const checked = QUIZ_FORMATS.includes(m.kind);
  const done = Boolean(progress.done[key]);
  const { dialog, frame } = openDialog();
  frame(`Level ${n} · ${kind.label}`, m.title, `
    ${done
      ? `<div class="note">Cleared on ${esc(progress.done[key])} ★${progress.quizzes[key] ? ` · check ${progress.quizzes[key].score}/${progress.quizzes[key].total}` : ""}</div>`
      : `<p class="small muted">${checked ? `${isVideo ? "Watch" : "Finish"} it, then pass a ${VIDEO_QUIZ_SIZE}-question check (${VIDEO_PASS_MARK} right) to clear this level. Every right answer earns 🪙 ${COINS.perRight}; all ${VIDEO_QUIZ_SIZE} right earns 🪙 ${COINS.perfect} more.` : "Finish it, then mark the level as cleared."}</p>`}
    <div class="row">
      ${/^https?:\/\//i.test(m.url || "") ? `<a class="btn" href="${safeUrl(m.url)}" target="_blank" rel="noopener">Open ${isVideo ? "video" : "it"} ↗</a>` : ""}
      ${done ? '<button class="btn ghost" type="button" id="lv-undo">Mark as not done</button>'
        : `<button class="btn primary" type="button" id="lv-done">${checked && !progress.quizzes[key] ? "Start the test" : "Mark as cleared"}</button>`}
    </div>`);
  const finish = () => {
    progress.done[key] = today();
    p.updated = today();
    saveProgress();
    reportPath(pathId);  // the SDG impact page counts the hours studied
    pageMyLearning();
  };
  dialog.querySelector("#lv-done")?.addEventListener("click", () => {
    if (checked && !progress.quizzes[key]) {
      dialog.close();
      videoQuiz(key, m.title, (r) => { progress.quizzes[key] = { score: r.score, total: r.total, date: today() }; finish(); });
    } else {
      dialog.close();
      finish();
    }
  });
  dialog.querySelector("#lv-undo")?.addEventListener("click", () => {
    delete progress.done[key];
    saveProgress();
    reportPath(pathId);
    dialog.close();
    pageMyLearning();
  });
}

/* ---------- shop: colours, cursors and effects, special themes ---------- */

const emojiCursor = (ch) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34"><text x="2" y="27" font-size="26">${ch}</text></svg>`)}") 6 6, auto`;

// Puts the saved colour, cursor, trail and special theme on the page (index.html sets the
// colour and theme before first paint; this adds the cursor, fonts and trail).
function applyLook() {
  const s = play;
  const root = document.documentElement;
  const special = SPECIALS.find((x) => x.id === s.special);
  if (special) { root.dataset.special = special.id; delete root.dataset.bg; }
  else { delete root.dataset.special; if (s.bg && s.bg !== "classic") root.dataset.bg = s.bg; else delete root.dataset.bg; }
  const cursor = CURSORS.find((c) => c.id === s.cursor);
  const icon = special ? special.cursor : cursor && cursor.id !== "arrow" && !cursor.trail ? cursor.icon : null;
  if (icon) { root.dataset.cursor = "on"; root.style.setProperty("--cursor", emojiCursor(icon)); }
  else { delete root.dataset.cursor; root.style.removeProperty("--cursor"); }
  trailChars = cursor && cursor.trail ? cursor.trail : null;
  if (special && !document.getElementById(`font-${special.id}`)) {
    const link = document.createElement("link");
    link.id = `font-${special.id}`;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${special.font}&display=swap`;
    document.head.appendChild(link);
  }
}

// Trail effects: a few characters that float up and fade behind the mouse.
let trailChars = null;
let trailLast = 0;
const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
document.addEventListener("mousemove", (e) => {
  if (!trailChars || calm.matches || e.timeStamp - trailLast < 40) return;
  trailLast = e.timeStamp;
  const dot = document.createElement("span");
  dot.className = "trail-dot";
  dot.setAttribute("aria-hidden", "true");
  dot.textContent = trailChars[Math.floor(Math.random() * trailChars.length)];
  dot.style.left = `${e.clientX}px`;
  dot.style.top = `${e.clientY}px`;
  document.body.appendChild(dot);
  setTimeout(() => dot.remove(), 900);
});

function openShop(tab = "hints") {
  const { dialog, frame } = openDialog();
  dialog.classList.add("shop-dialog");
  const draw = (current) => {
    const s = playStore();
    const t = SHOP_TABS.find((x) => x.id === current);
    const equipped = (kind, id) => (kind === "colours" ? s.bg === id && !s.special : kind === "cursors" ? s.cursor === id : s.special === id);
    const preview = (kind, it) => (kind === "colours" ? `<div class="bg-swatch bg-${it.id}" aria-hidden="true"></div>`
      : kind === "cursors" || kind === "hints" ?`<div class="shop-icon" aria-hidden="true">${it.icon}</div>`
      : `<div class="special-thumb" aria-hidden="true" style="background-image: url('/static/themes/${it.id}.svg')"><span style="font-family: '${it.sample}', serif">Aa ${it.cursor}</span></div>`);
    frame("Shop", `🪙 ${s.coins} coins`, `
      <div class="shop-tabs" role="tablist">${SHOP_TABS.map((x) => `<button type="button" role="tab" aria-selected="${x.id === current}" data-tab="${x.id}">${esc(x.label)}</button>`).join("")}</div>
      ${current === "colours" && s.special ? '<p class="small warn">A special theme is on, so colours are hidden. Turn it off on the Special themes tab.</p>' : ""}
      ${current === "hints" ? `<p class="small muted">Stuck on the daily challenge? A hint tells you what to check or try first, without giving the answer away. You have <strong>💡 ${s.hints}</strong>.</p>` : ""}
      <div class="shop-grid">${t.items.map((it) => {
        if (current === "hints") {
          return `<div class="shop-item"><div class="shop-icon" aria-hidden="true"><span>💡<small class="hint-count">×${it.count}</small></span></div><strong>${esc(it.name)}</strong>
            <button class="btn${s.coins >= it.price ? " primary" : ""}" type="button" data-hints="${it.id}"${s.coins >= it.price ? "" : " disabled"}>🪙 ${it.price}</button></div>`;
        }
        const owned = s.owned.includes(it.id);
        const on = equipped(current, it.id);
        const action = on ? (current === "specials" ? `<button class="btn" type="button" data-off>Turn off</button>` : '<span class="chip">In use</span>')
          : owned ? `<button class="btn" type="button" data-use="${it.id}">Use</button>`
          : `<button class="btn${s.coins >= it.price ? " primary" : ""}" type="button" data-buy="${it.id}"${s.coins >= it.price ? "" : " disabled"}>🪙 ${it.price}</button>`;
        return `<div class="shop-item${on ? " using" : ""}">${preview(current, it)}<strong>${esc(it.name)}</strong>${it.desc ? `<span class="muted small">${esc(it.desc)}</span>` : ""}${action}</div>`;
      }).join("")}</div>`);
    const use = (id) => {
      if (current === "colours") { s.bg = id; s.special = null; } else if (current === "cursors") s.cursor = id; else s.special = id;
      savePlay();
      applyLook();
      draw(current);
    };
    dialog.querySelectorAll("[data-tab]").forEach((b) => { b.onclick = () => draw(b.dataset.tab); });
    dialog.querySelectorAll("[data-use]").forEach((b) => { b.onclick = () => use(b.dataset.use); });
    dialog.querySelector("[data-off]")?.addEventListener("click", () => { s.special = null; savePlay(); applyLook(); draw(current); });
    dialog.querySelectorAll("[data-hints]").forEach((b) => {
      b.onclick = () => {
        const it = HINTS.find((x) => x.id === b.dataset.hints);
        if (!it || s.coins < it.price) return;
        s.coins -= it.price;
        s.hints += it.count;
        savePlay();
        showCoins();
        draw(current);
      };
    });
    dialog.querySelectorAll("[data-buy]").forEach((b) => {
      b.onclick = () => {
        const it = t.items.find((x) => x.id === b.dataset.buy);
        if (!it || s.coins < it.price || s.owned.includes(it.id)) return;
        s.coins -= it.price;
        s.owned.push(it.id);
        showCoins();
        use(it.id);
      };
    });
  };
  draw(tab);
  dialog.addEventListener("close", () => { if (location.hash === "#/progress") pageMyLearning(); });
}

/* ---------- dialogs: daily challenge and video check ---------- */

function openDialog() {
  const dialog = document.createElement("dialog");
  dialog.className = "quiz-dialog";
  dialog.setAttribute("aria-labelledby", "quiz-title");
  document.body.appendChild(dialog);
  dialog.addEventListener("close", () => dialog.remove());
  const frame = (eyebrow, title, body) => {
    dialog.innerHTML = `
      <div class="stack" style="gap: 14px">
        <div class="row" style="justify-content: space-between; gap: 8px; align-items: flex-start; flex-wrap: nowrap">
          <div class="stack" style="gap: 2px">
            <p class="eyebrow">${esc(eyebrow)}</p>
            <h2 id="quiz-title">${esc(title)}</h2>
          </div>
          <button class="btn ghost" type="button" data-close aria-label="Close">✕</button>
        </div>
        ${body}
      </div>`;
    dialog.querySelectorAll("[data-close]").forEach((b) => { b.onclick = () => dialog.close(); });
  };
  dialog.showModal();
  return { dialog, frame };
}

function puzzleHtml(p, n) {
  return `
    <span class="chip plain" style="align-self: flex-start">${esc(p.kind)}</span>
    <h3 class="puzzle-q">${n ? `${n}. ` : ""}${esc(p.prompt)}</h3>
    ${p.code ? `<pre class="code" data-no-i18n>${esc(p.code)}</pre>` : ""}
    <div class="options puzzle-options" role="group" aria-label="Answers" data-no-i18n>${p.options.map((o, i) => `
      <button type="button" data-i="${i}"><span class="opt-letter">${LETTERS[i]}</span><span>${esc(o)}</span></button>`).join("")}
    </div>`;
}

function markAnswer(buttons, choice, r) {
  buttons.forEach((x, i) => {
    x.disabled = true;
    x.removeAttribute("aria-pressed");
    if (i === r.answer) x.classList.add("is-right");
    else if (i === choice) x.classList.add("is-wrong");
  });
}

function dailyChallenge(daily) {
  const { dialog, frame } = openDialog();
  const reward = COINS.daily[daily.level];
  frame(`Daily challenge · ${daily.date}`, `${nameIn(daily.area_name)} · ${daily.level_label}`, `
    <p class="small muted">Solve it for 🪙 ${reward}. One try only.</p>
    <section class="stack quiz-q" style="gap: 10px">${puzzleHtml(daily.puzzle)}</section>
    <div class="hint-box" id="daily-hint" aria-live="polite"></div>
    <div id="daily-feedback" aria-live="polite"></div>`);
  const buttons = [...dialog.querySelectorAll(".puzzle-options button")];
  const hintBox = dialog.querySelector("#daily-hint");
  const drawHint = () => {
    const s = playStore();
    const seen = s.hinted[daily.date];
    hintBox.innerHTML = seen ? `<div class="note"><strong>💡 Hint:</strong> ${esc(seen)}</div>`
      : s.hints ? `<button class="btn" type="button" id="hint-use">💡 Use a hint <span class="muted small">(${s.hints} left)</span></button>`
      : '<button class="btn ghost" type="button" id="hint-shop">💡 Get hints in the shop</button>';
    hintBox.querySelector("#hint-use")?.addEventListener("click", async (e) => {
      e.target.closest("button").disabled = true;
      try {
        const r = await api("/api/puzzles/daily/hint", { body: JSON.stringify({ date: daily.date }) });
        s.hints -= 1;
        s.hinted[daily.date] = r.hint;
        savePlay();
      } catch (err) {
        alert(`Could not get the hint: ${err.message}`);
      }
      drawHint();
    });
    hintBox.querySelector("#hint-shop")?.addEventListener("click", () => {
      dialog.close();
      openShop("hints");
    });
  };
  drawHint();
  buttons.forEach((b) => {
    b.onclick = async () => {
      buttons.forEach((x) => { x.disabled = true; });
      const choice = Number(b.dataset.i);
      let r;
      try {
        r = await api("/api/puzzles/daily/check", { body: JSON.stringify({ date: daily.date, choice }) });
      } catch (e) {
        buttons.forEach((x) => { x.disabled = false; });
        alert(`Could not check the answer: ${e.message}`);
        return;
      }
      markAnswer(buttons, choice, r);
      const s = playStore();
      if (!s.hinted[daily.date]) hintBox.innerHTML = "";  // too late for a hint
      s.daily[daily.date] = { correct: r.correct, coins: r.correct ? reward : 0 };
      savePlay();
      if (r.correct) addCoins(reward, "daily challenge");
      dialog.querySelector("#daily-feedback").innerHTML = `
        <div class="stack" style="gap: 10px">
          <div class="${r.correct ? "note" : "warn"}"><strong>${r.correct ? `Solved! +${reward} 🪙` : `Not quite. The answer is ${LETTERS[r.answer]}.`}</strong> 🔥 ${streak(daily.date)} day streak.</div>
          <p class="small">${esc(r.explain)}</p>
          <div class="row"><button class="btn primary" type="button" data-close>Back to my levels</button></div>
        </div>`;
      dialog.querySelectorAll("[data-close]").forEach((x) => { x.onclick = () => dialog.close(); });
      dialog.addEventListener("close", () => { if (location.hash === "#/progress") pageMyLearning(); });
    };
  });
}

// The 5-question check on a learning-path video. Coins: 10 per right answer and 30 more for
// all 5, counted once per video (a retry only adds what beats the best try so far).
function videoQuiz(url, title, onPass) {
  const { dialog, frame } = openDialog();
  const eyebrow = "Quick check before it counts as done";
  const start = async () => {
    frame(eyebrow, title, '<div class="row" role="status"><span class="spinner" aria-hidden="true"></span><strong>Writing your questions…</strong></div>');
    let quiz;
    try {
      quiz = await api("/api/puzzles/video", { body: JSON.stringify({ url }) });
    } catch (e) {
      frame(eyebrow, title, `<div class="warn">Could not load the check: ${esc(e.message)}</div><div class="row"><button class="btn" type="button" data-close>Close</button></div>`);
      return;
    }
    const answers = Array(quiz.questions.length).fill(null);
    frame(eyebrow, title, `
      <p class="small muted">${quiz.questions.length} questions on this topic${quiz.skills.length ? ` (${esc(quiz.skills.slice(0, 3).join(", "))})` : ""}. Get ${quiz.pass_mark} right to clear it. Each right answer earns 🪙 ${COINS.perRight}; all ${quiz.questions.length} earns 🪙 ${COINS.perfect} more.</p>
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
        markAnswer([...sec.querySelectorAll(".puzzle-options button")], answers[i], res);
        sec.insertAdjacentHTML("beforeend", `<p class="small">${res.correct ? "✓ Right." : `✗ The answer is ${LETTERS[res.answer]}.`} ${esc(res.explain)}</p>`);
      });
      const s = playStore();
      const worth = r.score * COINS.perRight + (r.score === r.total ? COINS.perfect : 0);
      const gain = Math.max(0, worth - (s.video[url] || 0));
      if (gain) { s.video[url] = worth; savePlay(); addCoins(gain, "video check"); }
      e.target.parentElement.outerHTML = `
        <div class="${r.passed ? "note" : "warn"} quiz-verdict" role="status">
          <strong>${r.score} of ${r.total} right${gain ? ` · +${gain} 🪙` : ""}.</strong>
          ${r.passed ? "Level cleared ★" : `You need ${r.pass_mark} to clear it. Look again at the parts you missed, then try a new set of questions.`}
          ${!gain && r.score ? '<span class="small">(Coins only come from beating your best try on this video.)</span>' : ""}
        </div>
        <div class="row">${r.passed ? '<button class="btn primary" type="button" data-close>Done</button>' : '<button class="btn primary" type="button" id="quiz-retry">Try new questions</button><button class="btn ghost" type="button" data-close>Later</button>'}</div>`;
      dialog.querySelector(".quiz-verdict").scrollIntoView({ block: "nearest" });
      dialog.querySelectorAll("[data-close]").forEach((b) => { b.onclick = () => dialog.close(); });
      if (r.passed) onPass(r);
      else dialog.querySelector("#quiz-retry").onclick = start;
    };
  };
  start();
}

// The coin count and the shop look, once app.js has loaded (readSaved is defined there).
window.addEventListener("DOMContentLoaded", showCoins);
