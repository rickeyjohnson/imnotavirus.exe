# imnotavirus.exe — global leaderboard

Supplements `2026-09-11-imnotavirus-design.md`. That spec owns the palette, the
phase machine, the architecture and the contrast rules; this one only covers the
leaderboard. Where they disagree, the main spec wins except on the points listed
as amendments below.

## 1. What it is

A single global board of every finished round, ranked by pop-ups closed. Anyone
who plays the hosted build can put a name on it. The board lives on the title
screen behind a rotating `start` / `leaderboard` button, shows gold, silver and
bronze for the top three, and highlights the row the current player just set.

## 2. Decisions

| Decision | Choice | Why |
|---|---|---|
| Hosting | **GitHub Pages is the leaderboard build.** Double-clicking `index.html` still plays, but reports the leaderboard as offline and keeps using local scores | A page at `file://` has the opaque origin `null`; Chrome blocks cross-origin `fetch` from it in the common case and other browsers are inconsistent. A global board needs a real origin |
| Who gets an entry | **Every finished round**, win or loss, ranked by pop-ups closed. Winners carry a badge | Wins-only would be both sparse and near-tied: a round spawns ~144 pop-ups and a winner closed nearly all of them, so every winner lands within ~16 points of every other. Losses hold the real spread, and winners still sort to the top because dying early means seeing fewer pop-ups |
| Repeat plays | **Every run is its own row** | Rickey's call, over the one-row-per-player alternative. Accepted costs: one player can occupy the whole podium, and the table grows without bound. Mitigated by showing the top 25 only, not by changing the data |
| Identity | A random `clientId` in `localStorage`, used **only** to highlight your own rows | No accounts, no auth, no personal data beyond the name you type |
| Names | Up to 12 characters, `^[A-Za-z0-9 ]{1,12}$`, blocklist with leetspeak normalisation, enforced **in the page and again server-side** | A browser-side check stops honest accidents and nothing else — anyone can POST straight to the API |
| Blocklist shape (redesigned twice during build) | **Two tiers**: a short list of long, unambiguous words blocked as a substring anywhere, and a longer list of short or name-shaped words blocked only as a whole token or a contiguous run of tokens joined together | Earlier substring-everywhere and substring-plus-allowlist attempts both false-flagged real names and words ("Assange", "Scunthorpe", "sparse"). Whole-word/span matching means "Glasscock" (a real Texas county) is never touched, "dumbass" is an explicit whole-word entry, and a spaced-out obfuscation like "cassholes" is deliberately let through rather than risk another false accusation |
| Build order | **UI first, against a fake local source**, backend second | Lets the look and feel be judged before any account exists or any key is issued |
| Backend | Deferred to phase two. Supabase is the recommendation | Postgres + REST reachable with plain `fetch`; `CHECK` constraints and a trigger give real server-side name filtering without writing a server |
| Rotating button | Spins every 3 s, **freezes the moment it takes hover or focus**, resumes on leave | A control whose action changes on a timer otherwise changes under the player's cursor mid-reach |
| Medals | **Three new palette tokens** `--gold`, `--silver`, `--bronze`, used as fills behind ink text | A deliberate GDD palette amendment, like `--win`. Never coloured type: the existing yellow is 1.2:1 on white |

## 3. Amendments to the main spec

- §10 no longer lists leaderboards and online features as out of scope. Accounts,
  authentication and any social feature beyond a name and a score stay out.
- The palette gains `--gold`, `--silver`, `--bronze`.
- A new phase, `board`, joins `title`, `tutorial`, `play`, `paused`, `crashing`,
  `crash`, `winning`, `success`.

## 4. The seam

Everything in the game talks to one module and never to a network directly:

```
INAV.leaderboard
  top(limit)                -> Promise<{ rows, total, cut }>
  submit({ name, score, won }) -> Promise<{ id, rank }>
  state()                   -> "ready" | "loading" | "offline" | "error"
  me()                      -> { clientId, name, lastId, lastRank }   // name/lastId/lastRank may be null
```

A row is `{ id, rank, name, score, won, mine, isLast }`. `mine` marks every row
that belongs to this browser's `clientId`; `isLast` marks only the one row just
submitted, which is what actually drives the highlight and the pin — a returning
player with several old rows on the board should not see all of them lit up.
`cut` is the rank the visible list stops at, so the UI knows when to pin the
player's own row below a separator instead of scrolling to find it. `me()`
additionally returns `lastId`/`lastRank`, the id and rank from the most recent
`submit()` this session, which is what the pin text reads.

Underneath `INAV.leaderboard` sits the actual swappable seam, `INAV.leaderboardSource`,
with four methods: `fetchTop(limit)`, `insert(entry)`, `rankOf({ score, at })` and
`state()`. `INAV.leaderboard` is the only thing that calls it; the UI never does.

