# imnotavirus.exe: Design Spec

**Date:** 2026-09-11
**Author:** Rickey Johnson (design), Claude (spec)
**Source docs:** `imnotavirus.exe GDD.pdf`, hand-drawn screen sketches (Title, Tutorial, Gameplay, Game Over, Success, flow diagram)
**Reference prototype:** mini demo artifact at https://claude.ai/code/artifact/0173fa1d-e24d-4ca9-a236-80cc380a0066. This is a throwaway sketch of the feel; the real codebase is built fresh per this spec.

---

## 1. Premise

You are a Windows XP-era computer desktop. Pop-ups keep spawning, filling the screen ("bloom") until nothing else is visible. Your antivirus takes **60 seconds** to install. Close pop-ups fast enough to survive until it finishes. If too many pile up, the computer crashes.

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
| Win screen | **Keep a Success screen** | Overrides the GDD "Cut" list. Was a plain results dialog; superseded by the full-screen green `:)` in iteration 3b |
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
| Win screen (iter 3b) | **Full-screen green `:)`** replacing the success dialog | Mirrors the crash screen, so winning and losing are two sides of the same coin |
| Green (iter 3b, deepened iter 4) | **`#007A33` added as a sixth value**, a deliberate GDD amendment | Win screen only, and any later "safe" state. Carries white text at 5.5:1 |
| Pause panel (iter 3b) | **Start-menu parody** rising from the taskbar start button, with live round info | Replaces the centered pause dialog |
| Playtest (iter 4) | Two testers: goal understood instantly, no confusion, both survived; **"too easy for the whole first half"**, best moment was the late rush, and both wanted **more pop-up types** | Drives every iteration 4 decision below |
| Difficulty (iter 4) | Peak pressure by **0:30**, not 0:55, plus **random bursts** (a few pop-ups arriving together) | Bursts also make scores differ run to run, which the old fixed curve could not |
| Cap (iter 4) | **24 open pop-ups**, with pop-ups sized so the cap covers **85-95%** of the desktop | The old cap of 12 covered ~63%, so losing looked less overrun than the menu |
| Spawn placement (iter 4) | Pop-ups take the **least-occupied cell of a 6×4 grid** with a few pixels of jitter; Title ghosts use furthest-from-the-last placement | Replaces bloom-adjacency clustering. Grid placement is what makes a capped screen read as 90% full; bloom now means the screen filling, not clumps growing |
| Tutorial (iter 4) | **Once per page session** (a refresh shows it again; retries in the same session skip it) | Testers never needed it twice; retrying through it was friction |
| Pop-up types (iter 4) | **Warning (yellow), error (red danger), downloading (dark terminal)** plus the plain one | Visual variety now; different behavior stays in iteration 5 |
| Taskbar (iter 4) | Install **percentage** instead of a seconds countdown; closed/open counts move into the pause panel; the start button reads **pause** | |
| Pause panel (iter 4) | No resume button (the taskbar button resumes); stat rows use an accent of the panel colour | |
| Title ghosts (iter 3b, revised) | **14 ghosts anywhere on screen**, built by JS, popping faster | No reserved band: the title block paints over the ghosts, so it stays readable. Ghosts are sized like real pop-ups so their content never clips, and placement rejects piling on an already-placed ghost |

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
| **Gameplay** | Desktop + icons, spawning pop-ups, taskbar showing the antivirus label, striped progress bar, install percentage and clock |
| **Paused** | Gameplay stays visible behind a dimmed overlay. A start-menu-style panel rises from the taskbar start button with a "Paused" header and live rows (pop-ups closed, pop-ups open, antivirus installed %). The taskbar button, Esc, resume |
| **Game Over** | Full-screen crash parody: `:(`, "Your PC ran into a problem…", an "X% complete" counter, round stats, a "New best" badge when earned, **try again** (goes to Title) |
| **Success** | Full-screen green parody: `:)`, "Antivirus installed. Your PC survived.", score and best, a "New best" badge when earned, **play again** (goes to Title) |

Screen states (in code, owned by `game.phase`): `title`, `tutorial`, `play`, `paused`, `crashing` (a ~400 ms beat with the pop-ups still visible before Game Over; the shake arrives in iteration 4), `crash`, `success`.

## 5. Gameplay rules

