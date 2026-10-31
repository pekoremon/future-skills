/* The pirate crew of the interest questionnaire: a sailor drawn in SVG who acts out each answer,
   a live RIASEC hexagon, and the crew role the sailor becomes at the end. Each RIASEC type is
   one crew role. Decoration over the same 36 items and scoring: the hexagon reaches exactly the
   final percent scores (sum of (answer - 1) / 4 per item, over 6 items per type).
   Loaded before app.js. */
"use strict";

const CREW = {
  R: { icon: "⚒️", role: "Shipwright", adj: "Handy", color: "#B5651D",
    desc: "You like building and fixing real things. On the ship, you keep everything working.",
    it: "Hardware, networks, cloud infrastructure" },
  I: { icon: "🧭", role: "Navigator", adj: "Curious", color: "#2B6CB0",
    desc: "You like working out how things work. You read the stars and find the route.",
    it: "Data, AI, finding and fixing bugs" },
  A: { icon: "🎻", role: "Bard", adj: "Creative", color: "#7B4FB8",
    desc: "You like making things that look and feel good. You give the ship its style.",
    it: "Interface design, games, media" },
  S: { icon: "🩹", role: "Ship's Doctor", adj: "Caring", color: "#2F8F5B",
    desc: "You like helping people. The crew comes to you when they need help.",
    it: "IT support, training, education technology" },
  E: { icon: "🚩", role: "Captain", adj: "Bold", color: "#C0392B",
    desc: "You like leading and making decisions. You set the course and rally the crew.",
    it: "Project and product management, starting a business" },
  C: { icon: "📜", role: "Quartermaster", adj: "Organised", color: "#8A6D1F",
    desc: "You like order and getting the details right. You keep the supplies and the treasure in check.",
    it: "Databases, cybersecurity, IT operations" },
};
const CREW_ORDER = ["R", "I", "A", "S", "E", "C"];

// Hexagon value of each type so far, 0-100. With all 36 answered it equals the final percent.
function crewScores(items, answers) {
  const out = Object.fromEntries(CREW_ORDER.map((k) => [k, 0]));
  items.forEach((it, i) => { if (answers[i]) out[it.type] += ((answers[i] - 1) / 4) * (100 / 6); });
  return out;
}

// How the sailor reacts to one answer: the type's action for 4-5, a nod for 3, a head scratch for 1-2.
const crewReaction = (type, answer) => (answer >= 4 ? type : answer === 3 ? "nod" : "scratch");

let sailorCount = 0;
/* opts: { role: top type once evolved, hold: type whose prop is held, cls: extra classes,
   size: true to draw at 200 x 240 inside another SVG } */
