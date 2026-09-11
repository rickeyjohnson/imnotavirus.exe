# Iteration 2: Screen Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace iteration 1's temporary panels with the full screen flow from the sketches and the mini demo: Title → Tutorial → Gameplay (with pause) → Game Over / Success → Title. Last and best scores persist.

**Architecture:** `game.phase` becomes the single state list (`title, tutorial, play, paused, crashing, crash, success`). `game` owns every transition, including the timed `crashing → crash`, and reports each change through one `onPhase(phase, snapshot)` callback. `screens` maps a phase to its visible screen and runs that screen's enter logic (results text, badges, lockouts). `main.js` only wires events. `storage` wraps localStorage. `popups.spawn(opts)` gains a fixed-position / practice mode.

**Tech Stack:** HTML, CSS and vanilla JavaScript. No libraries, no build step, no server.

**Spec:** `docs/superpowers/specs/2026-09-11-imnotavirus-design.md` (§3 decisions, §4 screens and flow, §5.5 persistence, §7 architecture, §9 iteration 2 including "Carried over from the iteration 1 code review")

**Visual/copy reference:** `docs/reference/mini-demo.html`. Screens copy its layout and text. Styling stays basic (palette, system font, simple bordered panels). Don't port the demo's fonts, SVG icons, hard-shadow buttons or animations; those are iteration 3.

## Global Constraints

- Only HTML, CSS and vanilla JavaScript: no libraries, frameworks, build tools or package managers.
- It must run by double-clicking `index.html` (`file://`). Use classic `<script>` tags only; no `type="module"`, `import` or `fetch`.
- All shared code hangs off `window.INAV`. Each JS file is wrapped in an IIFE and defines exactly one `INAV.<name>` (`config.js` is the bootstrap exception, and `main.js` defines none).
- Every tuning number lives in `js/config.js`.
- Colors are only the palette tokens: `#00CAFF`, `#FFFFFF`, `#FAF900`, `#FF0057`, `#273548`, `#0078FD`. A translucent `rgba(39, 53, 72, …)` of `--ink` is allowed for the pause dim.
- Keep comments minimal.
- No unit tests. Verify with `node --check`, structural checks, and the controller's browser pass.
- Script load order (fixed): `config.js`, `storage.js`, `stage.js`, `popups.js`, `hud.js`, `screens.js`, `debug.js`, `game.js`, `main.js`.
- localStorage keys: `inav.last`, `inav.best`.

## File Map

| File | Change | Responsibility after this iteration |
|---|---|---|
| `js/config.js` | Modify | Adds `CRASH_DELAY_MS`, `CRASH_PCT_TICK_MS`, `PRACTICE_START_DELAY_MS`, `STORAGE_KEYS`, `PRACTICE` |
| `js/storage.js` | Create | `INAV.storage.get/set`, localStorage with an in-memory fallback |
| `js/popups.js` | Modify | `spawn(opts)` supports a fixed position/size, a title/message and a practice flag |
| `js/game.js` | Rewrite | Phase machine, tutorial, pause, crashing beat, result recording |
| `js/hud.js` | Rewrite | Phase-aware antivirus label, "✓" on success |
| `js/screens.js` | Rewrite | Phase → screen map, enter logic, copy from config, button lockouts |
| `js/main.js` | Rewrite | Event wiring only |
| `index.html` | Rewrite (Task 2), modify (Task 3) | Title, Tutorial, Play, Paused, Success, Crash markup |
| `css/screens.css` | Rewrite (Task 2), append (Task 3) | Basic styling for every screen |
| `css/desktop.css` | Modify (Task 3) | The taskbar start becomes a button |

---

### Task 1: Foundation (config, storage, spawn options)

**Files:**
- Modify: `js/config.js`
- Create: `js/storage.js`
- Modify: `js/popups.js`
- Modify: `index.html` (one script tag)

