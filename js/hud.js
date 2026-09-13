(function () {
  const C = INAV.config;
  const LABELS = {
    title: "Antivirus: not installed",
    tutorial: "Antivirus: not installed",
    play: "Antivirus installing…",
    paused: "Antivirus paused",
    crashing: "Antivirus installing…",
    winning: "Antivirus: protected",
    board: "Antivirus: not installed",
    crash: "Antivirus failed",
    success: "Antivirus: protected",
  };
  let els = null;
  let held = null; // taskbar state captured before the board opened

  function tickClock() {
    els.clock.textContent = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  INAV.hud = {
    init() {
      els = {
        fill: document.getElementById("hud-fill"),
        time: document.getElementById("hud-time"),
        label: document.getElementById("hud-label"),
        startBtn: document.getElementById("start-menu"),
        startLabel: document.getElementById("hud-start-label"),
        clock: document.getElementById("hud-clock"),
      };
      tickClock();
      setInterval(tickClock, C.CLOCK_TICK_MS);
    },

    render(s) {
      // The board is an overlay on whatever you were doing, not a state of the
      // install, so the taskbar holds whatever it showed when the board opened
      // instead of dropping back to "not installed" beside a live percentage.
      if (s.phase === "board") {
        if (held) {
          els.fill.style.width = held.width;
          els.label.textContent = held.label;
          els.time.textContent = held.pct;
        }
        return;
      }

      const done = s.phase === "success" || s.phase === "winning";
      const paused = s.phase === "paused";
      const progress = done ? 1 : Math.min(s.t / C.ROUND_SECONDS, 1);
      const width = progress * 100 + "%";
      const pct = Math.round(progress * 100) + "%";

      els.fill.style.width = width;
      els.label.textContent = LABELS[s.phase];
      els.time.textContent = pct;
      held = { width: width, label: LABELS[s.phase], pct: pct };

      // On the title screen the wheel owns this label, so don't fight it.
      if (INAV.wheel && INAV.wheel.owns()) return;

      const startLabel = paused ? "resume" : s.phase === "play" ? "pause" : "start";
      if (els.startLabel.textContent !== startLabel) {
        els.startLabel.textContent = startLabel;
        els.startBtn.title = paused ? "Resume (Esc)" : "Pause (Esc)";
      }
    },
  };
})();
