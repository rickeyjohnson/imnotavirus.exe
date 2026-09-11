# imnotavirus.exe: Design Spec

**Date:** 2026-09-11
**Author:** Rickey Johnson (design), Claude (spec)
**Source docs:** `imnotavirus.exe GDD.pdf`, hand-drawn screen sketches (Title, Tutorial, Gameplay, Game Over, Success, flow diagram)
**Reference prototype:** mini demo artifact at https://claude.ai/code/artifact/0173fa1d-e24d-4ca9-a236-80cc380a0066. This is a throwaway sketch of the feel; the real codebase is built fresh per this spec.

---

## 1. Premise

You are a Windows XP-era computer desktop. Pop-ups keep spawning, and they spread ("bloom") across the screen. Your antivirus takes **60 seconds** to install. Close pop-ups fast enough to survive until it finishes. If too many pile up, the computer crashes.

**Mood:** fast, fun, simple.

## 2. Hard constraints

- **Only HTML, CSS and vanilla JavaScript.** No libraries, frameworks, build tools or package managers.
- **Opens by double-clicking `index.html`.** No server required. This means classic `<script>` tags, not ES modules, because modules fail over `file://`.
- **Manual testing only.** No unit tests. Every iteration ends with a manual test checklist (see §9).
- **Fonts:** a system font stack until iteration 3. From iteration 3 the game ships Fredoka and Rubik itself: the `.woff2` files live in `assets/fonts/` and are embedded as base64 in `css/fonts.css`, because Chrome refuses font file requests over `file://`. Fonts are assets, not libraries, and every stack keeps a system fallback.

## 3. Decisions log

| Topic | Decision | Notes |
|---|---|---|
| Platform | Browser, plain HTML/CSS/JS | Pop-ups are DOM elements |
| Win screen | **Keep a Success screen** | Overrides the GDD "Cut" list; kept as a plain results dialog so replay stays the focus |
| Lose rule | **Pop-up count cap**: crash the instant `open >= CAP` | `CAP = 12` to start; tunable |
| Close input | **Click anywhere on a pop-up** | Matches the GDD cut of precision clicking; uses `pointerdown` for speed |
| Tutorial | **One practice pop-up + instruction bar** | Closing it starts the round. Shown on every Start from Title (confirmed in iter 2 Q1) |
| Retry (iter 2 Q2) | "try again" / "play again" go **back to the Title** | Every round then runs Title → Tutorial → Gameplay. There's no separate "Back to desktop" link; the retry button is it |
| Pop-up variety | **One type in V1**; variety in iteration 5 | Warning / error / downloading types come later |
| Window resizing | Fixed 1280×720 stage, scaled to fit, letterboxed | Resolves GDD fragile items #1 and #3 |
| Code authorship (iter 1 Q1) | Claude writes the code with **minimal comments** | The mechanics guide (§9) does the explaining |
| Starting difficulty (iter 1 Q2) | Keep `CAP = 12` and the 1100 → 360 ms ramp | Real tuning happens in iteration 4 |
| Round start (iter 1 Q3) | Temporary "click to start" button plus a plain-text end state with "restart" | Replaced by real screens in iteration 2 |
| Pop-up copy (iter 1 Q4) | Demo placeholder joke copy, kept in `config.js` | Rickey can replace it any time |
| Demo as guide (iter 2) | Screens copy the **mini demo's layout and text** (`docs/reference/mini-demo.html`) with **basic styling** | Palette, system font, simple bordered panels. The demo's full look (fonts, SVG icons, button style, animations) comes in iteration 3 |
| Pause (iter 2 extras) | **Esc** or clicking the taskbar **start** button pauses and resumes during Gameplay | The timer and spawns freeze, pop-ups can't be clicked, and a "Paused" dialog with a resume button appears |
| Title score (iter 2 Q3) | `Score:` shows the **last round, win or lose** | Default kept |
| Reset best (iter 2 Q5) | **Not included** | — |
| Art source (iter 3 Q1) | **Claude draws every asset** in CSS and inline SVG | No image files; SVG uses the palette tokens so `--line` and `--radius` restyle everything at once |
| Fonts (iter 3 Q2) | **Fredoka** (display) + **Rubik** (body), SIL OFL 1.1 | Shipped in `assets/fonts/` and embedded base64 in `css/fonts.css` so they load from `file://` |
| Desktop icons (iter 3 Q3) | Recycle Bin and **antivirus.exe**, plus the fake Windows flag on the taskbar start button | The flag is four palette-colored squares, not Microsoft's mark |
| Crash screen (iter 3 Q4) | Accent blue `#0078FD` | |
| Title ghosts (iter 3 Q5) | **Pop in and out at random intervals** behind the title | Static under `prefers-reduced-motion` |