**Interfaces:**
- Consumes: the existing `INAV.config`, and `INAV.stage.safeArea(w, h)`
- Produces:
  - New config keys: `CRASH_DELAY_MS: 420`, `CRASH_PCT_TICK_MS: 90`, `PRACTICE_START_DELAY_MS: 250`, `STORAGE_KEYS: { last: "inav.last", best: "inav.best" }`, and `PRACTICE: { title, message, w: 330, h: 170, y: 150 }`
  - `INAV.storage.get(key: string, fallback: any): any`
  - `INAV.storage.set(key: string, value: any): void`
  - `INAV.popups.spawn(opts?: { x?, y?, w?, h?, title?, message?, practice? }): HTMLElement`. With no opts it behaves exactly as before. With `x` and `y` it skips random/bloom placement but still clamps to the safe area. `practice: true` sets `el.dataset.practice = "1"`.

- [ ] **Step 1: Add the config keys**

In `js/config.js`, add these lines directly after the line `END_LOCKOUT_MS: 500,`:

```js
  CRASH_DELAY_MS: 420,
  CRASH_PCT_TICK_MS: 90,
  PRACTICE_START_DELAY_MS: 250,

  STORAGE_KEYS: { last: "inav.last", best: "inav.best" },

  PRACTICE: {
    title: "practice_popup.exe",
    message: "Click anywhere on me to close me. That's the whole trick.",
    w: 330,
    h: 170,
    y: 150,
  },
```

- [ ] **Step 2: Create `js/storage.js`**

```js
(function () {
  const memory = {};

  INAV.storage = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        if (raw !== null) return JSON.parse(raw);
      } catch (e) {}
      return key in memory ? memory[key] : fallback;
    },

    set(key, value) {
      memory[key] = value;
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {}
    },
  };
})();
```

- [ ] **Step 3: Give `popups.spawn` options**

In `js/popups.js`, replace the whole `function create(x, y, w, h) { ... }` function with:

```js
  function create(x, y, w, h, title, message) {
    const el = document.createElement("div");
    el.className = "popup";
    el.style.left = x + "px";
    el.style.top = y + "px";
    el.style.width = w + "px";
    el.style.height = h + "px";
    el.style.zIndex = ++z;

    const bar = document.createElement("div");
    bar.className = "popup-bar";
    bar.textContent = title;

    const body = document.createElement("div");
    body.className = "popup-body";
    body.textContent = message;

    el.append(bar, body);
    layer.appendChild(el);
    return el;
  }
```

Then replace the whole `function spawn() { ... }` function with:

```js
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
```

- [ ] **Step 4: Load `storage.js`**

In `index.html`, add this line directly after `<script src="js/config.js"></script>`:

```html
  <script src="js/storage.js"></script>
```

- [ ] **Step 5: Verify**

Run: `for f in js/*.js; do node --check "$f" || exit 1; done && echo OK`
Expected: `OK`

Run: `node -e "global.window=global;require('./js/config.js');require('./js/storage.js');INAV.storage.set('k',5);console.log(INAV.storage.get('k',0),INAV.storage.get('missing',7))" 2>/dev/null`
Expected: `5 7` (node has no usable localStorage, so this exercises the in-memory fallback).

Structural: `index.html` loads `config.js`, `storage.js`, `stage.js`, `popups.js`, `hud.js`, `screens.js`, `debug.js`, `game.js`, `main.js` in that order.

Manual (the controller does this in a browser): the iteration 1 game still plays unchanged. In the console, `INAV.popups.spawn({x: 475, y: 150, w: 330, h: 170, title: "t", message: "m", practice: true})` makes a pop-up at exactly that spot with `data-practice="1"`.

- [ ] **Step 6: Commit**

```bash
git add js/config.js js/storage.js js/popups.js index.html
git commit -m "feat: add storage, crash/practice config and spawn options"
```

---

### Task 2: Screen flow (phase machine, screens, results)

**Files:**
- Rewrite: `js/game.js`
- Rewrite: `js/hud.js`
- Rewrite: `js/screens.js`
- Rewrite: `js/main.js`
- Rewrite: `index.html`
- Rewrite: `css/screens.css`

