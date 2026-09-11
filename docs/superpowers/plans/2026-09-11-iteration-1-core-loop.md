# Iteration 1: Grey-Box Core Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A playable grey-box round. Pop-ups spawn on a ramp with bloom placement, a click anywhere closes one, the round crashes when 12 are open and succeeds at 60 s, and a temporary "click to start" / "restart" is included.

**Architecture:** One `index.html` holds a fixed 1280×720 `#stage` that CSS scales to the window. Classic `<script>` files share one global namespace, `window.INAV`, and each file owns one job: config, stage, popups, hud, screens, game, debug, and main for wiring. `game` owns round state and the `requestAnimationFrame` loop. `popups` owns the DOM for pop-ups and reports closes through a callback.

**Tech Stack:** HTML, CSS and vanilla JavaScript (ES2017+). No libraries, no build step, no server.

**Spec:** `docs/superpowers/specs/2026-09-11-imnotavirus-design.md` (§3 decisions, §5 rules, §7 architecture, §9 iteration 1)

## Global Constraints

- Only HTML, CSS and vanilla JavaScript: no libraries, frameworks, build tools or package managers.
- It must run by double-clicking `index.html` (`file://`). Use classic `<script>` tags only; no `type="module"`, `import` or `fetch`.
- All shared code hangs off `window.INAV`. Each JS file is wrapped in an IIFE and defines exactly one `INAV.<name>`.
- Every tuning number lives in `js/config.js`. No other file hard-codes a tuning value.
- Colors are only the palette tokens: `#00CAFF`, `#FFFFFF`, `#FAF900`, `#FF0057`, `#273548`, `#0078FD`.
- Keep comments minimal (decision log: "Claude writes the code with minimal comments").
- No unit tests. Verify each task with `node --check` for syntax, then the task's manual check in a browser.
- Grey-box only: no final art, fonts, sounds or animations beyond a 100 ms close fade.

## File Map

| File | Responsibility |
|---|---|
| `index.html` | Stage markup (icon column, pop-up layer, temp screens, taskbar, debug), loads CSS then JS in order |
| `css/base.css` | Palette tokens, reset, `#stage` scaling and letterbox, debug overlay |
| `css/desktop.css` | Grey-box icon column and taskbar HUD |
| `css/window.css` | Grey-box pop-up box and close fade |
| `css/screens.css` | Temporary start/end panels |
| `js/config.js` | `INAV.config`: tuning knobs and pop-up copy |
| `js/stage.js` | `INAV.stage`: fit-to-window scale and `safeArea(w, h)` |
| `js/popups.js` | `INAV.popups`: spawn (safe area + bloom), close on pointerdown, clear, count, enable/disable |
| `js/hud.js` | `INAV.hud`: renders the taskbar from a state snapshot |
| `js/screens.js` | `INAV.screens`: `show(name)`, the only code that toggles screen visibility |
| `js/game.js` | `INAV.game`: round state, rAF loop, spawn ramp, crash/success detection |
| `js/debug.js` | `INAV.debug`: overlay toggled with the D key |
| `js/main.js` | Boots modules and wires buttons |

Script load order (fixed): `config.js`, `stage.js`, `popups.js`, `hud.js`, `screens.js`, `debug.js`, `game.js`, `main.js`.

---

### Task 1: Stage, desktop shell and config

**Files:**
- Create: `.gitignore`
- Create: `index.html`
- Create: `css/base.css`
- Create: `css/desktop.css`
- Create: `js/config.js`
- Create: `js/stage.js`
- Create: `js/main.js`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `INAV.config`: an object with the keys listed in Step 3 (`STAGE_W`, `STAGE_H`, `TASKBAR_H`, `CAP`, `ROUND_SECONDS`, `FIRST_SPAWN_MS`, `INTERVAL_START_MS`, `INTERVAL_END_MS`, `INTERVAL_CURVE`, `MAX_DT_MS`, `BLOOM_CHANCE`, `BLOOM_OFFSET {x,y}`, `POPUP_W {min,max}`, `POPUP_H {min,max}`, `SAFE {left,top,right,bottom}`, `CLOSE_ANIM_MS`, `WARN_AT`, `CRIT_AT`, `TITLES: string[]`, `MESSAGES: string[]`)
  - `INAV.stage.init(stageEl: HTMLElement): void`
  - `INAV.stage.safeArea(w: number, h: number): {minX, maxX, minY, maxY}`, in stage units
  - DOM ids: `#stage`, `#icon-column`, `#taskbar`, `#hud-closed`, `#hud-open`, `#hud-cap`, `#hud-fill`, `#hud-time`

