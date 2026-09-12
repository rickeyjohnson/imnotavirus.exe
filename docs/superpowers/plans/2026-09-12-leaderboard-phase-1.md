# Leaderboard Phase 1 (UI) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the whole leaderboard experience — rotating title button, board window with a medal podium, and name entry on both end screens — against a fake local data source, so it can be judged before any backend account exists.

**Architecture:** One facade, `INAV.leaderboard`, is the only thing the game talks to. Behind it sits a swappable source object, `INAV.leaderboardSource`. Phase 1 installs `js/leaderboard-local.js` as that source: seeded rows in `localStorage` that simulate network latency, offline and error. Phase 2 replaces that one file with a `fetch`-based source and changes nothing else. Name validation lives in its own pure module so the same rules can be mirrored in SQL later.

**Tech Stack:** Vanilla HTML, CSS and JavaScript. No libraries, no build step, no ES modules — classic `<script>` tags in dependency order, one IIFE per file, everything shared on `window.INAV`. This is a hard project constraint.

**Spec:** `docs/superpowers/specs/2026-09-12-leaderboard-design.md` (and `2026-09-11-imnotavirus-design.md` for palette, phases and contrast rules)

## Global Constraints

- **No libraries, no frameworks, no build tooling.** HTML, CSS and JS only.
- **No ES modules.** `import`/`export` fail over `file://`. Use `<script>` tags and the `INAV` namespace.
- **No unit tests.** Rickey tests by hand. Every verification step in this plan is a real-browser check. Where a step needs measurement, measure what the browser *rendered* — never the constants the code placed from.
- **Use real clicks.** Scripted `dispatchEvent` skips hit-testing and has already hidden one unclickable-element bug in this project. Click with the browser's own input.
- **The game must still run by double-clicking `index.html`.** Phase 1 adds no network calls, so this holds throughout.
- **Contrast:** 4.5:1 for normal text, 3:1 for text at 18.66px bold or larger.
- **Pop-up/screen layering:** `[data-screen]` sections are `pointer-events: none` with an explicit `auto` allow-list in `css/screens.css`. Any new interactive screen **must** be added to that list or it will look fine and be unclickable.
- **Name charset:** `^[A-Za-z0-9 ]{1,12}$`, enforced identically everywhere.
- **Score range:** integer `0..250`.
- Test server: `python3 tools/dev-server.py 8765` (sends `no-store`; the project has been misled three times by cached CSS and JS).

## File Structure

**Created:**
- `js/names.js` — `INAV.names`: normalise, validate, blocklist. Pure functions, no DOM, no storage.
- `js/leaderboard-local.js` — `INAV.leaderboardLocal`: the fake source. Seeds rows, fakes latency/offline/error, installs itself as `INAV.leaderboardSource`.
- `js/leaderboard.js` — `INAV.leaderboard`: the facade. Owns `clientId`, the remembered name, and the rank/`mine`/`cut` composition.
- `js/board-ui.js` — `INAV.boardUI`: renders the board window and its loading/empty/offline/error states.
- `js/name-entry.js` — `INAV.nameEntry`: the single movable name form used by both end screens.
- `js/wheel.js` — `INAV.wheel`: the rotating title button's timer and freeze behaviour.
- `css/leaderboard.css` — board window, medals, wheel, name entry.

**Modified:**
- `index.html` — three medal tokens' stylesheet link, the board section, the wheel button, the name-entry host node, six new `<script>` tags.
- `css/base.css` — `--gold`, `--silver`, `--bronze`.
- `css/screens.css` — add the board section to the `pointer-events: auto` allow-list.
- `js/config.js` — `LEADERBOARD` block, three new `STORAGE_KEYS`.
- `js/game.js` — the `board` phase, `showBoard()`, `closeBoard()`.
- `js/screens.js` — `board` in the phase map, enter logic, taskbar inert, mount the name form.
- `js/hud.js` — `board` label.
- `js/main.js` — wire the new buttons, Esc closes the board.

---

### Task 1: Palette tokens and the board window shell

Gets a visible, closable board window on screen with hardcoded rows. Everything after this replaces its contents.

**Files:**
- Modify: `css/base.css` (`:root` block, after `--win`)
- Create: `css/leaderboard.css`
- Modify: `index.html` (stylesheet links, title screen, new board section, script tags)
- Modify: `css/screens.css` (the `pointer-events: auto` list near line 13)
- Modify: `js/config.js`, `js/game.js`, `js/screens.js`, `js/hud.js`, `js/main.js`

**Interfaces:**
- Consumes: nothing.
- Produces: phase `"board"`; `INAV.game.showBoard()` and `INAV.game.closeBoard()`; DOM ids `board-close`, `board-back`, `board-btn`, `board-rows`, `board-status`, `board-mine`.

- [ ] **Step 1: Add the three medal tokens**

In `css/base.css`, inside `:root`, immediately after `--win: #04B550;`:

```css
  /* Medals. Measured against --ink text: gold 7.78:1, silver 8.13:1,
     bronze 5.37:1 — all clear of 4.5:1. As fills only; each needs an --ink
     border because the fills themselves are 1.6-2.3:1 against --paper. */
  --gold: #FFC400;
  --silver: #C9D2DC;
  --bronze: #E09B6B;
```

- [ ] **Step 2: Add the leaderboard config block**

In `js/config.js`, replace the `STORAGE_KEYS` line with:

```js
  STORAGE_KEYS: {
    last: "inav.last",
    best: "inav.best",
    clientId: "inav.clientId",
    playerName: "inav.playerName",
    fakeRows: "inav.fakeRows",
  },

  LEADERBOARD: {
    VISIBLE: 25,
    WHEEL_MS: 3000,
    NAME_MAX: 12,
    SCORE_MAX: 250,
    FAKE_LATENCY_MS: { min: 220, max: 650 },
    SEED_COUNT: 30,
  },
```

- [ ] **Step 3: Create the board stylesheet**

Create `css/leaderboard.css`:

```css
/* Board window. Mirrors .wizard's construction so the two windows agree. */
.board {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 620px;
  max-height: 560px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--paper);
  border: var(--line) solid var(--ink);
  border-radius: var(--radius);
}
.board-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px 8px 14px;
  background: var(--blue);
  color: var(--paper);
  font-family: var(--display);
  font-size: 17px;
  border-bottom: var(--line) solid var(--ink);
}
.board-x {
  flex: none;
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  background: var(--err);
  color: var(--paper);
  font-size: 14px;
  line-height: 1;
  border: var(--line-thin) solid var(--ink);
  border-radius: calc(var(--radius) / 2);
  cursor: pointer;
}
.board-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 14px;
}
.board-foot {
  display: flex;
  justify-content: flex-end;
  padding: 10px 14px;
  border-top: var(--line-thin) solid var(--ink);
}
.board-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 16px;
  text-align: left;
}
.board-table th {
  padding: 4px 8px;
  font-family: var(--display);
  font-size: 14px;
  text-transform: lowercase;
  border-bottom: var(--line-thin) solid var(--ink);
}
.board-table td {
  padding: 5px 8px;
  border-bottom: 1px solid rgba(39, 53, 72, 0.15);
}
.board-table .col-rank { width: 70px; }
.board-table .col-score { width: 90px; text-align: right; }
.board-table td.col-score { font-variant-numeric: tabular-nums; font-weight: 700; }

/* Medals are a filled pill with the rank in ink. The number is always
   present, so rank is never communicated by colour alone. */
.medal {
  display: inline-grid;
  place-items: center;
  min-width: 30px;
  padding: 1px 7px;
  color: var(--ink);
  font-weight: 700;
  border: var(--line-thin) solid var(--ink);
  border-radius: 999px;
}
.medal-1 { background: var(--gold); }
.medal-2 { background: var(--silver); }
.medal-3 { background: var(--bronze); }

.row-mine { background: rgba(0, 120, 253, 0.12); }
.row-mine td { font-weight: 700; }
.won-badge {
  margin-left: 6px;
  padding: 0 6px;
  font-size: 12px;
  font-weight: 700;
  color: var(--ink);
  background: var(--win);
  border: 1px solid var(--ink);
  border-radius: 999px;
}

.board-mine-pin {
  margin-top: 10px;
  padding-top: 10px;
  border-top: var(--line-thin) dashed var(--ink);
  font-size: 16px;
  font-weight: 700;
}
.board-status {
  padding: 18px 6px;
  font-size: 17px;
  text-align: center;
}
.board-skeleton span {
  display: block;
  height: 18px;
  margin: 8px 0;
  background: rgba(39, 53, 72, 0.12);
  border-radius: calc(var(--radius) / 3);
}
```

- [ ] **Step 4: Link the stylesheet and add the board markup**

In `index.html`, after the `css/screens.css` link:

```html
  <link rel="stylesheet" href="css/leaderboard.css">
```

Replace the title screen's button line (currently `<button class="btn" id="start-btn" type="button">start</button>`) with:

```html
        <button class="btn" id="start-btn" type="button">start</button>
        <button class="btn small" id="board-btn" type="button">leaderboard</button>
```

After the `[data-screen="crash"]` section's closing `</section>`, add:

```html
    <section data-screen="board" hidden>
      <div class="board">
        <div class="board-bar">
          <span id="board-heading">leaderboard.exe</span>
          <button class="board-x" id="board-close" type="button" aria-label="Close leaderboard">✕</button>
        </div>
        <div class="board-body">
          <div class="board-status" id="board-status" hidden></div>
          <table class="board-table" id="board-table" aria-labelledby="board-heading">
            <thead>
              <tr><th class="col-rank" scope="col">rank</th><th scope="col">name</th><th class="col-score" scope="col">closed</th></tr>
            </thead>
            <tbody id="board-rows">
              <tr><td><span class="medal medal-1">1</span></td><td>placeholder</td><td class="col-score">144</td></tr>
              <tr><td><span class="medal medal-2">2</span></td><td>placeholder</td><td class="col-score">141</td></tr>
              <tr><td><span class="medal medal-3">3</span></td><td>placeholder</td><td class="col-score">138</td></tr>
              <tr class="row-mine"><td>4</td><td>placeholder</td><td class="col-score">96</td></tr>
            </tbody>
          </table>
          <div class="board-mine-pin" id="board-mine" hidden></div>
        </div>
        <div class="board-foot">
          <button class="btn small" id="board-back" type="button">back</button>
        </div>
      </div>
    </section>
```

- [ ] **Step 5: Add the board to the pointer-events allow-list**

This is the step that prevents the bug that already happened once in this project: a screen that renders perfectly and cannot be clicked. In `css/screens.css`, extend the existing selector list:

```css
[data-screen] button,
.wizard,
.board,
[data-screen="paused"],
[data-screen="crash"] {
  pointer-events: auto;
}
```

- [ ] **Step 6: Add the board phase to the game**

In `js/game.js`, add a module-level variable next to `let tutorialShown = false;`:

```js
  let boardReturn = "title";
```

Then add these two functions immediately after `goTitle()`:

```js
  // The board is reachable from the title and from either end screen, so it
  // remembers where it was opened from rather than always returning to title.
  function showBoard() {
    if (state.phase === "board") return;
    boardReturn = state.phase;
    INAV.popups.setEnabled(false);
    setPhase("board");
  }

  function closeBoard() {
    if (state.phase !== "board") return;
    setPhase(boardReturn === "board" ? "title" : boardReturn);
  }
```

And add both to the exported object, after `goTitle,`:

```js
    showBoard,
    closeBoard,
```

- [ ] **Step 7: Map the phase and make the taskbar inert**

In `js/screens.js`, add to `SCREEN_FOR_PHASE`, after the `winning` line:

```js
    board: "board",
```

Change the taskbar line to include the board (there is nothing to pause while reading it):

```js
      if (taskbar) taskbar.inert = phase === "crashing" || phase === "crash" || phase === "winning" || phase === "board";
```

Add an enter function before the `ENTER` map:

```js
  function enterBoard() {
    const close = $("board-close");
    if (close) close.focus();
  }
```

and register it in `ENTER`:

```js
    board: enterBoard,
```

In `js/hud.js`, add to `LABELS` after the `winning` line:

```js
    board: "Antivirus: not installed",
```

- [ ] **Step 8: Wire the buttons**

In `js/main.js`, after the `start-btn` listener:

```js
  $("board-btn").addEventListener("click", () => INAV.game.showBoard());
  $("board-close").addEventListener("click", () => INAV.game.closeBoard());
  $("board-back").addEventListener("click", () => INAV.game.closeBoard());
```

Replace the keydown listener so Esc closes the board instead of toggling pause while it is open:

```js
  window.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || e.repeat) return;
    if (INAV.game.snapshot().phase === "board") {
      INAV.game.closeBoard();
      return;
    }
    INAV.game.togglePause();
  });
```

- [ ] **Step 9: Verify in a real browser**

Start the server: `python3 tools/dev-server.py 8765`, open `http://localhost:8765/index.html`.

Check all of these, using **real clicks**, not scripted events:

1. Title screen shows `start` and a smaller `leaderboard` button.
2. Clicking `leaderboard` opens the board window with the four placeholder rows; ranks 1-3 show gold, silver and bronze pills, rank 4 is a highlighted plain row.
3. Clicking the red `✕` returns to the title. Clicking `back` returns to the title. Pressing `Esc` returns to the title.
4. The taskbar start button does nothing while the board is open.
5. Play a round, crash, then — there is no board button on the crash screen yet, so instead run `INAV.game.showBoard()` in the console and confirm `Esc` returns you to the **crash** screen, not the title.