function sailorSVG(opts = {}) {
  const id = `sailor-${++sailorCount}`;
  const role = opts.role || "";
  const hold = opts.hold ? ` hold-${opts.hold}` : "";
  return `<svg class="sailor${role ? ` is-${role}` : ""}${hold}${opts.cls ? ` ${opts.cls}` : ""}" viewBox="0 0 200 240"${opts.size ? ' width="200" height="240"' : ""} aria-hidden="true" focusable="false">
  <defs><clipPath id="${id}-torso"><rect x="70" y="112" width="60" height="66" rx="18"/></clipPath></defs>
  <ellipse cx="100" cy="228" rx="46" ry="7" class="s-shadow"/>
  <g class="s-fx">
    <text class="fx-spark" x="150" y="96">✦</text><text class="fx-spark s2" x="166" y="120">✦</text>
    <text class="fx-note" x="140" y="70">♪</text><text class="fx-note s2" x="160" y="92">♫</text>
    <text class="fx-heart" x="132" y="78">♥</text><text class="fx-heart s2" x="150" y="98">♥</text>
    <circle class="fx-coin" cx="90" cy="150" r="6"/><circle class="fx-coin s2" cx="104" cy="150" r="6"/><circle class="fx-coin s3" cx="118" cy="150" r="6"/>
    <text class="fx-ask" x="40" y="60">?</text>
  </g>
  <g class="s-body">
    <rect x="82" y="168" width="16" height="48" rx="7" fill="#2C3E63"/>
    <rect x="102" y="168" width="16" height="48" rx="7" fill="#2C3E63"/>
    <ellipse cx="88" cy="217" rx="11" ry="6" fill="#3B2A20"/><ellipse cx="112" cy="217" rx="11" ry="6" fill="#3B2A20"/>
    <g clip-path="url(#${id}-torso)">
      <rect x="70" y="112" width="60" height="66" fill="#F4F1EA"/>
      <rect x="70" y="124" width="60" height="7" fill="#2C3E63"/><rect x="70" y="140" width="60" height="7" fill="#2C3E63"/><rect x="70" y="156" width="60" height="7" fill="#2C3E63"/>
      <rect x="70" y="170" width="60" height="8" fill="#2C3E63"/>
    </g>
    <!-- evolved outfits, over the shirt -->
    <g class="o o-R"><path d="M80 128 h40 v46 a6 6 0 0 1 -6 6 h-28 a6 6 0 0 1 -6 -6z" fill="#8B5A2B"/><rect x="72" y="160" width="56" height="7" fill="#5A3A1A"/><rect x="93" y="140" width="14" height="10" rx="2" fill="#5A3A1A"/></g>
    <g class="o o-I"><path d="M70 130 a18 18 0 0 1 18 -18 h4 l8 22 l8 -22 h4 a18 18 0 0 1 18 18 v48 h-20 v-30 h-20 v30 h-20z" fill="#2B4C8C"/><circle cx="84" cy="150" r="2.5" fill="#E8C468"/><circle cx="116" cy="150" r="2.5" fill="#E8C468"/></g>
    <g class="o o-A"><path d="M78 114 q22 18 44 0 l4 10 q-26 20 -52 0z" fill="#F2B632"/><path d="M118 122 l8 30 l-8 -4z" fill="#F2B632"/></g>
    <g class="o o-S"><path d="M70 130 a18 18 0 0 1 18 -18 h24 a18 18 0 0 1 18 18 v48 h-60z" fill="#FAFAFA" stroke="#D5DBE3"/><path d="M100 114 v64" stroke="#D5DBE3"/><path d="M114 136 q4 -5 8 0 q4 -5 8 0 q0 6 -8 11 q-8 -5 -8 -11z" fill="#E05A6B" transform="translate(-6 0)"/></g>
    <g class="o o-E"><path d="M70 130 a18 18 0 0 1 18 -18 h4 l8 16 l8 -16 h4 a18 18 0 0 1 18 18 v48 h-60z" fill="#B23A3A"/><g fill="#E8C468"><circle cx="92" cy="140" r="3"/><circle cx="92" cy="154" r="3"/><circle cx="108" cy="140" r="3"/><circle cx="108" cy="154" r="3"/></g><rect x="70" y="164" width="60" height="6" fill="#3B2A20"/><rect x="96" y="162" width="10" height="10" rx="2" fill="#E8C468"/></g>
    <g class="o o-C"><path d="M76 116 h48 v62 h-48z" fill="#3E6B48"/><path d="M100 116 l-10 14 l10 48 l10 -48z" fill="#F4F1EA"/><g fill="#E8C468"><circle cx="100" cy="142" r="2.5"/><circle cx="100" cy="156" r="2.5"/></g><circle cx="118" cy="150" r="5" fill="#E8C468"/></g>
  </g>
  <g class="s-arm s-arm-l">
    <rect x="64" y="116" width="14" height="46" rx="7" class="s-sleeve"/><circle cx="71" cy="164" r="7.5" fill="#EDB98A"/>
  </g>
  <g class="s-arm s-arm-r">
    <g class="p p-R"><rect x="126" y="160" width="34" height="6" rx="3" fill="#7A4E2D"/><rect x="154" y="149" width="12" height="28" rx="3" fill="#7D8794"/></g>
    <g class="p p-I"><rect x="124" y="166" width="10" height="20" rx="2" fill="#C9A24A"/><rect x="125" y="184" width="8" height="18" rx="2" fill="#E0BE66"/><rect x="123" y="200" width="12" height="5" rx="2" fill="#7D8794"/></g>
    <g class="p p-A"><path d="M129 166 L 86 150" stroke="#3B2A20" stroke-width="2.5" stroke-linecap="round"/></g>
    <g class="p p-E"><rect x="127" y="150" width="4" height="78" rx="2" fill="#5A3A1A"/><path class="flag" d="M127 196 h-34 l8 9 l-8 9 h34z" fill="#C0392B"/><circle cx="129" cy="230" r="4" fill="#E8C468"/></g>
    <rect x="122" y="116" width="14" height="46" rx="7" class="s-sleeve"/><circle cx="129" cy="164" r="7.5" fill="#EDB98A"/>
  </g>
  <!-- props held in front of the body -->
  <g class="p p-A"><ellipse cx="78" cy="122" rx="11" ry="16" fill="#9A4E1C" transform="rotate(-35 78 122)"/><ellipse cx="78" cy="122" rx="5" ry="7" fill="#6B3410" transform="rotate(-35 78 122)"/><rect x="82" y="92" width="5" height="30" rx="2" fill="#3B2A20" transform="rotate(-35 84 107)"/></g>
  <g class="p p-S"><rect x="84" y="152" width="32" height="24" rx="5" fill="#FAFAFA" stroke="#9AA6B4"/><path d="M95 160 q2.5 -3 5 0 q2.5 -3 5 0 q0 4 -5 7.5 q-5 -3.5 -5 -7.5z" fill="#E05A6B"/></g>
  <g class="p p-C"><rect x="82" y="148" width="36" height="28" rx="3" fill="#7A4E2D"/><rect x="86" y="151" width="28" height="22" rx="2" fill="#F4ECD8"/><path d="M90 157 h20 M90 162 h20 M90 167 h14" stroke="#9AA6B4" stroke-width="1.5"/></g>
  <g class="s-head">
    <circle cx="100" cy="78" r="38" fill="#EDB98A"/>
    <path class="bandana" d="M62 74 a38 38 0 0 1 76 0 q-38 -12 -76 0z" fill="#D64545"/><circle class="bandana" cx="62" cy="76" r="5" fill="#D64545"/>
    <ellipse cx="86" cy="84" rx="4" ry="5" fill="#2B2B2B"/><ellipse cx="114" cy="84" rx="4" ry="5" fill="#2B2B2B"/>
    <circle cx="80" cy="96" r="5" fill="#F29C8F" opacity="0.6"/><circle cx="120" cy="96" r="5" fill="#F29C8F" opacity="0.6"/>
    <path d="M92 98 q8 7 16 0" stroke="#2B2B2B" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <!-- evolved hats -->
    <g class="o o-R"><path d="M62 72 a38 38 0 0 1 76 0 q-38 -10 -76 0z" fill="#E07B24"/><rect x="62" y="66" width="76" height="8" rx="4" fill="#8B5A2B"/></g>
    <g class="o o-I"><path d="M64 64 q36 -34 72 0 q-36 -8 -72 0z" fill="#1E3A6E"/><rect x="62" y="62" width="76" height="6" rx="3" fill="#1E3A6E"/><circle cx="86" cy="84" r="9" fill="none" stroke="#3B2A20" stroke-width="2"/><circle cx="114" cy="84" r="9" fill="none" stroke="#3B2A20" stroke-width="2"/><path d="M95 84 h10" stroke="#3B2A20" stroke-width="2"/></g>
    <g class="o o-A"><ellipse cx="96" cy="50" rx="40" ry="14" fill="#7B4FB8" transform="rotate(-8 96 50)"/><path d="M118 44 q26 -26 30 -8 q-12 2 -30 8z" fill="#F2B632"/></g>
    <g class="o o-S"><rect x="62" y="56" width="76" height="12" rx="6" fill="#FAFAFA" stroke="#D5DBE3"/><path d="M95 59 q2.5 -3 5 0 q2.5 -3 5 0 q0 4 -5 7 q-5 -3 -5 -7z" fill="#E05A6B"/></g>
    <g class="o o-E"><path d="M48 58 q52 -48 104 0 q-52 -14 -104 0z" fill="#22252B"/><path d="M48 58 q52 -14 104 0" stroke="#E8C468" stroke-width="3" fill="none"/><circle cx="100" cy="36" r="5" fill="#E8C468"/></g>
    <g class="o o-C"><path d="M66 60 q34 -26 68 0z" fill="#3E6B48"/><rect x="62" y="58" width="76" height="6" rx="3" fill="#2E4F35"/><path d="M134 66 q14 -22 6 -36 q-2 18 -10 32z" fill="#F4F1EA" stroke="#9AA6B4"/></g>
  </g>
</svg>`;
}