- [ ] **Step 1: Create `.gitignore`**

```
.DS_Store
```

- [ ] **Step 2: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>imnotavirus.exe</title>
  <link rel="stylesheet" href="css/base.css">
  <link rel="stylesheet" href="css/desktop.css">
</head>
<body>
  <div id="stage">
    <div id="icon-column">
      <div class="icon-placeholder">Recycle Bin</div>
    </div>

    <div id="taskbar">
      <span class="hud-start">start</span>
      <span>Closed <strong id="hud-closed">0</strong></span>
      <span>Open <strong id="hud-open">0</strong>/<span id="hud-cap">12</span></span>
      <span class="hud-av">
        Antivirus
        <span class="hud-meter"><span class="hud-meter-fill" id="hud-fill"></span></span>
        <strong id="hud-time">60s</strong>
      </span>
    </div>
  </div>

  <script src="js/config.js"></script>
  <script src="js/stage.js"></script>
  <script src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 3: Create `js/config.js`**

```js
window.INAV = window.INAV || {};

INAV.config = {
  STAGE_W: 1280,
  STAGE_H: 720,
  TASKBAR_H: 56,

  CAP: 12,
  ROUND_SECONDS: 60,

  FIRST_SPAWN_MS: 600,
  INTERVAL_START_MS: 1100,
  INTERVAL_END_MS: 360,
  INTERVAL_CURVE: 1.15,
  MAX_DT_MS: 100,

  BLOOM_CHANCE: 0.45,
  BLOOM_OFFSET: { x: 150, y: 110 },

  POPUP_W: { min: 240, max: 300 },
  POPUP_H: { min: 140, max: 160 },
  SAFE: { left: 130, top: 16, right: 16, bottom: 16 },

  CLOSE_ANIM_MS: 100,

  WARN_AT: 7,
  CRIT_AT: 10,

  TITLES: [
    "WARNING.exe", "FreeRAM_Download", "YOU_WON!!!.exe", "System Alert", "toolbar_setup.exe",
    "Congratulations!", "hot_deals.exe", "PC_Cleaner_Pro", "Update Required", "definitely_safe.zip",
  ],
  MESSAGES: [
    "Your PC is running SLOW! Click to fix now.",
    "You are visitor #1,000,000! Claim your prize.",
    "Download 16GB more RAM for free!",
    "3 viruses found. Install cleaner?",
    "Your toolbar is out of date.",
    "Limited offer: 99% off a new mouse!",
    "Warning: low disk vibes detected.",
    "Allow notifications? (you have no choice)",
    "Your warranty is expiring. Probably.",
    "A new update is ready. And another.",
  ],
};
```

- [ ] **Step 4: Create `js/stage.js`**

```js
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
```

- [ ] **Step 5: Create `js/main.js`**

```js
(function () {
  INAV.stage.init(document.getElementById("stage"));
})();
```

- [ ] **Step 6: Create `css/base.css`**

```css
:root {
  --desk: #00CAFF;
  --paper: #FFFFFF;
  --warn: #FAF900;
  --err: #FF0057;
  --ink: #273548;
  --blue: #0078FD;

  --line: 3px;
  --taskbar: 56px;
  --font: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}

* { box-sizing: border-box; }

html, body { height: 100%; margin: 0; }

body {
  overflow: hidden;
  background: var(--ink);
  color: var(--ink);
  font-family: var(--font);
  user-select: none;
  -webkit-user-select: none;
}

#stage {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 1280px;
  height: 720px;
  transform: translate(-50%, -50%) scale(var(--scale, 1));
  background: var(--desk);
  overflow: hidden;
}
```

- [ ] **Step 7: Create `css/desktop.css`**