**Interfaces:**
- Consumes: `INAV.config` (including the Task 1 keys and `END_LOCKOUT_MS`), `INAV.storage.get/set`, `INAV.popups.{init, spawn(opts), count, clear, setEnabled}`, `INAV.stage.init`, `INAV.debug.{init, render}`
- Produces:
  - `INAV.game.init(onPhase: (phase: string, snapshot) => void): void`
  - `INAV.game.goTitle()`, `INAV.game.startTutorial()`, `INAV.game.handleClose(el)`, `INAV.game.snapshot()`, `INAV.game.interval(t)`
  - Snapshot: `{ phase, t, score, open, interval, result }`, where `result` is `null` or `{ won: boolean, score: number, t: number, best: number, isBest: boolean }`
  - Phases in this task: `"title" | "tutorial" | "play" | "crashing" | "crash" | "success"` (`"paused"` arrives in Task 3)
  - `INAV.screens.init(): void`, `INAV.screens.show(phase, snapshot): void`
  - `INAV.hud.init()`, `INAV.hud.render(snapshot)`
  - DOM ids: `start-btn`, `title-last`, `title-best`, `success-new-best`, `success-score`, `success-best`, `play-again-btn`, `crash-score`, `crash-best`, `crash-progress`, `crash-new-best`, `crash-pct`, `try-again-btn`, `hud-label`, plus all iteration 1 ids. Classes `copy-seconds` and `copy-cap` are filled from config.

- [ ] **Step 1: Rewrite `js/game.js`**

```js
(function () {
  const C = INAV.config;
  const state = {
    phase: "title",
    t: 0,
    score: 0,
    spawnAcc: 0,
    nextSpawnIn: C.FIRST_SPAWN_MS,
    lastFrame: 0,
    result: null,
  };
  let onPhase = function () {};

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
      result: state.result,
    };
  }

  function setPhase(phase) {
    state.phase = phase;
    onPhase(phase, snapshot());
  }

  function resetRound() {
    INAV.popups.clear();
    state.t = 0;
    state.score = 0;
    state.spawnAcc = 0;
    state.nextSpawnIn = C.FIRST_SPAWN_MS;
  }

  function goTitle() {
    resetRound();
    INAV.popups.setEnabled(false);
    setPhase("title");
  }

  function startTutorial() {
    resetRound();
    const P = C.PRACTICE;
    INAV.popups.spawn({
      x: Math.round((C.STAGE_W - P.w) / 2),
      y: P.y,
      w: P.w,
      h: P.h,
      title: P.title,
      message: P.message,
      practice: true,
    });
    INAV.popups.setEnabled(true);
    setPhase("tutorial");
  }

  function startRound() {
    resetRound();
    INAV.popups.setEnabled(true);
    setPhase("play");
  }

  function recordResult(won) {
    const previousBest = INAV.storage.get(C.STORAGE_KEYS.best, 0);
    const isBest = state.score > previousBest;
    INAV.storage.set(C.STORAGE_KEYS.last, state.score);
    if (isBest) INAV.storage.set(C.STORAGE_KEYS.best, state.score);
    state.result = {
      won,
      score: state.score,
      t: state.t,
      best: Math.max(previousBest, state.score),
      isBest,
    };
  }

  function crash() {
    INAV.popups.setEnabled(false);
    recordResult(false);
    setPhase("crashing");
    setTimeout(() => {
      if (state.phase !== "crashing") return;
      INAV.popups.clear();
      setPhase("crash");
    }, C.CRASH_DELAY_MS);
  }

  function succeed() {
    INAV.popups.setEnabled(false);
    state.t = C.ROUND_SECONDS;
    recordResult(true);
    INAV.popups.clear();
    setPhase("success");
  }

  function handleClose(el) {
    if (state.phase === "tutorial" && el.dataset.practice) {
      INAV.popups.setEnabled(false);
      setTimeout(() => {
        if (state.phase === "tutorial") startRound();
      }, C.PRACTICE_START_DELAY_MS);
      return;
    }
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
        crash();
        return;
      }
    }

    if (state.t >= C.ROUND_SECONDS) succeed();
  }

  // dt is clamped so a hidden tab can't release a burst of pop-ups when it returns.
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(now - (state.lastFrame || now), C.MAX_DT_MS);
    state.lastFrame = now;

    if (state.phase === "play") step(dt);

    const s = snapshot();
    INAV.hud.render(s);
    if (INAV.debug) INAV.debug.render(s);
  }

  INAV.game = {
    init(phaseHandler) {
      onPhase = phaseHandler;
      requestAnimationFrame(frame);
    },
    goTitle,
    startTutorial,
    handleClose,
    snapshot,
    interval,
  };
})();
```

- [ ] **Step 2: Rewrite `js/hud.js`**

```js
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
```

