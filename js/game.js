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
    scores: {
      last: INAV.storage.get(C.STORAGE_KEYS.last, 0),
      best: INAV.storage.get(C.STORAGE_KEYS.best, 0),
    },
  };
  let onPhase = function () {};
  let tutorialShown = false;

  // Piecewise ramp: a flat 1/sec through 0:10, 3/sec at 0:30, tightening to the end.
  function interval(t) {
    const keys = C.SPAWN_RAMP;
    for (let i = 0; i < keys.length - 1; i++) {
      const a = keys[i];
      const b = keys[i + 1];
      if (t <= b.t) {
        const p = Math.max(0, Math.min(1, (t - a.t) / (b.t - a.t)));
        return a.ms + (b.ms - a.ms) * p;
      }
    }
    return keys[keys.length - 1].ms;
  }

  function nextGap(t) {
    const j = C.SPAWN_JITTER_PCT;
    return interval(t) * (1 - j + Math.random() * j * 2);
  }

  function snapshot() {
    return {
      phase: state.phase,
      t: state.t,
      score: state.score,
      open: INAV.popups.count(),
      interval: interval(state.t),
      result: state.result,
      scores: state.scores,
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
    state.result = null;
  }

  function goTitle() {
    resetRound();
    INAV.popups.setEnabled(false);
    setPhase("title");
  }

  function startTutorial() {
    if (tutorialShown) {
      startRound();
      return;
    }
    tutorialShown = true;

    resetRound();
    const P = C.PRACTICE;
    INAV.popups.spawn({
      x: Math.round((C.STAGE_W - P.w) / 2),
      y: P.y,
      type: P.type,
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

  function togglePause() {
    if (state.phase === "play") {
      INAV.popups.setEnabled(false);
      setPhase("paused");
    } else if (state.phase === "paused") {
      INAV.popups.setEnabled(true);
      setPhase("play");
    }
  }

  function recordResult(won) {
    const previousBest = state.scores.best;
    const isBest = state.score > previousBest;

    state.scores.last = state.score;
    INAV.storage.set(C.STORAGE_KEYS.last, state.scores.last);
    if (isBest) {
      state.scores.best = state.score;
      INAV.storage.set(C.STORAGE_KEYS.best, state.scores.best);
    }

    state.result = {
      won,
      score: state.score,
      t: state.t,
      best: state.scores.best,
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
    setPhase("winning");
    sweep();
  }

  // The antivirus tidies the desk one pop-up at a time before the wizard appears,
  // so a round that ended cluttered takes visibly longer to clear than a clean one.
  function sweep() {
    if (state.phase !== "winning") return;

    if (INAV.popups.closeOldest()) {
      setTimeout(sweep, C.WIN_SWEEP_STEP_MS);
      return;
    }

    setTimeout(() => {
      if (state.phase !== "winning") return;
      INAV.popups.clear();
      setPhase("success");
    }, C.WIN_SWEEP_HOLD_MS);
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

    if (state.t >= C.ROUND_SECONDS) {
      succeed();
      return;
    }
    state.spawnAcc += dt;

    while (state.spawnAcc >= state.nextSpawnIn) {
      state.spawnAcc -= state.nextSpawnIn;
      INAV.popups.spawn();
      state.nextSpawnIn = nextGap(state.t);
      if (INAV.popups.count() >= C.CAP) {
        crash();
        return;
      }
    }
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
    togglePause,
    handleClose,
    snapshot,
    interval,
  };
})();