```css
#icon-column {
  position: absolute;
  left: 0;
  top: 0;
  bottom: var(--taskbar);
  width: 130px;
  border-right: 2px dashed var(--ink);
}

.icon-placeholder {
  margin: 20px auto 0;
  width: 88px;
  height: 80px;
  display: grid;
  place-items: center;
  border: 2px dashed var(--ink);
  font-size: 12px;
  text-align: center;
}

#taskbar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: var(--taskbar);
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 0 16px 0 0;
  background: var(--blue);
  color: var(--paper);
  border-top: var(--line) solid var(--ink);
  font-size: 16px;
  font-variant-numeric: tabular-nums;
}

.hud-start {
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 20px;
  background: var(--ink);
  font-weight: 700;
  font-style: italic;
}

.hud-av {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
}

.hud-meter {
  width: 200px;
  height: 18px;
  background: var(--paper);
  border: 2px solid var(--ink);
}

.hud-meter-fill {
  display: block;
  height: 100%;
  width: 0;
  background: var(--warn);
}

#hud-time {
  width: 36px;
  text-align: right;
}
```

- [ ] **Step 8: Syntax check**

Run: `node --check js/config.js && node --check js/stage.js && node --check js/main.js && echo OK`
Expected: `OK`

- [ ] **Step 9: Manual check**

Open `index.html` by double-clicking it (or run `open index.html`).
Expected:
- A cyan 1280×720 desktop, centered, with dark `#273548` bars filling any leftover space.
- A dashed icon column on the left with a "Recycle Bin" placeholder.
- A blue taskbar reading `start | Closed 0 | Open 0/12 | Antivirus [empty bar] 60s`.
- Resizing the window scales everything together, with no scrollbars.
- DevTools console shows no errors.

- [ ] **Step 10: Commit**

```bash
git add .gitignore index.html css/base.css css/desktop.css js/config.js js/stage.js js/main.js
git commit -m "feat: add scaled stage, desktop shell and config"
```

---

### Task 2: Pop-ups (spawn with safe area + bloom, click to close)

**Files:**
- Create: `css/window.css`
- Create: `js/popups.js`
- Modify: `index.html` (add pop-up layer, stylesheet and script)
- Modify: `js/main.js` (temporary init for console testing)

**Interfaces:**
- Consumes: `INAV.config` (`POPUP_W`, `POPUP_H`, `BLOOM_CHANCE`, `BLOOM_OFFSET`, `CLOSE_ANIM_MS`, `TITLES`, `MESSAGES`), `INAV.stage.safeArea(w, h)`
- Produces:
  - `INAV.popups.init(layerEl: HTMLElement, onClose: (el: HTMLElement) => void): void`
  - `INAV.popups.spawn(): HTMLElement`: adds one pop-up, returns it
  - `INAV.popups.count(): number`: open pop-ups, excluding ones mid-close
  - `INAV.popups.clear(): void`: removes every pop-up
  - `INAV.popups.setEnabled(on: boolean): void`: when false, clicks do nothing
  - DOM: `#popups` layer; each pop-up is `div.popup` with `.popup-bar` and `.popup-body`; `.closing` while fading out

- [ ] **Step 1: Create `css/window.css`**

```css
#popups {
  position: absolute;
  inset: 0 0 var(--taskbar) 0;
  z-index: 1;
}

.popup {
  position: absolute;
  display: flex;
  flex-direction: column;
  background: var(--paper);
  border: var(--line) solid var(--ink);
  cursor: pointer;
  transition: opacity 100ms linear;
}

.popup-bar {
  padding: 6px 10px;
  background: var(--blue);
  color: var(--paper);
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.popup-body {
  flex: 1;
  padding: 10px;
  font-size: 14px;
  line-height: 1.3;
}

.popup.closing {
  opacity: 0;
  pointer-events: none;
}
```

- [ ] **Step 2: Create `js/popups.js`**

```js
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
```

- [ ] **Step 3: Modify `index.html`: add the pop-up layer, stylesheet and script**

Add this line directly after `<link rel="stylesheet" href="css/desktop.css">`:

```html
  <link rel="stylesheet" href="css/window.css">
```

Add this line directly after the closing `</div>` of `#icon-column` (before `<div id="taskbar">`):

```html
    <div id="popups"></div>
```

Add this line directly before `<script src="js/main.js"></script>`:

```html
  <script src="js/popups.js"></script>
```

- [ ] **Step 4: Replace `js/main.js` with a temporary console-test version**

```js
(function () {
  INAV.stage.init(document.getElementById("stage"));
  INAV.popups.init(document.getElementById("popups"), () => {
    console.log("closed; open now:", INAV.popups.count());
  });
  INAV.popups.setEnabled(true);
})();
```

- [ ] **Step 5: Syntax check**

Run: `node --check js/popups.js && node --check js/main.js && echo OK`
Expected: `OK`

- [ ] **Step 6: Manual check (DevTools console)**

