(function () {
  const C = INAV.config;
  let els = null;

  INAV.hud = {
    init() {
      els = {
        closed: document.getElementById("hud-closed"),
        open: document.getElementById("hud-open"),
        cap: document.getElementById("hud-cap"),
        fill: document.getElementById("hud-fill"),
        time: document.getElementById("hud-time"),
      };
      els.cap.textContent = C.CAP;
    },

    render(s) {
      const progress = Math.min(s.t / C.ROUND_SECONDS, 1);
      els.closed.textContent = s.score;
      els.open.textContent = s.open;
      els.fill.style.width = progress * 100 + "%";
      els.time.textContent = Math.max(0, Math.ceil(C.ROUND_SECONDS - s.t)) + "s";
    },
  };
})();