// Replays one reaction on a drawn sailor.
function sailorAct(svg, action) {
  if (!svg) return;
  svg.classList.remove(...[...svg.classList].filter((c) => c.startsWith("act-")));
  void svg.getBoundingClientRect();  // restart the CSS animation
  svg.classList.add(`act-${action}`);
}

/* The live hexagon, drawn small next to the question. Corners are crew icons; `grew` gets a pulse. */
function crewHex(values, grew) {
  const W = 220, H = 210, cx = 110, cy = 105, R = 72;
  const at = (i, r) => { const a = -Math.PI / 2 + (Math.PI / 3) * i; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
  const pts = (rs) => rs.map((r, i) => at(i, r).map((v) => v.toFixed(1)).join(",")).join(" ");
  const rings = [1 / 3, 2 / 3, 1].map((f) => `<polygon class="hex-ring" points="${pts(CREW_ORDER.map(() => R * f))}"/>`).join("");
  const spokes = CREW_ORDER.map((_, i) => { const [x, y] = at(i, R); return `<line class="hex-ring" x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`; }).join("");
  const icons = CREW_ORDER.map((k, i) => { const [x, y] = at(i, R + 20); return `<text class="crew-ico${k === grew ? " grew" : ""}" x="${x.toFixed(1)}" y="${(y + 6).toFixed(1)}" text-anchor="middle">${CREW[k].icon}</text>`; }).join("");
  const label = CREW_ORDER.map((k) => `${CREW[k].role} ${Math.round(values[k])}`).join(", ");
  return `<svg class="crew-hex" viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}">${rings}${spokes}
    <polygon class="hex-shape" points="${pts(CREW_ORDER.map((k) => (R * values[k]) / 100))}"/>${icons}</svg>`;
}

// Grows the hexagon's shape from the old values to the new ones.
function crewHexGrow(svg, from, to) {
  const shape = svg && svg.querySelector(".hex-shape");
  if (!shape || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const R = 72, cx = 110, cy = 105, t0 = performance.now(), ms = 600;
  const draw = (f) => shape.setAttribute("points", CREW_ORDER.map((k, i) => {
    const r = (R * (from[k] + (to[k] - from[k]) * f)) / 100, a = -Math.PI / 2 + (Math.PI / 3) * i;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(" "));
  const step = (now) => { const f = Math.min(1, (now - t0) / ms); draw(1 - (1 - f) ** 3); if (f < 1) requestAnimationFrame(step); };
  draw(0);
  requestAnimationFrame(step);
}

// "The Curious Captain": the second type's word, then the top type's role.
const crewTitle = (top, second) => (second ? `The ${CREW[second].adj} ${CREW[top].role}` : `The ${CREW[top].role}`);

/* ---------- IT skills test as a treasure hunt ----------
   Each tested IT area is an island. The quick check scouts every island (a flag when its
   questions are answered); the 2 strongest become treasure islands, dug into by the in-depth
   and hands-on questions; the result opens one chest per treasure island, its metal set by
   the level. Right or wrong is never shown before the result. */
const ISLANDS = {
  software_dev: { icon: "💻", short: "Software" },
  data_ai: { icon: "📊", short: "Data & AI" },
  cybersecurity: { icon: "🔐", short: "Security" },
  cloud_infra: { icon: "☁️", short: "Cloud" },
  web_ux: { icon: "🎨", short: "Web & UX" },
};
const CHEST = { gold: ["#F2C230", "#B8860B"], silver: ["#D5DBE3", "#8A96A6"], wood: ["#B07A4A", "#6B4423"] };
const chestTier = (level) => (level.min >= 75 ? "gold" : level.min >= 50 ? "silver" : "wood");

let seaShipX = null;  // where the ship was on the last question, so it sails from there

function seaMap(t, idx) {
  const ids = [...t.areas, ...(t.added || [])];
  const W = 40 + ids.length * 100, cx = (i) => 70 + i * 100, cy = 58;
  const q = t.questions[idx];
  const islands = ids.map((id, i) => {
    const qs = t.questions.filter((x) => x.domain === id);
    const screen = qs.filter((x) => x.stage === "screen"), deep = qs.filter((x) => x.stage !== "screen");
    const done = (list) => list.length && list.every((x) => x.id in t.responses);
    const treasure = (t.deepDomains || []).includes(id);
    const here = q.domain === id, x = cx(i);
    const dots = screen.map((s, k) => `<circle cx="${x - 12 + k * 12}" cy="${cy + 32}" r="3.5" class="${s.id in t.responses ? "dot-on" : "dot"}"/>`).join("");
    return `<g class="isle${here ? " here" : ""}${done(screen) ? " explored" : ""}">
      <ellipse cx="${x}" cy="${cy + 10}" rx="38" ry="13" class="sand"/><ellipse cx="${x}" cy="${cy + 4}" rx="26" ry="12" class="grass"/>
      <text x="${x}" y="${cy + 8}" text-anchor="middle" class="isle-ico">${ISLANDS[id].icon}</text>
      ${done(screen) ? `<g class="isle-flag"><rect x="${x + 18}" y="${cy - 26}" width="2.5" height="30" fill="#5A3A1A"/><path d="M${x + 20.5} ${cy - 26} h16 l-5 6 l5 6 h-16z" fill="#C0392B"/></g>` : ""}
      ${treasure ? (done(deep) ? `<text x="${x}" y="${cy - 14}" text-anchor="middle" class="isle-mark">💰</text>` : `<text x="${x}" y="${cy - 14}" text-anchor="middle" class="isle-mark x">✕</text>`) : ""}
      ${dots}
      <text x="${x}" y="${cy + 54}" text-anchor="middle" class="isle-name">${ISLANDS[id].short}</text></g>`;
  }).join("");
  const shipX = cx(ids.indexOf(q.domain)) - 50;
  const from = seaShipX === null ? shipX : seaShipX;
  seaShipX = shipX;
  const crew = state.crew || {};
  return `<svg class="sea" viewBox="0 0 ${W} 120" role="img" aria-label="Map of your ${ids.length} IT areas">
    <rect x="0" y="0" width="${W}" height="120" rx="14" class="sea-bg"/>
    <path d="M14 22 q8 -5 16 0 t16 0 M${W - 70} 104 q8 -5 16 0 t16 0 M${W / 2} 14 q8 -5 16 0 t16 0" class="wave"/>
    ${islands}
    <g class="ship" style="transform: translateX(${from}px)" data-to="${shipX}">
      <path d="M2 74 h34 l-6 11 h-22z" fill="#7A4E2D"/><rect x="18" y="38" width="2.5" height="36" fill="#5A3A1A"/>
      <path d="M21 40 l14 26 h-14z" fill="#F4F1EA"/>
      <g transform="translate(-1 48) scale(0.13)">${sailorSVG({ role: crew.lead, size: true })}</g>
    </g></svg>`;
}

// Sails the ship from the last island to this question's island.
function seaSail(svg) {
  const ship = svg && svg.querySelector(".ship");
  if (!ship) return;
  requestAnimationFrame(() => requestAnimationFrame(() => { ship.style.transform = `translateX(${ship.dataset.to}px)`; }));
}

function chestSVG(tier, open) {
  const [main, dark] = CHEST[tier];
  return `<svg class="chest${open ? " opening" : ""}" viewBox="0 0 120 100" aria-hidden="true" focusable="false">
    <ellipse cx="60" cy="92" rx="44" ry="6" class="s-shadow"/>
    <g class="glow"><circle cx="60" cy="44" r="30" fill="${main}" opacity="0.35"/><text x="30" y="24" class="spark">✦</text><text x="84" y="30" class="spark">✦</text></g>
    <rect x="18" y="46" width="84" height="42" rx="6" fill="${main}" stroke="${dark}" stroke-width="3"/>
    <rect x="18" y="58" width="84" height="6" fill="${dark}"/><rect x="52" y="54" width="16" height="16" rx="3" fill="${dark}"/>
    <g class="lid"><path d="M18 48 v-12 a20 14 0 0 1 20 -14 h44 a20 14 0 0 1 20 14 v12z" fill="${main}" stroke="${dark}" stroke-width="3"/>
    <rect x="54" y="38" width="12" height="12" rx="2" fill="${dark}"/></g>
  </svg>`;
}

// Coins for the test: once per island ever explored and once for the first finished test,
// so taking the test again (or answering "I don't know yet" to everything) pays nothing more.
const TEST_COINS_KEY = "future-skills-test-coins-v1";
const TEST_COINS = { island: 20, finish: 30 };
function testCoins(kind, id) {
  const got = readSaved(TEST_COINS_KEY) || {};
  const key = `${kind}:${id}`;
  if (got[key] || typeof addCoins !== "function") return;
  got[key] = true;
  writeSaved(TEST_COINS_KEY, got);
  addCoins(TEST_COINS[kind], kind === "island" ? "island explored" : "test finished");
}