Open `index.html`, open DevTools → Console, and run:

```js
for (let i = 0; i < 40; i++) INAV.popups.spawn();
```

Expected:
- 40 white boxes with blue title bars and joke text. Some sit in clusters (bloom), and newer ones stack on top.
- None cross the dashed icon column, sit under the taskbar or go past the right or top edge.
- Clicking anywhere on a box fades it out, and the console logs `closed; open now: N`, going down by exactly 1 per box even when you click rapidly.
- `INAV.popups.count()` in the console matches what you see.
- `INAV.popups.clear()` empties the desktop.
- Run `INAV.config.BLOOM_CHANCE = 1; INAV.popups.clear(); for (let i = 0; i < 20; i++) INAV.popups.spawn();` and you should see one tight spreading cluster.

- [ ] **Step 7: Commit**

```bash
git add css/window.css js/popups.js index.html js/main.js
git commit -m "feat: add pop-up spawning with safe area, bloom and click-to-close"
```

---

### Task 3: Round loop, HUD and temporary start/end screens

**Files:**
- Create: `js/hud.js`
- Create: `js/screens.js`
- Create: `js/game.js`
- Create: `css/screens.css`
- Modify: `index.html` (screens markup, stylesheet, scripts)
- Modify: `js/main.js` (full wiring, replacing the Task 2 test version)

**Interfaces:**
- Consumes: `INAV.config`, `INAV.stage.init`, `INAV.popups.{init, spawn, count, clear, setEnabled}`
- Produces:
  - `INAV.hud.init(): void`, `INAV.hud.render(snapshot): void`
  - `INAV.screens.show(name: "start" | "play" | "end"): void`
  - `INAV.game.init(onEnd: (result: "crash" | "success", snapshot) => void): void`: starts the rAF loop
  - `INAV.game.start(): void`: resets and begins a round
  - `INAV.game.handleClose(): void`: pass to `INAV.popups.init` as the close callback
  - `INAV.game.snapshot(): { phase: "idle"|"play"|"crash"|"success", t: number, score: number, open: number, interval: number }`
  - `INAV.game.interval(t: number): number`: ms between spawns at time `t`
  - Optional hook: if `INAV.debug` exists, the loop calls `INAV.debug.render(snapshot)` every frame (added in Task 4)

- [ ] **Step 1: Create `js/hud.js`**

```js
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
```

- [ ] **Step 2: Create `js/screens.js`**

```js
(function () {
  INAV.screens = {
    show(name) {
      document.querySelectorAll("[data-screen]").forEach((el) => {
        el.hidden = el.dataset.screen !== name;
      });
    },
  };
})();
```

- [ ] **Step 3: Create `js/game.js`**

```js
(function () {
  const C = INAV.config;
  const state = {
    phase: "idle",
    t: 0,
    score: 0,
    spawnAcc: 0,
    nextSpawnIn: C.FIRST_SPAWN_MS,
    lastFrame: 0,
  };
  let onEnd = function () {};

  function interval(t) {
    const p = Math.min(Math.max(t / C.ROUND_SECONDS, 0), 1);
    return C.INTERVAL_START_MS - (C.INTERVAL_START_MS - C.INTERVAL_END_MS) * Math.pow(p, C.INTERVAL_CURVE);
  }

  function snapshot() {
    return {
      phase: state.phase,
      t: state.t,
      score: state.score,
      open: INAV.popups.count(),
      interval: interval(state.t),
    };
  }

  function start() {
    INAV.popups.clear();
    state.phase = "play";
    state.t = 0;
    state.score = 0;
    state.spawnAcc = 0;
    state.nextSpawnIn = C.FIRST_SPAWN_MS;
    INAV.popups.setEnabled(true);
  }

  function end(result) {
    state.phase = result;
    INAV.popups.setEnabled(false);
    onEnd(result, snapshot());
  }

  function handleClose() {
    if (state.phase === "play") state.score++;
  }

  function step(dt) {
    state.t += dt / 1000;
    state.spawnAcc += dt;

    while (state.spawnAcc >= state.nextSpawnIn) {
      state.spawnAcc -= state.nextSpawnIn;
      INAV.popups.spawn();
      state.nextSpawnIn = interval(state.t);
      if (INAV.popups.count() >= C.CAP) {
        end("crash");
        return;
      }
    }

    if (state.t >= C.ROUND_SECONDS) end("success");
  }

  // dt is clamped so a hidden tab can't release a burst of pop-ups when it returns.
  function frame(now) {
    const dt = Math.min(now - (state.lastFrame || now), C.MAX_DT_MS);
    state.lastFrame = now;

    if (state.phase === "play") step(dt);

    const s = snapshot();
    INAV.hud.render(s);
    if (INAV.debug) INAV.debug.render(s);

    requestAnimationFrame(frame);
  }

  INAV.game = {
    init(endHandler) {
      onEnd = endHandler;
      requestAnimationFrame(frame);
    },
    start,
    handleClose,
    snapshot,
    interval,
  };
})();
```

