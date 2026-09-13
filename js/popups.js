(function () {
  const C = INAV.config;
  let layer = null;
  let onClose = function () {};
  let enabled = false;
  let z = 0;

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function pickType(id) {
    const types = C.POPUP_TYPES;
    if (id) return types.find((t) => t.id === id) || types[0];
    let roll = Math.random() * types.reduce((sum, t) => sum + t.weight, 0);
    for (const type of types) {
      roll -= type.weight;
      if (roll <= 0) return type;
    }
    return types[types.length - 1];
  }

  const X_MARK =
    '<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">' +
    '<path d="M2 2l8 8M10 2l-8 8" stroke="var(--paper)" stroke-width="var(--line-thin)" stroke-linecap="round"/></svg>';

  function live() {
    return layer.querySelectorAll(".popup:not(.closing)");
  }

  // Spread spawns over a coarse grid so a full screen of pop-ups actually fills it.
  function pickCell() {
    const g = C.SPAWN_GRID;
    const counts = new Array(g.cols * g.rows).fill(0);
    live().forEach((el) => {
      const cell = Number(el.dataset.cell);
      if (Number.isInteger(cell) && cell >= 0 && cell < counts.length) counts[cell]++;
    });

    const fewest = Math.min.apply(null, counts);
    const free = [];
    counts.forEach((n, i) => {
      if (n === fewest) free.push(i);
    });
    return free[Math.floor(Math.random() * free.length)];
  }

  function buildWindow(cls, type, title, message) {
    const el = document.createElement("div");
    el.className = cls + " popup-" + type.id;

    const body =
      type.id === "download"
        ? '<div class="popup-body popup-terminal"><span class="popup-text"></span><span class="popup-bar-fill"></span></div>'
        : '<div class="popup-body"><span class="popup-icon" aria-hidden="true">!</span><span class="popup-text"></span></div>';

    el.innerHTML =
      '<div class="popup-bar"><span class="popup-title"></span><span class="popup-x">' + X_MARK + "</span></div>" +
      body +
      '<div class="popup-foot"><span class="popup-fake"></span><span class="popup-fake primary"></span></div>';

    el.querySelector(".popup-title").textContent = title;
    el.querySelector(".popup-text").textContent = message;

    const [primary, secondary] = pick(C.BUTTONS);
    const fakes = el.querySelectorAll(".popup-fake");
    fakes[0].textContent = secondary;
    fakes[1].textContent = primary;

    return el;
  }

  function create(x, y, w, h, type, title, message) {
    const el = buildWindow("popup", type, title, message);
    el.style.left = x + "px";
    el.style.top = y + "px";
    el.style.width = w + "px";
    el.style.height = h + "px";
    el.style.zIndex = ++z;
    layer.appendChild(el);
    return el;
  }

  function spawn(opts = {}) {
    const w = opts.w || Math.round(rand(C.POPUP_W.min, C.POPUP_W.max));
    const h = opts.h || Math.round(rand(C.POPUP_H.min, C.POPUP_H.max));
    const area = INAV.stage.safeArea(w, h);

    let x = opts.x;
    let y = opts.y;
    let cell = -1;

    if (x === undefined || y === undefined) {
      const g = C.SPAWN_GRID;
      cell = pickCell();
      const cw = (C.STAGE_W - C.SAFE.left - C.SAFE.right) / g.cols;
      const ch = (C.STAGE_H - C.TASKBAR_H - C.SAFE.top - C.SAFE.bottom) / g.rows;
      const col = cell % g.cols;
      const row = Math.floor(cell / g.cols);
      x = C.SAFE.left + col * cw + (cw - w) / 2 + rand(-C.SPAWN_JITTER, C.SPAWN_JITTER);
      y = C.SAFE.top + row * ch + (ch - h) / 2 + rand(-C.SPAWN_JITTER, C.SPAWN_JITTER);
    }

    x = Math.round(clamp(x, area.minX, area.maxX));
    y = Math.round(clamp(y, area.minY, area.maxY));

    const type = pickType(opts.type);
    const el = create(x, y, w, h, type, opts.title || pick(type.titles), opts.message || pick(type.messages));
    if (cell >= 0) el.dataset.cell = String(cell);
    if (opts.practice) el.dataset.practice = "1";
    return el;
  }

  function close(el, notify) {
    el.classList.add("closing");
    setTimeout(() => el.remove(), C.CLOSE_ANIM_MS);
    if (notify !== false) onClose(el);
  }

  function handlePointerDown(e) {
    if (!enabled) return;
    if (e.button !== 0) return;
    const el = e.target.closest(".popup");
    if (!el || el.classList.contains("closing")) return;
    close(el);
  }

  INAV.popups = {
    init(layerEl, closeHandler) {
      layer = layerEl;
      onClose = closeHandler;
      layer.addEventListener("pointerdown", handlePointerDown);
    },
    spawn,
    ghost(opts) {
      const type = pickType(opts.type);
      const el = buildWindow("ghost", type, opts.title || pick(type.titles), opts.message || pick(type.messages));
      el.style.left = opts.x + "px";
      el.style.top = opts.y + "px";
      el.style.width = opts.w + "px";
      el.style.height = opts.h + "px";
      return el;
    },
    count() {
      return live().length;
    },
    // Closes the oldest pop-up with the normal animation but without scoring it.
    // Used by the win sweep, where the antivirus tidies up rather than the player.
    closeOldest() {
      const el = live()[0];
      if (!el) return false;
      close(el, false);
      return true;
    },
    clear() {
      layer.replaceChildren();
      z = 0;
    },
    setEnabled(on) {
      enabled = on;
    },
    isEnabled() {
      return enabled;
    },
  };
})();
