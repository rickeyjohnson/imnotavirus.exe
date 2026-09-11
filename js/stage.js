(function () {
  const C = INAV.config;
  let stageEl = null;

  function fit() {
    const scale = Math.min(window.innerWidth / C.STAGE_W, window.innerHeight / C.STAGE_H);
    stageEl.style.setProperty("--scale", scale);
  }

  // Box a w×h pop-up's top-left corner may occupy, in stage units.
  function safeArea(w, h) {
    const playH = C.STAGE_H - C.TASKBAR_H;
    return {
      minX: C.SAFE.left,
      maxX: C.STAGE_W - w - C.SAFE.right,
      minY: C.SAFE.top,
      maxY: playH - h - C.SAFE.bottom,
    };
  }

  INAV.stage = {
    init(el) {
      stageEl = el;
      fit();
      window.addEventListener("resize", fit);
    },
    safeArea,
  };
})();