- [ ] **Step 4: Create `css/screens.css`**

```css
[data-screen] {
  position: absolute;
  inset: 0 0 var(--taskbar) 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
}

[data-screen][hidden] {
  display: none;
}

[data-screen="play"] {
  pointer-events: none;
}

.panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px 32px;
  background: var(--paper);
  border: var(--line) solid var(--ink);
  text-align: center;
}

.panel h1 {
  margin: 0;
  font-size: 40px;
}

.panel p {
  margin: 0;
  font-size: 18px;
}

.temp-btn {
  font: inherit;
  font-size: 20px;
  font-weight: 700;
  padding: 10px 28px;
  background: var(--warn);
  color: var(--ink);
  border: var(--line) solid var(--ink);
  cursor: pointer;
}

.temp-btn:focus-visible {
  outline: 4px solid var(--ink);
  outline-offset: 3px;
}
```

- [ ] **Step 5: Modify `index.html`: screens markup, stylesheet and scripts**

Add this line directly after `<link rel="stylesheet" href="css/window.css">`:

```html
  <link rel="stylesheet" href="css/screens.css">
```

Add this block directly after `<div id="popups"></div>` (before `<div id="taskbar">`):

```html
    <section data-screen="start">
      <div class="panel">
        <h1>imnotavirus.exe</h1>
        <p>Grey-box build. Close pop-ups for 60 seconds. 12 open = crash.</p>
        <button class="temp-btn" id="start-btn">click to start</button>
      </div>
    </section>

    <section data-screen="play" hidden></section>

    <section data-screen="end" hidden>
      <div class="panel">
        <h1 id="end-title">CRASHED</h1>
        <p id="end-detail"></p>
        <button class="temp-btn" id="restart-btn">restart</button>
      </div>
    </section>
```

Replace the single line `<script src="js/popups.js"></script>` with these lines (the order matters):

```html
  <script src="js/popups.js"></script>
  <script src="js/hud.js"></script>
  <script src="js/screens.js"></script>
  <script src="js/game.js"></script>
```

- [ ] **Step 6: Replace `js/main.js`**

```js
(function () {
  const C = INAV.config;
  const $ = (id) => document.getElementById(id);

  INAV.stage.init($("stage"));
  INAV.hud.init();
  INAV.popups.init($("popups"), () => INAV.game.handleClose());

  INAV.game.init((result, s) => {
    if (result === "crash") {
      $("end-title").textContent = "CRASHED";
      $("end-detail").textContent =
        `${C.CAP} pop-ups were open at ${s.t.toFixed(1)}s. You closed ${s.score}.`;
    } else {
      $("end-title").textContent = "SURVIVED";
      $("end-detail").textContent = `Antivirus installed. You closed ${s.score}.`;
    }
    INAV.screens.show("end");
    $("restart-btn").focus();
  });

  function begin() {
    INAV.game.start();
    INAV.screens.show("play");
  }

  $("start-btn").addEventListener("click", begin);
  $("restart-btn").addEventListener("click", begin);

  INAV.screens.show("start");
})();
```

- [ ] **Step 7: Syntax check**

Run: `for f in js/*.js; do node --check "$f" || exit 1; done && echo OK`
Expected: `OK`

- [ ] **Step 8: Manual check**

Open `index.html`.
Expected:
- A start panel appears. Clicking **click to start** hides it and the first pop-up appears within 1 s.
- The taskbar shows Closed going up as you click, Open tracking pop-ups on screen, the antivirus bar filling and the seconds counting down from 60.
- **Crash:** don't click anything. Around 12 s, the 12th pop-up appears, the end panel says `CRASHED`, and the 12 pop-ups stay visible behind it. Clicking them does nothing.
- **Restart** clears the desktop and starts a fresh round (Closed 0, 60s).
- **Success:** in DevTools run `INAV.config.ROUND_SECONDS = 10`, click restart, and keep clicking. At 10 s the panel says `SURVIVED`. Reload afterward to reset the config.
- **Hidden tab:** mid-round, switch tabs for 10 s and come back. There's no burst of pop-ups, and the timer didn't advance while hidden.
- No console errors.