Measure the rendered contrast rather than trusting the tokens:

```js
const cs = getComputedStyle(document.querySelector('.medal-3'));
[cs.backgroundColor, cs.color]
```

Expected `rgb(224, 155, 107)` on `rgb(39, 53, 72)` — 5.37:1.

- [ ] **Step 10: Commit**

```bash
git add css/base.css css/leaderboard.css css/screens.css index.html js/config.js js/game.js js/screens.js js/hud.js js/main.js
git commit -m "feat: board window shell, board phase and medal palette tokens"
```

---

### Task 2: Name validation

Pure module, no DOM, no storage. Phase 2 mirrors these exact rules in SQL, so they live in one place with no side effects.

**Files:**
- Create: `js/names.js`
- Modify: `index.html` (script tag)

**Interfaces:**
- Consumes: `INAV.config.LEADERBOARD.NAME_MAX`.
- Produces: `INAV.names.check(raw)` → `{ ok: true, name: string }` or `{ ok: false, error: string }`; `INAV.names.normalise(raw)` → string.

- [ ] **Step 1: Write the module**

Create `js/names.js`:

```js
(function () {
  const C = INAV.config;

  // Leetspeak folding, so "n00b" and "noob" hit the same blocklist entry.
  const LEET = { "0": "o", "1": "i", "!": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s" };

  // Deliberately short and dull. It is a speed bump, not a guarantee, and the
  // real floor is the server-side copy added in phase 2.
  const BLOCKED = [
    "anus", "arse", "ass", "bastard", "bitch", "bollocks", "boner", "clit",
    "cock", "coon", "cum", "cunt", "dick", "dildo", "dyke", "fag", "faggot",
    "fuck", "jizz", "kike", "nazi", "nigg", "penis", "piss", "porn", "prick",
    "pussy", "queer", "rape", "retard", "scrotum", "sex", "shit", "slut",
    "spic", "tits", "tranny", "twat", "vagina", "wank", "whore",
  ];

  function normalise(raw) {
    return String(raw == null ? "" : raw)
      .toLowerCase()
      .replace(/[^a-z0-9!@$]/g, "")
      .replace(/[013457!@$]/g, (ch) => LEET[ch] || ch)
      .replace(/(.)\1+/g, "$1");
  }

  function check(raw) {
    const name = String(raw == null ? "" : raw).trim().replace(/\s+/g, " ");

    if (!name) return { ok: false, error: "Type a name first." };
    if (name.length > C.LEADERBOARD.NAME_MAX) {
      return { ok: false, error: "Names are " + C.LEADERBOARD.NAME_MAX + " characters or fewer." };
    }

    const bad = name.match(/[^A-Za-z0-9 ]/);
    if (bad) return { ok: false, error: "“" + bad[0] + "” isn't allowed — letters, numbers and spaces only." };

    const folded = normalise(name);
    if (BLOCKED.some((word) => folded.includes(word))) {
      return { ok: false, error: "Pick a different name." };
    }

    return { ok: true, name: name };
  }

  INAV.names = { check, normalise };
})();
```

Note the `(.)\1+` collapse: it folds `fuuuuck` to `fuck`. It also folds `bookkeeper` to `bokeper`, which is harmless because we only ever substring-match the folded form against the blocklist and never show it to anyone.

- [ ] **Step 2: Load it**

In `index.html`, add after the `js/config.js` script tag:

```html
  <script src="js/names.js"></script>
```

- [ ] **Step 3: Verify the rules in the browser console**

Reload and paste:

```js
[
  "Rickey", "a", "12 chars ok!", "RICKEY JOHNSON", "", "   ",
  "thirteenchars", "RicKey", "n00b", "ASS", "a55", "classic", "Bookkeeper",
].map((s) => [JSON.stringify(s), JSON.stringify(INAV.names.check(s))]);
```

Expected, in order: ok; ok; rejected for `!`; rejected as 14 characters; "Type a name first"; "Type a name first"; rejected as 13 characters; rejected for the Kelvin-sign look-alike; "Pick a different name"; "Pick a different name"; **ok** (`classic` contains no blocklist word — confirm it is not a false positive); ok.

The `RicKey` case is the important one: that is U+212A, the Kelvin sign, which renders identically to a capital K in most fonts, and the charset rule is the only thing that stops it. **Copy the line, don't retype it** — retyping gives you an ASCII K, which passes, and you'll think the check is broken.

- [ ] **Step 4: Commit**

```bash
git add js/names.js index.html
git commit -m "feat: name validation with charset rule and folded blocklist"
```

---

### Task 3: The fake source

**Files:**
- Create: `js/leaderboard-local.js`
- Modify: `index.html` (script tag)

**Interfaces:**
- Consumes: `INAV.storage`, `INAV.config.LEADERBOARD`.
- Produces: `INAV.leaderboardSource` with `fetchTop(limit)` → `Promise<{rows, total}>`, `insert({name, score, won, clientId})` → `Promise<{id, at}>`, `rankOf({score, at})` → `Promise<number>`, `state()` → `"ready"|"offline"|"error"`. Also `INAV.leaderboardLocal.force(mode)` and `INAV.leaderboardLocal.reset()` for testing. A stored row is `{id, name, score, won, clientId, at}` where `at` is a millisecond timestamp.

- [ ] **Step 1: Write the source**

Create `js/leaderboard-local.js`:

```js
(function () {
  const C = INAV.config;
  const L = C.LEADERBOARD;

  // Seed names are deliberately plausible and deliberately fake. They obey the
  // same charset as real entries, so nothing on the board is unreachable to a
  // real player.
  const SEED_NAMES = [
    "PopHunter", "ctrl alt del", "mousehand", "Kara", "BSOD Betty", "dialup99",
    "Jaylen", "CLICKZILLA", "Nia", "toolbar fan", "Marcus", "defrag",
    "Simone", "Windows Me", "trashcan", "Dee", "Kofi", "screensaver",
    "Amara", "clippy", "Devon", "solitaire", "Yusuf", "minesweeper",
    "Tati", "cd rom", "Jamal", "floppy", "Imani", "wingding",
  ];

  // Matches real play: a crowd between 40 and 110, a few winners above 130.
  // A winner must be near the full 144 spawns, so wins only appear up high.
  function seedScore(i) {
    if (i < 3) return 144 - i * 3;
    if (i < 6) return 131 - i;
    return 40 + Math.floor(Math.random() * 71);
  }

  let forced = null; // null | "ready" | "offline" | "error" | "slow" | "empty"

  function load() {
    const rows = INAV.storage.get(C.STORAGE_KEYS.fakeRows, null);
    if (Array.isArray(rows)) return rows;
    return seed();
  }

  function seed() {
    const now = Date.now();
    const rows = [];
    for (let i = 0; i < Math.min(L.SEED_COUNT, SEED_NAMES.length); i++) {
      const score = seedScore(i);
      rows.push({
        id: "seed-" + i,
        name: SEED_NAMES[i],
        score: score,
        won: score >= 128,
        clientId: "seed",
        at: now - (L.SEED_COUNT - i) * 3600000,
      });
    }
    save(rows);
    return rows;
  }

  function save(rows) {
    INAV.storage.set(C.STORAGE_KEYS.fakeRows, rows);
  }

  // Ties break on the earlier submission, so ranks are always unique and the
  // podium never shows two golds.
  function ordered(rows) {
    return rows.slice().sort((a, b) => b.score - a.score || a.at - b.at);
  }

  function wait() {
    const l = L.FAKE_LATENCY_MS;
    const ms = forced === "slow" ? 2600 : l.min + Math.random() * (l.max - l.min);
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function guard() {
    if (forced === "offline") return Promise.reject(new Error("offline"));
    if (forced === "error") return Promise.reject(new Error("error"));
    return null;
  }

  INAV.leaderboardLocal = {
    // Console helper: INAV.leaderboardLocal.force("offline")
    force(mode) {
      forced = mode === "ready" ? null : mode || null;
      return forced;
    },
    reset() {
      INAV.storage.set(C.STORAGE_KEYS.fakeRows, null);
      seed();
    },
  };

  INAV.leaderboardSource = {
    state() {
      if (forced === "offline") return "offline";
      if (forced === "error") return "error";
      return "ready";
    },

    fetchTop(limit) {
      const blocked = guard();
      if (blocked) return blocked;
      return wait().then(() => {
        const all = forced === "empty" ? [] : ordered(load());
        return { rows: all.slice(0, limit), total: all.length };
      });
    },

    insert(entry) {
      const blocked = guard();
      if (blocked) return blocked;
      return wait().then(() => {
        const row = {
          id: "run-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
          name: entry.name,
          score: entry.score,
          won: !!entry.won,
          clientId: entry.clientId,
          at: Date.now(),
        };
        const rows = load();
        rows.push(row);
        save(rows);
        return { id: row.id, at: row.at };
      });
    },

    rankOf(entry) {
      const blocked = guard();
      if (blocked) return blocked;
      return wait().then(() => {
        const rows = load();
        let ahead = 0;
        rows.forEach((r) => {
          if (r.score > entry.score || (r.score === entry.score && r.at < entry.at)) ahead++;
        });
        return ahead + 1;
      });
    },
  };
})();
```

- [ ] **Step 2: Load it**

In `index.html`, after the `js/storage.js` script tag:

```html
  <script src="js/leaderboard-local.js"></script>
```

- [ ] **Step 3: Verify the source in the console**

```js
await INAV.leaderboardSource.fetchTop(5)
```

Expected: five rows, descending by score, first three at 144/141/138 with `won: true`, and `total` of 30.

Then check the latency is real, not instant — a board designed against instant data will not survive a real connection:

```js
const t0 = performance.now();
await INAV.leaderboardSource.fetchTop(25);
performance.now() - t0
```

Expected: between 220 and 650.

Then the failure modes:

```js
INAV.leaderboardLocal.force("offline");
await INAV.leaderboardSource.fetchTop(5).catch((e) => "rejected: " + e.message)
```

Expected `"rejected: offline"`, and `INAV.leaderboardSource.state()` returns `"offline"`. Reset with `INAV.leaderboardLocal.force("ready")`.

Then insert-and-rank:

```js
const r = await INAV.leaderboardSource.insert({ name: "Test", score: 100, won: false, clientId: "abc" });
await INAV.leaderboardSource.rankOf({ score: 100, at: r.at })
```

Expected: a rank consistent with 100 against the seeded spread. Run `INAV.leaderboardLocal.reset()` afterwards to clear the test row.

- [ ] **Step 4: Commit**

```bash
git add js/leaderboard-local.js index.html
git commit -m "feat: fake leaderboard source with seeded rows and simulated latency"
```

---

### Task 4: The facade

**Files:**
- Create: `js/leaderboard.js`
- Modify: `index.html` (script tag)

**Interfaces:**
- Consumes: `INAV.leaderboardSource` (Task 3), `INAV.names` (Task 2), `INAV.storage`.
- Produces: `INAV.leaderboard` with `top(limit)` → `Promise<{rows, total, cut}>` where a row is `{id, rank, name, score, won, mine, isLast}`; `submit({score, won, name})` → `Promise<{id, rank, total}>`; `state()`; `me()` → `{clientId, name, lastId}`; `rememberName(name)`.

- [ ] **Step 1: Write the facade**

Create `js/leaderboard.js`:

```js
(function () {
  const C = INAV.config;
  const K = C.STORAGE_KEYS;

  let lastId = null; // the row from the run just submitted, highlighted on the board

  function clientId() {
    let id = INAV.storage.get(K.clientId, null);
    if (typeof id !== "string" || !id) {
      id = "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      INAV.storage.set(K.clientId, id);
    }
    return id;
  }

  function storedName() {
    const name = INAV.storage.get(K.playerName, null);
    return typeof name === "string" && INAV.names.check(name).ok ? name : null;
  }

  INAV.leaderboard = {
    state() {
      return INAV.leaderboardSource.state();
    },

    me() {
      return { clientId: clientId(), name: storedName(), lastId: lastId };
    },

    rememberName(name) {
      const result = INAV.names.check(name);
      if (result.ok) INAV.storage.set(K.playerName, result.name);
      return result;
    },

    top(limit) {
      const want = limit || C.LEADERBOARD.VISIBLE;
      const mine = clientId();
      return INAV.leaderboardSource.fetchTop(want).then((res) => {
        const rows = res.rows.map((r, i) => ({
          id: r.id,
          rank: i + 1,
          name: r.name,
          score: r.score,
          won: !!r.won,
          mine: r.clientId === mine,
          isLast: r.id === lastId,
        }));
        return { rows: rows, total: res.total, cut: rows.length };
      });
    },

    // Validates, stores the name for next time, inserts, then resolves the
    // placement. Rank comes from the source so phase 2 can answer it with a
    // count query instead of shipping the whole table.
    submit(entry) {
      const checked = INAV.names.check(entry.name);
      if (!checked.ok) return Promise.reject(new Error(checked.error));

      const score = Math.round(Number(entry.score));
      if (!Number.isFinite(score) || score < 0 || score > C.LEADERBOARD.SCORE_MAX) {
        return Promise.reject(new Error("That score isn't valid."));
      }

      INAV.storage.set(K.playerName, checked.name);

      return INAV.leaderboardSource
        .insert({ name: checked.name, score: score, won: !!entry.won, clientId: clientId() })
        .then((res) => {
          lastId = res.id;
          return INAV.leaderboardSource.rankOf({ score: score, at: res.at }).then((rank) => ({
            id: res.id,
            rank: rank,
            total: 0,
          }));
        });
    },
  };
})();
```

