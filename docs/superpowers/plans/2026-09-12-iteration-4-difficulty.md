# Iteration 4: Difficulty, Variety and HUD Polish

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** act on the playtest. Both testers understood the game instantly and won on their first try; both said it is too easy for the first half and asked for more pop-up types.

**Spec:** `docs/superpowers/specs/2026-09-11-imnotavirus-design.md` — §3 decisions (the iteration 4 rows), §5 gameplay rules, §6 art direction, §9.

## Global Constraints

- Vanilla HTML/CSS/JS only; no libraries, frameworks, build tools or package managers; runs by double-clicking `index.html`.
- One IIFE per file on `window.INAV`; every tuning number in `js/config.js`.
- Palette tokens only (`--desk --paper --warn --err --ink --blue --win`), plus the pause dim. Border weight and radius from `var(--line)`, `var(--line-thin)`, `var(--radius)`, `var(--press)` or a `calc()`; `999px` pills, `50%` circles and the flag squares are sanctioned.
- Contrast: small text never on `--blue`, `--err` or `--win`. Bold text at 19px+ on `--blue` is acceptable (4.1:1 clears the large-text bar).
- Screens must keep letting clicks reach the pop-up layer (the iteration 2 pointer-events rules).
- Keep comments minimal. Honor `prefers-reduced-motion`.
- Verify with `node --check`, the per-task checks, and the controller's browser pass. **Measure rendered geometry, never the constants the code places from.**

---

### Task 1: Spawn overhaul — harder by 0:30, bursts, spread placement

> **What shipped differs from this task.** Measurement showed the "furthest from the previous pop-up" placement here covered only 54% of the desktop, so it was replaced by grid placement (`SPAWN_GRID`, `SPAWN_JITTER`, least-occupied cell) and `SPAWN_MIN_DISTANCE` / `SPAWN_PLACE_TRIES` were dropped. The tuning values below were also superseded. Read `js/config.js` and `js/popups.js` for what actually ships.

**Files:** Modify `js/config.js`, `js/popups.js`, `js/game.js`

**Interfaces:**
- Config: `CAP: 24`; `POPUP_W: { min: 195, max: 235 }`; `POPUP_H: { min: 150, max: 170 }`; `INTERVAL_START_MS: 1000`; `INTERVAL_END_MS: 260`; `INTERVAL_CURVE: 0.55`; `BURST_GAP_S: { min: 3, max: 6 }`; `BURST_SIZE: { start: 2, end: 7 }`; `SPAWN_MIN_DISTANCE: 420`; `SPAWN_PLACE_TRIES: 14`. Delete `BLOOM_CHANCE` and `BLOOM_OFFSET`.
- `INAV.popups.spawn(opts)` keeps its signature. Placement changes: instead of bloom-adjacency, a random spot is picked up to `SPAWN_PLACE_TRIES` times and the one furthest from the previously spawned pop-up's centre wins, accepting early once it clears `SPAWN_MIN_DISTANCE`.
- `game.step` adds a burst timer alongside the steady spawn timer.

- [ ] **Step 1: Config (`js/config.js`)**

Set these values (replacing the existing lines):

```js
  CAP: 24,
```
```js
  INTERVAL_START_MS: 1000,
  INTERVAL_END_MS: 260,
  INTERVAL_CURVE: 0.55,
```
```js
  POPUP_W: { min: 195, max: 235 },
  POPUP_H: { min: 150, max: 170 },
```

Delete the `BLOOM_CHANCE:` and `BLOOM_OFFSET:` lines, and in their place add:

```js
  BURST_GAP_S: { min: 3, max: 6 },
  BURST_SIZE: { start: 2, end: 7 },
  SPAWN_MIN_DISTANCE: 420,
  SPAWN_PLACE_TRIES: 14,
```

- [ ] **Step 2: Spread placement (`js/popups.js`)**

Add this line directly after `let z = 0;`:

```js
  let lastSpawn = null;
```

In `clear()`, add `lastSpawn = null;` directly after the `z = 0;` line.

Replace the whole `function spawn(opts = {}) { ... }` function with:

```js
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

    const el = create(x, y, w, h, opts.title || pick(C.TITLES), opts.message || pick(C.MESSAGES));
    if (opts.practice) el.dataset.practice = "1";
    return el;
  }
```

