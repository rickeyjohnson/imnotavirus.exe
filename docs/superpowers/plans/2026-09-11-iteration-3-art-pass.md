# Iteration 3: Art Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** give the working grey-box game the GDD's XP-parody look. The anchor pop-up, desktop icons, taskbar with the fake Windows flag and striped antivirus bar, a real clock, the Title with ghost pop-ups that pop in and out, the blue crash screen and the success dialog.

**Architecture:** no new modules. Art lives in CSS driven by tokens (`--line`, `--radius`, the palette, `--display`, `--font`), icons are inline SVG that reference those tokens, and `stage.init` publishes the layout constants from `config.js` as CSS variables so the numbers have one home. Three carry-overs from the iteration 2 review land here: scores move into the game snapshot, the crash section moves into DOM order, and the taskbar start button reflects the paused state.

**Tech Stack:** HTML, CSS and vanilla JavaScript. No libraries, no build step, no server. Two `.woff2` font files ship in the repo.

**Spec:** `docs/superpowers/specs/2026-09-11-imnotavirus-design.md` (§2 constraints, §3 decisions incl. the iteration 3 rows, §6 art direction, §9 iteration 3)

**Visual reference:** `docs/reference/mini-demo.html`. Match its look. Skip its animations and hover flourishes beyond what this plan specifies; iteration 4 owns feel.

## Global Constraints