## 4. Screens and flow

```
Title ──start──▶ Tutorial ──close practice pop-up──▶ Gameplay ◀── Esc / start button ──▶ Paused
  ▲                                                  │      │
  │                                     open >= CAP  │      │  t >= 60s
  │                                                  ▼      ▼
  │                                             Game Over   Success
  │                                                  │          │
  └─────────────── "try again" / "play again" ───────┴──────────┘
```

| Screen | Contents (from sketches) |
|---|---|
| **Title** | Desktop, faded "ghost" pop-ups in the background, `imnotavirus.exe` title, **start** button, `Score:` (last round) and `Best:`, taskbar |
| **Tutorial** | Desktop + recycle bin, one practice pop-up in the center, instruction bar above the taskbar, antivirus progress bar at 0% |
| **Gameplay** | Desktop + recycle bin, spawning pop-ups, taskbar showing closed count, open count `n/12`, antivirus progress bar and seconds remaining |
| **Paused** | Gameplay stays visible behind a dimmed overlay with a "Paused" dialog and a **resume** button |
| **Game Over** | Full-screen crash parody: `:(`, "Your PC ran into a problem…", an "X% complete" counter, round stats, a "New best" badge when earned, **try again** (goes to Title) |
| **Success** | Desktop + recycle bin, a results dialog ("Installation complete"), Score, Best, "New best" badge when earned, **play again** (goes to Title), progress bar full |

Screen states (in code, owned by `game.phase`): `title`, `tutorial`, `play`, `paused`, `crashing` (a ~400 ms beat with the pop-ups still visible before Game Over; the shake arrives in iteration 4), `crash`, `success`.

## 5. Gameplay rules

### 5.1 Stage and safe area
- The logical stage is **1280×720**. The taskbar takes the bottom **56 px**, so the playable area is 1280×664.
- Every position is in stage units. The stage is CSS-scaled by `min(innerWidth/1280, innerHeight/720)` and centered, with letterbox bars in `#273548`.
- Pop-ups spawn only inside the **safe area**: 130 px from the left (clear of the desktop icon column) and 16 px from the other edges, above the taskbar. A pop-up can never be off-screen, clipped or partly hidden behind the taskbar.

### 5.2 Spawning
- The first pop-up spawns at **0.6 s** ("within the first second").
- The spawn interval eases down over the round:
  `interval(t) = START − (START − END) · (t/60)^CURVE`
- **Bloom placement:** with probability `BLOOM_CHANCE`, a new pop-up spawns offset (±150 px x, ±110 px y) from a random open pop-up, clamped to the safe area. Otherwise it spawns at a random spot in the safe area. The result is visible spreading clusters, which puts the GDD's "bloom" reading into the mechanics.
- Each new pop-up gets the next z-index, so newest is on top.
- The loop uses `requestAnimationFrame` with `dt` clamped to 100 ms, so a background tab can't dump a burst of pop-ups.

### 5.3 Closing and scoring
- `pointerdown` anywhere on a pop-up closes it. It plays a close animation of about 100 ms and stops accepting input immediately.
- **Score = pop-ups closed this round.** The practice pop-up doesn't count.

### 5.4 End conditions
- **Crash:** checked immediately after each spawn. If `open >= CAP`, the game goes `crashing` (shake) and then Game Over.
- **Success:** `t >= 60 s` while playing.
- Crash is checked before success within the same frame.