- [ ] **Step 3: Rewrite `js/screens.js`**

```js
(function () {
  const C = INAV.config;
  const SCREEN_FOR_PHASE = {
    title: "title",
    tutorial: "tutorial",
    play: "play",
    crashing: "play",
    crash: "crash",
    success: "success",
  };
  const $ = (id) => document.getElementById(id);
  let pctTimer = null;

  function lockButton(btn) {
    btn.disabled = true;
    setTimeout(() => {
      btn.disabled = false;
      btn.focus();
    }, C.END_LOCKOUT_MS);
  }

  function enterTitle() {
    $("title-last").textContent = INAV.storage.get(C.STORAGE_KEYS.last, 0);
    $("title-best").textContent = INAV.storage.get(C.STORAGE_KEYS.best, 0);
    $("start-btn").focus();
  }

  function enterCrash(s) {
    const r = s.result;
    $("crash-score").textContent = r.score;
    $("crash-best").textContent = r.best;
    $("crash-progress").textContent = Math.floor((r.t / C.ROUND_SECONDS) * 100);
    $("crash-new-best").hidden = !r.isBest;

    let pct = 0;
    $("crash-pct").textContent = pct;
    pctTimer = setInterval(() => {
      pct = Math.min(100, pct + 1 + Math.floor(Math.random() * 9));
      $("crash-pct").textContent = pct;
      if (pct >= 100) clearInterval(pctTimer);
    }, C.CRASH_PCT_TICK_MS);

    lockButton($("try-again-btn"));
  }

  function enterSuccess(s) {
    const r = s.result;
    $("success-score").textContent = r.score;
    $("success-best").textContent = r.best;
    $("success-new-best").hidden = !r.isBest;
    lockButton($("play-again-btn"));
  }

  const ENTER = {
    title: enterTitle,
    crash: enterCrash,
    success: enterSuccess,
  };

  INAV.screens = {
    init() {
      document.querySelectorAll(".copy-seconds").forEach((el) => {
        el.textContent = C.ROUND_SECONDS;
      });
      document.querySelectorAll(".copy-cap").forEach((el) => {
        el.textContent = C.CAP;
      });
    },

    show(phase, s) {
      clearInterval(pctTimer);
      const name = SCREEN_FOR_PHASE[phase];
      document.querySelectorAll("[data-screen]").forEach((el) => {
        el.hidden = el.dataset.screen !== name;
      });
      if (ENTER[phase]) ENTER[phase](s);
    },
  };
})();
```

- [ ] **Step 4: Rewrite `js/main.js`**

```js
(function () {
  const $ = (id) => document.getElementById(id);

  INAV.stage.init($("stage"));
  INAV.hud.init();
  INAV.debug.init($("debug"));
  INAV.screens.init();
  INAV.popups.init($("popups"), (el) => INAV.game.handleClose(el));
  INAV.game.init((phase, s) => INAV.screens.show(phase, s));

  $("start-btn").addEventListener("click", () => INAV.game.startTutorial());
  $("try-again-btn").addEventListener("click", () => INAV.game.goTitle());
  $("play-again-btn").addEventListener("click", () => INAV.game.goTitle());

  INAV.game.goTitle();
})();
```