### 5.1 Stage and safe area
- The logical stage is **1280×720**; the taskbar takes the bottom **56 px**, leaving 1280×664 of desktop.
- Every position is in stage units. The stage is CSS-scaled by `min(innerWidth/1280, innerHeight/720)` and centred, with letterbox bars in `--ink`.
- Pop-ups keep a **16 px margin** on all sides and never overlap the taskbar. They may cover the desktop icons, which are decorative — a screen being overrun is the point.

### 5.2 Spawning
- The first pop-up lands at **0.6 s**.
- The steady interval eases down across the round: `interval(t) = START − (START − END) · (t/60)^CURVE`, tuned so pressure peaks around **0:30** rather than the final seconds.
- **Bursts:** every few seconds a clump of pop-ups arrives at once, growing over the round. Bursts are what make two rounds differ, so scores vary.
- **Grid placement:** the desktop is divided into a coarse grid; each pop-up takes the least-occupied cell with a few pixels of jitter. Spread placement is what lets a capped screen actually look full (measured 90% covered at the cap).
- The loop uses `requestAnimationFrame` with `dt` clamped, so a hidden tab can't dump a burst on return.

### 5.3 Closing and scoring
- `pointerdown` anywhere on a pop-up closes it, left button only. It fades out and stops accepting input immediately.
- **Score = pop-ups closed this round.** The practice pop-up doesn't count.

### 5.4 End conditions
- **Success:** checked first each frame. Once `t >= ROUND_SECONDS` the round is won, even if a burst would have crossed the cap on that same frame — losing after the bar reads 100% feels cheated.
- **Crash:** checked immediately after each spawn, including each pop-up within a burst. `open >= CAP` ends the round.

### 5.5 Persistence (localStorage, wrapped in try/catch)
`inav.last` holds the most recent finished round's score, `inav.best` the highest ever. `game` is the only module that touches storage; values are held in memory too, so a browser that refuses storage still plays correctly.

### 5.6 Tuning
Every knob lives in `js/config.js` — round length, cap, the interval curve, burst gaps and sizes, pop-up sizes, the spawn grid, ghost behaviour and every delay. Read that file for current values rather than duplicating them here. Balance target, measured with a simulated player: ~2 clicks/second dies around 0:45, ~2.5 is roughly a coin flip, ~3 survives.


## 6. Art direction (from the GDD)

**Palette:** six values and one accent (green was added in iteration 3b). These are the only colors allowed.
| Token | Hex | Use |
|---|---|---|
| `--desk` | `#00CAFF` | Desktop background |
| `--paper` | `#FFFFFF` | Pop-up body |
| `--warn` | `#FAF900` | Warning pop-ups, highlights, warning state |
| `--err` | `#FF0057` | Error pop-ups, X button, critical state |
| `--ink` | `#273548` | Outlines, text, "downloading" pop-ups, letterbox |
| `--blue` (accent) | `#0078FD` | Title bars, taskbar, crash screen |
| `--win` | `#007A33` | Win screen only. Deepened in iteration 4 so it carries **white** text (5.5:1); the brighter `#00C853` could only take dark text |

**Anchor asset: the pop-up window.** Every other asset is matched to it (values as built in iteration 3):
- `--line` (3 px) `--ink` border, `--radius` (12 px) corner radius
- 34 px `--blue` title bar with a `--line` `--ink` bottom border and bold rounded title text in `--display`
- 26 px `--err` X button, `calc(--radius / 2)` radius, `--line-thin` (2 px) ink border
- White body, 14 px text, a yellow circular "!" icon, two fake buttons in the footer

**Tokens are the only way to size chrome.** Border weight comes from `--line` or `--line-thin`, corner radius from `--radius` or a `calc()` on it, and the button press distance from `--press`. This includes inline SVG geometry (`stroke-width`, `rx`) and CSS `outline` widths, so changing one token restyles the whole game. The sanctioned exceptions are `999px` for pills, `50%` for circles, and the taskbar flag's own 2 px squares.

**Known contrast limits.** The palette is fixed by the GDD, and white-on-`--blue` measures 4.11:1 — fine for large text, below AA for small text. That affects the pop-up title bars, the dialog/panel title bars and the taskbar. White on `--win` measures 5.5:1 and is the pairing the win screen uses. Prefer ink-on-paper (12.4:1) or ink-on-`--warn` (11:1) for anything small, text on a blue ground must be 19 px bold or larger (the large-text bar is 18.66 px bold), as the pause rows are, and never put small text on `--err` (3.2:1 either direction) — show danger with border weight, fills or the meter instead.