- [ ] **Step 9: Commit**

```bash
git add js/hud.js js/screens.js js/game.js css/screens.css index.html js/main.js
git commit -m "feat: add round loop, taskbar HUD and temporary start/end screens"
```

---

### Task 4: Debug overlay (D key)

**Files:**
- Create: `js/debug.js`
- Modify: `css/base.css` (append overlay styles)
- Modify: `index.html` (overlay element and script)

**Interfaces:**
- Consumes: `INAV.config.CAP`, and the snapshot shape from `INAV.game.snapshot()`: `{ phase, t, score, open, interval }`
- Produces:
  - `INAV.debug.init(el: HTMLElement): void`
  - `INAV.debug.render(snapshot): void`, called every frame by `game.js` once `INAV.debug` exists

- [ ] **Step 1: Create `js/debug.js`**

```js
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
```

- [ ] **Step 2: Append to `css/base.css`**

```css
#debug {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  margin: 0;
  padding: 8px 10px;
  background: var(--ink);
  color: var(--paper);
  font: 12px/1.5 ui-monospace, Menlo, Consolas, monospace;
  pointer-events: none;
}
```

- [ ] **Step 3: Modify `index.html`**

Add this line directly after the closing `</div>` of `#taskbar` (still inside `#stage`):

```html
    <pre id="debug" hidden></pre>
```

Add this line directly after `<script src="js/screens.js"></script>` (before `game.js`):

```html
  <script src="js/debug.js"></script>
```

- [ ] **Step 4: Modify `js/main.js`: init the overlay**

Add this line directly after `INAV.hud.init();`:

```js
  INAV.debug.init($("debug"));
```

- [ ] **Step 5: Syntax check**

Run: `for f in js/*.js; do node --check "$f" || exit 1; done && echo OK`
Expected: `OK`

- [ ] **Step 6: Manual check**

Open `index.html` and press **D**.
Expected:
- A dark overlay appears top-right showing `phase idle`, `t 0.0s`, `interval 1100ms`, `open 0/12`, `closed 0`. Pressing D again hides it.
- During a round, `interval` reads about 770 ms at t≈30 s and about 430 ms at t≈55 s.
- The overlay never blocks clicks on pop-ups under it.

- [ ] **Step 7: Commit**

```bash
git add js/debug.js css/base.css index.html js/main.js
git commit -m "feat: add D-key debug overlay for tuning"
```

---

### Task 5: Iteration 1 acceptance pass

**Files:**
- Modify: `docs/superpowers/specs/2026-09-11-imnotavirus-design.md` (only if the acceptance pass turns up a spec mismatch)

**Interfaces:**
- Consumes: the whole iteration 1 build
- Produces: a build ready for Rickey's hand testing

- [ ] **Step 1: Final syntax check and file inventory**

Run: `for f in js/*.js; do node --check "$f" || exit 1; done && ls index.html css js && git status --short`
Expected: no syntax errors, a listing of `index.html`, 4 CSS files (`base`, `desktop`, `window`, `screens`) and 8 JS files (`config`, `stage`, `popups`, `hud`, `screens`, `debug`, `game`, `main`), and empty `git status` output.

- [ ] **Step 2: Walk the spec §9 iteration 1 checklist in a browser**

Every item must pass:
- [ ] Open `index.html` by double-clicking it. No console errors.
- [ ] The first pop-up appears within 1 s.
- [ ] The debug interval drops from about 1100 ms toward 360 ms over the round.
- [ ] No pop-up appears off-screen, under the taskbar or over the icon column.
- [ ] A click anywhere on a pop-up closes it: score +1, open −1. Rapid clicks never double count.
- [ ] Not clicking crashes exactly when 12 are open.
- [ ] Surviving to 60 s triggers success.
- [ ] Resizing mid-round keeps everything in place and in view.

- [ ] **Step 3: Hand off to Rickey**

Report: the branch name (`iteration-1-core-loop`), how to open the game, the spec §9 checklist, and the iteration 2 questions from spec §9 for Rickey to answer.
