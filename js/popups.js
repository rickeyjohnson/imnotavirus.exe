(function () {
  const C = INAV.config;
  let layer = null;
  let onClose = function () {};
  let enabled = false;
  let z = 0;

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function live() {
    return layer.querySelectorAll(".popup:not(.closing)");
  }

  function create(x, y, w, h) {
    const el = document.createElement("div");
    el.className = "popup";
    el.style.left = x + "px";
    el.style.top = y + "px";
    el.style.width = w + "px";
    el.style.height = h + "px";
    el.style.zIndex = ++z;

    const bar = document.createElement("div");
    bar.className = "popup-bar";
    bar.textContent = pick(C.TITLES);

    const body = document.createElement("div");
    body.className = "popup-body";
    body.textContent = pick(C.MESSAGES);

    el.append(bar, body);
    layer.appendChild(el);
    return el;
  }

  function spawn() {
    const w = Math.round(rand(C.POPUP_W.min, C.POPUP_W.max));
    const h = Math.round(rand(C.POPUP_H.min, C.POPUP_H.max));
    const area = INAV.stage.safeArea(w, h);

    let x = rand(area.minX, area.maxX);
    let y = rand(area.minY, area.maxY);

    const open = live();
    if (open.length > 0 && Math.random() < C.BLOOM_CHANCE) {
      const source = pick(open);
      x = parseFloat(source.style.left) + rand(-C.BLOOM_OFFSET.x, C.BLOOM_OFFSET.x);
      y = parseFloat(source.style.top) + rand(-C.BLOOM_OFFSET.y, C.BLOOM_OFFSET.y);
    }

    x = Math.round(clamp(x, area.minX, area.maxX));
    y = Math.round(clamp(y, area.minY, area.maxY));
    return create(x, y, w, h);
  }

  function close(el) {
    el.classList.add("closing");
    setTimeout(() => el.remove(), C.CLOSE_ANIM_MS);
    onClose(el);
  }

  function handlePointerDown(e) {
    if (!enabled) return;
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
