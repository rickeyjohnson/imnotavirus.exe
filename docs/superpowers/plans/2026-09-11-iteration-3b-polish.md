# Iteration 3b: Pause Menu, Ghost Spread, Win Screen

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** three changes Rickey asked for after playing the art pass.
1. A full-screen green `:)` win screen, the twin of the blue crash screen.
2. A start-menu-style pause panel rising from the taskbar start button, with live round info.
3. Ten ghost pop-ups at random spread-out positions on the Title instead of five fixed ones.

**Architecture:** no new modules. The win screen is markup and CSS only (its ids already exist). The pause panel replaces the centered dialog in the same `paused` screen, filled by `screens.enterPaused`. The ghosts move from hand-written markup to `screens` building them through a new `INAV.popups.ghost()`, so real pop-ups and ghosts keep one source of markup.

**Tech Stack:** HTML, CSS and vanilla JavaScript. No libraries, no build step, no server.

**Spec:** `docs/superpowers/specs/2026-09-11-imnotavirus-design.md` — §3 decisions (the iteration 3b rows), §4 screens, §6 art direction and palette, §9 iteration 3b.

## Global Constraints

- Only HTML, CSS and vanilla JavaScript: no libraries, frameworks, build tools or package managers.
- Runs by double-clicking `index.html` (`file://`); classic `<script>` tags only.
- One IIFE per file on `window.INAV` (`config.js` bootstraps, `main.js` defines none); every tuning number in `js/config.js`.
- Colors come only from the palette tokens, now including `--win: #00C853`. The pause dim `rgba(39, 53, 72, 0.35)` stays the single literal.
- **Contrast rule (spec §6):** text on `--win` and on `--blue` must be `--ink` at small sizes. White on green is 2.2:1 and is never allowed. White on ink (12.4:1) and ink on paper (12.4:1) are both fine.
- Border weight and radius from `var(--line)`, `var(--line-thin)`, `var(--radius)`, `var(--press)` or a `calc()` on them. Sanctioned exceptions: `999px` pills, `50%` circles, the taskbar flag's 2px squares. This includes SVG geometry and CSS outlines.
- **Don't weaken the pointer-events rules** at the top of `css/screens.css`. They are iteration 2's critical fix: screens let clicks through to the pop-up layer, with named exceptions.
- Keep comments minimal. Don't change gameplay, timing or the phase machine.
- No unit tests. Verify with `node --check`, the per-task checks, and the controller's real-input browser pass.

## File Map

| File | Change | Why |
|---|---|---|
| `css/base.css` | Modify | Adds the `--win` token |
| `index.html` | Modify | New success markup, new pause panel, empty ghost container |
| `css/screens.css` | Modify | Win screen, start-menu panel; drops the now-unused `.dialog` rules |
| `js/screens.js` | Modify | Fills the pause rows; builds the ten ghosts |
| `js/popups.js` | Modify | Extracts `buildWindow` and exports `ghost()` |
| `js/config.js` | Modify | Adds `GHOSTS` and `GHOST_RESERVED` |

---

### Task 1: Win screen

**Files:** Modify `css/base.css`, `index.html`, `css/screens.css`

**Interfaces:** the ids `success-score`, `success-best` and `success-new-best` keep their current names and meanings, so `js/screens.js` needs no change. The screen becomes full-bleed like the crash screen.

- [ ] **Step 1: Add the token (`css/base.css`)**

Add this line directly after the line `  --blue: #0078FD;`:

```css
  --win: #00C853;
```

- [ ] **Step 2: Replace the success markup (`index.html`)**

Replace the whole `<section data-screen="success" hidden> ... </section>` block with:

```html
    <section data-screen="success" hidden>
      <div class="win-face" aria-hidden="true">:)</div>
      <h2>Antivirus installed. Your PC survived.</h2>
      <p>You closed <strong id="success-score">0</strong> pop-ups in <span class="copy-seconds">60</span> seconds. Your best is <strong id="success-best">0</strong>.</p>
      <span class="badge" id="success-new-best" hidden>New best</span>
      <p class="win-note">Your PC is protected. For now.</p>
      <button class="btn" id="play-again-btn" type="button">play again</button>
    </section>
```

- [ ] **Step 3: Style it (`css/screens.css`)**

In the pointer-events exception rule, add `[data-screen="success"]` to the selector list, so it reads:

```css
[data-screen] button,
.dialog,
[data-screen="paused"],
[data-screen="crash"],
[data-screen="success"] {
  pointer-events: auto;
}
```

Then append to the end of the file:

```css
[data-screen="success"] {
  inset: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 20px;
  padding: 84px 140px;
  background: var(--win);
  color: var(--ink);
}

.win-face {
  margin-bottom: 8px;
  font-family: var(--display);
  font-size: 150px;
  font-weight: 500;
  line-height: 0.8;
}

[data-screen="success"] h2 {
  margin: 0;
  max-width: 30ch;
  font-size: 34px;
  font-weight: 600;
  line-height: 1.25;
}

[data-screen="success"] p {
  margin: 0;
  max-width: 62ch;
  font-size: 19px;
  line-height: 1.45;
}

.win-note {
  font-weight: 500;
}
```