- [ ] **Step 3: Bursts (`js/game.js`)**

In the `state` object, add these two lines directly after `nextSpawnIn: C.FIRST_SPAWN_MS,`:

```js
    burstIn: 0,
    burstArmed: false,
```

In `resetRound()`, add directly after `state.nextSpawnIn = C.FIRST_SPAWN_MS;`:

```js
    state.burstIn = C.BURST_GAP_S.min * 1000;
    state.burstArmed = true;
```

Add this function directly before `function step(dt) {`:

```js
  function burstSize(t) {
    const p = Math.min(Math.max(t / C.ROUND_SECONDS, 0), 1);
    const mid = C.BURST_SIZE.start + (C.BURST_SIZE.end - C.BURST_SIZE.start) * p;
    return Math.max(1, Math.round(mid - 1 + Math.random() * 3));
  }
```

In `step(dt)`, directly after the `while (state.spawnAcc >= state.nextSpawnIn) { ... }` loop and before the `if (state.t >= C.ROUND_SECONDS) succeed();` line, add:

```js
    state.burstIn -= dt;
    if (state.burstArmed && state.burstIn <= 0) {
      const count = burstSize(state.t);
      for (let i = 0; i < count; i++) {
        INAV.popups.spawn();
        if (INAV.popups.count() >= C.CAP) {
          crash();
          return;
        }
      }
      const gap = C.BURST_GAP_S;
      state.burstIn = (gap.min + Math.random() * (gap.max - gap.min)) * 1000;
    }
```

- [ ] **Step 4: Tune with a simulation, then report the table**

Run this simulated-player sweep and paste its output into your report. It models a player who closes pop-ups at a fixed rate:

```bash
node -e "
global.window=global; require('./js/config.js'); const C=INAV.config;
const interval=t=>C.INTERVAL_START_MS-(C.INTERVAL_START_MS-C.INTERVAL_END_MS)*Math.pow(Math.min(t/C.ROUND_SECONDS,1),C.INTERVAL_CURVE);
function run(cps){ let t=0,open=0,closed=0,acc=0,next=C.FIRST_SPAWN_MS,burst=C.BURST_GAP_S.min*1000,clickAcc=0; const dt=16;
 while(t<C.ROUND_SECONDS){ t+=dt/1000; acc+=dt; burst-=dt; clickAcc+=dt/1000*cps;
  while(acc>=next){acc-=next; open++; next=interval(t); if(open>=C.CAP) return {died:+t.toFixed(1),closed};}
  if(burst<=0){ const p=Math.min(t/C.ROUND_SECONDS,1); const mid=C.BURST_SIZE.start+(C.BURST_SIZE.end-C.BURST_SIZE.start)*p;
   const n=Math.max(1,Math.round(mid-1+Math.random()*3));
   for(let i=0;i<n;i++){ open++; if(open>=C.CAP) return {died:+t.toFixed(1),closed}; }
   burst=(C.BURST_GAP_S.min+Math.random()*(C.BURST_GAP_S.max-C.BURST_GAP_S.min))*1000; }
  while(clickAcc>=1 && open>0){ clickAcc--; open--; closed++; } }
 return {died:null,closed}; }
for(const cps of [1.5,2,2.5,3,3.5,4,5]){ let deaths=[],scores=[]; for(let i=0;i<200;i++){const r=run(cps); if(r.died!==null) deaths.push(r.died); scores.push(r.closed);} 
 const surv=((200-deaths.length)/2).toFixed(0); const avgDeath=deaths.length?(deaths.reduce((a,b)=>a+b,0)/deaths.length).toFixed(1):'-';
 const min=Math.min(...scores), max=Math.max(...scores);
 console.log(cps+' clicks/s -> survives '+surv+'% | avg death '+avgDeath+'s | score '+min+'-'+max); }
"
```

Report the table. The intended shape: a 2 clicks/s player usually dies well before the end, a 3 clicks/s player sometimes survives, and a 4+ clicks/s player usually survives. Scores must vary run to run. **Do not change the config to chase those numbers** — just report what you measured; the controller tunes.

- [ ] **Step 5: Verify and commit**

