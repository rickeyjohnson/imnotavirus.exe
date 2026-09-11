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

  function lockButton(btn) {
    btn.disabled = true;
    setTimeout(() => {
      btn.disabled = false;
      btn.focus();
    }, C.END_LOCKOUT_MS);
  }

  function enterTitle() {
    $("title-last").textContent = INAV.storage.get(C.STORAGE_KEYS.last, 0);
    $("title-best").textContent = INAV.storage.get(C.STORAGE_KEYS.best, 0);
    $("start-btn").focus();
  }

  function enterPaused() {
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
      const name = SCREEN_FOR_PHASE[phase];
      document.querySelectorAll("[data-screen]").forEach((el) => {
        el.hidden = el.dataset.screen !== name;
      });
      if (ENTER[phase]) ENTER[phase](s);
    },
  };
})();