- [ ] **Step 5: Rewrite `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>imnotavirus.exe</title>
  <link rel="stylesheet" href="css/base.css">
  <link rel="stylesheet" href="css/desktop.css">
  <link rel="stylesheet" href="css/window.css">
  <link rel="stylesheet" href="css/screens.css">
</head>
<body>
  <div id="stage">
    <div id="icon-column">
      <div class="icon-placeholder">Recycle Bin</div>
    </div>

    <div id="popups"></div>

    <section data-screen="title" hidden>
      <div class="ghosts" aria-hidden="true">
        <div class="ghost" style="left:180px;top:60px;width:220px;height:130px"><div class="popup-bar">popup</div><div class="popup-body">popup</div></div>
        <div class="ghost" style="left:930px;top:50px;width:240px;height:130px"><div class="popup-bar">popup</div><div class="popup-body">popup</div></div>
        <div class="ghost" style="left:560px;top:24px;width:210px;height:120px"><div class="popup-bar">popup</div><div class="popup-body">popup</div></div>
        <div class="ghost" style="left:170px;top:450px;width:210px;height:130px"><div class="popup-bar">popup</div><div class="popup-body">popup</div></div>
        <div class="ghost" style="left:900px;top:440px;width:240px;height:130px"><div class="popup-bar">popup</div><div class="popup-body">popup</div></div>
      </div>
      <div class="center">
        <h1 class="title-logo">imnotavirus<span class="exe">.exe</span></h1>
        <p class="tagline">Your antivirus needs <span class="copy-seconds">60</span> seconds. The pop-ups need less.</p>
        <button class="btn" id="start-btn" type="button">start</button>
        <div class="stats">
          <span>Score: <strong id="title-last">0</strong></span>
          <span>Best: <strong id="title-best">0</strong></span>
        </div>
      </div>
    </section>

    <section data-screen="tutorial" hidden>
      <div class="instruct">
        <b>Click anywhere on a pop-up</b> to close it. If <b class="copy-cap">12</b> are open at once, your PC crashes.
        Survive <b><span class="copy-seconds">60</span> seconds</b> while the antivirus installs. Close the practice pop-up to begin.
      </div>
    </section>

    <section data-screen="play" hidden></section>

    <section data-screen="success" hidden>
      <div class="dialog" role="dialog" aria-labelledby="success-heading">
        <div class="dialog-bar">antivirus.exe — Setup</div>
        <div class="dialog-body">
          <h2 id="success-heading">Installation complete.<br>Your PC survived.</h2>
          <span class="badge" id="success-new-best" hidden>New best</span>
          <div class="stats">
            <span>Score: <strong id="success-score">0</strong></span>
            <span>Best: <strong id="success-best">0</strong></span>
          </div>
          <button class="btn" id="play-again-btn" type="button">play again</button>
        </div>
      </div>
    </section>

    <div id="taskbar">
      <span class="hud-start">start</span>
      <span>Closed <strong id="hud-closed">0</strong></span>
      <span>Open <strong id="hud-open">0</strong>/<span id="hud-cap">12</span></span>
      <span class="hud-av">
        <span id="hud-label">Antivirus: not installed</span>
        <span class="hud-meter"><span class="hud-meter-fill" id="hud-fill"></span></span>
        <strong id="hud-time">60s</strong>
      </span>
    </div>

    <section data-screen="crash" hidden>
      <div class="crash-face">:(</div>
      <h2>Your PC ran into a problem and needs to restart.</h2>
      <p><span class="copy-cap">12</span> pop-ups were open at once. You closed <strong id="crash-score">0</strong> before it happened (best: <strong id="crash-best">0</strong>), and the antivirus was <strong id="crash-progress">0</strong>% installed.</p>
      <span class="badge" id="crash-new-best" hidden>New best</span>
      <p class="crash-pct"><span id="crash-pct">0</span>% complete</p>
      <button class="btn" id="try-again-btn" type="button">try again</button>
    </section>

    <pre id="debug" hidden></pre>
  </div>

  <script src="js/config.js"></script>
  <script src="js/storage.js"></script>
  <script src="js/stage.js"></script>
  <script src="js/popups.js"></script>
  <script src="js/hud.js"></script>
  <script src="js/screens.js"></script>
  <script src="js/debug.js"></script>
  <script src="js/game.js"></script>
  <script src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 6: Rewrite `css/screens.css`**

```css
[data-screen] {
  position: absolute;
  inset: 0 0 var(--taskbar) 0;
  z-index: 2;
}

[data-screen][hidden] {
  display: none;
}

[data-screen="play"] {
  pointer-events: none;
}

.center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  text-align: center;
}