```bash
for f in js/*.js; do node --check "$f" || exit 1; done && echo JS_OK
grep -n "BLOOM" js/config.js js/popups.js || echo "bloom gone (expected)"
grep -n "CAP\|BURST\|SPAWN_MIN_DISTANCE\|SPAWN_PLACE_TRIES\|POPUP_W\|POPUP_H\|INTERVAL" js/config.js
grep -n "lastSpawn\|burstIn\|burstSize" js/popups.js js/game.js
```

```bash
git add js/config.js js/popups.js js/game.js
git commit -m "feat: harder spawn curve, random bursts and spread-out placement"
```

---

### Task 2: Pop-up types

**Files:** Modify `js/config.js`, `js/popups.js`, `css/window.css`

**Interfaces:**
- Config gains `POPUP_TYPES`: an array of `{ id, weight, titles, messages }`. Ids: `plain`, `warning`, `error`, `download`.
- `buildWindow(cls, title, message)` becomes `buildWindow(cls, type, title, message)` and adds `popup-<id>` to the element's class list; the `download` type renders fake terminal lines instead of the icon-and-text body.
- `spawn()` picks a type by weight unless `opts.type` says otherwise; `ghost()` picks one too, so the Title shows the same variety.
- Behavior is identical for every type. Only looks and copy differ.

- [ ] **Step 1: Type copy (`js/config.js`)**

Replace the `TITLES:` and `MESSAGES:` arrays with a single `POPUP_TYPES` array. Keep the entries short — pop-ups are now about 195-235px wide, so messages must fit in two or three lines:

```js
  POPUP_TYPES: [
    {
      id: "plain",
      weight: 4,
      titles: ["System Alert", "Congratulations!", "hot_deals.exe", "toolbar_setup.exe"],
      messages: [
        "You are visitor #1,000,000!",
        "Your toolbar is out of date.",
        "99% off a new mouse!",
        "Allow notifications?",
      ],
    },
    {
      id: "warning",
      weight: 3,
      titles: ["WARNING.exe", "Low Disk Space", "Update Required"],
      messages: [
        "Your PC is running SLOW!",
        "Low disk vibes detected.",
        "Your warranty is expiring.",
      ],
    },
    {
      id: "error",
      weight: 2,
      titles: ["CRITICAL ERROR", "virus_found.exe", "SECURITY ALERT"],
      messages: [
        "3 viruses found. Clean now?",
        "Your files are at risk!",
        "Unauthorized access detected.",
      ],
    },
    {
      id: "download",
      weight: 2,
      titles: ["definitely_safe.zip", "FreeRAM_Download", "setup_1.exe"],
      messages: [
        "> downloading payload...",
        "> unpacking 16GB of RAM...",
        "> installing 4 toolbars...",
      ],
    },
  ],
```

- [ ] **Step 2: Build typed windows (`js/popups.js`)**

Add this helper directly after the `const clamp = ...` line:

```js
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
```

Replace the whole `function buildWindow(cls, title, message) { ... }` function with:

```js
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
```

Update `create` to take and pass the type: change its signature line to `function create(x, y, w, h, type, title, message) {` and its first line to `const el = buildWindow("popup", type, title, message);`.

In `spawn`, replace the `const el = create(...)` line with:

```js
    const type = pickType(opts.type);
    const el = create(x, y, w, h, type, opts.title || pick(type.titles), opts.message || pick(type.messages));
```

In the exported `ghost(opts)`, replace its `buildWindow(...)` line with:

```js
      const type = pickType(opts.type);
      const el = buildWindow("ghost", type, opts.title || pick(type.titles), opts.message || pick(type.messages));
```

- [ ] **Step 3: Type styling (`css/window.css`)**

Append:

```css
.popup-warning .popup-bar {
  background: var(--warn);
  color: var(--ink);
}

.popup-warning .popup-x {
  background: var(--ink);
}

.popup-error .popup-bar {
  background: var(--err);
}

.popup-error .popup-icon {
  background: var(--err);
  color: var(--paper);
  border-radius: calc(var(--radius) / 3);
}

.popup-download .popup-bar {
  background: var(--ink);
}

.popup-terminal {
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  background: var(--ink);
  color: var(--warn);
  font-family: ui-monospace, Menlo, Consolas, monospace;
  font-size: 12px;
}

.popup-terminal .popup-text {
  white-space: nowrap;
  overflow: hidden;
}

.popup-bar-fill {
  height: 10px;
  background: repeating-linear-gradient(90deg, var(--warn) 0 8px, var(--ink) 8px 14px);
  border: var(--line-thin) solid var(--paper);
}
```

