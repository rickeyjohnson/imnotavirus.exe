(function () {
  const C = INAV.config;
  let layer = null;
  let onClose = function () {};
  let enabled = false;
  let z = 0;

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const X_MARK =
    '<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">' +
    '<path d="M2 2l8 8M10 2l-8 8" stroke="var(--paper)" stroke-width="var(--line-thin)" stroke-linecap="round"/></svg>';

  function live() {
    return layer.querySelectorAll(".popup:not(.closing)");
  }

  function buildWindow(cls, title, message) {
    const el = document.createElement("div");
    el.className = cls;

    el.innerHTML =
      '<div class="popup-bar"><span class="popup-title"></span><span class="popup-x">' + X_MARK + "</span></div>" +
      '<div class="popup-body"><span class="popup-icon" aria-hidden="true">!</span><span class="popup-text"></span></div>' +
      '<div class="popup-foot"><span class="popup-fake"></span><span class="popup-fake primary"></span></div>';

    el.querySelector(".popup-title").textContent = title;
    el.querySelector(".popup-text").textContent = message;

    const [primary, secondary] = pick(C.BUTTONS);
    const fakes = el.querySelectorAll(".popup-fake");
    fakes[0].textContent = secondary;
    fakes[1].textContent = primary;

    return el;
  }

  function create(x, y, w, h, title, message) {
    const el = buildWindow("popup", title, message);
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
      x = rand(area.minX, area.maxX);
      y = rand(area.minY, area.maxY);

      const open = live();
      if (open.length > 0 && Math.random() < C.BLOOM_CHANCE) {
        const source = pick(open);
        x = parseFloat(source.style.left) + rand(-C.BLOOM_OFFSET.x, C.BLOOM_OFFSET.x);
        y = parseFloat(source.style.top) + rand(-C.BLOOM_OFFSET.y, C.BLOOM_OFFSET.y);
      }
    }

    x = Math.round(clamp(x, area.minX, area.maxX));
    y = Math.round(clamp(y, area.minY, area.maxY));

    const el = create(x, y, w, h, opts.title || pick(C.TITLES), opts.message || pick(C.MESSAGES));
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
      const el = buildWindow("ghost", opts.title || pick(C.TITLES), opts.message || pick(C.MESSAGES));
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
    },
    setEnabled(on) {
      enabled = on;
    },
  };
})();
