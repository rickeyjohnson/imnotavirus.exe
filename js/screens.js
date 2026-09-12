(function () {
  const C = INAV.config;
  const SCREEN_FOR_PHASE = {
    title: "title",
    tutorial: "tutorial",
    play: "play",
    paused: "paused",
    crashing: "play",
    crash: "crash",
    success: "success",
  };
  const $ = (id) => document.getElementById(id);
  let pctTimer = null;
  let lockTimer = null;
  let ghostTimer = null;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function ghostsRoot() {
    return document.querySelector(".ghosts");
  }

  function ghostArea(w, h) {
    const m = C.GHOST_MARGIN;
    return {
      minX: m,
      maxX: C.STAGE_W - w - m,
      minY: m,
      maxY: C.STAGE_H - C.TASKBAR_H - h - m,
    };
  }

  // Measured from the rendered title block so it can't drift from the layout.
  function reservedRect() {
    const fallback = C.GHOST_RESERVED;
    const stageEl = document.getElementById("stage");
    const parts = document.querySelectorAll('[data-screen="title"] .center > *');
    if (!stageEl || parts.length === 0) return fallback;

    const stageBox = stageEl.getBoundingClientRect();
    if (!stageBox.width) return fallback;

    const scale = stageBox.width / C.STAGE_W;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    parts.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      minX = Math.min(minX, (r.left - stageBox.left) / scale);
      minY = Math.min(minY, (r.top - stageBox.top) / scale);
      maxX = Math.max(maxX, (r.right - stageBox.left) / scale);
      maxY = Math.max(maxY, (r.bottom - stageBox.top) / scale);
    });

    if (!isFinite(minX)) return fallback;

    const pad = C.GHOST_CLEARANCE;
    const x = Math.min(minX - pad, fallback.x);
    const y = Math.min(minY - pad, fallback.y);
    return {
      x,
      y,
      w: Math.max(maxX + pad, fallback.x + fallback.w) - x,
      h: Math.max(maxY + pad, fallback.y + fallback.h) - y,
    };
  }

  function hitsRect(r, x, y, w, h) {
    return x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y;
  }

  function ghostBands(r, w, h) {
    const a = ghostArea(w, h);
    return [
      { minX: a.minX, maxX: a.maxX, minY: a.minY, maxY: Math.min(a.maxY, r.y - h) },
      { minX: Math.max(a.minX, r.x + r.w), maxX: a.maxX, minY: a.minY, maxY: a.maxY },
      { minX: a.minX, maxX: a.maxX, minY: Math.max(a.minY, r.y + r.h), maxY: a.maxY },
      { minX: a.minX, maxX: Math.min(a.maxX, r.x - w), minY: a.minY, maxY: a.maxY },
    ];
  }

  function overlapRatio(a, b) {
    const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (w <= 0 || h <= 0) return 0;
    return (w * h) / Math.min(a.w * a.h, b.w * b.h);
  }

  function placeGhost(root, placed, r, i, w, h) {
    const bands = ghostBands(r, w, h);
    let fallback = null;

    // Round-robin the bands so the ghosts ring the title instead of filling the widest gap.
    for (let step = 0; step < bands.length; step++) {
      const band = bands[(i + step) % bands.length];
      if (band.maxX < band.minX || band.maxY < band.minY) continue;

      for (let tries = 0; tries < C.GHOST_TRIES; tries++) {
        const box = {
          x: Math.round(band.minX + Math.random() * (band.maxX - band.minX)),
          y: Math.round(band.minY + Math.random() * (band.maxY - band.minY)),
          w: w,
          h: h,
        };
        if (hitsRect(r, box.x, box.y, w, h)) continue;
        if (!fallback) fallback = box;
        if (placed.some((other) => overlapRatio(box, other) > C.GHOST_OVERLAP_MAX)) continue;
        placed.push(box);
        root.appendChild(INAV.popups.ghost(box));
        return true;
      }
    }

    if (fallback) {
      placed.push(fallback);
      root.appendChild(INAV.popups.ghost(fallback));
      return true;
    }

    return false;
  }

  function buildGhosts() {
    const root = ghostsRoot();
    if (!root) return;
    root.textContent = "";

    const g = C.GHOSTS;
    const reserved = reservedRect();
    let dropped = 0;
    const placed = [];

    for (let i = 0; i < g.count; i++) {
      const w = Math.round(g.w.min + Math.random() * (g.w.max - g.w.min));
      const h = Math.round(g.h.min + Math.random() * (g.h.max - g.h.min));
      if (!placeGhost(root, placed, reserved, i, w, h)) dropped++;
    }

    if (dropped > 0) console.warn("ghosts: no room for " + dropped + " of " + g.count);
  }

  function scheduleGhost() {
    const g = C.GHOST_TOGGLE_MS;
    ghostTimer = setTimeout(() => {
      if (reducedMotion.matches) {
        stopGhosts();
        return;
      }
      const ghosts = ghostsRoot().querySelectorAll(".ghost");
      const one = ghosts[Math.floor(Math.random() * ghosts.length)];
      if (one) one.classList.toggle("ghost-on");
      scheduleGhost();
    }, g.min + Math.random() * (g.max - g.min));
  }

  function startGhosts() {
    const root = ghostsRoot();
    if (!root) return;
    buildGhosts();
    if (reducedMotion.matches) return;
    root.classList.add("animated");
    root.querySelectorAll(".ghost").forEach((el) => {
      el.classList.toggle("ghost-on", Math.random() < 0.5);
    });
    scheduleGhost();
  }

  function stopGhosts() {
    clearTimeout(ghostTimer);
    ghostTimer = null;
    const root = ghostsRoot();
    if (root) root.classList.remove("animated");
  }

  // The first build can measure the title before the web font swaps in.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      if (!INAV.game || INAV.game.snapshot().phase !== "title") return;
      stopGhosts();
      startGhosts();
    });
  }

  function lockButton(btn) {
    btn.disabled = true;
    lockTimer = setTimeout(() => {
      btn.disabled = false;
      btn.focus();
    }, C.END_LOCKOUT_MS);
  }

  function enterTitle(s) {
    $("title-last").textContent = s.scores.last;
    $("title-best").textContent = s.scores.best;
    $("start-btn").focus();
    startGhosts();
  }

  function enterPaused(s) {
    $("pause-closed").textContent = s.score;
    $("pause-open").textContent = s.open;
    $("pause-time").textContent = Math.max(0, Math.ceil(C.ROUND_SECONDS - s.t));
    $("resume-btn").focus();
  }

  function enterCrash(s) {
    const r = s.result;
    $("crash-score").textContent = r.score;
    $("crash-best").textContent = r.best;
    $("crash-progress").textContent = Math.floor((r.t / C.ROUND_SECONDS) * 100);
    $("crash-new-best").hidden = !r.isBest;

    let pct = 0;
    $("crash-pct").textContent = pct;
    pctTimer = setInterval(() => {
      pct = Math.min(100, pct + 1 + Math.floor(Math.random() * C.CRASH_PCT_STEP_MAX));
      $("crash-pct").textContent = pct;
      if (pct >= 100) clearInterval(pctTimer);
    }, C.CRASH_PCT_TICK_MS);

    lockButton($("try-again-btn"));
  }

  function enterSuccess(s) {
    const r = s.result;
    $("success-score").textContent = r.score;
    $("success-best").textContent = r.best;
    $("success-new-best").hidden = !r.isBest;
    lockButton($("play-again-btn"));
  }

  const ENTER = {
    title: enterTitle,
    paused: enterPaused,
    crash: enterCrash,
    success: enterSuccess,
  };

  INAV.screens = {
    init() {
      document.querySelectorAll(".copy-seconds").forEach((el) => {
        el.textContent = C.ROUND_SECONDS;
      });
      document.querySelectorAll(".copy-cap").forEach((el) => {
        el.textContent = C.CAP;
      });
    },

    show(phase, s) {
      clearInterval(pctTimer);
      clearTimeout(lockTimer);
      pctTimer = null;
      lockTimer = null;
      stopGhosts();
      const name = SCREEN_FOR_PHASE[phase];
      document.querySelectorAll("[data-screen]").forEach((el) => {
        el.hidden = el.dataset.screen !== name;
      });
      const taskbar = document.getElementById("taskbar");
      if (taskbar) taskbar.inert = phase === "crashing" || phase === "crash" || phase === "success";
      if (ENTER[phase]) ENTER[phase](s);
    },
  };
})();
