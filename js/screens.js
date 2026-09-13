(function () {
  const C = INAV.config;
  const SCREEN_FOR_PHASE = {
    title: "title",
    tutorial: "tutorial",
    play: "play",
    paused: "paused",
    crashing: "play",
    winning: "play",
    board: "board",
    crash: "crash",
    success: "success",
  };
  const $ = (id) => document.getElementById(id);
  let pctTimer = null;
  let lockTimer = null;
  let tickTimers = [];
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

    const last = placed.length ? placed[placed.length - 1] : null;
    let fallback = null;
    let best = null;
    let bestGap = -1;

    for (let tries = 0; tries < C.GHOST_TRIES; tries++) {
      const box = {
        x: Math.round(area.minX + Math.random() * (area.maxX - area.minX)),
        y: Math.round(area.minY + Math.random() * (area.maxY - area.minY)),
        w: w,
        h: h,
      };
      if (!fallback) fallback = box;
      if (placed.some((other) => overlapRatio(box, other) > C.GHOST_OVERLAP_MAX)) continue;

      const gap = last ? Math.hypot(box.x + w / 2 - (last.x + last.w / 2), box.y + h / 2 - (last.y + last.h / 2)) : Infinity;
      if (gap > bestGap) {
        bestGap = gap;
        best = box;
      }
      if (gap >= C.GHOST_MIN_DISTANCE) break;
    }

    const chosen = best || fallback;
    placed.push(chosen);
    root.appendChild(
      INAV.popups.ghost({
        x: chosen.x,
        y: chosen.y,
        w: chosen.w,
        h: chosen.h,
        type: "plain",
        title: C.GHOST_COPY.title,
        message: C.GHOST_COPY.message,
      })
    );
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

  function lockButton(btn, ms) {
    btn.disabled = true;
    lockTimer = setTimeout(() => {
      btn.disabled = false;
      // Only steal focus when it isn't already somewhere meaningful. A player
      // who has clicked into the name field and is mid-word must not have
      // focus yanked onto this button -- the next space they type would
      // activate it and bail out to the title screen with the run unsubmitted.
      if (!document.activeElement || document.activeElement === document.body) btn.focus();
    }, ms === undefined ? C.END_LOCKOUT_MS : ms);
  }

  function enterTitle(s) {
    $("title-last").textContent = s.scores.last;
    $("title-best").textContent = s.scores.best;
    $("start-btn").focus();
    INAV.wheel.start();
    startGhosts();
  }

  function enterPaused(s) {
    $("pause-closed").textContent = s.score;
    $("pause-open").textContent = s.open;
    $("pause-progress").textContent = Math.round(Math.min(s.t / C.ROUND_SECONDS, 1) * 100) + "%";
    if (INAV.wheel) INAV.wheel.focusSilently();
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

    // Passed by reference (not a fresh literal) so that re-mounting for the

    lockButton($("try-again-btn"));
  }

  function enterSuccess(s) {
    const r = s.result;
    $("success-score").textContent = r.score;
    $("success-best").textContent = r.best;
    $("success-new-best").hidden = !r.isBest;
    INAV.nameEntry.mount($("success-name-slot"), r);

    const wizard = document.querySelector('[data-screen="success"] .wizard');
    if (!wizard || reducedMotion.matches) {
      if (wizard) wizard.classList.remove("wizard-reveal");
      lockButton($("play-again-btn"));
      return;
    }

    // The steps tick over one at a time and the meter fills last. The step text is
    // always in the DOM, so the live region announces the finished list once rather
    // than nagging a screen reader on every tick.
    const steps = wizard.querySelectorAll(".wizard-steps li");
    wizard.classList.add("wizard-reveal");
    wizard.classList.remove("filled");
    steps.forEach((li) => li.classList.remove("done"));
    steps.forEach((li, i) => {
      tickTimers.push(setTimeout(() => li.classList.add("done"), C.WIN_TICK_STEP_MS * (i + 1)));
    });

    const fillAt = C.WIN_TICK_STEP_MS * (steps.length + 1);
    tickTimers.push(setTimeout(() => wizard.classList.add("filled"), fillAt));
    lockButton($("play-again-btn"), fillAt + C.END_LOCKOUT_MS);
  }

  function enterBoard() {
    INAV.boardUI.load();
    const close = $("board-close");
    if (close) close.focus();
  }

  const ENTER = {
    title: enterTitle,
    paused: enterPaused,
    crash: enterCrash,
    success: enterSuccess,
    board: enterBoard,
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
      tickTimers.forEach(clearTimeout);
      tickTimers = [];
      pctTimer = null;
      lockTimer = null;
      stopGhosts();
      if (INAV.wheel) INAV.wheel.release();
      if (INAV.nameEntry) INAV.nameEntry.unmount();
      // Invalidate any board fetch still in flight so a slow response can't
      // land in DOM the player has already left.
      if (INAV.boardUI) INAV.boardUI.close();
      const name = SCREEN_FOR_PHASE[phase];
      document.querySelectorAll("[data-screen]").forEach((el) => {
        el.hidden = el.dataset.screen !== name;
      });
      const taskbar = document.getElementById("taskbar");
      if (taskbar) taskbar.inert = phase === "crashing" || phase === "crash" || phase === "winning" || phase === "board";
      if (ENTER[phase]) ENTER[phase](s);
    },
  };
})();
