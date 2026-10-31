/* Trend dashboard: the first page and the Trends page.

   Drawn from /api/trends and /api/roles, so every chart follows the data the "Update data"
   job writes. Plain HTML bars and one small SVG line chart, no chart library, so the page
   stays light on mobile data. Chart rules: one accent hue for the series that matters and
   gray for context, colours checked for colour
   blindness and contrast in light and dark mode (style.css, --viz-*). Every chart has
   direct labels, so hover details never hold the only copy of a number.
   Uses esc, fmt, AREA_NAMES and SUBFIELD_AREA from app.js (loaded after this file). */
"use strict";

const vizNum = (v) => (v === "" || v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v));
const vizSigned = (n, d = 1) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(d)}`;
const vizQuarter = (d) => `${d.slice(0, 4)} Q${Math.floor((Number(d.slice(5, 7)) - 1) / 3) + 1}`;
const vizInt = (n) => Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
const vizTipAttr = (title, rows) => esc(JSON.stringify({ t: title, r: rows }));  // rows: [value, label, key class]
const VIZ_DIRECTION = { up: "rising", flat: "flat", down: "falling" };

// One row per period of a series in /api/trends inputs, oldest first; censored rows left out.
function vizSeries(inputs, etype, entity, metric) {
  return inputs.filter((r) => r.entity_type === etype && r.entity_id === entity && r.metric === metric
    && r.is_censored !== "TRUE" && vizNum(r.value) !== null)
    .sort((a, b) => a.period_start.localeCompare(b.period_start));
}
const vizLatestRelease = (rows) => rows.map((r) => r.release_date).filter(Boolean).sort().pop() || "";

/* ---------- tooltip: one floating box; labels go in as text nodes, never as HTML ---------- */

let vizTipEl = null;
function vizShowTip(title, rows, x, y) {
  if (!vizTipEl) {
    vizTipEl = document.createElement("div");
    vizTipEl.className = "viz-tip";
    document.body.appendChild(vizTipEl);
  }
  const el = vizTipEl;
  el.replaceChildren();
  if (title) {
    const h = document.createElement("div");
    h.className = "viz-tip-title";
    h.textContent = title;
    el.append(h);
  }
  for (const [value, label, key] of rows) {
    const row = document.createElement("div");
    row.className = "viz-tip-row";
    if (key) {
      const k = document.createElement("i");
      k.className = `viz-key ${key}`;
      row.append(k);
    }
    if (value) {
      const v = document.createElement("strong");
      v.textContent = value;
      row.append(v, " ");
    }
    if (label) {
      const l = document.createElement("span");
      l.textContent = label;
      row.append(l);
    }
    el.append(row);
  }
  el.hidden = false;
  const pad = 14, w = el.offsetWidth, h = el.offsetHeight;
  let left = x + pad, top = y - h - pad;
  if (left + w > window.innerWidth - 8) left = Math.max(8, x - w - pad);
  if (top < 8) top = y + pad;
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
}
function vizHideTip() {
  if (vizTipEl) vizTipEl.hidden = true;
}
window.addEventListener("hashchange", vizHideTip);
window.addEventListener("scroll", vizHideTip, { passive: true });

/* ---------- pieces ---------- */

function vizCard(title, sub, body, source, wide = false) {
  return `
  <figure class="card viz-card${wide ? " viz-wide" : ""}">
    <figcaption class="viz-head"><h3>${title}</h3>${sub ? `<p class="small muted">${sub}</p>` : ""}</figcaption>
    ${body}
    <p class="viz-source small muted">${source}</p>
  </figure>`;
}

// A horizontal bar row: label, bar on a 0-100 track (left and width in %), value at the tip.
function vizBarRow(label, bar, value, tip, extra = "") {
  return `
    <div class="viz-row" data-tip="${tip}">
      <span class="viz-label">${label}</span>
      <span class="viz-track">${extra}${bar}</span>
      <span class="viz-value">${value}</span>
    </div>`;
}

// IT area names under a column: translated here, with soft hyphens where long words may break, so a
// narrow column on a phone splits "Cyber-security" rather than "Cybersec-urity".
const VIZ_SHY = Object.fromEntries(["Cyber|security", "Infra|structure", "Engin|eering", "Network|ing",
  "Inter|face", "Infra|struktur", "Kejuru|teraan", "Kese|lamatan", "Rang|kaian"].map((w) => [w.replace("|", ""), w.replace("|", "­")]));
const vizAreaLabel = (area) => `<span data-no-i18n>${esc(trName(AREA_NAMES[area])).replace(/[A-Za-z]{9,}/g, (w) => VIZ_SHY[w] || w)}</span>`;

// A vertical column chart. cols: { label, value (shown at the bar's tip), from, to (bar ends as % of the plot
// height; to = null draws no bar), cls, tip }. lines: { at (% of the plot height), cls } across every column.
function vizColumns(cols, lines = []) {
  const grid = `style="grid-template-columns: repeat(${cols.length}, minmax(0, 1fr))"`;
  return `
    <div class="viz-colchart">
      <div class="viz-plot">
        ${lines.map((l) => `<span class="viz-hline ${l.cls || ""}" style="bottom: ${l.at}%"></span>`).join("")}
        <div class="viz-cols" ${grid}>${cols.map((c) => `
          <div class="viz-col"${c.tip ? ` data-tip="${c.tip}"` : ""}>${c.to === null
    ? `<span class="viz-col-value muted" style="bottom: ${c.from}%">${c.value}</span>`
    : `<span class="viz-col-bar ${c.cls || ""}${c.to < c.from ? " neg" : ""}" style="bottom: ${Math.min(c.from, c.to)}%; height: ${Math.abs(c.to - c.from)}%"><span class="viz-col-value">${c.value}</span></span>`}
          </div>`).join("")}
        </div>
      </div>
      <div class="viz-cols viz-col-labels" ${grid}>${cols.map((c) => `<span>${c.label}</span>`).join("")}</div>
    </div>`;
}

/* ---------- data shaping ---------- */

// AI paper growth per IT area: the arxiv_ai_paper_growth signals with their paper counts.
function vizAiGrowth(t) {
  const areaOf = Object.fromEntries(t.subdomains.map((d) => [d.subdomain_id, SUBFIELD_AREA[d.subfield_code]]));
  return t.signals.filter((s) => s.layer === "subdomain" && s.signal === "arxiv_ai_paper_growth" && AREA_NAMES[areaOf[s.entity_id]])
    .map((s) => {
      const papers = vizSeries(t.inputs, "subdomain", s.entity_id, "arxiv_ai_papers");
      return { area: areaOf[s.entity_id], growth: vizNum(s.value), direction: s.direction, rule: s.direction_rule,
        before: papers.length > 1 ? papers[papers.length - 2] : null, after: papers.length ? papers[papers.length - 1] : null };
    });
}

/* ---------- the headline numbers ---------- */

function vizKpis(t, roles) {
  const tile = (label, value, lines) => `
    <div class="card viz-tile">
      <p class="small muted">${label}</p>
      <p class="viz-tile-value">${value}</p>
      ${lines.filter(Boolean).map((l) => `<p class="small">${l}</p>`).join("")}
    </div>`;
  const tiles = [];
  const ict = vizSeries(t.inputs, "sector", "ict", "employment_growth_yoy");
  const all = vizSeries(t.inputs, "sector", "overall", "employment_growth_yoy");
  if (ict.length) {
    const last = ict[ict.length - 1], same = all.find((r) => r.period_start === last.period_start);
    tiles.push(tile("ICT jobs, growth in a year", `${vizSigned(vizNum(last.value))}%`, [
      same ? `<span class="muted">All sectors:</span> ${vizSigned(vizNum(same.value))}%` : "",
    ]));
  }
  // DOSM publishes graduate salaries only for all graduates, not by field or age.
  const grad = (who) => vizSeries(t.inputs, "graduates", who, "median_monthly_wage").pop();
  const wage = grad("all"), degree = grad("degree"), diploma = grad("diploma");
  if (wage) {
    tiles.push(tile("Graduate median monthly wage", `RM ${vizInt(wage.value)}`, [
      degree ? `<span class="muted">Degree:</span> RM ${vizInt(degree.value)}` : "",
      diploma ? `<span class="muted">Diploma:</span> RM ${vizInt(diploma.value)}` : "",
      `<span class="muted">DOSM Graduates Statistics ${esc(wage.period_start.slice(0, 4))}; all fields and ages</span>`,
    ]));
  }
  const fastest = vizAiGrowth(t).filter((r) => r.growth !== null).sort((a, b) => b.growth - a.growth)[0];
  if (fastest) {
    tiles.push(tile("Fastest-growing AI research", `${vizSigned(fastest.growth)}%`,
      [`<span>${esc(AREA_NAMES[fastest.area])}</span>`, '<span class="muted">arXiv, latest 6 months</span>']));
  }
  return tiles.join("");
}

/* ---------- the charts ---------- */

function vizAreaChart(t) {
  const rows = t.scores.filter((s) => !s.role_id && AREA_NAMES[s.it_area])
    .map((s) => ({ area: s.it_area, score: vizNum(s.trend_score), demand: vizNum(s.my_demand_score), ai: vizNum(s.ai_momentum_score) }))
    .filter((r) => r.score !== null).sort((a, b) => b.score - a.score);
  if (!rows.length) return "";
  const part = (v) => (v === null ? "no data" : fmt(v));
  const body = `
    <div class="viz-split">
      <div class="stack" style="gap: 10px">
    <div class="viz-legend"><span><i class="viz-key refline"></i>above 50 = growing, below 50 = shrinking</span></div>
    ${vizColumns(rows.map((r) => ({ label: vizAreaLabel(r.area), value: fmt(r.score), from: 0, to: Math.max(0, Math.min(100, r.score)),
    tip: vizTipAttr(AREA_NAMES[r.area], [[fmt(r.score), "Trend score"], [part(r.demand), "Malaysian demand"], [part(r.ai), "AI momentum"]]) })),
    [{ at: 0, cls: "zero" }, { at: 50 }])}
      </div>
      <aside class="viz-explain">
        <h4>What is a Trend Score?</h4>
        <p>A 0–100 index measuring an IT area's growth speed and market demand, calculated from two equally weighted streams:</p>
        <ul>
          <li><span aria-hidden="true">📊</span> <strong>Malaysian Demand:</strong> Based on TalentCorp MyCOL shortages and DOSM job ad data. Higher scores mean greater local vacancy and urgency.</li>
          <li><span aria-hidden="true">🚀</span> <strong>Global AI Momentum:</strong> Based on the growth rate of AI papers on arXiv, latest 6 months against the 6 before. Higher scores mean faster technological disruption.</li>
          <li><span aria-hidden="true">💡</span> <strong>The 50 Line:</strong> Above 50 means growth; below 50 means negative growth.</li>
        </ul>
      </aside>
    </div>`;
  return vizCard("Trend score by IT area", "", body, `<span>Sources:</span> TalentCorp MyCOL 2024/2025 · DOSM · arXiv · <span>computed</span> ${esc(t.computed_date || "")}`, true);
}

function vizJobsChart(t) {
  const ict = vizSeries(t.inputs, "sector", "ict", "employment_growth_yoy");
  const all = vizSeries(t.inputs, "sector", "overall", "employment_growth_yoy");
  if (ict.length < 2) return "";
  const quarters = ict.map((r) => r.period_start);
  const allBy = Object.fromEntries(all.map((r) => [r.period_start, vizNum(r.value)]));
  const data = { quarters, series: [
    { name: "ICT sector", cls: "accent", values: ict.map((r) => vizNum(r.value)) },
    { name: "All sectors", cls: "muted", values: quarters.map((q) => (q in allBy ? allBy[q] : null)) },
  ] };
  const body = `
    <div class="viz-legend">${data.series.map((s) => `<span><i class="viz-key line ${s.cls}"></i>${esc(s.name)}</span>`).join("")}</div>
    <div class="viz-line" data-line="${esc(JSON.stringify(data))}"></div>`;
  return vizCard("Jobs in Malaysia: growth in a year",
    "People employed in the ICT sector compared with all sectors, change against the same quarter a year earlier.",
    body, `<span>Source:</span> OpenDOSM productivity_qtr (DOSM) · <span>released</span> ${esc(vizLatestRelease([...ict, ...all]))}`);
}

function vizAiChart(t) {
  const rows = vizAiGrowth(t).sort((a, b) => (b.growth === null ? -1e9 : b.growth) - (a.growth === null ? -1e9 : a.growth));
  const known = rows.filter((r) => r.growth !== null);
  if (!known.length) return "";
  const thr = Number((/> \+?([\d.]+)%/.exec(known[0].rule || "") || [])[1]) || 10;
  const lo = Math.min(0, ...known.map((r) => r.growth));
  const hi = Math.max(thr * 1.5, ...known.map((r) => r.growth)) * 1.05;
  const pos = (v) => ((v - lo) * 100) / (hi - lo);
  const zero = pos(0);
  const body = `
    <div class="viz-legend"><span><i class="viz-key accent"></i>rising</span><span><i class="viz-key muted"></i>${known.some((r) => r.direction === "down") ? "flat or falling" : "flat"}</span></div>
    ${vizColumns(rows.map((r) => (r.growth === null
    ? { label: vizAreaLabel(r.area), value: "no data", from: zero, to: null }
    : { label: vizAreaLabel(r.area), value: `${vizSigned(r.growth)}%`, from: zero, to: pos(r.growth), cls: r.direction === "up" ? "" : "muted",
      tip: vizTipAttr(AREA_NAMES[r.area], [
        ...(r.before && r.after ? [[`${vizInt(r.before.value)} → ${vizInt(r.after.value)}`, "AI papers"]] : []),
        [`${vizSigned(r.growth)}%`, VIZ_DIRECTION[r.direction] || ""]]) })),
    [{ at: zero, cls: "zero" }, { at: pos(thr) }])}`;
  const ref = known.find((r) => r.before && r.after);
  const win = ref ? `${esc(ref.before.period_start.slice(0, 7))} – ${esc(ref.before.period_end.slice(0, 7))} → ${esc(ref.after.period_start.slice(0, 7))} – ${esc(ref.after.period_end.slice(0, 7))}` : "";
  return vizCard("How fast AI research is growing in each IT area",
    "Papers on arXiv that mention AI, latest 6 months against the 6 before. A global research signal, not Malaysian hiring.",
    body, `<span>Source:</span> arXiv API · ${win} · <span>fetched</span> ${esc(ref ? ref.after.fetched_date : "")}`, true);
}

function vizRolesChart(t, roles) {
  const role = Object.fromEntries(roles.map((r) => [r.role_id, r]));
  const rs = t.scores.filter((s) => s.role_id && role[s.role_id] && AREA_NAMES[role[s.role_id].it_area])
    .map((s) => ({ id: s.role_id, score: vizNum(s.trend_score), demand: vizNum(s.my_demand_score), ai: vizNum(s.ai_momentum_score) }))
    .filter((r) => r.score !== null);
  if (rs.length < 2) return "";
  const name = (r) => role[r.id].role_name_en;
  const part = (v) => (v === null ? "no data" : fmt(v));
  const most = [...rs].sort((a, b) => b.score - a.score || name(a).localeCompare(name(b))).slice(0, 5);
  const least = [...rs].sort((a, b) => a.score - b.score || name(a).localeCompare(name(b))).slice(0, 5);
  const list = (title, items, cls) => `
    <div class="stack" style="gap: 4px">
      <h4>${title}</h4>
      <div class="viz-rows">${items.map((r) => vizBarRow(esc(name(r)),
    `<span class="viz-bar ${cls}" style="left: 0; width: ${Math.max(0, Math.min(100, r.score))}%"></span>`, fmt(r.score),
    vizTipAttr(name(r), [[fmt(r.score), "Trend score"], [part(r.demand), "Malaysian demand"], [part(r.ai), "AI momentum"]]))).join("")}</div>
    </div>`;
  const falling = rs.some((r) => r.score < 50);
  const body = `<div class="viz-pair">${list("Most momentum", most, "")}${list("Least momentum", least, "muted")}</div>
    ${falling ? "" : '<p class="small muted">No role is falling in the latest data: the lowest scores mean flat signals, not falling ones.</p>'}`;
  return vizCard("Rising and flat IT roles", "Trend score of each of our 25 IT roles: its IT area's signals plus whether MyCOL lists the role itself.",
    body, `<span>Sources:</span> TalentCorp MyCOL 2024/2025 · DOSM · arXiv · <span>computed</span> ${esc(t.computed_date || "")}`, true);
}

/* ---------- the line chart (SVG, drawn at the container's width) ---------- */

function vizDrawLine(el) {
  const data = JSON.parse(el.dataset.line);
  const W = Math.max(260, Math.round(el.clientWidth)), narrow = W < 460, n = data.quarters.length;
  const H = 220, m = { l: 40, r: narrow ? 14 : 132, t: 14, b: 30 };
  const vals = data.series.flatMap((s) => s.values).filter((v) => v !== null);
  const hi = Math.max(1, Math.ceil(Math.max(...vals))), lo = Math.min(0, Math.floor(Math.min(...vals)));
  const step = hi - lo > 6 ? 2 : 1;
  const x = (i) => m.l + (i * (W - m.l - m.r)) / Math.max(1, n - 1);
  const y = (v) => m.t + ((hi - v) * (H - m.t - m.b)) / (hi - lo || 1);
  let svg = "";
  for (let v = lo; v <= hi; v += step) {
    svg += `<line class="viz-gridline" x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/>`
      + `<text class="viz-axis" x="${m.l - 6}" y="${y(v) + 4}" text-anchor="end">${v}%</text>`;
  }
  data.quarters.forEach((q, i) => {
    if (!narrow || (n - 1 - i) % 2 === 0) svg += `<text class="viz-axis" x="${x(i)}" y="${H - 8}" text-anchor="middle">${esc(vizQuarter(q))}</text>`;
  });
  const lastIdx = (vs) => vs.reduce((acc, v, i) => (v === null ? acc : i), -1);
  data.series.forEach((s) => {
    let d = "", pen = false;
    s.values.forEach((v, i) => {
      if (v === null) { pen = false; return; }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true;
    });
    const li = lastIdx(s.values);
    svg += `<path class="viz-path ${s.cls}" d="${d}"/>`;
    if (li >= 0) svg += `<circle class="viz-dot ${s.cls}" cx="${x(li)}" cy="${y(s.values[li])}" r="4"/>`;
  });
  const ends = data.series.map((s) => ({ s, i: lastIdx(s.values) })).filter((e) => e.i >= 0);
  const clash = ends.length > 1 && Math.abs(y(ends[0].s.values[ends[0].i]) - y(ends[1].s.values[ends[1].i])) < 18;
  if (!narrow && !clash) {
    ends.forEach(({ s, i }) => {
      svg += `<text class="viz-end" x="${x(i) + 10}" y="${y(s.values[i]) + 4}"><tspan>${esc(s.name)}</tspan><tspan class="viz-end-value" dx="6">${vizSigned(s.values[i])}%</tspan></text>`;
    });
  }
  svg += `<line class="viz-cross" x1="0" x2="0" y1="${m.t}" y2="${H - m.b}" visibility="hidden"/>`;
  data.series.forEach((s) => { svg += `<circle class="viz-dot ${s.cls} viz-hover" r="4" visibility="hidden"/>`; });
  svg += `<rect class="viz-hit" x="${m.l}" y="0" width="${W - m.l - m.r + (narrow ? 0 : 20)}" height="${H}" fill="transparent"/>`;
  el.innerHTML = `<svg class="viz-svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Line chart of employment growth in a year, ICT sector and all sectors">${svg}</svg>`;

  const svgEl = el.querySelector("svg"), cross = el.querySelector(".viz-cross"), dots = [...el.querySelectorAll(".viz-hover")];
  const hit = el.querySelector(".viz-hit");
  hit.addEventListener("pointermove", (ev) => {
    const r = svgEl.getBoundingClientRect();
    const px = ((ev.clientX - r.left) * W) / r.width;
    const i = Math.max(0, Math.min(n - 1, Math.round(((px - m.l) * (n - 1)) / (W - m.l - m.r))));
    cross.setAttribute("x1", x(i));
    cross.setAttribute("x2", x(i));
    cross.setAttribute("visibility", "visible");
    data.series.forEach((s, k) => {
      const v = s.values[i];
      dots[k].setAttribute("visibility", v === null ? "hidden" : "visible");
      if (v !== null) { dots[k].setAttribute("cx", x(i)); dots[k].setAttribute("cy", y(v)); }
    });
    vizShowTip(vizQuarter(data.quarters[i]),
      data.series.map((s) => [s.values[i] === null ? "–" : `${vizSigned(s.values[i])}%`, s.name, `line ${s.cls}`]), ev.clientX, ev.clientY);
  });
  hit.addEventListener("pointerleave", () => {
    cross.setAttribute("visibility", "hidden");
    dots.forEach((dot) => dot.setAttribute("visibility", "hidden"));
    vizHideTip();
  });
}

/* ---------- the whole dashboard ---------- */

// The page's opening chart, next to its heading: is Malaysia hiring in ICT?
function trendHeroChart(t) {
  return vizJobsChart(t);
}

function trendDashboard(t, roles) {
  return `
    <div class="viz-kpis">${vizKpis(t, roles)}</div>
    <p>You may wonder: Which IT areas does Malaysia need, and how fast is AI entering them? Let's check our future trend.</p>
    <div class="viz-grid">
      ${vizAreaChart(t)}
      ${vizAiChart(t)}
      ${vizRolesChart(t, roles)}
    </div>`;
}

// Draw the line chart at the container's width (again on resize) and show hover details.
function wireDashboard(root) {
  root.querySelectorAll("[data-line]").forEach((el) => {
    vizDrawLine(el);
    let width = Math.round(el.clientWidth);
    const ro = new ResizeObserver(() => {
      if (!document.contains(el)) { ro.disconnect(); return; }
      const w = Math.round(el.clientWidth);
      if (w && w !== width) { width = w; vizDrawLine(el); }
    });
    ro.observe(el);
  });
  root.addEventListener("pointermove", (ev) => {
    if (ev.target.closest(".viz-line")) return;  // the line chart has its own crosshair
    const mark = ev.target.closest("[data-tip]");
    if (!mark || !root.contains(mark)) { vizHideTip(); return; }
    const d = JSON.parse(mark.dataset.tip);
    vizShowTip(d.t, d.r, ev.clientX, ev.clientY);
  });
  root.addEventListener("pointerleave", vizHideTip);
}
