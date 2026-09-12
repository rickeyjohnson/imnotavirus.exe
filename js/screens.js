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

  function overlapRatio(a, b) {
    const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (w <= 0 || h <= 0) return 0;
    return (w * h) / Math.min(a.w * a.h, b.w * b.h);
  }

  function placeGhost(root, placed, w, h) {
    const area = ghostArea(w, h);
    if (area.maxX < area.minX || area.maxY < area.minY) return;

    let fallback = null;

    // Retry a spot that lands on top of another ghost, but never lose the ghost.
    for (let tries = 0; tries < C.GHOST_TRIES; tries++) {
      const box = {
        x: Math.round(area.minX + Math.random() * (area.maxX - area.minX)),
        y: Math.round(area.minY + Math.random() * (area.maxY - area.minY)),
        w: w,
        h: h,
      };
      if (!fallback) fallback = box;
      if (placed.some((other) => overlapRatio(box, other) > C.GHOST_OVERLAP_MAX)) continue;
      placed.push(box);
      root.appendChild(INAV.popups.ghost(box));
      return;
    }

    placed.push(fallback);
    root.appendChild(INAV.popups.ghost(fallback));
  }

  function buildGhosts() {
    const root = ghostsRoot();
    if (!root) return;
    root.textContent = "";

    const g = C.GHOSTS;
    const placed = [];

    for (let i = 0; i < g.count; i++) {
      const w = Math.round(g.w.min + Math.random() * (g.w.max - g.w.min));
      const h = Math.round(g.h.min + Math.random() * (g.h.max - g.h.min));
      placeGhost(root, placed, w, h);
    }
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
    $("pause-progress").textContent = Math.round(Math.min(s.t / C.ROUND_SECONDS, 1) * 100) + "%";
    const startBtn = $("start-menu");
    if (startBtn) startBtn.focus();
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