- Only HTML, CSS and vanilla JavaScript: no libraries, frameworks, build tools or package managers.
- It must run by double-clicking `index.html` (`file://`). Classic `<script>` tags only; no `type="module"`, `import` or `fetch`. Fonts are base64 in CSS because Chrome blocks font requests over `file://`.
- All shared code hangs off `window.INAV`, one IIFE per file (`config.js` bootstraps, `main.js` defines none).
- Every tuning number lives in `js/config.js`.
- Colors are only these six tokens: `#00CAFF`, `#FFFFFF`, `#FAF900`, `#FF0057`, `#273548`, `#0078FD`. The sole exception is the existing pause dim, `rgba(39, 53, 72, 0.35)`. Inline SVG uses `var(--token)`, never raw hex.
- No raw pixel values for border weight or corner radius: use `var(--line)` and `var(--radius)` (or a `calc()` on them) so the anchor asset drives the whole game.
- Per the GDD: no gradients (the bar's hard-stop diagonal stripes are the one allowed exception, matching the sketch), no textures, no realistic shadows, no serif or thin fonts. Flat offset shadows on buttons are allowed.
- Keep comments minimal.
- No unit tests. Verify with `node --check`, the per-task structural checks, and the controller's real-input browser pass.
- Don't change gameplay behavior. No new animations except the Title ghosts.
- Honor `prefers-reduced-motion`.

## File Map

| File | Change | Responsibility after this iteration |
|---|---|---|
| `assets/fonts/*.woff2` | Create | The Fredoka and Rubik latin subsets, as shipped originals |
| `assets/fonts/README.md` | Create | Provenance, license, regeneration command |
| `css/fonts.css` | Create (generated) | The two `@font-face` rules with base64 payloads |
| `css/base.css` | Modify | Tokens (palette, `--line`, `--radius`, stage vars, font stacks), stage box, debug |
| `css/window.css` | Rewrite | The anchor pop-up: bar, X, icon, body, fake buttons |
| `css/desktop.css` | Rewrite | Desktop icons, taskbar, flag, chips, striped meter, clock |
| `css/screens.css` | Rewrite | Title, tutorial bar, dialogs, crash screen, buttons, ghosts |
| `index.html` | Modify | Icon SVGs, pop-up-shaped ghosts, taskbar markup, crash section moved before the taskbar, `fonts.css` link |
| `js/config.js` | Modify | Adds `BUTTONS` and `GHOST_TOGGLE_MS` |
| `js/stage.js` | Modify | Publishes `--stage-w`, `--stage-h`, `--taskbar` from config |
| `js/popups.js` | Modify | `create()` builds the anchor pop-up structure |
| `js/hud.js` | Modify | Clock, and the start button's paused label and `aria-pressed` |
| `js/game.js` | Modify | Snapshot carries `scores` (last, best) |
| `js/screens.js` | Modify | Title reads scores from the snapshot; runs the ghost timer |

---

### Task 1: Fonts and design tokens

**Files:**
- Create: `assets/fonts/fredoka-latin.woff2`, `assets/fonts/rubik-latin.woff2`, `assets/fonts/README.md`, `css/fonts.css`
- Modify: `css/base.css`, `index.html`, `js/stage.js`

**Interfaces:**
- Produces CSS tokens: `--radius: 12px`, `--display`, `--font`, `--stage-w`, `--stage-h`, `--taskbar` (all on `:root`, with the stage three re-published from config at runtime).
- `INAV.stage.init(el)` additionally sets `--stage-w`, `--stage-h` and `--taskbar` on `document.documentElement` from `INAV.config`.

- [ ] **Step 1: Download the fonts**

```bash
mkdir -p assets/fonts
curl -sS -m 60 -o assets/fonts/fredoka-latin.woff2 "https://fonts.gstatic.com/s/fredoka/v17/X7n64b87HvSqjb_WIi2yDCRwoQ_k7367_DWu89XgHPyh.woff2"
curl -sS -m 60 -o assets/fonts/rubik-latin.woff2 "https://fonts.gstatic.com/s/rubik/v31/iJWKBXyIfDnIV7nBrXyw023e.woff2"
file assets/fonts/*.woff2
```

Both must report "Web Open Font Format (Version 2)". Expected sizes are about 29,704 and 35,324 bytes. If either download fails or reports something else, STOP and report BLOCKED; don't substitute another font.

- [ ] **Step 2: Generate `css/fonts.css`**

Run exactly this (it embeds the two files as base64):

```bash
{
  printf '/* Fredoka and Rubik, latin subset, SIL Open Font License 1.1.\n   Base64 so the fonts also load from file://; see assets/fonts/README.md. */\n\n'
  printf '@font-face {\n  font-family: "Fredoka";\n  font-style: normal;\n  font-weight: 300 700;\n  font-display: swap;\n  src: url(data:font/woff2;base64,%s) format("woff2");\n}\n\n' "$(base64 -i assets/fonts/fredoka-latin.woff2 | tr -d '\n')"
  printf '@font-face {\n  font-family: "Rubik";\n  font-style: normal;\n  font-weight: 300 900;\n  font-display: swap;\n  src: url(data:font/woff2;base64,%s) format("woff2");\n}\n' "$(base64 -i assets/fonts/rubik-latin.woff2 | tr -d '\n')"
} > css/fonts.css
grep -c "@font-face" css/fonts.css
```

Expected: `2`. The file should be roughly 87 KB.

- [ ] **Step 3: Create `assets/fonts/README.md`**

```markdown
# Fonts

| File | Family | License |
|---|---|---|
| `fredoka-latin.woff2` | Fredoka (variable, weight 300–700) | SIL Open Font License 1.1 |
| `rubik-latin.woff2` | Rubik (variable, weight 300–900) | SIL Open Font License 1.1 |

Both are the latin subset, downloaded from Google Fonts (`fonts.gstatic.com`).

The game loads them from `css/fonts.css`, which embeds each file as base64. That
is deliberate: Chrome refuses font file requests over `file://`, and the game has
to work when `index.html` is double-clicked.

To refresh them, re-run the download and generate commands in
`docs/superpowers/plans/2026-09-11-iteration-3-art-pass.md`, Task 1.
```

- [ ] **Step 4: Tokens in `css/base.css`**

Replace the whole `:root { ... }` block with:

```css
:root {
  --desk: #00CAFF;
  --paper: #FFFFFF;
  --warn: #FAF900;
  --err: #FF0057;
  --ink: #273548;
  --blue: #0078FD;

  --line: 3px;
  --radius: 12px;

  --stage-w: 1280px;
  --stage-h: 720px;
  --taskbar: 56px;

  --display: "Fredoka", "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif;
  --font: "Rubik", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
```

In the `#stage` rule, replace `width: 1280px;` with `width: var(--stage-w);` and `height: 720px;` with `height: var(--stage-h);`.

In the `#debug` rule, add this line directly after its `padding: 8px 10px;` line:

```css
  border-radius: calc(var(--radius) / 2);
```

- [ ] **Step 5: Load `css/fonts.css` first**

In `index.html`, add this line directly before `<link rel="stylesheet" href="css/base.css">`:

```html
  <link rel="stylesheet" href="css/fonts.css">
```

- [ ] **Step 6: Publish the layout constants in `js/stage.js`**

Replace the whole `init(el) { ... },` method with:

```js
    init(el) {
      stageEl = el;
      const root = document.documentElement.style;
      root.setProperty("--stage-w", C.STAGE_W + "px");
      root.setProperty("--stage-h", C.STAGE_H + "px");
      root.setProperty("--taskbar", C.TASKBAR_H + "px");
      fit();
      window.addEventListener("resize", fit);
    },
```

- [ ] **Step 7: Verify**

```bash
for f in js/*.js; do node --check "$f" || exit 1; done && echo OK
grep -n "@font-face" css/fonts.css | head
grep -n -- "--radius\|--display\|--stage-w" css/base.css
grep -n "fonts.css" index.html
```

Expected: `OK`, two `@font-face` lines, the new tokens present, and the `fonts.css` link before `base.css`.

Manual (controller, in a browser): the game plays exactly as before; nothing looks different yet except that text may now render in Rubik.

- [ ] **Step 8: Commit**

```bash
git add assets/fonts css/fonts.css css/base.css index.html js/stage.js
git commit -m "feat: ship Fredoka and Rubik locally and add art tokens"
```

---

### Task 2: The anchor pop-up

**Files:**
- Modify: `js/config.js`, `js/popups.js`, `index.html`
- Rewrite: `css/window.css`

**Interfaces:**
- Consumes: `INAV.config.BUTTONS` (new), the tokens from Task 1.
- Produces: the pop-up DOM structure `.popup > .popup-bar(.popup-title, .popup-x) + .popup-body(.popup-icon, .popup-text) + .popup-foot(.popup-fake ×2)`. Ghost pop-ups on the Title use the same inner classes, so they inherit the same chrome.
- Unchanged: clicking anywhere on a pop-up still closes it, and `.closing` still fades over `CLOSE_ANIM_MS`.

- [ ] **Step 1: Add the fake button copy to `js/config.js`**

Add this directly after the closing `],` of the `MESSAGES` array (before the final `};`):

```js

  BUTTONS: [
    ["OK", "Cancel"],
    ["Claim", "Later"],
    ["Fix now", "No"],
    ["Yes", "Also yes"],
  ],
```

- [ ] **Step 2: Build the anchor structure in `js/popups.js`**

Directly after the line `const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));`, add:

```js

  const X_MARK =
    '<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">' +
    '<path d="M2 2l8 8M10 2l-8 8" stroke="var(--paper)" stroke-width="2.6" stroke-linecap="round"/></svg>';
```

Then replace the whole `function create(x, y, w, h, title, message) { ... }` function with:

```js
  function create(x, y, w, h, title, message) {
    const el = document.createElement("div");
    el.className = "popup";
    el.style.left = x + "px";
    el.style.top = y + "px";
    el.style.width = w + "px";
    el.style.height = h + "px";
    el.style.zIndex = ++z;

    el.innerHTML =
      '<div class="popup-bar"><span class="popup-title"></span><span class="popup-x">' + X_MARK + "</span></div>" +
      '<div class="popup-body"><span class="popup-icon">!</span><span class="popup-text"></span></div>' +
      '<div class="popup-foot"><span class="popup-fake"></span><span class="popup-fake primary"></span></div>';

    el.querySelector(".popup-title").textContent = title;
    el.querySelector(".popup-text").textContent = message;

    const [primary, secondary] = pick(C.BUTTONS);
    const fakes = el.querySelectorAll(".popup-fake");
    fakes[0].textContent = secondary;
    fakes[1].textContent = primary;

    layer.appendChild(el);
    return el;
  }
```

- [ ] **Step 3: Rewrite `css/window.css`**

```css
#popups {
  position: absolute;
  inset: 0 0 var(--taskbar) 0;
  z-index: 1;
}

.popup,
.ghost {
  position: absolute;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--paper);
  border: var(--line) solid var(--ink);
  border-radius: var(--radius);
}

.popup {
  cursor: pointer;
  transition: opacity 100ms linear;
}

.popup-bar {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  height: 34px;
  padding: 0 6px 0 12px;
  background: var(--blue);
  color: var(--paper);
  border-bottom: var(--line) solid var(--ink);
  font-family: var(--display);
  font-size: 15px;
  font-weight: 600;
}

.popup-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.popup-x {
  flex: none;
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  background: var(--err);
  border: 2px solid var(--ink);
  border-radius: calc(var(--radius) / 2);
}

.popup-x svg {
  display: block;
}

.popup-body {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  font-size: 14px;
  line-height: 1.3;
}

.popup-icon {
  flex: none;
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  background: var(--warn);
  border: var(--line) solid var(--ink);
  border-radius: 50%;
  font-family: var(--display);
  font-size: 21px;
  font-weight: 700;
}

.popup-foot {
  flex: none;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 12px 10px;
}

.popup-fake {
  padding: 5px 14px;
  background: var(--paper);
  border: 2px solid var(--ink);
  border-radius: calc(var(--radius) / 1.5);
  font-family: var(--display);
  font-size: 13px;
  font-weight: 600;
}

.popup-fake.primary {
  background: var(--warn);
}

.popup:hover .popup-bar {
  background: var(--ink);
}

.popup.closing {
  opacity: 0;
  pointer-events: none;
}
```

- [ ] **Step 4: Give the Title ghosts the same structure**

In `index.html`, replace the five `<div class="ghost" ...>` lines inside `<div class="ghosts" aria-hidden="true">` with:

```html
        <div class="ghost" style="left:180px;top:60px;width:220px;height:132px"><div class="popup-bar"><span class="popup-title">popup</span><span class="popup-x"></span></div><div class="popup-body"><span class="popup-icon">!</span><span class="popup-text">popup</span></div></div>
        <div class="ghost" style="left:930px;top:50px;width:240px;height:132px"><div class="popup-bar"><span class="popup-title">popup</span><span class="popup-x"></span></div><div class="popup-body"><span class="popup-icon">!</span><span class="popup-text">popup</span></div></div>
        <div class="ghost" style="left:560px;top:24px;width:210px;height:126px"><div class="popup-bar"><span class="popup-title">popup</span><span class="popup-x"></span></div><div class="popup-body"><span class="popup-icon">!</span><span class="popup-text">popup</span></div></div>
        <div class="ghost" style="left:170px;top:450px;width:210px;height:132px"><div class="popup-bar"><span class="popup-title">popup</span><span class="popup-x"></span></div><div class="popup-body"><span class="popup-icon">!</span><span class="popup-text">popup</span></div></div>
        <div class="ghost" style="left:900px;top:440px;width:240px;height:132px"><div class="popup-bar"><span class="popup-title">popup</span><span class="popup-x"></span></div><div class="popup-body"><span class="popup-icon">!</span><span class="popup-text">popup</span></div></div>
```

- [ ] **Step 5: Verify**

```bash
for f in js/*.js; do node --check "$f" || exit 1; done && echo OK
grep -c 'class="ghost"' index.html
grep -n "BUTTONS" js/config.js | head -2
grep -c "var(--radius)" css/window.css
```

Expected: `OK`, `5` ghosts, `BUTTONS` present, and at least 3 uses of `var(--radius)`.

Manual (controller): pop-ups show a blue title bar with a red X, a yellow "!" circle, the message, and two fake buttons. Clicking anywhere on one still closes it.

- [ ] **Step 6: Commit**

```bash
git add js/config.js js/popups.js css/window.css index.html
git commit -m "feat: style the anchor pop-up window"
```

---

### Task 3: Desktop icons and taskbar

**Files:**
- Modify: `index.html`, `js/hud.js`
- Rewrite: `css/desktop.css`

**Interfaces:**
- Produces DOM: `.desktop-icon` entries in `#icon-column`, and a taskbar of `.hud-start` (flag + label), two `.hud-chip`s, `.hud-av` (label, striped meter, seconds) and `#hud-clock`.
- New ids: `hud-start-label`, `hud-clock`.
- `INAV.hud.render(s)` also sets the start button's label ("start" / "resume"), its `title`, and `aria-pressed`.
- `INAV.hud.init()` also starts the clock.

- [ ] **Step 1: Icons and taskbar markup in `index.html`**

Replace the whole `<div id="icon-column"> ... </div>` block with:

```html
    <div id="icon-column">
      <div class="desktop-icon">
        <svg viewBox="0 0 56 56" width="52" height="52" aria-hidden="true">
          <path d="M23 7h10" fill="none" stroke="var(--ink)" stroke-width="3" stroke-linecap="round"/>
          <rect x="9" y="11" width="38" height="9" rx="4" fill="var(--paper)" stroke="var(--ink)" stroke-width="3"/>
          <path d="M13 20h30l-3 28a4 4 0 0 1-4 3.5H20a4 4 0 0 1-4-3.5z" fill="var(--paper)" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round"/>
          <path d="M23 27v17M33 27v17" fill="none" stroke="var(--ink)" stroke-width="3" stroke-linecap="round"/>
        </svg>
        <span>Recycle Bin</span>
      </div>
      <div class="desktop-icon">
        <svg viewBox="0 0 56 56" width="52" height="52" aria-hidden="true">
          <path d="M28 5l19 7v14c0 13-8 21-19 26C17 47 9 39 9 26V12z" fill="var(--blue)" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round"/>
          <path d="M19 28l7 7 12-13" fill="none" stroke="var(--paper)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>antivirus.exe</span>
      </div>
    </div>
```

Replace the whole `<div id="taskbar"> ... </div>` block with:

```html
    <div id="taskbar">
      <button class="hud-start" id="start-menu" type="button" title="Pause (Esc)" aria-pressed="false">
        <span class="hud-flag" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
        <span id="hud-start-label">start</span>
      </button>
      <span class="hud-chip">Closed <strong id="hud-closed">0</strong></span>
      <span class="hud-chip">Open <strong id="hud-open">0</strong>/<span id="hud-cap">12</span></span>
      <span class="hud-av">
        <span id="hud-label">Antivirus: not installed</span>
        <span class="hud-meter"><span class="hud-meter-fill" id="hud-fill"></span></span>
        <strong id="hud-time">60s</strong>
      </span>
      <span class="hud-clock" id="hud-clock">12:00 PM</span>
    </div>
```

- [ ] **Step 2: Rewrite `css/desktop.css`**

```css
#icon-column {
  position: absolute;
  left: 0;
  top: 0;
  bottom: var(--taskbar);
  width: 130px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding-top: 20px;
}

.desktop-icon {
  width: 104px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.desktop-icon span {
  padding: 2px 8px;
  background: var(--paper);
  border: 2px solid var(--ink);
  border-radius: calc(var(--radius) / 2);
  font-size: 12px;
  font-weight: 500;
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
  gap: 12px;
  padding: 0 0 0 0;
  background: var(--blue);
  color: var(--paper);
  border-top: var(--line) solid var(--ink);
  font-size: 15px;
  font-variant-numeric: tabular-nums;
}

.hud-start {
  height: 100%;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 22px 0 12px;
  background: var(--ink);
  color: var(--paper);
  border: 0;
  border-radius: 0 var(--radius) var(--radius) 0;
  font-family: var(--display);
  font-size: 20px;
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

.hud-flag {
  display: grid;
  grid-template-columns: 10px 10px;
  gap: 2px;
  transform: skewY(-6deg);
}

.hud-flag i {
  width: 10px;
  height: 10px;
  border-radius: 2px;
}

.hud-flag i:nth-child(1) { background: var(--err); }
.hud-flag i:nth-child(2) { background: var(--desk); }
.hud-flag i:nth-child(3) { background: var(--paper); }
.hud-flag i:nth-child(4) { background: var(--warn); }

.hud-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 32px;
  padding: 0 12px;
  background: var(--paper);
  color: var(--ink);
  border: 2px solid var(--ink);
  border-radius: calc(var(--radius) / 1.5);
}

.hud-av {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
}

.hud-meter {
  width: 210px;
  height: 22px;
  overflow: hidden;
  background: var(--paper);
  border: 2px solid var(--ink);
  border-radius: 11px;
}

.hud-meter-fill {
  display: block;
  height: 100%;
  width: 0;
  background: repeating-linear-gradient(-45deg, var(--ink) 0 6px, var(--warn) 6px 12px);
}

#hud-time {
  width: 34px;
  text-align: right;
  font-weight: 700;
}

.hud-clock {
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 14px;
  border-left: 2px solid var(--ink);
  font-size: 14px;
}
```

- [ ] **Step 3: Clock and paused label in `js/hud.js`**

Replace the whole `INAV.hud = { ... };` object with:

```js
  INAV.hud = {
    init() {
      els = {
        closed: document.getElementById("hud-closed"),
        open: document.getElementById("hud-open"),
        cap: document.getElementById("hud-cap"),
        fill: document.getElementById("hud-fill"),
        time: document.getElementById("hud-time"),
        label: document.getElementById("hud-label"),
        startBtn: document.getElementById("start-menu"),
        startLabel: document.getElementById("hud-start-label"),
        clock: document.getElementById("hud-clock"),
      };
      els.cap.textContent = C.CAP;
      tickClock();
      setInterval(tickClock, C.CLOCK_TICK_MS);
    },

    render(s) {
      const done = s.phase === "success";
      const paused = s.phase === "paused";
      const progress = done ? 1 : Math.min(s.t / C.ROUND_SECONDS, 1);
      els.closed.textContent = s.score;
      els.open.textContent = s.open;
      els.fill.style.width = progress * 100 + "%";
      els.label.textContent = LABELS[s.phase];
      els.time.textContent = done ? "✓" : Math.max(0, Math.ceil(C.ROUND_SECONDS - s.t)) + "s";
      els.startLabel.textContent = paused ? "resume" : "start";
      els.startBtn.title = paused ? "Resume (Esc)" : "Pause (Esc)";
      els.startBtn.setAttribute("aria-pressed", paused ? "true" : "false");
    },
  };
```

Directly after the line `let els = null;`, add:

```js

  function tickClock() {
    els.clock.textContent = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
```

In `js/config.js`, add this line directly after the line `CRASH_PCT_STEP_MAX: 9,`:

```js
  CLOCK_TICK_MS: 10000,
```

- [ ] **Step 4: Verify**

```bash
for f in js/*.js; do node --check "$f" || exit 1; done && echo OK
grep -c "desktop-icon" index.html
grep -n "hud-clock\|hud-start-label\|hud-flag" index.html
grep -n "CLOCK_TICK_MS" js/config.js js/hud.js
```

Expected: `OK`, `2` desktop icons, the three new taskbar ids present, and `CLOCK_TICK_MS` in both files.

Manual (controller): the desktop shows two icons with labels; the taskbar shows the four-square flag, italic "start", two white chips, the striped meter, the seconds and the real time. During pause the button reads "resume".

- [ ] **Step 5: Commit**

```bash
git add index.html css/desktop.css js/hud.js js/config.js
git commit -m "feat: draw desktop icons and the XP-parody taskbar"
```

---

### Task 4: Screen art, and two carry-overs from the iteration 2 review

**Files:**
- Rewrite: `css/screens.css`
- Modify: `index.html`, `js/game.js`, `js/screens.js`

**Interfaces:**
- `INAV.game.snapshot()` gains `scores: { last, best }`, kept in game state and mirrored to storage. `game` becomes the only module that reads or writes storage.
- `screens.enterTitle(s)` takes the snapshot and reads `s.scores`.
- Behavior is otherwise unchanged.

**Do not weaken the pointer-events rules.** The first four rules of the stylesheet below are the iteration 2 critical fix (screens must let clicks reach the pop-ups); keep them exactly as written.

- [ ] **Step 1: Rewrite `css/screens.css`**

```css
[data-screen] {
  position: absolute;
  inset: 0 0 var(--taskbar) 0;
  z-index: 2;
  pointer-events: none;
}

[data-screen][hidden] {
  display: none;
}

[data-screen] button,
.dialog,
[data-screen="paused"],
[data-screen="crash"] {
  pointer-events: auto;
}

.center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  text-align: center;
}

.ghosts {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.ghost {
  opacity: 0.3;
}

.title-logo {
  margin: 0;
  font-family: var(--display);
  font-size: 104px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1;
}

.title-logo .exe {
  color: var(--err);
}

.tagline {
  margin: 0;
  padding: 7px 18px;
  background: var(--paper);
  border: var(--line) solid var(--ink);
  border-radius: 999px;
  font-size: 18px;
}

.stats {
  display: flex;
  gap: 10px;
  font-size: 18px;
  font-variant-numeric: tabular-nums;
}

.stats span {
  padding: 7px 14px;
  background: var(--paper);
  border: 2px solid var(--ink);
  border-radius: calc(var(--radius) / 1.5);
}

.btn {
  padding: 12px 40px;
  background: var(--paper);
  color: var(--ink);
  border: var(--line) solid var(--ink);
  border-radius: var(--radius);
  box-shadow: 0 6px 0 var(--ink);
  font-family: var(--display);
  font-size: 28px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 60ms linear, box-shadow 60ms linear, background 100ms linear;
}

.btn:hover {
  background: var(--warn);
}

.btn:active {
  transform: translateY(6px);
  box-shadow: 0 0 0 var(--ink);
}

.btn:focus-visible {
  outline: 4px solid var(--warn);
  outline-offset: 4px;
}

.btn:disabled {
  cursor: default;
  opacity: 0.55;
}

.instruct {
  position: absolute;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  width: 780px;
  padding: 14px 22px;
  background: var(--paper);
  border: var(--line) solid var(--ink);
  border-radius: var(--radius);
  font-size: 18px;
  line-height: 1.45;
  text-align: center;
}

.dialog {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 460px;
  overflow: hidden;
  background: var(--paper);
  border: var(--line) solid var(--ink);
  border-radius: var(--radius);
}

.dialog-bar {
  padding: 9px 14px;
  background: var(--blue);
  color: var(--paper);
  border-bottom: var(--line) solid var(--ink);
  font-family: var(--display);
  font-size: 16px;
  font-weight: 600;
}

.dialog-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 26px 24px;
  text-align: center;
}

.dialog-body h2 {
  margin: 0;
  font-family: var(--display);
  font-size: 28px;
  font-weight: 600;
  line-height: 1.15;
}

.dialog-body p {
  margin: 0;
  font-size: 16px;
  line-height: 1.45;
}

.badge {
  padding: 5px 14px;
  background: var(--warn);
  color: var(--ink);
  border: 2px solid var(--ink);
  border-radius: 999px;
  font-family: var(--display);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

[data-screen="paused"] {
  background: rgba(39, 53, 72, 0.35);
}

[data-screen="crash"] {
  inset: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 20px;
  padding: 84px 140px;
  background: var(--blue);
  color: var(--paper);
}

.crash-face {
  margin-bottom: 8px;
  font-family: var(--display);
  font-size: 150px;
  font-weight: 500;
  line-height: 0.8;
}

[data-screen="crash"] h2 {
  margin: 0;
  max-width: 30ch;
  font-size: 34px;
  font-weight: 400;
  line-height: 1.25;
}

[data-screen="crash"] p {
  margin: 0;
  max-width: 62ch;
  font-size: 19px;
  line-height: 1.45;
}

.crash-pct {
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 2: Move the crash section into DOM order (`index.html`)**

Cut the whole `<section data-screen="crash"> ... </section>` block and paste it directly after the closing `</section>` of the success screen, so it sits before `<div id="taskbar">`. Change nothing inside it.

- [ ] **Step 3: Scores live in game state (`js/game.js`)**

In the `state` object, add this directly after the line `result: null,`:

```js
    scores: {
      last: INAV.storage.get(C.STORAGE_KEYS.last, 0),
      best: INAV.storage.get(C.STORAGE_KEYS.best, 0),
    },
```

In `snapshot()`, add this directly after the line `result: state.result,`:

```js
      scores: state.scores,
```

Replace the whole `function recordResult(won) { ... }` function with:

```js
  function recordResult(won) {
    const previousBest = state.scores.best;
    const isBest = state.score > previousBest;

    state.scores.last = state.score;
    INAV.storage.set(C.STORAGE_KEYS.last, state.scores.last);
    if (isBest) {
      state.scores.best = state.score;
      INAV.storage.set(C.STORAGE_KEYS.best, state.scores.best);
    }

    state.result = {
      won,
      score: state.score,
      t: state.t,
      best: state.scores.best,
      isBest,
    };
  }
```

- [ ] **Step 4: Title reads the snapshot (`js/screens.js`)**

Replace the whole `function enterTitle() { ... }` function with:

```js
  function enterTitle(s) {
    $("title-last").textContent = s.scores.last;
    $("title-best").textContent = s.scores.best;
    $("start-btn").focus();
  }
```

- [ ] **Step 5: Verify**

```bash
for f in js/*.js; do node --check "$f" || exit 1; done && echo OK
grep -n "pointer-events" css/screens.css
grep -n "INAV.storage" js/screens.js || echo "screens no longer touches storage (expected)"
grep -n "scores" js/game.js | head
awk '/id="taskbar"/{print NR": taskbar"} /data-screen="crash"/{print NR": crash"}' index.html
```

Expected: `OK`; the pointer-events rules intact (`[data-screen]` none, plus the `auto` rule for buttons/`.dialog`/paused/crash); `js/screens.js` no longer references `INAV.storage`; `scores` present in game state, snapshot and `recordResult`; and in the awk output the `crash` line number is SMALLER than the `taskbar` line number, proving the crash section now comes first.

Manual (controller): every screen matches the demo's look in Fredoka/Rubik. The Title's scores still show and still survive a reload.

- [ ] **Step 6: Commit**

```bash
git add css/screens.css index.html js/game.js js/screens.js
git commit -m "feat: style every screen and move score ownership into game"
```

---

### Task 5: Title ghosts pop in and out

**Files:** Modify `js/config.js`, `js/screens.js`, `css/screens.css`

**Interfaces:**
- New config: `GHOST_TOGGLE_MS: { min: 500, max: 1600 }`.
- `screens` runs a self-rescheduling timer while the Title shows, toggling `.ghost-on` on one random ghost. `show()` stops it on every screen change.
- Under `prefers-reduced-motion`, the timer never starts and the ghosts stay visible.

- [ ] **Step 1: Config knob (`js/config.js`)**

Add this directly after the line `CLOCK_TICK_MS: 10000,`:

```js
  GHOST_TOGGLE_MS: { min: 500, max: 1600 },
```

- [ ] **Step 2: Ghost timer (`js/screens.js`)**

Add this directly after the line `let lockTimer = null;`:

```js
  let ghostTimer = null;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function scheduleGhost() {
    const g = C.GHOST_TOGGLE_MS;
    ghostTimer = setTimeout(() => {
      const ghosts = document.querySelectorAll(".ghost");
      const one = ghosts[Math.floor(Math.random() * ghosts.length)];
      if (one) one.classList.toggle("ghost-on");
      scheduleGhost();
    }, g.min + Math.random() * (g.max - g.min));
  }

  function startGhosts() {
    if (reducedMotion.matches) return;
    document.querySelectorAll(".ghost").forEach((el) => {
      el.classList.toggle("ghost-on", Math.random() < 0.5);
    });
    scheduleGhost();
  }

  function stopGhosts() {
    clearTimeout(ghostTimer);
    ghostTimer = null;
  }
```

In `enterTitle(s)`, add `startGhosts();` as the last line of the function (after the `$("start-btn").focus();` line).

In `show(phase, s)`, add `stopGhosts();` directly after the line `lockTimer = null;`.

- [ ] **Step 3: Ghost states (`css/screens.css`)**

Replace the whole `.ghost { ... }` rule with:

```css
.ghost {
  opacity: 0;
  transform: scale(0.92);
  transition: opacity 140ms linear, transform 140ms ease-out;
}

.ghost.ghost-on {
  opacity: 0.3;
  transform: none;
}

@media (prefers-reduced-motion: reduce) {
  .ghost {
    opacity: 0.3;
    transform: none;
    transition: none;
  }
}
```

- [ ] **Step 4: Verify**

```bash
for f in js/*.js; do node --check "$f" || exit 1; done && echo OK
grep -n "GHOST_TOGGLE_MS" js/config.js js/screens.js
grep -n "startGhosts\|stopGhosts" js/screens.js
grep -n "ghost-on\|prefers-reduced-motion" css/screens.css
```

Expected: `OK`, the knob in both files, `startGhosts` called in `enterTitle` and defined once, `stopGhosts` called in `show` and defined once, and both CSS additions present.

Manual (controller): ghosts pop in and out behind the title, stop when you leave the Title, and never block the start button.

- [ ] **Step 5: Commit**

```bash
git add js/config.js js/screens.js css/screens.css
git commit -m "feat: title ghosts pop in and out at random"
```

---

### Task 6: Iteration 3 acceptance pass

**Files:** none unless the pass finds a mismatch.

- [ ] **Step 1:** Syntax-check every JS file and confirm `git status` is clean.
- [ ] **Step 2:** Walk the spec §9 iteration 3 checklist in a real browser using REAL clicks and key presses (per spec §9's method note), including the `--radius: 0` token test and a `file://` open to confirm the fonts load on double-click.
- [ ] **Step 3:** Hand off to Rickey with the branch name (`iteration-3-art-pass`), screenshots of each screen, the checklist results, and the iteration 4 questions from spec §9.