### 5.5 Persistence (localStorage, wrapped in try/catch)
| Key | Value |
|---|---|
| `inav.last` | Score of the most recent finished round (win or lose) |
| `inav.best` | Highest score ever |

If storage is unavailable, the game still plays with the values held in memory.

### 5.6 Starting tuning values (all in `js/config.js`)
| Knob | Start value | GDD goal it serves |
|---|---|---|
| `CAP` | 12 | "Filling the screen" |
| `ROUND_SECONDS` | 60 | Antivirus install time |
| `FIRST_SPAWN_MS` | 600 | Pop-up within the first second |
| `INTERVAL_START_MS` | 1100 | Calm opening while the player learns |
| `INTERVAL_END_MS` | 360 | Peak density at 0:55 |
| `INTERVAL_CURVE` | 1.15 | Ramp shape |
| `BLOOM_CHANCE` | 0.45 | Visible spreading |
| `BLOOM_OFFSET` | ±150 px x, ±110 px y | Cluster tightness |
| `SAFE` | left 130, top/right/bottom 16 px | Always clickable and visible |
| `WARN_AT` / `CRIT_AT` | 7 / 10 open | Danger feedback (iteration 4) |
| `POPUP_W` / `POPUP_H` | 240–300 / 140–160 px | Large enough to click, small enough to take up little screen |

Target feel from the GDD: by 0:30 pop-ups arrive noticeably faster; at 0:55 a skilled player is holding steady and a losing player sits 1–2 spawns from the cap. Tuning happens mainly in iteration 4.

## 6. Art direction (from the GDD)

**Palette:** five values and one accent. These are the only colors allowed.
| Token | Hex | Use |
|---|---|---|
| `--desk` | `#00CAFF` | Desktop background |
| `--paper` | `#FFFFFF` | Pop-up body |
| `--warn` | `#FAF900` | Warning pop-ups, highlights, warning state |
| `--err` | `#FF0057` | Error pop-ups, X button, critical state |
| `--ink` | `#273548` | Outlines, text, "downloading" pop-ups, letterbox |
| `--blue` (accent) | `#0078FD` | Title bars, taskbar, crash screen |

**Anchor asset: the pop-up window.** Every other asset is matched to it:
- 3 px `--ink` border, 12 px corner radius
- 38 px `--blue` title bar with a 3 px `--ink` bottom border and bold rounded title text
- 26 px `--err` X button, 7 px radius, 2 px ink border
- White body, 15 px medium text, a yellow circular "!" icon, two fake buttons in the footer

**Rules:** flat vector with hard edges and bold outlines. No gradients, textures, realistic shadows, glass, pixel art, serif fonts or thin fonts. The only "shadow" allowed is a hard flat offset block on buttons. The progress bar may use hard-stop diagonal stripes, matching the hatched bar in the sketches. Lighting is flat and even. Honor `prefers-reduced-motion`.

## 7. Architecture

Classic scripts share one global namespace, `window.INAV`. Each file owns one job and loads in dependency order from `index.html`.

```
index.html              markup for the stage, screens, taskbar; loads CSS + JS in order
css/
  base.css              palette tokens, reset, #stage scaling, letterbox
  window.css            the anchor pop-up (.win, .popup, animations)
  desktop.css           desktop icons, taskbar, progress bar, chips
  screens.css           title, tutorial, success dialog, crash screen, buttons
js/
  config.js             INAV.config: every tuning knob + pop-up copy text
  storage.js            INAV.storage: safe localStorage get/set
  stage.js              INAV.stage: fit-to-window scaling, safe-area math
  popups.js             INAV.popups: create, spawn (with bloom placement), close, clear, count
  hud.js                INAV.hud: renders taskbar (closed, open n/CAP, progress, seconds, clock)
  screens.js            INAV.screens: show(phase, snapshot) maps a phase to its [data-screen] section; per-screen enter logic (title stats, results, lockouts)
  game.js               INAV.game: round state, rAF loop, spawn timer, crash/win detection
  debug.js              INAV.debug: overlay toggled with the D key (t, interval, open, score, screen)
  main.js               wires buttons/events, boots to Title
assets/
  icons/  fonts/  sounds/   (filled in as assets arrive)
```

