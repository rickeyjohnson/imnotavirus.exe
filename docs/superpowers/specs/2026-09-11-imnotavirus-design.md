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
- **Manual testing only.** No unit tests. Every iteration ends with a manual test checklist (see §10).
- **Fonts:** a system font stack until iteration 3. Any custom font ships as a local file in `assets/fonts/` (it counts as an asset, not a library), with a system fallback.

## 3. Decisions log

| Topic | Decision | Notes |
|---|---|---|
| Platform | Browser, plain HTML/CSS/JS | Pop-ups are DOM elements |
| Win screen | **Keep a Success screen** | Overrides the GDD "Cut" list; kept as a plain results dialog so replay stays the focus |
| Lose rule | **Pop-up count cap**: crash the instant `open >= CAP` | `CAP = 12` to start; tunable |
| Close input | **Click anywhere on a pop-up** | Matches the GDD cut of precision clicking; uses `pointerdown` for speed |
| Tutorial | **One practice pop-up + instruction bar** | Closing it starts the round. Shown on every Start from Title |
| Retry | "try again" / "play again" go **straight to Gameplay** | Skips the tutorial for fast replay. "Back to desktop" goes to Title |
| Pop-up variety | **One type in V1**; variety in iteration 5 | Warning / error / downloading types come later |
| Window resizing | Fixed 1280×720 stage, scaled to fit, letterboxed | Resolves GDD fragile items #1 and #3 |

## 4. Screens and flow

```
Title ──start──▶ Tutorial ──close practice pop-up──▶ Gameplay
  ▲                                                  │      │
  │                                     open >= CAP  │      │  t >= 60s
  │                                                  ▼      ▼
  └──────── "Back to desktop" ─────────────── Game Over   Success
                                                  │          │
                          "try again" / "play again" ──▶ Gameplay
```

| Screen | Contents (from sketches) |
|---|---|
| **Title** | Desktop, faded "ghost" pop-ups in the background, `imnotavirus.exe` title, **start** button, `Score:` (last round) and `Best:`, taskbar |
| **Tutorial** | Desktop + recycle bin, one practice pop-up in the center, instruction bar above the taskbar, antivirus progress bar at 0% |
| **Gameplay** | Desktop + recycle bin, spawning pop-ups, taskbar showing closed count, open count `n/12`, antivirus progress bar and seconds remaining |
| **Game Over** | Full-screen crash parody: `:(`, "Your PC ran into a problem…", an "X% complete" counter, round stats, **try again**, "Back to desktop" |
| **Success** | Desktop + recycle bin, a results dialog ("Installation complete"), Score, Best, "New best" badge when earned, **play again**, "Back to desktop", progress bar full |

Screen states (in code): `title`, `tutorial`, `play`, `crashing` (a ~400 ms shake before Game Over), `crash`, `success`.

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
  screens.js            INAV.screens: show(name), per-screen enter logic (title stats, results)
  game.js               INAV.game: round state, rAF loop, spawn timer, crash/win detection
  debug.js              INAV.debug: overlay toggled with the D key (t, interval, open, score, screen)
  main.js               wires buttons/events, boots to Title
assets/
  icons/  fonts/  sounds/   (filled in as assets arrive)
```

**How the pieces talk:**
- `game` owns round state (`t`, `open`, `score`, `nextSpawnIn`). It calls `popups.spawn()` and reads `popups.count()`.
- `popups` reports closes through a callback, `onClose(isPractice)`, that `game` registers. It never touches screens or the HUD directly.
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

Each iteration is a playable checkpoint. After each one: manual test, then feedback, assets and rule changes from Rickey, and the spec/plan is updated before the next.

1. **Grey-box core loop.** File structure from §7. Plain boxes on the desktop color, spawning with the ramp and bloom, click to close, score, open counter, 60 s timer, crash at the cap, success at 60 s. End states can be plain text. Debug overlay (D key).
2. **Screen flow.** Title → Tutorial → Gameplay → Game Over / Success → back. Last and best scores persisted. Retry skips the tutorial.
3. **Art pass.** The finished anchor pop-up, desktop icons (recycle bin, antivirus), taskbar with start logo, striped antivirus progress bar, clock, ghost pop-ups on Title, crash screen, success dialog. Any custom fonts go in local files.
4. **Tuning and feel.** Tune the ramp against the 0:00 / 0:30 / 0:55 beats. Danger feedback as the cap nears (counter goes yellow at 7, red and blinking at 10; possible screen shake). Open/close animations. Sound effects if assets exist.
5. **Variety.** Warning (yellow), error (red) and downloading (dark gray) pop-up types, plus copy variety. Whether the types behave differently (e.g. downloading pop-ups spawn children if left open) gets decided at the start of this iteration.
6. **Polish and ship.** Swap in Rickey's final assets, run the edge cases in §8 by hand, optionally host on GitHub Pages, and update the GDD to match what shipped.

## 10. Manual test checklists

**Iteration 1**
- [ ] Open `index.html` by double-clicking it. The round starts with no console errors.
- [ ] The first pop-up appears within 1 s.
- [ ] Spawns get visibly faster; the debug overlay's interval drops from ~1100 ms toward ~360 ms.
- [ ] No pop-up ever appears off-screen, behind the taskbar or over the icon column (watch a full round).
- [ ] Clicking anywhere on a pop-up closes it; score +1, open −1.
- [ ] Leaving pop-ups open until 12 are open crashes immediately.
- [ ] Surviving to 60 s triggers success.
- [ ] Resizing the window mid-round keeps everything in place and in view.

**Iteration 2**
- [ ] Every arrow in the §4 flow works, including both "Back to desktop" links.
- [ ] The practice pop-up doesn't count toward score; closing it starts the round.
- [ ] Title shows the last and best scores; both survive a page reload.
- [ ] Retry from Game Over / Success skips the tutorial.

**Iterations 3–6:** checklists are written at the start of each iteration.

## 11. Out of scope

- Precision clicking (GDD cut)
- Leaderboards, accounts, online anything
- Mobile/touch-first layout (pointer events keep touch working, but it isn't tuned for it)
- Libraries, frameworks, build tooling