- [ ] **Step 4: Verify**

```bash
for f in js/*.js; do node --check "$f" || exit 1; done && echo OK
grep -n -- "--win" css/base.css css/screens.css
grep -n "win-face\|success-score\|success-best\|success-new-best\|play-again-btn" index.html
grep -n "pointer-events" css/screens.css
```

Expected: `OK`; `--win` defined once and used once; all five success ids present exactly once; the pointer-events rules intact with `success` added to the exception list.

Manual (controller): winning a shortened round shows a full-screen green `:)` with dark text, covering the taskbar the way the crash screen does.

- [ ] **Step 5: Commit**

```bash
git add css/base.css css/screens.css index.html
git commit -m "feat: full-screen green win screen"
```

---

### Task 2: Start-menu pause panel

**Files:** Modify `index.html`, `css/screens.css`, `js/screens.js`

**Interfaces:**
- New ids `pause-closed`, `pause-open`, `pause-time`. `resume-btn` keeps its id and role.
- `screens.enterPaused(s)` now takes the snapshot and fills those three rows before focusing resume.
- The `.dialog*` rules and the `.dialog` pointer-events exception are removed, because nothing uses them once this task lands.

- [ ] **Step 1: Replace the paused markup (`index.html`)**

Replace the whole `<section data-screen="paused" hidden> ... </section>` block with:

```html
    <section data-screen="paused" hidden>
      <div class="start-menu" role="dialog" aria-labelledby="paused-heading">
        <div class="start-menu-head">
          <span class="hud-flag" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
          <h2 id="paused-heading">Paused</h2>
        </div>
        <ul class="start-menu-rows">
          <li><span>Pop-ups closed</span><strong id="pause-closed">0</strong></li>
          <li><span>Pop-ups open</span><strong id="pause-open">0</strong></li>
          <li><span>Seconds left</span><strong id="pause-time">60</strong></li>
        </ul>
        <p class="start-menu-hint">Press Esc or the start button to keep going.</p>
        <button class="start-menu-item" id="resume-btn" type="button">resume</button>
      </div>
    </section>
```

- [ ] **Step 2: Swap the styles (`css/screens.css`)**

Delete these five now-unused rules entirely: `.dialog`, `.dialog-bar`, `.dialog-body`, `.dialog-body h2` and `.dialog-body p`. Also remove the `.dialog,` line from the pointer-events exception selector list (leave the other selectors in that rule untouched).

Then append to the end of the file:

```css
.start-menu {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 340px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  background: var(--ink);
  color: var(--paper);
  border: var(--line) solid var(--ink);
  border-radius: 0 var(--radius) 0 0;
}

.start-menu-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.start-menu-head h2 {
  margin: 0;
  font-family: var(--display);
  font-size: 26px;
  font-weight: 600;
}

.start-menu-rows {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.start-menu-rows li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 12px;
  background: var(--paper);
  color: var(--ink);
  border-radius: calc(var(--radius) / 3);
  font-size: 15px;
}

.start-menu-rows strong {
  font-size: 17px;
  font-variant-numeric: tabular-nums;
}

.start-menu-hint {
  margin: 0;
  font-size: 14px;
  line-height: 1.4;
}

.start-menu-item {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 18px;
  background: var(--paper);
  color: var(--ink);
  border: var(--line-thin) solid var(--ink);
  border-radius: calc(var(--radius) / 1.5);
  font-family: var(--display);
  font-size: 22px;
  font-weight: 600;
  cursor: pointer;
}

.start-menu-item:hover {
  background: var(--warn);
}

.start-menu-item:focus-visible {
  outline: var(--line) solid var(--warn);
  outline-offset: var(--line);
}
```

- [ ] **Step 3: Fill the rows (`js/screens.js`)**

Replace the whole `function enterPaused() { ... }` function with:

```js
  function enterPaused(s) {
    $("pause-closed").textContent = s.score;
    $("pause-open").textContent = s.open;
    $("pause-time").textContent = Math.max(0, Math.ceil(C.ROUND_SECONDS - s.t));
    $("resume-btn").focus();
  }
```

- [ ] **Step 4: Verify**

```bash
for f in js/*.js; do node --check "$f" || exit 1; done && echo OK
grep -n "start-menu\|pause-closed\|pause-open\|pause-time\|resume-btn" index.html
grep -n "dialog" css/screens.css index.html || echo "no .dialog left (expected)"
grep -n "pointer-events" css/screens.css
```

Expected: `OK`; the panel markup and all four ids present; no `.dialog` rules or markup left anywhere; the pointer-events rules still intact (minus `.dialog`).

Manual (controller): pausing opens the panel above the taskbar start button; the three rows match the taskbar; Esc, the start button and resume all continue the round.

- [ ] **Step 5: Commit**

```bash
git add index.html css/screens.css js/screens.js
git commit -m "feat: start-menu style pause panel with live round info"
```

---

### Task 3: Ten spread-out ghosts

