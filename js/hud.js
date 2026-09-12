(function () {
  const C = INAV.config;
  const LABELS = {
    title: "Antivirus: not installed",
    tutorial: "Antivirus: not installed",
    play: "Antivirus installing…",
    paused: "Antivirus paused",
    crashing: "Antivirus installing…",
    crash: "Antivirus failed",
    success: "Antivirus: protected",
  };
  let els = null;

  function tickClock() {
    els.clock.textContent = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  INAV.hud = {
    init() {
      els = {
        closed: document.getElementById("hud-closed"),
        open: document.getElementById("hud-open"),
        cap: document.getElementById("hud-cap"),
        fill: document.getElementById("hud-fill"),
        time: document.getElementById("hud-time"),
        label: document.getElementById("hud-label"),
        startBtn: document.getElementById("start-menu"),
        startLabel: document.getElementById("hud-start-label"),
        clock: document.getElementById("hud-clock"),
      };
      els.cap.textContent = C.CAP;
      tickClock();
      setInterval(tickClock, C.CLOCK_TICK_MS);
    },

    render(s) {
      const done = s.phase === "success";
      const paused = s.phase === "paused";
      const progress = done ? 1 : Math.min(s.t / C.ROUND_SECONDS, 1);
      els.closed.textContent = s.score;
      els.open.textContent = s.open;
      els.fill.style.width = progress * 100 + "%";
      els.label.textContent = LABELS[s.phase];
      els.time.textContent = done ? "✓" : Math.max(0, Math.ceil(C.ROUND_SECONDS - s.t)) + "s";
      const startLabel = paused ? "resume" : "start";
      if (els.startLabel.textContent !== startLabel) {
        els.startLabel.textContent = startLabel;
        els.startBtn.title = paused ? "Resume (Esc)" : "Pause (Esc)";
      }
    },
  };
})();
