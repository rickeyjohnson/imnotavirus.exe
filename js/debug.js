(function () {
  const C = INAV.config;
  let el = null;
  let visible = false;

  INAV.debug = {
    init(debugEl) {
      el = debugEl;
      // A tuning tool, not a player feature: it only arms when the page is
      // opened with ?debug in the URL. Before this it shipped live and every
      // D toggled it -- including the D in a name typed on the win screen.
      if (!new URLSearchParams(location.search).has("debug")) return;
      window.addEventListener("keydown", (e) => {
        if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
        const t = e.target;
        if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
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
