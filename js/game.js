(function () {
  const C = INAV.config;
  const state = {
    phase: "title",
    t: 0,
    score: 0,
    spawnAcc: 0,
    nextSpawnIn: C.FIRST_SPAWN_MS,
    lastFrame: 0,
    result: null,
  };
  let onPhase = function () {};

  function interval(t) {
    const p = Math.min(Math.max(t / C.ROUND_SECONDS, 0), 1);
    return C.INTERVAL_START_MS - (C.INTERVAL_START_MS - C.INTERVAL_END_MS) * Math.pow(p, C.INTERVAL_CURVE);
  }

  function snapshot() {
    return {
      phase: state.phase,
      t: state.t,
      score: state.score,
      open: INAV.popups.count(),
      interval: interval(state.t),
      result: state.result,
    };
  }

  function setPhase(phase) {
    state.phase = phase;
    onPhase(phase, snapshot());
  }

  function resetRound() {
    INAV.popups.clear();
    state.t = 0;
    state.score = 0;
    state.spawnAcc = 0;
    state.nextSpawnIn = C.FIRST_SPAWN_MS;
  }

  function goTitle() {
    resetRound();
    INAV.popups.setEnabled(false);
    setPhase("title");
  }

  function startTutorial() {
    resetRound();
    const P = C.PRACTICE;
    INAV.popups.spawn({
      x: Math.round((C.STAGE_W - P.w) / 2),
      y: P.y,
      w: P.w,
      h: P.h,
      title: P.title,
      message: P.message,
      practice: true,
    });
    INAV.popups.setEnabled(true);
    setPhase("tutorial");
  }

  function startRound() {
    resetRound();
    INAV.popups.setEnabled(true);
    setPhase("play");
  }

  function recordResult(won) {
    const previousBest = INAV.storage.get(C.STORAGE_KEYS.best, 0);
    const isBest = state.score > previousBest;
    INAV.storage.set(C.STORAGE_KEYS.last, state.score);
    if (isBest) INAV.storage.set(C.STORAGE_KEYS.best, state.score);
    state.result = {
      won,
      score: state.score,
      t: state.t,
      best: Math.max(previousBest, state.score),
      isBest,
    };
  }

  function crash() {
    INAV.popups.setEnabled(false);
    recordResult(false);
    setPhase("crashing");
    setTimeout(() => {
      if (state.phase !== "crashing") return;
      INAV.popups.clear();
      setPhase("crash");
    }, C.CRASH_DELAY_MS);
  }

  function succeed() {
    INAV.popups.setEnabled(false);
    state.t = C.ROUND_SECONDS;
    recordResult(true);
    INAV.popups.clear();
    setPhase("success");
  }

  function handleClose(el) {
    if (state.phase === "tutorial" && el.dataset.practice) {
      INAV.popups.setEnabled(false);
      setTimeout(() => {
        if (state.phase === "tutorial") startRound();
      }, C.PRACTICE_START_DELAY_MS);
      return;
    }
    if (state.phase === "play") state.score++;
  }

  function step(dt) {
    state.t += dt / 1000;
    state.spawnAcc += dt;

    while (state.spawnAcc >= state.nextSpawnIn) {
      state.spawnAcc -= state.nextSpawnIn;
      INAV.popups.spawn();
      state.nextSpawnIn = interval(state.t);
      if (INAV.popups.count() >= C.CAP) {
        crash();
        return;
      }
    }

    if (state.t >= C.ROUND_SECONDS) succeed();
  }

  // dt is clamped so a hidden tab can't release a burst of pop-ups when it returns.
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(now - (state.lastFrame || now), C.MAX_DT_MS);
    state.lastFrame = now;

    if (state.phase === "play") step(dt);

    const s = snapshot();
    INAV.hud.render(s);
    if (INAV.debug) INAV.debug.render(s);
  }

  INAV.game = {
    init(phaseHandler) {
      onPhase = phaseHandler;
      requestAnimationFrame(frame);
    },
    goTitle,
    startTutorial,
    handleClose,
    snapshot,
    interval,
  };
})();
