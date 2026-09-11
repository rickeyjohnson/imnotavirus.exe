(function () {
  const C = INAV.config;
  let el = null;
  let visible = false;

  INAV.debug = {
    init(debugEl) {
      el = debugEl;
      window.addEventListener("keydown", (e) => {
        if ((e.key || "").toLowerCase() !== "d") return;
        visible = !visible;
        el.hidden = !visible;
      });
    },

    render(s) {
      if (!visible) return;
      el.textContent =
        `phase    ${s.phase}\n` +
        `t        ${s.t.toFixed(1)}s\n` +
        `interval ${Math.round(s.interval)}ms\n` +
        `open     ${s.open}/${C.CAP}\n` +
        `closed   ${s.score}`;
    },
  };
})();
