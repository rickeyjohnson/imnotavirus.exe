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

  function hitsReserved(x, y, w, h) {
    const r = C.GHOST_RESERVED;
    return x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y;
  }


  function ghostBands(w, h) {
    const r = C.GHOST_RESERVED;
    const a = INAV.stage.safeArea(w, h);
    return [
      { minX: a.minX, maxX: a.maxX, minY: a.minY, maxY: Math.min(a.maxY, r.y - h) },
      { minX: Math.max(a.minX, r.x + r.w), maxX: a.maxX, minY: a.minY, maxY: a.maxY },
      { minX: a.minX, maxX: a.maxX, minY: Math.max(a.minY, r.y + r.h), maxY: a.maxY },
      { minX: a.minX, maxX: Math.min(a.maxX, r.x - w), minY: a.minY, maxY: a.maxY },
    ];
  }
  function buildGhosts() {
    const root = ghostsRoot();
    if (!root) return;
    root.textContent = "";

    const g = C.GHOSTS;
    for (let i = 0; i < g.count; i++) {
      const w = Math.round(g.w.min + Math.random() * (g.w.max - g.w.min));
      const h = Math.round(g.h.min + Math.random() * (g.h.max - g.h.min));
      const bands = ghostBands(w, h);

      // Round-robin the bands so the ghosts ring the title instead of filling the widest gap.
      for (let step = 0; step < bands.length; step++) {
        const band = bands[(i + step) % bands.length];
        if (band.maxX < band.minX || band.maxY < band.minY) continue;
        const x = Math.round(band.minX + Math.random() * (band.maxX - band.minX));
        const y = Math.round(band.minY + Math.random() * (band.maxY - band.minY));
        if (hitsReserved(x, y, w, h)) continue;
        root.appendChild(INAV.popups.ghost({ x, y, w, h }));
        break;
      }

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
      if (ENTER[phase]) ENTER[phase](s);
    },
  };
})();