**How the pieces talk:**
- `game` owns round state (`t`, `score`, `nextSpawnIn`). The open count isn't stored anywhere; it comes from `popups.count()`, which excludes pop-ups that are mid-close. `game` calls `popups.spawn()`.
- `popups` reports closes through a callback, `onClose(el)`, that `game` registers. A practice pop-up is recognized by `el.dataset.practice`. `popups` never touches screens or the HUD directly.
- `screens.show()` is the only place screen visibility changes. `hud.render(state)` is the only place the taskbar changes.
- `config` holds no logic. Tuning never requires touching other files.

## 8. Error and edge handling

| Case | Handling |
|---|---|
| Window resized mid-round | Only the CSS scale changes. Positions are in stage units, so nothing moves or goes off-screen |
| Tab hidden mid-round | rAF pauses and `dt` is clamped, so the round effectively pauses with no burst on return |
| Double-click / fast clicks on one pop-up | The `.closing` class blocks a second close; the count can't go negative |
| Clicking a pop-up during `crashing` | Ignored (score/open only change in `play`) |
| localStorage blocked | try/catch; fall back to in-memory values |
| Crash and success in the same frame | Crash wins (checked first) |

## 9. Iteration roadmap

Each iteration is a playable checkpoint, and every one runs the same cycle:

1. **Questions.** Rickey answers the iteration's clarifying questions. The answers are recorded in the §3 decisions log.
2. **Plan.** An implementation plan is written for that iteration only.
3. **Build.** Claude implements it, with the mechanics guide below as the reference for how each mechanic works.
4. **Manual test.** Rickey plays it against the checklist. Every check uses real mouse clicks and key presses. Scripted `dispatchEvent` calls skip the browser's hit-testing, and in iteration 2 they hid a bug where the practice pop-up couldn't be clicked.
5. **Feedback.** Rickey sends feedback, assets and rule changes, and the spec is updated before the next iteration.

Each mechanic guide uses the same five parts: **What:** what the player experiences. **How:** how the code does it. **Knobs:** what to change in `config.js`. **Test:** how to check it by hand. **Broken:** what failure looks like.

---

### Iteration 1: Grey-box core loop

**Goal:** the core loop is playable with plain boxes and no art. The round runs, spawns ramp up, clicks close pop-ups, and the game ends by crash or by success. End states can be plain text. The debug overlay is on the D key.

**Questions for Rickey**
1. **Who writes the code?** Should Claude write everything, or write it with teaching comments so you can explain and defend it in class?
2. **Starting difficulty:** is `CAP = 12` and an interval ramping 1100 → 360 ms okay for a first feel, or do you want easier or harder?
3. **Starting a round:** with no screens yet, should a round start on page load, or behind a temporary "click to start"?
4. **Pop-up text:** use the placeholder joke copy from the demo, or will you send your own lines?

**Mechanics guide**

**Stage scaling**
- **What:** the desktop always fills the window at a fixed shape, with bars on the sides if needed.
- **How:** everything lives in a 1280×720 `#stage`. On load and on `resize`, `stage.js` sets `scale = min(innerWidth/1280, innerHeight/720)` as a CSS transform. Nothing inside the stage ever reads the real window size.
- **Knobs:** none. The stage size is fixed on purpose.
- **Test:** resize the window mid-round. Everything should shrink or grow together and stay in view.
- **Broken:** pop-ups shift relative to each other, or a scrollbar appears.

**Safe-area placement**
- **What:** pop-ups always appear somewhere you can see and click.
- **How:** a spawn picks `x` in `[SAFE.left, 1280 − w − SAFE.right]` and `y` in `[SAFE.top, 664 − h − SAFE.bottom]`. Every position, bloom ones included, is clamped into that box.
- **Knobs:** `SAFE` margins, `POPUP_W` and `POPUP_H` ranges.
- **Test:** turn on debug and watch a full round. Nothing should touch the taskbar, the icon column or an edge.
- **Broken:** a pop-up is cut off, sits under the taskbar, or covers the recycle bin.