- [ ] **Step 2: Load it**

In `index.html`, after the `js/leaderboard-local.js` script tag:

```html
  <script src="js/leaderboard.js"></script>
```

Note `js/names.js` must load before this file. Confirm the tag order is `config`, `names`, `storage`, `leaderboard-local`, `leaderboard`.

- [ ] **Step 3: Verify the facade in the console**

```js
INAV.leaderboard.me()
```

Expected: a `clientId` starting with `c`, `name: null` on a fresh browser, `lastId: null`. Call it twice — the `clientId` must be identical, and must survive a reload.

```js
const t = await INAV.leaderboard.top(5);
[t.total, t.cut, t.rows.map((r) => [r.rank, r.score, r.mine, r.isLast])]
```

Expected: ranks `1,2,3,4,5` with no gaps or duplicates, all `mine` false, all `isLast` false.

```js
const s = await INAV.leaderboard.submit({ name: "Rickey", score: 96, won: false });
s
```

Expected: an `id` and a plausible `rank`. Then:

```js
const t2 = await INAV.leaderboard.top(25);
t2.rows.filter((r) => r.mine || r.isLast).map((r) => [r.rank, r.name, r.mine, r.isLast])
```

Expected: exactly one row with both `mine` and `isLast` true. And `INAV.leaderboard.me().name` now returns `"Rickey"`.

Then confirm validation rejects rather than storing garbage:

```js
await INAV.leaderboard.submit({ name: "a!", score: 10 }).catch((e) => e.message);
await INAV.leaderboard.submit({ name: "ok", score: 9999 }).catch((e) => e.message)
```

Expected: the charset message, then `"That score isn't valid."`

Run `INAV.leaderboardLocal.reset()` to clear the test rows.

- [ ] **Step 4: Commit**

```bash
git add js/leaderboard.js index.html
git commit -m "feat: leaderboard facade with client id, ranking and submit validation"
```

---

### Task 5: Board rendering

Replaces Task 1's placeholder rows with real data and all four states.

**Files:**
- Create: `js/board-ui.js`
- Modify: `index.html` (remove the placeholder `<tbody>` rows, add the script tag)
- Modify: `js/screens.js` (`enterBoard`)

**Interfaces:**
- Consumes: `INAV.leaderboard.top()`, `INAV.leaderboard.me()`, `INAV.config.LEADERBOARD.VISIBLE`.
- Produces: `INAV.boardUI.load()`, which re-reads the board and renders it.

- [ ] **Step 1: Empty the placeholder rows**

In `index.html`, replace the whole `<tbody id="board-rows">…</tbody>` block with:

```html
            <tbody id="board-rows"></tbody>
```

- [ ] **Step 2: Write the renderer**

Create `js/board-ui.js`:

```js
(function () {
  const C = INAV.config;
  const $ = (id) => document.getElementById(id);
  let token = 0; // guards against a slow response landing after a newer one

  function medal(rank) {
    if (rank > 3) return String(rank);
    return '<span class="medal medal-' + rank + '">' + rank + "</span>";
  }

  function rowHtml(r) {
    const cls = r.mine || r.isLast ? ' class="row-mine"' : "";
    const current = r.isLast ? ' aria-current="true"' : "";
    return (
      "<tr" + cls + current + ">" +
      "<td>" + medal(r.rank) + "</td>" +
      "<td></td>" +
      '<td class="col-score">' + r.score + "</td>" +
      "</tr>"
    );
  }

  function status(html, extraClass) {
    $("board-table").hidden = !!html;
    $("board-mine").hidden = true;
    const el = $("board-status");
    el.hidden = !html;
    el.className = "board-status" + (extraClass ? " " + extraClass : "");
    el.innerHTML = html || "";
  }

  function render(data) {
    const me = INAV.leaderboard.me();
    const body = $("board-rows");

    if (!data.rows.length) {
      status("Nobody has finished a round yet. Be the first.");
      return;
    }

    status("");
    body.innerHTML = data.rows.map(rowHtml).join("");

    // Names are inserted as text, never as HTML. They come from other players.
    data.rows.forEach((r, i) => {
      const cell = body.rows[i].cells[1];
      cell.textContent = r.name;
      if (r.won) {
        const badge = document.createElement("span");
        badge.className = "won-badge";
        badge.textContent = "survived";
        cell.appendChild(badge);
      }
    });

    // If the run just submitted placed below the visible cut, pin it rather
    // than making the player hunt for it.
    const shown = data.rows.some((r) => r.isLast);
    const pin = $("board-mine");
    if (me.lastId && !shown) {
      pin.hidden = false;
      pin.textContent = "Your last run: #" + (me.lastRank || "?") + " of " + data.total;
    } else {
      pin.hidden = true;
    }
  }

  INAV.boardUI = {
    load() {
      const mine = ++token;
      status('<div class="board-skeleton"><span></span><span></span><span></span><span></span><span></span></div>');
      INAV.leaderboard
        .top(C.LEADERBOARD.VISIBLE)
        .then((data) => {
          if (mine !== token) return;
          render(data);
        })
        .catch((err) => {
          if (mine !== token) return;
          if (err && err.message === "offline") {
            status("The global board needs the online version of the game. Your scores are still saved on this computer.");
          } else {
            status('Could not load the board. <button class="btn small" id="board-retry" type="button">retry</button>');
            const retry = $("board-retry");
            if (retry) retry.addEventListener("click", () => INAV.boardUI.load());
          }
        });
    },
  };
})();
```

The `token` counter matters: open the board, close it, open it again quickly, and without it the first (slower) response can overwrite the second. That class of bug is invisible on instant fake data, which is exactly why the fake source has latency.

- [ ] **Step 3: Carry the player's rank for the pinned row**

`render` reads `me.lastRank`, so the facade has to keep it. In `js/leaderboard.js`, change the `lastId` declaration to:

```js
  let lastId = null; // the row from the run just submitted, highlighted on the board
  let lastRank = null;
```

In `me()`, return it:

```js
      return { clientId: clientId(), name: storedName(), lastId: lastId, lastRank: lastRank };
```

And in `submit()`, inside the `rankOf` callback, set it before returning:

```js
          return INAV.leaderboardSource.rankOf({ score: score, at: res.at }).then((rank) => {
            lastRank = rank;
            return { id: res.id, rank: rank, total: 0 };
          });
```

- [ ] **Step 4: Load the board when the screen opens**

In `index.html`, add after the `js/leaderboard.js` tag:

```html
  <script src="js/board-ui.js"></script>
```

In `js/screens.js`, extend `enterBoard`:

```js
  function enterBoard() {
    INAV.boardUI.load();
    const close = $("board-close");
    if (close) close.focus();
  }
```

- [ ] **Step 5: Verify every state in a real browser**

Reload, then with real clicks:

1. Open the board. You should briefly see five grey skeleton bars, then 25 rows.
2. Ranks run 1-25 with no gaps. Rows 1-3 carry gold, silver, bronze pills. The high scorers carry a green `survived` badge; the 40-110 crowd does not.
3. `INAV.leaderboardLocal.force("slow")`, reopen, and confirm the skeleton is visible for about 2.6 seconds and the layout does not jump when rows arrive.
4. `INAV.leaderboardLocal.force("offline")`, reopen — expect the "needs the online version" message, the table hidden, and the window still closable.
5. `INAV.leaderboardLocal.force("error")`, reopen — expect the retry button. Click it with `force("ready")` set back first, and confirm the rows load.
6. `INAV.leaderboardLocal.force("empty")`, reopen — expect the "be the first" message.
7. `force("ready")`, then run `await INAV.leaderboard.submit({name: "Rickey", score: 41, won: false})` and reopen. Rank 41 will not be in the top 25, so the pinned "Your last run: #N of M" line must appear under the dashed separator.
8. Submit a winning score — `submit({name: "Rickey", score: 144, won: true})` — and confirm your row appears in the podium, highlighted, with `aria-current`.
9. **Injection check.** Names come from other players, so confirm they can never be markup:

```js
INAV.leaderboardLocal.reset();
const rows = INAV.storage.get(INAV.config.STORAGE_KEYS.fakeRows, []);
rows[0].name = '<img src=x onerror="alert(1)">';
INAV.storage.set(INAV.config.STORAGE_KEYS.fakeRows, rows);
```

Reopen the board. The rank-1 row must display the literal text `<img src=x onerror="alert(1)">` with no alert and no broken image. Then `INAV.leaderboardLocal.reset()`.

- [ ] **Step 6: Commit**

```bash
git add js/board-ui.js js/leaderboard.js js/screens.js index.html
git commit -m "feat: render the board with medals, pinned placement and all four states"
```

---

### Task 6: Name entry on both end screens

One form instance, moved between screens, so there is no duplicated markup and no duplicated ids.

**Files:**
- Create: `js/name-entry.js`
- Modify: `index.html` (the host node, slots in both end screens, script tag)
- Modify: `css/leaderboard.css` (form styles)
- Modify: `js/screens.js` (`enterCrash`, `enterSuccess`, `show`)

**Interfaces:**
- Consumes: `INAV.leaderboard.submit()`, `INAV.leaderboard.me()`, `INAV.names.check()`, `INAV.game.showBoard()`.
- Produces: `INAV.nameEntry.mount(slotEl, result)` and `INAV.nameEntry.unmount()`.

- [ ] **Step 1: Add the form markup and the two slots**

In `index.html`, immediately before `<pre id="debug" hidden></pre>`, add the single form instance:

```html
    <form class="name-entry" id="name-entry" novalidate hidden>
      <label for="name-input">Put this run on the leaderboard</label>
      <div class="name-entry-row">
        <input id="name-input" name="name" type="text" maxlength="12" autocomplete="off" spellcheck="false" placeholder="your name">
        <button class="btn small" id="name-submit" type="submit">submit</button>
      </div>
      <p class="name-error" id="name-error" role="alert" hidden></p>
      <p class="name-note">Letters, numbers and spaces, up to 12. Your name will be visible on a public board.</p>
      <p class="name-placed" id="name-placed" hidden></p>
    </form>
```

In the success screen, after the `success-new-best` badge line:

```html
          <div class="name-slot" id="success-name-slot"></div>
```

In the crash screen, after the `crash-new-best` badge line:

```html
      <div class="name-slot" id="crash-name-slot"></div>
```

- [ ] **Step 2: Style the form**

Append to `css/leaderboard.css`:

```css
.name-entry {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  width: 100%;
  max-width: 380px;
  margin: 4px auto 0;
  text-align: center;
}
.name-entry > label {
  font-family: var(--display);
  font-size: 16px;
}
.name-entry-row {
  display: flex;
  gap: 8px;
  width: 100%;
}
#name-input {
  flex: 1 1 auto;
  min-width: 0;
  padding: 8px 10px;
  font-family: var(--font);
  font-size: 17px;
  color: var(--ink);
  background: var(--paper);
  border: var(--line-thin) solid var(--ink);
  border-radius: calc(var(--radius) / 2);
}
#name-input:focus-visible {
  outline: var(--line) solid var(--ink);
  outline-offset: 2px;
}
.name-error {
  margin: 0;
  padding: 4px 8px;
  font-size: 15px;
  font-weight: 700;
  color: var(--ink);
  background: var(--warn);
  border: var(--line-thin) solid var(--ink);
  border-radius: calc(var(--radius) / 2);
}
.name-note {
  margin: 0;
  font-size: 13px;
  opacity: 0.75;
}
.name-placed {
  margin: 0;
  font-family: var(--display);
  font-size: 18px;
}
/* The crash screen is ink-on-blue, so the form needs the paper treatment
   there to keep every pairing above 4.5:1. */
[data-screen="crash"] .name-entry > label,
[data-screen="crash"] .name-note,
[data-screen="crash"] .name-placed {
  color: var(--paper);
}
```

- [ ] **Step 3: Write the controller**

Create `js/name-entry.js`:

```js
(function () {
  const $ = (id) => document.getElementById(id);
  let form = null;
  let pending = false;

  function showError(message) {
    const el = $("name-error");
    el.hidden = !message;
    el.textContent = message || "";
  }

  function setBusy(on) {
    pending = on;
    $("name-submit").disabled = on;
    $("name-input").disabled = on;
    $("name-submit").textContent = on ? "sending…" : "submit";
  }

  function placed(rank) {
    $("name-input").closest(".name-entry-row").hidden = true;
    form.querySelector("label").hidden = true;
    $("name-error").hidden = true;
    form.querySelector(".name-note").hidden = true;
    const el = $("name-placed");
    el.hidden = false;
    el.textContent = "You're #" + rank + " on the board.";
    const link = document.createElement("button");
    link.type = "button";
    link.className = "btn small";
    link.textContent = "see the board";
    link.addEventListener("click", () => INAV.game.showBoard());
    el.appendChild(document.createElement("br"));
    el.appendChild(link);
  }

  function onSubmit(e, result) {
    e.preventDefault();
    if (pending) return;

    const raw = $("name-input").value;
    const checked = INAV.names.check(raw);
    if (!checked.ok) {
      showError(checked.error);
      $("name-input").focus();
      return;
    }

    showError("");
    setBusy(true);
    INAV.leaderboard
      .submit({ name: checked.name, score: result.score, won: result.won })
      .then((res) => {
        setBusy(false);
        placed(res.rank);
      })
      .catch((err) => {
        setBusy(false);
        const offline = err && err.message === "offline";
        showError(offline ? "No connection to the board. Your score is still saved here." : err.message || "That didn't send.");
        $("name-input").focus();
      });
  }

  INAV.nameEntry = {
    // One form instance, moved into whichever end screen is showing. Keeps a
    // single set of element ids no matter how many screens can submit.
    mount(slot, result) {
      if (!slot) return;
      form = $("name-entry");
      slot.appendChild(form);
      form.hidden = false;

      $("name-input").closest(".name-entry-row").hidden = false;
      form.querySelector("label").hidden = false;
      form.querySelector(".name-note").hidden = false;
      $("name-placed").hidden = true;
      $("name-placed").textContent = "";
      showError("");
      setBusy(false);

      const me = INAV.leaderboard.me();
      $("name-input").value = me.name || "";

      form.onsubmit = (e) => onSubmit(e, result);
    },

    unmount() {
      if (form) form.hidden = true;
    },
  };
})();
```