.ghosts {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.ghost {
  position: absolute;
  display: flex;
  flex-direction: column;
  background: var(--paper);
  border: var(--line) solid var(--ink);
  opacity: 0.3;
}

.title-logo {
  margin: 0;
  font-size: 96px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.title-logo .exe {
  color: var(--err);
}

.tagline {
  margin: 0;
  padding: 6px 16px;
  background: var(--paper);
  border: var(--line) solid var(--ink);
  font-size: 18px;
}

.stats {
  display: flex;
  gap: 10px;
  font-size: 18px;
  font-variant-numeric: tabular-nums;
}

.stats span {
  padding: 6px 12px;
  background: var(--paper);
  border: 2px solid var(--ink);
}

.btn {
  font: inherit;
  font-size: 24px;
  font-weight: 700;
  padding: 10px 36px;
  background: var(--paper);
  color: var(--ink);
  border: var(--line) solid var(--ink);
  cursor: pointer;
}

.btn:hover {
  background: var(--warn);
}

.btn:focus-visible {
  outline: 4px solid var(--warn);
  outline-offset: 3px;
}

.btn:disabled {
  cursor: default;
  opacity: 0.5;
}

.instruct {
  position: absolute;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  width: 760px;
  padding: 14px 20px;
  background: var(--paper);
  border: var(--line) solid var(--ink);
  font-size: 18px;
  line-height: 1.4;
  text-align: center;
}

.dialog {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 440px;
  background: var(--paper);
  border: var(--line) solid var(--ink);
}

.dialog-bar {
  padding: 8px 12px;
  background: var(--blue);
  color: var(--paper);
  font-weight: 700;
  border-bottom: var(--line) solid var(--ink);
}

.dialog-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 24px;
  text-align: center;
}

.dialog-body h2 {
  margin: 0;
  font-size: 26px;
}

.badge {
  padding: 4px 12px;
  background: var(--warn);
  color: var(--ink);
  border: 2px solid var(--ink);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

[data-screen="crash"] {
  inset: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 20px;
  padding: 90px 150px;
  background: var(--blue);
  color: var(--paper);
}

.crash-face {
  margin-bottom: 12px;
  font-size: 160px;
  line-height: 0.8;
}

[data-screen="crash"] h2 {
  margin: 0;
  max-width: 30ch;
  font-size: 32px;
  font-weight: 400;
}

[data-screen="crash"] p {
  margin: 0;
  max-width: 60ch;
  font-size: 20px;
  line-height: 1.4;
}

.crash-pct {
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 7: Verify**

Run: `for f in js/*.js; do node --check "$f" || exit 1; done && echo OK`
Expected: `OK`

Run: `grep -c '<section data-screen=' index.html && grep -o 'id="[a-z-]*"' index.html | sort | uniq -d`
Expected: `5` (the title, tutorial, play, success and crash sections), then no duplicate ids printed.

Structural: every id listed under Interfaces → Produces exists in `index.html`. The script order matches the Global Constraints. `grep -n "restart-btn\|end-title\|end-detail\|temp-btn\|panel" index.html js/*.js css/*.css` prints nothing (the iteration 1 temporary panel is fully gone).

Manual (controller, in a browser):
- The Title shows ghosts, the logo, the tagline "…needs 60 seconds…", **start**, and Score/Best.
- **start** opens the Tutorial with a centered practice pop-up and the instruction bar. Closing it starts the round within about 0.25 s, with Closed 0.
- A crash shows about 0.4 s of frozen pop-ups, then the blue `:(` screen with the counter climbing to 100%. **try again** is disabled for 0.5 s, then goes to the Title.
- A win (set `INAV.config.ROUND_SECONDS = 8` in the console first) shows the Success dialog. **play again** goes to the Title.
- The Title's Score/Best update and survive a reload. "New best" appears only when the best is beaten.

- [ ] **Step 8: Commit**

```bash
git add js/game.js js/hud.js js/screens.js js/main.js index.html css/screens.css
git commit -m "feat: add title, tutorial, crash and success screen flow with saved scores"
```

---

### Task 3: Pause (Esc and the taskbar start button)

**Files:**
- Modify: `js/game.js`
- Modify: `js/hud.js`
- Modify: `js/screens.js`
- Modify: `js/main.js`
- Modify: `index.html`
- Modify: `css/desktop.css`
- Modify: `css/screens.css`

**Interfaces:**
- Consumes: Task 2's `game`, `screens`, `hud` and `main`
- Produces:
  - `INAV.game.togglePause(): void`: `play → paused`, `paused → play`, and nothing in any other phase
  - Phase `"paused"`, mapped to screen `"paused"`
  - DOM ids `start-menu` (the taskbar button) and `resume-btn`

- [ ] **Step 1: Add `togglePause` to `js/game.js`**

Add this function directly after the `function startRound() { ... }` function:

```js
  function togglePause() {
    if (state.phase === "play") {
      INAV.popups.setEnabled(false);
      setPhase("paused");
    } else if (state.phase === "paused") {
      INAV.popups.setEnabled(true);
      setPhase("play");
    }
  }
```

In the `INAV.game = { ... }` object, add `togglePause,` directly after the line `startTutorial,`.

- [ ] **Step 2: Add the paused label to `js/hud.js`**

In the `LABELS` object, add this line directly after the line `play: "Antivirus installing…",`:

```js
    paused: "Antivirus paused",
```

- [ ] **Step 3: Map the paused screen in `js/screens.js`**

In the `SCREEN_FOR_PHASE` object, add this line directly after the line `play: "play",`:

```js
    paused: "paused",
```

Add this function directly after the `function enterTitle() { ... }` function:

```js
  function enterPaused() {
    $("resume-btn").focus();
  }
```

In the `ENTER` object, add this line directly after the line `title: enterTitle,`:

```js
    paused: enterPaused,
```

- [ ] **Step 4: Wire the controls in `js/main.js`**

Add these lines directly after the line `$("play-again-btn").addEventListener("click", () => INAV.game.goTitle());`:

```js
  $("resume-btn").addEventListener("click", () => INAV.game.togglePause());
  $("start-menu").addEventListener("click", () => INAV.game.togglePause());
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !e.repeat) INAV.game.togglePause();
  });
```

- [ ] **Step 5: Add the markup in `index.html`**

Add this block directly after the line `<section data-screen="play" hidden></section>`:

```html

    <section data-screen="paused" hidden>
      <div class="dialog" role="dialog" aria-labelledby="paused-heading">
        <div class="dialog-bar">antivirus.exe — Paused</div>
        <div class="dialog-body">
          <h2 id="paused-heading">Install paused.</h2>
          <p>The timer and the pop-ups are frozen. Press Esc or the start button to keep going.</p>
          <button class="btn" id="resume-btn" type="button">resume</button>
        </div>
      </div>
    </section>
```

Replace the line `<span class="hud-start">start</span>` with:

```html
      <button class="hud-start" id="start-menu" type="button" title="Pause (Esc)">start</button>
```

- [ ] **Step 6: Style the start button in `css/desktop.css`**

Replace the whole `.hud-start { ... }` rule with:

```css
.hud-start {
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 20px;
  background: var(--ink);
  color: var(--paper);
  border: 0;
  font: inherit;
  font-weight: 700;
  font-style: italic;
  cursor: pointer;
}

.hud-start:hover {
  color: var(--warn);
}

.hud-start:focus-visible {
  outline: 3px solid var(--warn);
  outline-offset: -3px;
}
```

- [ ] **Step 7: Style the pause overlay in `css/screens.css`**

Append to the end of the file:

```css
[data-screen="paused"] {
  background: rgba(39, 53, 72, 0.35);
}

.dialog-body p {
  margin: 0;
  font-size: 16px;
  line-height: 1.4;
}
```

- [ ] **Step 8: Verify**

Run: `for f in js/*.js; do node --check "$f" || exit 1; done && echo OK`
Expected: `OK`

Structural: `start-menu` and `resume-btn` exist once each in `index.html`. The `paused` section sits between the `play` and `success` sections. `togglePause` appears in both the function definition and the exported `INAV.game` object.

Manual (controller, in a browser):
- During Gameplay, Esc shows the dimmed Paused dialog. The seconds stop, no pop-ups spawn, and clicking a pop-up does nothing.
- Esc, **resume**, or the taskbar **start** button continues from the same second, with no burst.
- Esc and the start button do nothing on the Title, Tutorial, Game Over or Success screens.

- [ ] **Step 9: Commit**

```bash
git add js/game.js js/hud.js js/screens.js js/main.js index.html css/desktop.css css/screens.css
git commit -m "feat: pause and resume with Esc or the taskbar start button"
```

---

### Task 4: Iteration 2 acceptance pass

**Files:** none unless the pass finds a spec mismatch.

- [ ] **Step 1:** Syntax check every JS file, and confirm `git status` is clean.
- [ ] **Step 2:** Walk the spec §9 iteration 2 checklist in a real browser (the controller does this through the preview server). Every item must pass.
- [ ] **Step 3:** Hand off to Rickey with the branch name (`iteration-2-screen-flow`), how to play, the checklist, and the iteration 3 questions from spec §9.
