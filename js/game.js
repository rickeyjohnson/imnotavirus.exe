(function () {
  const C = INAV.config;
  const state = {
    phase: "idle",
    t: 0,
    score: 0,
    spawnAcc: 0,
    nextSpawnIn: C.FIRST_SPAWN_MS,
    lastFrame: 0,
  };
  let onEnd = function () {};

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
    };
  }

  function start() {
    INAV.popups.clear();
    state.phase = "play";
    state.t = 0;
    state.score = 0;
    state.spawnAcc = 0;
    state.nextSpawnIn = C.FIRST_SPAWN_MS;
    INAV.popups.setEnabled(true);
  }

  function end(result) {
    state.phase = result;
    INAV.popups.setEnabled(false);
    onEnd(result, snapshot());
  }

  function handleClose() {
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
        end("crash");
        return;
      }
    }

    if (state.t >= C.ROUND_SECONDS) end("success");
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
    init(endHandler) {
      onEnd = endHandler;
      requestAnimationFrame(frame);
    },
    start,
    handleClose,
    snapshot,
    interval,
  };
})();
