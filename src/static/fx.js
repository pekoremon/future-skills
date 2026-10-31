// Visual layer (fx.css): an animated AI-network background, a photo banner on each page,
// the photo hero on the landing page, scroll reveals and a light that follows the pointer.
// Decoration only: it never changes what app.js shows or does.
(() => {
  if (document.documentElement.dataset.lite) return;  // Lite mode: no photos and no animation (app.js)
  const app = document.getElementById("app");
  const still = window.matchMedia("(prefers-reduced-motion: reduce)");
  const photo = (id, w = 1600) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

  // Page photos (Unsplash, free licence) with a code-style tag; the landing page has its own hero instead.
  const PAGES = {
    cv: ["1677442135703-1787eea5ce01", "ai.read(cv)", ["NLP", "O*NET", "LLM"]],
    skills: ["1555066931-4365d14bab8c", "skills.profile()", ["Python", "SQL", "Cloud"]],
    quiz: ["1522202176988-66273c2fd55f", "interests.riasec()", ["R", "I", "A"]],
    interests: ["1522202176988-66273c2fd55f", "interests.riasec()", ["R", "I", "A"]],
    test: ["1550751827-4bd374c3f58b", "test.run()", ["Python", "SQL", "Logic"]],
    results: ["1680783954745-3249be59e527", "roles.match()", ["Skills", "Trends", "SDG"]],
    learn: ["1516321497487-e288fb19713f", "pathway.plan()", ["Courses", "Free", "SDG 4"]],
    progress: ["1516321497487-e288fb19713f", "progress.track()", ["Courses", "SDG 4"]],
    whatif: ["1558494949-ef010cbdcc31", "scenario.simulate()", ["arXiv", "DOSM", "MyCOL"]],
    data: ["1506399558188-acca6f8cbf41", "trends.sources()", ["DOSM", "MyCOL", "arXiv"]],
    shared: ["1680783954745-3249be59e527", "result.share()", ["IT test"]],
    impact: ["1516321497487-e288fb19713f", "sdg.aggregate()", ["SDG 4.3", "SDG 4.4", "SDG 8.5"]],
  };
  const AREAS = [
    ["Software Engineering", "1555066931-4365d14bab8c"],
    ["Data & AI", "1677442135703-1787eea5ce01"],
    ["Cybersecurity", "1614064641938-3bbee52942c7"],
    ["Cloud, Infrastructure & Networking", "1558494949-ef010cbdcc31"],
    ["Web & Interface Design", "1558655146-d09347e92766"],
  ];

  function pageKey() {
    const parts = location.hash.replace(/^#\/?/, "").split("/");
    const page = parts[0] || "trends";
    if (page === "trends") return parts[1] === "data" ? "data" : "trends";
    // One question per screen: keep the photo off so the question stays at the top.
    if ((page === "quiz" || page === "test") && parts[1] && parts[1] !== "result") return "";
    return page;
  }

  function decorate() {
    const key = pageKey();
    document.body.dataset.fxPage = key;
    const root = app.firstElementChild;
    if (!root || root.dataset.fx) return;
    root.dataset.fx = "1";

    if (key === "trends") {
      const hero = root.querySelector(":scope > section:first-child");
      if (hero) {
        hero.classList.add("fx-hero");
        hero.insertAdjacentHTML("beforeend", '<div class="fx-hero-tags" aria-hidden="true"><span>#AI</span><span>#DOSM</span><span>#MyCOL</span><span>#arXiv</span><span>#SDG4</span><span>#SDG8</span></div>');
        hero.insertAdjacentHTML("afterend", `<div class="fx-areas">${AREAS.map(([name, id]) =>
          `<div class="fx-area" style="--fx-photo: url('${photo(id, 600)}')"><span>${name}</span></div>`).join("")}</div>`);
      }
    } else if (PAGES[key]) {
      const [id, tag, chips] = PAGES[key];
      root.insertAdjacentHTML("afterbegin", `<div class="fx-banner" aria-hidden="true" style="--fx-photo: url('${photo(id)}')">
        <div class="fx-chips">${chips.map((c) => `<span>${c}</span>`).join("")}</div><div class="fx-tag" data-no-i18n>${tag}</div></div>`);
    }
    reveal(root);
  }

  // Cards slide in as they scroll into view.
  const seen = "IntersectionObserver" in window ? new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add("fx-in"); seen.unobserve(e.target); }
  }, { rootMargin: "0px 0px -40px 0px" }) : null;
  function reveal(root) {
    if (!seen || still.matches) return;
    root.querySelectorAll(".card, .viz-card, .top-card, details.group, .viz-tile, .res, .fx-area").forEach((el, i) => {
      if (el.classList.contains("fx-reveal")) return;
      const box = el.getBoundingClientRect();
      if (box.top < innerHeight) return;  // already on screen: no flicker
      el.classList.add("fx-reveal");
      el.style.transitionDelay = `${(i % 4) * 60}ms`;
      seen.observe(el);
    });
  }

  // The gradient the skills hexagon is filled with (fx.css: .hex-shape).
  document.body.insertAdjacentHTML("afterbegin", `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <linearGradient id="fx-hex-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#14B8A6" stop-opacity="0.45"/><stop offset="1" stop-color="#6366F1" stop-opacity="0.35"/></linearGradient></defs></svg>`);
  document.body.classList.add("fx-on");

  new MutationObserver(decorate).observe(app, { childList: true });
  window.addEventListener("hashchange", () => { document.body.dataset.fxPage = pageKey(); });
  decorate();

  // A soft light under the pointer on cards.
  document.addEventListener("pointermove", (e) => {
    const card = e.target.closest && e.target.closest(".card, .top-card");
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
    card.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
  }, { passive: true });

  // Background: drifting nodes that link up like a neural network, and lean towards the pointer.
  const canvas = document.createElement("canvas");
  canvas.id = "fx-net";
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);
  const ctx = canvas.getContext("2d");
  let w = 0, h = 0, nodes = [], color = "15, 110, 102", mouse = null, frame = 0;
  function size() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round(Math.min(90, (w * h) / 16000));
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35, r: 1 + Math.random() * 1.8,
    }));
    color = getComputedStyle(document.documentElement).getPropertyValue("--fx-net").trim() || color;
  }
  function draw() {
    ctx.clearRect(0, 0, w, h);
    const link = 130;
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      if (!still.matches) {
        a.x += a.vx; a.y += a.vy;
        if (a.x < 0 || a.x > w) a.vx *= -1;
        if (a.y < 0 || a.y > h) a.vy *= -1;
        if (mouse) {
          const dx = mouse.x - a.x, dy = mouse.y - a.y, d = Math.hypot(dx, dy);
          if (d < 180) { a.x += dx * 0.006; a.y += dy * 0.006; }
        }
      }
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < link) {
          ctx.strokeStyle = `rgba(${color}, ${0.22 * (1 - d / link)})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
      ctx.fillStyle = `rgba(${color}, 0.55)`;
      ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.fill();
    }
    // a pulse travelling along one link now and then, like a signal through the network
    const t = (performance.now() / 1600) % 1, p = nodes[Math.floor(performance.now() / 1600) % nodes.length], q = nodes[(Math.floor(performance.now() / 1600) * 7 + 3) % nodes.length];
    if (p && q && Math.hypot(p.x - q.x, p.y - q.y) < 320) {
      ctx.fillStyle = `rgba(${color}, ${0.9 * (1 - t)})`;
      ctx.beginPath(); ctx.arc(p.x + (q.x - p.x) * t, p.y + (q.y - p.y) * t, 2.6, 0, Math.PI * 2); ctx.fill();
    }
    if (!still.matches && !document.hidden) frame = requestAnimationFrame(draw);
  }
  function restart() { cancelAnimationFrame(frame); size(); draw(); }
  window.addEventListener("resize", restart);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) restart(); });
  still.addEventListener("change", restart);
  window.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    mouse = { x: ((e.clientX - r.left) / r.width) * w, y: ((e.clientY - r.top) / r.height) * h };
  }, { passive: true });
  window.addEventListener("pointerout", (e) => { if (!e.relatedTarget) mouse = null; });
  // Light / dark switch: pick up the new line colour.
  new MutationObserver(() => { color = getComputedStyle(document.documentElement).getPropertyValue("--fx-net").trim() || color; })
    .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { color = getComputedStyle(document.documentElement).getPropertyValue("--fx-net").trim() || color; });
  restart();
})();