> **Amended during execution.** Step 4's uniform rejection sampling clumped ghosts into the widest gap, so it was replaced by a four-band round-robin (top, right, bottom, left). The final review then found the hand-tuned reserved rectangle was ~50px narrower than the rendered logo, so the shipped code measures the title block at build time (`reservedRect()`), gives ghosts their own `GHOST_MARGIN` bounds, and warns if a ghost cannot be placed. Read `js/screens.js` for the shipped algorithm.

**Files:** Modify `js/config.js`, `js/popups.js`, `js/screens.js`, `index.html`

**Interfaces:**
- New config: `GHOSTS: { count, w: {min,max}, h: {min,max} }` and `GHOST_RESERVED: { x, y, w, h }` (a rectangle in stage units that ghosts must not overlap).
- New export `INAV.popups.ghost({ x, y, w, h, title?, message? }) -> HTMLElement`: builds a `.ghost` element with the same inner markup as a real pop-up, positioned and sized, WITHOUT appending it anywhere and without touching the z-counter. The caller appends it.
- `screens` rebuilds the ghosts on entering the Title.

- [ ] **Step 1: Config (`js/config.js`)**

Add these lines directly after the line `  GHOST_TOGGLE_MS: { min: 500, max: 1600 },`:

```js
  GHOSTS: { count: 10, w: { min: 150, max: 220 }, h: { min: 130, max: 160 } },
  GHOST_RESERVED: { x: 320, y: 165, w: 640, h: 325 },
```

- [ ] **Step 2: One source of window markup (`js/popups.js`)**

Replace the whole `function create(x, y, w, h, title, message) { ... }` function with these two functions:

```js
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
```

In the `INAV.popups = { ... }` export object, add this entry directly after the `spawn,` line:

```js
    ghost(opts) {
      const el = buildWindow("ghost", opts.title || pick(C.TITLES), opts.message || pick(C.MESSAGES));
      el.style.left = opts.x + "px";
      el.style.top = opts.y + "px";
      el.style.width = opts.w + "px";
      el.style.height = opts.h + "px";
      return el;
    },
```

- [ ] **Step 3: Empty the container (`index.html`)**

Replace the whole `<div class="ghosts" aria-hidden="true"> ... </div>` block (the container and all five hand-written ghost divs inside it) with this single line:

```html
      <div class="ghosts" aria-hidden="true"></div>
```

- [ ] **Step 4: Build them (`js/screens.js`)**

Add these two functions directly after the `function ghostsRoot() { ... }` function:

```js
  function hitsReserved(x, y, w, h) {
    const r = C.GHOST_RESERVED;
    return x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y;
  }

  function buildGhosts() {
    const root = ghostsRoot();
    if (!root) return;
    root.textContent = "";

    const g = C.GHOSTS;
    for (let i = 0; i < g.count; i++) {
      const w = Math.round(g.w.min + Math.random() * (g.w.max - g.w.min));
      const h = Math.round(g.h.min + Math.random() * (g.h.max - g.h.min));
      const area = INAV.stage.safeArea(w, h);

      for (let tries = 0; tries < 40; tries++) {
        const x = Math.round(area.minX + Math.random() * (area.maxX - area.minX));
        const y = Math.round(area.minY + Math.random() * (area.maxY - area.minY));
        if (hitsReserved(x, y, w, h)) continue;
        root.appendChild(INAV.popups.ghost({ x, y, w, h }));
        break;
      }
    }
  }
```

Then, in `function startGhosts() { ... }`, replace its first two lines:

```js
    const root = ghostsRoot();
    if (!root || reducedMotion.matches) return;
```

with:

```js
    const root = ghostsRoot();
    if (!root) return;
    buildGhosts();
    if (reducedMotion.matches) return;
```

(The rest of `startGhosts` stays as it is: it adds `animated`, seeds random `ghost-on` classes, and schedules the timer.)

- [ ] **Step 5: Verify**

```bash
for f in js/*.js; do node --check "$f" || exit 1; done && echo OK
grep -n "GHOSTS\|GHOST_RESERVED" js/config.js js/screens.js
grep -n "buildWindow\|ghost(opts)" js/popups.js
grep -c "class=\"ghost\"" index.html || echo "0 hand-written ghosts (expected)"
grep -n "buildGhosts" js/screens.js
```

Expected: `OK`; both config keys used in `screens.js`; `buildWindow` defined once and used twice; no hand-written ghost markup left in `index.html`; `buildGhosts` defined once and called once from `startGhosts`.

Manual (controller): the Title shows ten ghosts in different places on each visit, none of them over the logo, tagline, start button or scores, and none clickable.

- [ ] **Step 6: Commit**

```bash
git add js/config.js js/popups.js js/screens.js index.html
git commit -m "feat: ten randomly placed title ghosts from one window builder"
```

---

### Task 4: Iteration 3b acceptance pass

**Files:** none unless the pass finds a mismatch.

- [ ] **Step 1:** Syntax-check every JS file and confirm `git status` is clean.
- [ ] **Step 2:** Walk the spec §9 iteration 3b checklist in a real browser with REAL clicks and key presses, plus a check that the ten ghosts never overlap the reserved band across several Title visits.
- [ ] **Step 3:** Hand off to Rickey with the branch name, screenshots of the win screen and pause panel, and the checklist results.
