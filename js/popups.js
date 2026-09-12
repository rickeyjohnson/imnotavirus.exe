(function () {
  const C = INAV.config;
  let layer = null;
  let onClose = function () {};
  let enabled = false;
  let z = 0;
  let lastSpawn = null;

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

    if (x === undefined || y === undefined) {
      let best = null;
      let bestGap = -1;

      // Push each pop-up away from the one before it, so they fill the desktop
      // instead of clustering where the player is already looking.
      for (let tries = 0; tries < C.SPAWN_PLACE_TRIES; tries++) {
        const cx = rand(area.minX, area.maxX);
        const cy = rand(area.minY, area.maxY);
        const gap = lastSpawn
          ? Math.hypot(cx + w / 2 - lastSpawn.x, cy + h / 2 - lastSpawn.y)
          : Infinity;
        if (gap > bestGap) {
          bestGap = gap;
          best = { x: cx, y: cy };
        }
        if (gap >= C.SPAWN_MIN_DISTANCE) break;
      }

      x = best.x;
      y = best.y;
    }

    x = Math.round(clamp(x, area.minX, area.maxX));
    y = Math.round(clamp(y, area.minY, area.maxY));
    lastSpawn = { x: x + w / 2, y: y + h / 2 };

    const type = pickType(opts.type);
    const el = create(x, y, w, h, type, opts.title || pick(type.titles), opts.message || pick(type.messages));
    if (opts.practice) el.dataset.practice = "1";
    return el;
  }

  function close(el) {
    el.classList.add("closing");
    setTimeout(() => el.remove(), C.CLOSE_ANIM_MS);
    onClose(el);
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
    clear() {
      layer.replaceChildren();
      z = 0;
      lastSpawn = null;
    },
    setEnabled(on) {
      enabled = on;
    },
  };
})();
