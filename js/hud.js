(function () {
  const C = INAV.config;
  const LABELS = {
    title: "Antivirus: not installed",
    tutorial: "Antivirus: not installed",
    play: "Antivirus installing…",
    crashing: "Antivirus installing…",
    crash: "Antivirus failed",
    success: "Antivirus: protected",
  };
  let els = null;

  INAV.hud = {
    init() {
      els = {
        closed: document.getElementById("hud-closed"),
        open: document.getElementById("hud-open"),
        cap: document.getElementById("hud-cap"),
        fill: document.getElementById("hud-fill"),
        time: document.getElementById("hud-time"),
        label: document.getElementById("hud-label"),
      };
      els.cap.textContent = C.CAP;
    },

    render(s) {
      const done = s.phase === "success";
      const progress = done ? 1 : Math.min(s.t / C.ROUND_SECONDS, 1);
      els.closed.textContent = s.score;
      els.open.textContent = s.open;
      els.fill.style.width = progress * 100 + "%";
      els.label.textContent = LABELS[s.phase];
      els.time.textContent = done ? "✓" : Math.max(0, Math.ceil(C.ROUND_SECONDS - s.t)) + "s";
    },
  };
})();