- [ ] **Step 4: Verify and commit**

```bash
for f in js/*.js; do node --check "$f" || exit 1; done && echo JS_OK
grep -n "POPUP_TYPES" js/config.js | head -2
grep -n "TITLES\|MESSAGES" js/config.js js/popups.js js/screens.js || echo "old copy arrays gone (expected)"
grep -n "pickType\|buildWindow(" js/popups.js
```

```bash
git add js/config.js js/popups.js css/window.css
git commit -m "feat: warning, error and downloading pop-up types"
```

---

### Task 3: Taskbar, pause panel and tutorial copy

**Files:** Modify `index.html`, `js/hud.js`, `js/screens.js`, `css/screens.css`

**Interfaces:**
- The taskbar shows: start button, antivirus label, striped meter, **install percentage**, clock. The closed/open chips are gone; those counts live in the pause panel.
- `hud.render(s)` writes the percentage into `#hud-time` and no longer touches `#hud-closed`, `#hud-open` or `#hud-cap`.
- The start button reads **pause** during play, **resume** while paused, **start** everywhere else.
- The pause panel loses its resume button; `enterPaused` focuses the taskbar start button instead, and the third row becomes install progress.

- [ ] **Step 1: Markup (`index.html`)**

In the taskbar, delete both `<span class="hud-chip">…</span>` lines (closed and open).

Replace the paused panel's rows and resume button — that is, the `<ul class="start-menu-rows">…</ul>`, the `<p class="start-menu-hint">…</p>` and the `<button class="start-menu-item" id="resume-btn" …>resume</button>` — with:

```html
        <ul class="start-menu-rows">
          <li><span>Pop-ups closed</span><strong id="pause-closed">0</strong></li>
          <li><span>Pop-ups open</span><strong id="pause-open">0</strong></li>
          <li><span>Antivirus installed</span><strong id="pause-progress">0%</strong></li>
        </ul>
        <p class="start-menu-hint">Press Esc or the start button to keep going.</p>
```

Replace the tutorial instruction block's text with:

```html
        <b>Click anywhere on a pop-up</b> to close it. Don't let too many pile up before the antivirus finishes installing.
```

- [ ] **Step 2: HUD (`js/hud.js`)**

In `init()`, delete the `closed:`, `open:` and `cap:` entries from the `els` object and delete the `els.cap.textContent = C.CAP;` line.

Replace the whole `render(s)` method with:

```js
    render(s) {
      const done = s.phase === "success";
      const paused = s.phase === "paused";
      const progress = done ? 1 : Math.min(s.t / C.ROUND_SECONDS, 1);
      els.fill.style.width = progress * 100 + "%";
      els.label.textContent = LABELS[s.phase];
      els.time.textContent = Math.round(progress * 100) + "%";

      const startLabel = paused ? "resume" : s.phase === "play" ? "pause" : "start";
      if (els.startLabel.textContent !== startLabel) {
        els.startLabel.textContent = startLabel;
        els.startBtn.title = paused ? "Resume (Esc)" : "Pause (Esc)";
      }
    },
```

- [ ] **Step 3: Pause rows (`js/screens.js`)**

Replace the whole `function enterPaused(s) { ... }` function with:

```js
  function enterPaused(s) {
    $("pause-closed").textContent = s.score;
    $("pause-open").textContent = s.open;
    $("pause-progress").textContent = Math.round(Math.min(s.t / C.ROUND_SECONDS, 1) * 100) + "%";
    const startBtn = $("start-menu");
    if (startBtn) startBtn.focus();
  }
```

- [ ] **Step 4: Row styling (`css/screens.css`)**

Replace the whole `.start-menu-rows li { ... }` rule with:

```css
.start-menu-rows li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  background: var(--blue);
  color: var(--paper);
  border-radius: calc(var(--radius) / 3);
  font-size: 15px;
}
```