- [ ] **Step 4: Mount it from the end screens**

In `index.html`, after the `js/board-ui.js` tag:

```html
  <script src="js/name-entry.js"></script>
```

In `js/screens.js`, at the end of `enterCrash`, before the `lockButton` call:

```js
    INAV.nameEntry.mount($("crash-name-slot"), { score: r.score, won: false });
```

In `enterSuccess`, immediately after the `success-new-best` line:

```js
    INAV.nameEntry.mount($("success-name-slot"), { score: r.score, won: true });
```

And in `show()`, alongside the other teardown, so the form never lingers on a screen it does not belong to:

```js
      if (INAV.nameEntry) INAV.nameEntry.unmount();
```

- [ ] **Step 5: Verify with real typing and real clicks**

1. Play until you crash. The form appears under the crash stats, empty, with the note about a public board.
2. Type `Rickey`, click `submit`. The button reads `sending…` and is disabled during the request, then the form is replaced by "You're #N on the board." and a `see the board` button.
3. Click `see the board` — the board opens with your row highlighted. Press `Esc` and confirm you return to the **crash** screen, not the title.
4. `try again`, crash again. The field is **prefilled** with `Rickey`.
5. Type `a!` and submit — the yellow error names the `!` character, the field keeps focus, and nothing is sent.
6. Type a 13-character name — the `maxlength` should stop you at 12; confirm you physically cannot type the 13th.
7. `INAV.leaderboardLocal.force("offline")`, then submit — expect "No connection to the board. Your score is still saved here." and the form still usable.
8. Win a round (shorten it with `INAV.config.ROUND_SECONDS = 12` if you don't want to play a full minute) and confirm the same form appears inside the wizard, below the stats, and that submitting from there records `won: true` — check with `(await INAV.leaderboard.top(5)).rows.find(r => r.isLast)`.
9. **Contrast check on the crash screen**, where the form sits on blue:

```js
const el = document.querySelector('[data-screen="crash"] .name-note');
[getComputedStyle(el).color, getComputedStyle(document.querySelector('[data-screen="crash"]')).backgroundColor]
```

Confirm paper-on-blue, which is 4.6:1. If the note is ink on blue it fails at 3.1:1 and the rule in Step 2 is not applying.

- [ ] **Step 6: Commit**

```bash
git add js/name-entry.js css/leaderboard.css js/screens.js index.html
git commit -m "feat: name entry on both end screens with inline validation"
```

---

### Task 7: The rotating wheel button

**Files:**
- Create: `js/wheel.js`
- Modify: `index.html` (replace the two title buttons with the wheel plus the reduced-motion fallback, script tag)
- Modify: `css/leaderboard.css` (wheel styles)
- Modify: `js/screens.js` (`enterTitle`, `show`)
- Modify: `js/main.js` (the wheel's click handler replaces `start-btn`'s)

**Interfaces:**
- Consumes: `INAV.config.LEADERBOARD.WHEEL_MS`, `INAV.game.startTutorial()`, `INAV.game.showBoard()`.
- Produces: `INAV.wheel.init()`, `INAV.wheel.start()`, `INAV.wheel.stop()`, `INAV.wheel.action()` → `"start"|"board"`.

- [ ] **Step 1: Replace the title buttons**

In `index.html`, replace the two lines added in Task 1 (`start-btn` and `board-btn`) with:

```html
        <button class="btn wheel" id="wheel-btn" type="button" aria-label="start">
          <span class="wheel-track" id="wheel-track" aria-hidden="true">
            <span>start</span>
            <span>leaderboard</span>
          </span>
        </button>
        <button class="btn small" id="board-btn" type="button">leaderboard</button>
```

`#board-btn` stays in the markup as the reduced-motion fallback and is hidden by default in the next step. Keep its listener from Task 1 — it is still wired.

- [ ] **Step 2: Style the wheel**

Append to `css/leaderboard.css`:

```css
.wheel {
  position: relative;
  overflow: hidden;
  min-width: 260px;
  height: 58px;
  padding: 0;
}
.wheel-track {
  display: flex;
  flex-direction: column;
  transition: transform 320ms cubic-bezier(0.34, 1.3, 0.64, 1);
}
.wheel-track > span {
  display: grid;
  place-items: center;
  height: 58px;
  line-height: 1;
}
.wheel-track.at-1 { transform: translateY(-58px); }

/* Reduced motion: the wheel stops being a wheel and the fallback button
   carries the second action. */
#board-btn { display: none; }
@media (prefers-reduced-motion: reduce) {
  .wheel-track { transition: none; }
  .wheel-track.at-1 { transform: none; }
  #board-btn { display: inline-flex; }
}
```

- [ ] **Step 3: Write the wheel**

Create `js/wheel.js`:

```js
(function () {
  const C = INAV.config;
  const LABELS = ["start", "leaderboard"];
  const ACTIONS = ["start", "board"];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let index = 0;
  let timer = null;
  let frozen = false;
  let btn = null;
  let track = null;

  function paint() {
    track.classList.toggle("at-1", index === 1);
    // The label is the button's accessible name, updated in place. The button
    // is deliberately NOT in a live region: a name that re-announced itself
    // every three seconds would be unusable with a screen reader.
    btn.setAttribute("aria-label", LABELS[index]);
  }

  function tick() {
    if (frozen) return;
    index = (index + 1) % LABELS.length;
    paint();
  }

  function freeze() {
    frozen = true;
  }

  function thaw() {
    frozen = false;
  }

  INAV.wheel = {
    init() {
      btn = document.getElementById("wheel-btn");
      track = document.getElementById("wheel-track");
      // Freezing on hover and focus is what stops the button changing action
      // under the player's cursor mid-reach.
      btn.addEventListener("pointerenter", freeze);
      btn.addEventListener("pointerleave", thaw);
      btn.addEventListener("focus", freeze);
      btn.addEventListener("blur", thaw);
      paint();
    },

    start() {
      if (reducedMotion.matches) {
        index = 0;
        paint();
        return;
      }
      this.stop();
      timer = setInterval(tick, C.LEADERBOARD.WHEEL_MS);
    },

    stop() {
      clearInterval(timer);
      timer = null;
    },

    action() {
      return reducedMotion.matches ? "start" : ACTIONS[index];
    },
  };
})();
```

- [ ] **Step 4: Wire it**

In `index.html`, after the `js/name-entry.js` tag:

```html
  <script src="js/wheel.js"></script>
```

In `js/main.js`, add `INAV.wheel.init();` next to the other `init` calls, and replace the `start-btn` listener (that id no longer exists) with:

```js
  $("wheel-btn").addEventListener("click", () => {
    if (INAV.wheel.action() === "board") {
      INAV.game.showBoard();
      return;
    }
    INAV.game.startTutorial();
  });
```

In `js/screens.js`, start the wheel on the title screen and stop it everywhere else. In `enterTitle`, replace the `$("start-btn").focus();` line with:

```js
    $("wheel-btn").focus();
    INAV.wheel.start();
```

and in `show()`, next to `stopGhosts()`:

```js
      if (INAV.wheel) INAV.wheel.stop();
```

- [ ] **Step 5: Verify the wheel, including the trap it exists to avoid**

1. On the title screen the button label alternates between `start` and `leaderboard` every three seconds with a vertical slide.
2. **The freeze:** move the mouse onto the button and leave it there for fifteen seconds. The label must not change once. Move away and it resumes.
3. **The real misclick test:** wait for `leaderboard` to appear, hover the button, wait five seconds, then click. You must land on the board — the label you clicked is the action you got. Repeat with `start`.
4. Tab to the button with the keyboard. It must stop rotating on focus. Press Enter and confirm you get the action the label showed.
5. Confirm the fallback button is hidden in normal motion: `getComputedStyle(document.getElementById('board-btn')).display` returns `"none"`.
6. **Reduced motion.** In Chrome DevTools open the Rendering panel and set "Emulate CSS prefers-reduced-motion" to `reduce`, then reload. The wheel must sit on `start` permanently, never move, and the separate `leaderboard` button must be visible and work. Set it back to "no preference" afterwards.
7. Leave the title screen for the board and back again several times, then run `INAV.game.snapshot()` — confirm the wheel is not stacking timers by checking the label still changes only once per three seconds.

- [ ] **Step 6: Commit**

```bash
git add js/wheel.js css/leaderboard.css js/screens.js js/main.js index.html
git commit -m "feat: rotating start/leaderboard wheel that freezes on hover and focus"
```

---

### Task 8: Integration pass and documentation

**Files:**
- Modify: `docs/superpowers/specs/2026-09-12-leaderboard-design.md` (phase 1 marked shipped, any decision that changed during build)
- Modify: `docs/superpowers/specs/2026-09-11-imnotavirus-design.md` (§ architecture file list, phase list, roadmap)
- Modify: whichever files the checklist below turns up bugs in

- [ ] **Step 1: Run the full manual checklist**

With `python3 tools/dev-server.py 8765` running, and using real input throughout:

1. Fresh browser (or `localStorage.clear()` then reload): title shows the wheel, board shows 30 seeded rows, no row is yours.
2. Full round to a crash → submit a name → board shows your row highlighted, pinned if below rank 25.
3. Full round to a win → submit from the wizard → your row carries the green `survived` badge.
4. Board reachable from title, crash and success; `Esc`, `✕` and `back` all return to the screen you came from.
5. `Esc` during play still pauses. `Esc` on the board closes the board and does **not** pause.
6. Taskbar start button does nothing while the board is open.
7. Tab order on each screen reaches every control, and the focus ring is visible on all of them.
8. Reload mid-board and confirm the game comes back to the title without errors.
9. Console is clean of errors and warnings on every screen.

- [ ] **Step 2: Confirm the double-click path still works**

Close the server. Open `index.html` by double-clicking it in Finder. The whole game **and** the board must work, because phase 1 makes no network calls. Submit a name and confirm it appears. This is the check that proves the seam is real: when phase 2 swaps in a `fetch`-based source, this same path is what has to degrade to the offline message.

- [ ] **Step 3: Update the architecture file list in the main spec**

In `docs/superpowers/specs/2026-09-11-imnotavirus-design.md`, add to the file-responsibility list near line 155:

```
  names.js              INAV.names: charset rule, leetspeak folding, blocklist. Pure, no DOM
  leaderboard-local.js  INAV.leaderboardSource: fake rows, simulated latency/offline/error
  leaderboard.js        INAV.leaderboard: client id, remembered name, ranking, submit
  board-ui.js           INAV.boardUI: renders the board window and its four states
  name-entry.js         INAV.nameEntry: the one name form, moved between end screens
  wheel.js              INAV.wheel: the rotating title button and its freeze behaviour
```

Add `board` to the phase list in the same file, and add a roadmap row:

```
| 7a | Leaderboard phase 1: wheel button, board window with podium, name entry, fake local source | `plans/2026-09-12-leaderboard-phase-1.md` |
```

- [ ] **Step 4: Mark phase 1 shipped in the leaderboard spec**

In `docs/superpowers/specs/2026-09-12-leaderboard-design.md`, add to §8 above the existing sketch:

```markdown
Phase 1 shipped on 2026-09-12: the whole UI runs against
`js/leaderboard-local.js`. Phase 2 replaces that one file with a `fetch`-based
source implementing the same four methods (`fetchTop`, `insert`, `rankOf`,
`state`) and changes nothing else in the game.
```

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs js
git commit -m "docs: record leaderboard phase 1 and its module layout"
```

- [ ] **Step 6: Merge to main**

```bash
git checkout main && git merge --no-ff leaderboard-phase-1 && git push origin main
```

---

## Notes for whoever executes this

**The three traps this project has already fallen into.** Every one of them produced a confidently wrong verification report:

1. **Stale caches.** Chrome served old CSS and then old JS across three separate verification passes. Use `tools/dev-server.py` (it sends `no-store`) and hard-reload.
2. **Tautological checks.** A check that asserts an element avoids a rectangle it was placed outside of by construction cannot fail. Assert against `getBoundingClientRect()`, not against the constants the code placed from.
3. **Synthetic events.** `el.click()` does not close a pop-up in this codebase — the handler listens on `pointerdown`. And `dispatchEvent` skips hit-testing entirely, which once hid a pop-up that no real mouse could click. Click with real input.

**One more, specific to this task.** The fake source has latency on purpose. If a state looks wrong only when the response is slow, that is a real bug and not a testing artifact — it is the bug phase 2 would otherwise ship.