**Spawn timer and ramp**
- **What:** pop-ups arrive slowly at first and faster over time.
- **How:** each frame adds `dt` to an accumulator. When the accumulator passes `nextSpawnIn`, one pop-up spawns and `nextSpawnIn = interval(t)`. A `while` loop catches up if a frame was slow.
- **Knobs:** `FIRST_SPAWN_MS`, `INTERVAL_START_MS`, `INTERVAL_END_MS`, `INTERVAL_CURVE`. A curve above 1 keeps it calm longer; below 1 ramps up early.
- **Test:** the debug interval should read about 1100 ms at 0:00, about 770 ms at 0:30 and about 430 ms at 0:55.
- **Broken:** a burst of pop-ups after switching tabs, meaning `dt` isn't clamped, or a flat rate.

**Bloom placement**
- **What:** pop-ups spread in clusters instead of scattering evenly. This is the game's "Bloom" theme made visible.
- **How:** with probability `BLOOM_CHANCE`, the new pop-up's position is a random open pop-up's position plus a random offset, then clamped to the safe area.
- **Knobs:** `BLOOM_CHANCE` from 0 (pure random) to 1 (always clusters), and `BLOOM_OFFSET`.
- **Test:** set `BLOOM_CHANCE` to 1 and then 0 and compare the rounds. Clusters should be obvious at 1.
- **Broken:** pop-ups stack exactly on top of each other (offset too small), or clusters pile up in the corners because clamping is bunching them.

**Close and score**
- **What:** click anywhere on a pop-up and it vanishes. Score goes up.
- **How:** one `pointerdown` listener on the pop-up layer finds the clicked pop-up with `closest('.popup')`. It marks it `.closing` (which blocks double counting), removes it after the animation, and calls `onClose`, so `game` can decrement `open` and increment `score`.
- **Knobs:** close animation length (in CSS).
- **Test:** click fast and repeatedly on one pop-up that nothing overlaps. Score should go up by exactly 1. Where pop-ups overlap, each click closes the topmost pop-up that's still open, so rapid clicks clear a cluster one pop-up per click. That's by design.
- **Broken:** one non-overlapping pop-up scores 2, the open count goes negative, or a right-click closes a pop-up.

**Crash cap**
- **What:** if too many pop-ups are open at once, the PC crashes.
- **How:** right after each spawn, check `open >= CAP`. If true, the screen state becomes `crashing`, input is ignored, and Game Over follows.
- **Knobs:** `CAP`.
- **Test:** don't click anything. The game should crash on the 12th spawn, at about 12 s.
- **Broken:** a crash at 11 or 13, or the game keeps spawning after the crash.

**Antivirus timer and success**
- **What:** the antivirus installs over 60 s. Surviving that long wins.
- **How:** `t` accumulates only while in `play`. `t >= ROUND_SECONDS` triggers success, and crash is checked first in the same frame.
- **Knobs:** `ROUND_SECONDS`. Set it to 10 to test success quickly.
- **Test:** with `ROUND_SECONDS = 10`, a round should end in success at 10 s.
- **Broken:** the timer keeps running on the end screen, or runs while the tab is hidden.

**Manual test checklist**
- [ ] Open `index.html` by double-clicking it. No console errors.
- [ ] The first pop-up appears within 1 s.
- [ ] The debug interval drops from about 1100 ms toward 360 ms over the round.
- [ ] No pop-up appears off-screen, under the taskbar or over the icon column.
- [ ] A click anywhere on a pop-up closes it: score +1, open −1. Rapid clicks never double count.
- [ ] Not clicking crashes exactly when 12 are open.
- [ ] Surviving to 60 s triggers success.
- [ ] Resizing mid-round keeps everything in place and in view.

---

### Iteration 2: Screen flow

**Goal:** the full loop from the sketches. Title → Tutorial → Gameplay → Game Over / Success → back, with persistent last and best scores.