**Rules:** flat vector with hard edges and bold outlines. No gradients, textures, realistic shadows, glass, pixel art, serif fonts or thin fonts. The only "shadow" allowed is a hard flat offset block on buttons. The progress bar may use hard-stop diagonal stripes, matching the hatched bar in the sketches. Lighting is flat and even. Honor `prefers-reduced-motion`.

## 7. Architecture

Classic scripts share one global namespace, `window.INAV`. Each file owns one job and loads in dependency order from `index.html`.

```
index.html              markup for the stage, screens, taskbar; loads CSS + JS in order
css/
  base.css              palette tokens, reset, #stage scaling, letterbox
  window.css            the anchor pop-up (.win, .popup, animations)
  desktop.css           desktop icons, taskbar, start button, progress meter, clock
  screens.css           title, tutorial, pause panel, crash and win screens, buttons
js/
  config.js             INAV.config: every tuning knob + pop-up copy text
  storage.js            INAV.storage: safe localStorage get/set
  stage.js              INAV.stage: fit-to-window scaling, safe-area math
  popups.js             INAV.popups: build/spawn typed windows on the spawn grid, close, clear, count, ghost
  hud.js                INAV.hud: renders the taskbar (antivirus label, progress, install %, start button, clock)
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
| Crash and success in the same frame | Success wins: the timer is checked at the top of the frame |

## 9. Iteration roadmap

Each iteration ships something playable, gets hand-tested against its checklist, then reviewed. Two rules learned the hard way:

- **Measure what the browser renders**, never the constants the code places from. A check that asserts pop-ups avoid the rectangle they are placed outside of by construction cannot fail, and twice it hid a real bug.
- **Use real clicks and key presses.** Scripted `dispatchEvent` skips hit-testing, which once hid a pop-up nothing could click.

### Shipped

| # | What shipped | Detail |
|---|---|---|
| 1 | Core loop: scaled stage, spawning with a ramp, click-to-close, cap, timer, debug overlay | `plans/2026-09-11-iteration-1-core-loop.md` |
| 2 | Screen flow: title, tutorial, pause, crash, success; saved scores; one phase machine | `plans/2026-09-11-iteration-2-screen-flow.md` |
| 3 | Art pass: local fonts, design tokens, the anchor pop-up, desktop icons, taskbar, screen art | `plans/2026-09-11-iteration-3-art-pass.md` |
| 3b | Green win screen, start-menu pause panel, scattered title ghosts | `plans/2026-09-11-iteration-3b-polish.md` |
| 4 | Playtest response: harder by 0:30, bursts, cap 24 at ~90% coverage, four pop-up types, install percentage, per-session tutorial | `plans/2026-09-12-iteration-4-difficulty.md` |

### Iteration 5: Variety with behaviour

Types exist visually; this iteration gives them behaviour. Notes carried from earlier reviews:
- Child spawns must be driven by `game.step(dt)`, never their own `setTimeout`, or a pop-up would breed through the pause screen.
- `popups.create()` takes positional arguments; move it to an options object before adding another.
- `stage.safeArea` can return an inverted range once a type is bigger than the play area — clamp it then.
- `#popups` covers the desktop icons, so it swallows clicks over them. That only matters if the Recycle Bin ever becomes interactive.
- Danger colours: `--err` can't carry small text (3.2:1 either way). Show danger with border weight, fills or the meter.

### Iteration 6: Polish and ship

- Fold the crash and win screens into one shared rule set; their headings disagree on weight.
- Return focus to the taskbar button after resuming; vary the ghost ring order.
- Guard stored scores against corrupt values; check a fresh browser with no saved scores.
- `hud.render` writes every frame and `snapshot()` counts pop-ups every frame — cache both if profiling ever shows it.
- Missing favicon 404s over http.
- Decide whether process files (`docs/superpowers/`, `.superpowers/`, `tools/dev-server.py`) belong in the submitted repo.


## 10. Out of scope

- Precision clicking (GDD cut)
- Leaderboards, accounts, online anything
- Mobile/touch-first layout (pointer events keep touch working, but it isn't tuned for it)
- Libraries, frameworks, build tooling