and replace the whole `.start-menu-rows strong { ... }` rule with:

```css
.start-menu-rows strong {
  font-size: 19px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 5: Verify and commit**

```bash
for f in js/*.js; do node --check "$f" || exit 1; done && echo JS_OK
grep -n "hud-chip\|hud-closed\|hud-open\|hud-cap\|resume-btn" index.html js/hud.js js/main.js js/screens.js || echo "chips and resume button gone (expected)"
grep -n "pause-progress\|hud-time" index.html js/hud.js js/screens.js
```

Note: `js/main.js` wires `resume-btn`. Delete that one listener line, since the button no longer exists.

```bash
git add index.html js/hud.js js/screens.js js/main.js css/screens.css
git commit -m "feat: install percentage in the taskbar, counts in the pause panel"
```

---

### Task 4: Tutorial once per session, and spread-out ghosts

**Files:** Modify `js/game.js`, `js/config.js`, `js/screens.js`

**Interfaces:**
- `game.startTutorial()` shows the practice pop-up only the first time in a page session; afterwards it starts the round directly. A page refresh shows it again (the flag lives in memory, not storage).
- Ghost placement prefers spots far from the previously placed ghost, the same way pop-ups now do.

- [ ] **Step 1: Session flag (`js/game.js`)**

Add this line directly after `let onPhase = function () {};`:

```js
  let tutorialShown = false;
```

Replace the whole `function startTutorial() { ... }` function with:

```js
  function startTutorial() {
    if (tutorialShown) {
      startRound();
      return;
    }
    tutorialShown = true;

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
```

- [ ] **Step 2: Ghost distance (`js/config.js`)**

Add this line directly after the `GHOST_TRIES:` line:

```js
  GHOST_MIN_DISTANCE: 340,
```

- [ ] **Step 3: Spread the ghosts too (`js/screens.js`)**

Replace the whole `function placeGhost(root, placed, w, h) { ... }` function with:

```js
  function placeGhost(root, placed, w, h) {
    const area = ghostArea(w, h);
    if (area.maxX < area.minX || area.maxY < area.minY) return;

    const last = placed.length ? placed[placed.length - 1] : null;
    let fallback = null;
    let best = null;
    let bestGap = -1;

    for (let tries = 0; tries < C.GHOST_TRIES; tries++) {
      const box = {
        x: Math.round(area.minX + Math.random() * (area.maxX - area.minX)),
        y: Math.round(area.minY + Math.random() * (area.maxY - area.minY)),
        w: w,
        h: h,
      };
      if (!fallback) fallback = box;
      if (placed.some((other) => overlapRatio(box, other) > C.GHOST_OVERLAP_MAX)) continue;

      const gap = last ? Math.hypot(box.x + w / 2 - (last.x + last.w / 2), box.y + h / 2 - (last.y + last.h / 2)) : Infinity;
      if (gap > bestGap) {
        bestGap = gap;
        best = box;
      }
      if (gap >= C.GHOST_MIN_DISTANCE) break;
    }

    const chosen = best || fallback;
    placed.push(chosen);
    root.appendChild(INAV.popups.ghost(chosen));
  }
```

- [ ] **Step 4: Verify and commit**

```bash
for f in js/*.js; do node --check "$f" || exit 1; done && echo JS_OK
grep -n "tutorialShown" js/game.js
grep -n "GHOST_MIN_DISTANCE" js/config.js js/screens.js
```

```bash
git add js/game.js js/config.js js/screens.js
git commit -m "feat: tutorial once per session and ghosts placed further apart"
```

---

### Task 5: Controller tasks (no subagent)

- [ ] Tune the spawn numbers from Task 1's simulation plus a browser pass, so skill separates players and scores vary.
- [ ] Measure real coverage at the cap in the browser (union of pop-up rectangles over the desktop) and adjust `POPUP_W` / `POPUP_H` / `CAP` until it lands at 85-95%.
- [ ] Confirm no pop-up type clips its content at the new smaller sizes.
- [ ] Compact the spec: keep §1-§8 as the binding rules, and shrink §9 to a short per-iteration record that points at the plans for detail.
- [ ] Brainstorm the win screen with Rickey (he wants white or off-white text on it, which the current green cannot carry at 2.2:1).