**Carried over from the iteration 1 code review** (the iteration 2 plan must cover these):
- **One state list:** `game.phase` uses the §4 states (`title, tutorial, play, paused, crashing, crash, success`). `game` owns the timed `crashing` → `crash` transition. `screens` only maps a phase to its visible screen.
- **Results rendering:** per-screen text (Title stats, Game Over/Success results, the "New best" badge) moves into `screens` enter logic, so `main.js` only wires events.
- **Spawn options:** `popups.spawn(opts)` accepts at least a fixed position and a practice flag, for the centered practice pop-up.
- **Clean screens:** pop-ups are cleared when leaving gameplay (Success and Title show a clean desktop), and the HUD shows zeroed values on Title.
- **Copy from config:** screen text that mentions numbers (60 seconds, 12 open) reads them from `INAV.config`.

**Questions for Rickey** (answered 2026-09-11, see §3)
1. **Tutorial frequency:** show the tutorial on every Start, as decided, or only the first time you ever play? **Every Start.**
2. **Retry route:** keep "try again" and "play again" skipping the tutorial and going straight to Gameplay? **No, they go back to the Title.**
3. **Title score line:** should `Score:` show the last round (win or lose) or only the last win? **Last round.**
4. **Pause:** add a pause on Esc, or no pausing to keep it tense? **Yes: Esc, and also the taskbar start button.**
5. **Reset best:** add a hidden way to reset best, e.g. for class demos? **No.**
6. **Demo as guide:** how closely should the screens follow the mini demo? **Demo layout and text, basic styling.**

**Mechanics guide**

**Screen state machine**
- **What:** exactly one screen is active at a time.
- **How:** `game` owns `phase` and calls `screens.show(phase, snapshot)` on every change. `show` maps the phase to a `[data-screen]` section (for example, `crashing` shows the play screen), sets `hidden` on all the others, and runs that screen's enter logic, such as filling in scores. Screen sections let clicks through (`pointer-events: none`) except on their buttons and dialogs and on the full-cover pause and crash screens, so pop-ups under a screen stay clickable.
- **Knobs:** none.
- **Test:** walk every arrow in §4. No two screens should ever show together.
- **Broken:** the Title shows through behind Gameplay, or pop-ups carry over onto the Title.

**Tutorial / practice pop-up**
- **What:** one safe pop-up teaches you to close pop-ups, and closing it starts the round.
- **How:** the practice pop-up is spawned with `data-practice`. Its close calls `startRound()` and is not counted toward score.
- **Knobs:** instruction text and practice pop-up copy in `config.js`.
- **Test:** close the practice pop-up. Score should stay 0 and the first real pop-up should arrive within 1 s.
- **Broken:** score starts at 1, or the round starts before the practice pop-up is closed.

**Persistence (last and best)**
- **What:** Title remembers your last score and your best score, even after a reload.
- **How:** at the end of each round, save `inav.last`, and update `inav.best` if the score beat it. Every storage call is wrapped in try/catch.
- **Knobs:** none.
- **Test:** play, reload the page, and check the Title. Try once in a private window too.
- **Broken:** scores reset on reload, or the game fails to load when storage is blocked.

**Crashing beat**
- **What:** the moment the 12th pop-up lands, everything freezes briefly before the crash screen, so you can see what beat you.
- **How:** `game` sets phase `crashing`, disables pop-up input and records the score. After `CRASH_DELAY_MS` it clears the pop-ups and sets phase `crash`. The crash screen's "try again" stays disabled for `END_LOCKOUT_MS`.
- **Knobs:** `CRASH_DELAY_MS`, `END_LOCKOUT_MS`, `CRASH_PCT_TICK_MS` (speed of the "X% complete" counter).
- **Test:** let it crash while spam-clicking the middle of the screen. The crash screen must not be skipped.
- **Broken:** the crash screen flashes and immediately returns to Title, or the pop-ups vanish before the pause.