Phase one ships `js/leaderboard-local.js`: about 30 seeded rows whose scores
follow real play (a crowd between 40 and 110, a few winners above 130), stored
in `localStorage`. It **simulates latency, failure and offline**, with debug
toggles to force each (`INAV.leaderboardLocal.force("offline" | "error" | "slow" | "empty" | "ready")`
and `.reset()`), so the loading, empty, offline and error states get designed
now rather than discovered in phase two. Phase two replaces that one file with
a `fetch`-based implementation of the same four `leaderboardSource` methods;
nothing else in the game knows which source is behind the seam.

## 5. Screens

**Rotating button (title).** One `<button>` whose label wheels between `start`
and `leaderboard`; clicking does whatever is showing. It stops on
`pointerenter` and on focus, resumes on leave and blur. Its `aria-label` tracks
the current action and the button is **not** inside a live region — a label that
re-announced itself every three seconds would be unusable with a screen reader.
Under `prefers-reduced-motion` it does not rotate at all and renders as two
plain buttons instead.

**Board (`board` phase).** A window titled `leaderboard.exe` over the desktop.
Columns rank / name / score, marked up as a real `<table>` with header cells.
Top three carry medal fills. The player's row is highlighted and marked
`aria-current="true"`; a player below `cut` gets their row pinned under a
separator. Closing returns to wherever the board was opened from — the title
screen or an end screen.

**Name entry (crash and success).** Name field plus submit, below the result
stats. Validation is inline and specific: says which character is not allowed,
or that the name is taken by the blocklist, rather than refusing silently. On
success the form is replaced by the placement and a link into the board. The
name is remembered in `localStorage` and prefilled next time.

**States.** Loading shows a skeleton, not a spinner over an empty box. Empty
says the board has no entries yet and invites the first one. Offline says the
board needs the hosted version and keeps the rest of the screen usable. Error
offers a retry.

## 6. Validation

Applied identically in the page and, in phase two, in the database:

- Trim, collapse runs of whitespace, reject empty.
- `^[A-Za-z0-9 ]{1,12}$`. Rejecting everything else removes unicode
  look-alikes, homoglyphs, zero-width characters and right-to-left overrides as
  a class of problem rather than one at a time.
- Blocklist match after normalising case, spacing and common leetspeak
  substitutions (`0`→`o`, `1`/`!`→`i`, `3`→`e`, `4`→`a`, `5`→`s`, `7`→`t`,
  `@`→`a`, `$`→`s`).
- Score must be an integer in `0..250`. A 60-second round spawns about 144
  pop-ups, so 250 is comfortably above any honest score while still rejecting
  the obvious `99999`.

The filter will not stop a determined person with creative spelling. It is a
speed bump plus a server-side floor, not a guarantee.

## 7. Accessibility and contrast

- Medal colours are fills behind ink text. No rank is communicated by colour
  alone — the number is always present.
- Board is a table with real headers; the player's row is marked
  `aria-current`, not merely coloured.
- The rotating button keeps a stable accessible role and an `aria-label` that
  matches what a click will do.
- Every new colour pairing gets measured against 4.5:1 for normal text and 3:1
  for text at 18.66px bold or larger, per the main spec.

## 8. Phase two: the backend

Phase 1 shipped on 2026-09-12: the whole UI runs against
`js/leaderboard-local.js`. Phase 2 replaces that one file with a `fetch`-based
source implementing the same four methods (`fetchTop`, `insert`, `rankOf`,
`state`) and changes nothing else in the game.

Not built. Sketch for when it is: one table `scores` (`id`, `name`, `score`,
`won`, `client_id`, `created_at`); row-level security permitting `INSERT` and
`SELECT` but never `UPDATE` or `DELETE`; a `CHECK` constraint for the charset,
length and score range; a `BEFORE INSERT` trigger for the blocklist. The anon
key ships in the page, which is what it is for.

## 9. Known limits

- **Scores can be forged.** The server never watched the round, so it cannot
  tell a real 140 from a fabricated one. Constraints cap implausible values and
  nothing more. Acceptable for a course project; stated so it is not a surprise.
- **The name filter is bypassable** with creative spelling.
- **The table grows without bound**, a consequence of the every-run-a-row
  decision.
- **Supabase free projects pause after 7 days idle** and need a manual wake. A
  paused project reads as offline, which the UI already handles, but a grader
  opening it weeks later would see no board until it is woken.
- **Names are mild personal data.** The entry form says the name goes on a
  public board.

## 10. Out of scope

Accounts, authentication, avatars, comments, per-class or per-region boards,
score deletion by players, and any attempt at real anti-cheat.