**Pause**
- **What:** Esc or the taskbar **start** button freezes the round, and pressing either again (or **resume**) continues it.
- **How:** `game.togglePause()` switches `play` ↔ `paused` and does nothing in any other phase. Only `play` advances `t` and spawns. `lastFrame` keeps updating while paused, so resuming never releases a burst. Pop-up input is disabled while paused.
- **Knobs:** none.
- **Test:** pause at about 0:20 for 10 s, then resume. The timer continues from the same second and no burst of pop-ups arrives. Clicking pop-ups while paused does nothing. Esc on the Title does nothing.
- **Broken:** time keeps running while paused, pop-ups spawn while paused, or pausing works on Game Over / Title.

**Manual test checklist**
- [ ] Every arrow in the §4 flow works: Title → Tutorial → Gameplay → Game Over / Success → Title.
- [ ] The practice pop-up doesn't count; closing it starts the round.
- [ ] Last and best show on Title and survive a reload. "New best" appears only when the best is beaten.
- [ ] "try again" and "play again" go to the Title.
- [ ] No leftover pop-ups on the Title, Game Over or Success screens. The HUD reads zero on the Title.
- [ ] Spam-clicking through a crash never skips the crash screen.
- [ ] Esc and the start button both pause and resume; nothing moves while paused.
- [ ] Screen text that mentions 60 seconds or 12 pop-ups follows `config.js` (change `CAP` to 8 and reload to check).

---

### Iteration 3: Art pass

**Goal:** the XP-parody look from the GDD. The anchor pop-up, desktop icons, taskbar, progress bar, clock, Title ghosts, crash screen and success dialog.

**Questions for Rickey** (answered 2026-09-11, see §3)
1. **Assets:** will you supply art, or should Claude draw everything in CSS and inline SVG? **Claude draws it all.**
2. **Font:** which typefaces? **Fredoka and Rubik, shipped locally and embedded as base64.**
3. **Desktop apps:** is the second icon "antivirus.exe"? **Yes, plus the fake Windows flag on the taskbar start button.**
4. **Crash screen:** blue or dark gray? **Palette blue `#0078FD`.**
5. **Title ghosts:** static, or moving? **They pop in and out at random times.**

**Mechanics guide**

**Anchor asset rules**
- **What:** every visual matches the pop-up window.
- **How:** CSS custom properties hold border weight (`--line`), radius (`--radius`) and the palette. All components use those tokens and never raw values.
- **Knobs:** changing `--line` or `--radius` re-styles the whole game at once.
- **Test:** change `--radius` to 0 and every rounded element should follow.
- **Broken:** any hard-coded color outside the palette, or mismatched border weights.

**Antivirus progress bar**
- **What:** the taskbar bar fills over 60 s, showing the timer in a way the player reads at a glance.
- **How:** `hud.render` sets the fill width to `t / ROUND_SECONDS × 100%` and the label to the seconds remaining.
- **Knobs:** none beyond `ROUND_SECONDS`.
- **Test:** the bar should be about half full at 0:30 and full on Success.
- **Broken:** the bar is jumpy, overflows, or keeps filling on Game Over.

**Title ghosts**
- **What:** faded pop-ups appear and vanish behind the title, previewing the bloom before you press start.
- **How:** `screens` runs a timer while the Title is showing, toggling one random ghost every `GHOST_TOGGLE_MS`. `show()` stops the timer on leaving the Title.
- **Knobs:** `GHOST_TOGGLE_MS` (min/max).
- **Test:** watch the Title for 10 s; ghosts come and go, and none of them is clickable. Under `prefers-reduced-motion` they all sit still and visible.
- **Broken:** ghosts flicker rapidly, block the start button, or keep running after you leave the Title.

**Manual test checklist**
- [ ] Both fonts render when `index.html` is opened by double-click (not just through the preview server).
- [ ] Pop-ups match the GDD anchor: blue title bar, red X, yellow "!" icon, two fake buttons, `--line` border, `--radius` corners.
- [ ] Setting `--radius: 0` in `css/base.css` squares off every rounded element at once.
- [ ] The desktop shows the Recycle Bin and antivirus.exe icons; the taskbar start button shows the four-square flag.
- [ ] The antivirus bar is striped and about half full at 0:30, and full on Success.
- [ ] The taskbar clock shows the real time.
- [ ] The crash screen is palette blue with a big `:(`.
- [ ] Ghost pop-ups come and go on the Title and never block the start button.
- [ ] The start button reads "resume" while paused.
- [ ] No color outside the six palette tokens appears anywhere (the pause dim is ink with alpha).

---

### Iteration 4: Tuning and feel

**Goal:** the round matches the GDD's 0:00 / 0:30 / 0:55 beats and feels fast and fun.

**Questions for Rickey**
1. **Difficulty target:** roughly what share of first-time players should survive 60 s? Something like 1 in 5, half, or most?
2. **Ramp shape:** a smooth ramp, or distinct "waves" that jump in intensity at 0:30 and 0:55?
3. **Danger feedback:** which ones? Options are counter color (yellow at 7, red at 10), screen shake, a red screen tint, or a warning sound.
4. **Sound:** do you have sound effects (pop-up, close, crash, win, start-up)? They must be original or licensed, not real Windows sounds. Is a mute toggle needed?
5. **Juice:** pop-in and close animations, a score bump, a combo for fast closes? Pick any, or none.

**Mechanics guide**

**Difficulty tuning loop**
- **What:** adjust the numbers until the round feels right.
- **How:** play three rounds with debug on, then write down when you crashed and the open count at 0:30 and 0:55. Change one knob at a time.
- **Knobs:** `INTERVAL_END_MS` (peak pressure), `INTERVAL_CURVE` (when the pressure arrives), `CAP` (how forgiving it is), `BLOOM_CHANCE` (how readable it is).
- **Test:** a skilled player hovers around 4–8 open at 0:55; a new player crashes between 0:35 and 0:55.
- **Broken:** everyone crashes before 0:30 (too hard), or nobody gets above 5 open (too easy).

**Danger feedback**
- **What:** the game warns you before the crash so a loss feels fair.
- **How:** `hud.render` sets classes from `open / CAP` thresholds, and the CSS reacts to them.
- **Knobs:** `WARN_AT`, `CRIT_AT`.
- **Test:** the warning should fire early enough that you can react.
- **Broken:** a crash comes with no warning, or the warning is on constantly and gets ignored.

**Manual test checklist:** written at the start of the iteration.

---

### Iteration 5: Variety

**Goal:** warning (yellow), error (red) and downloading (dark gray) pop-up types.

**Questions for Rickey**
1. **Look or behavior:** should types differ only in look, or also in behavior? Candidates:
   - **Downloading:** spawns a child pop-up every few seconds if left open. This is "bloom" in its purest form.
   - **Error:** takes two clicks.
   - **Warning:** a normal pop-up.
2. **Cap and score:** do all types count the same toward the cap and the score?
3. **Unlocking:** when does each type start appearing? Everything from 0:00, or a new type at 0:20 and another at 0:40?
4. **Recycle bin:** should the recycle bin do anything, such as dragging a virus into it, or stay decoration?

**Mechanics guide:** written at the start of the iteration from the answers, e.g. type weights, the child-spawn timer and multi-click health.

---

### Iteration 6: Polish and ship

**Goal:** final assets, the §8 edge cases checked by hand, and a shareable build.

**Questions for Rickey**
1. **Submission:** how does it get submitted or shared? A zip of the folder, GitHub Pages, itch.io, or something else?
2. **Course rubric:** does the rubric require anything specific, such as a credits screen, a controls screen or documentation?
3. **Final assets:** which final assets and credits need adding?
4. **GDD update:** which parts of the GDD should be updated to match what shipped (the Success screen, the cut list, the lose rule)?

**Manual test checklist:** every row in §8, a full playthrough of every screen, and a fresh-browser test with no saved scores.

## 10. Out of scope

- Precision clicking (GDD cut)
- Leaderboards, accounts, online anything
- Mobile/touch-first layout (pointer events keep touch working, but it isn't tuned for it)
- Libraries, frameworks, build tooling
