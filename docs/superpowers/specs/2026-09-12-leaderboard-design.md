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
| Hosting | **Live at https://rickeyjohnson.github.io/imnotavirus.exe/, served from `main`.** Double-clicking `index.html` reaches the same live board | Corrected 2026-09-13 by measurement. This row used to predict that a `file://` page would be cut off from the board and fall back to offline. It isn't: Supabase answers a request from the opaque `null` origin with `Access-Control-Allow-Origin: null`, and a real Chromium loading `index.html` off disk read all five rows. Both builds get the real board; the offline copy is now only for an actually-dead connection |
| Who gets an entry | **Winners only.** A round you survive can put a name on the board; a round you lose cannot. Ranked by pop-ups closed | Rickey's call, revised 2026-09-13 after seeing the board. The cost was raised and accepted: a winner closed nearly all of ~144 spawned pop-ups, so every entry lands in a narrow band and ties are common, and at the current difficulty the board fills slowly. The upside is that appearing on it means something |
| Repeat plays | **Every run is its own row** | Rickey's call, over the one-row-per-player alternative. Accepted costs: one player can occupy the whole podium, and the table grows without bound. Mitigated by showing the top 25 only, not by changing the data |
| Identity | A random `clientId` in `localStorage`, used **only** to highlight your own rows | No accounts, no auth, no personal data beyond the name you type |
| Names | Up to 12 characters, `^[A-Za-z0-9 ]{1,12}$`, blocklist with leetspeak normalisation, enforced **in the page and again server-side** | A browser-side check stops honest accidents and nothing else — anyone can POST straight to the API |
| Blocklist shape (redesigned twice during build) | **Two tiers**: a short list of long, unambiguous words blocked as a substring anywhere, and a longer list of short or name-shaped words blocked only as a whole token or a contiguous run of tokens joined together | Earlier substring-everywhere and substring-plus-allowlist attempts both false-flagged real names and words ("Assange", "Scunthorpe", "sparse"). Whole-word/span matching means "Glasscock" (a real Texas county) is never touched, "dumbass" is an explicit whole-word entry, and a spaced-out obfuscation like "cassholes" is deliberately let through rather than risk another false accusation |
| Build order | **UI first, against a fake local source**, backend second | Lets the look and feel be judged before any account exists or any key is issued |
| Backend | Deferred to phase two. Supabase is the recommendation | Postgres + REST reachable with plain `fetch`; `CHECK` constraints and a trigger give real server-side name filtering without writing a server |
| Rotating button | **The taskbar start button** is the wheel: on the title screen its label spins between `start` and `leaderboard` every 3 s, **freezing the moment it takes hover or focus** and resuming on leave. Everywhere else it is the pause button it has always been | Rickey pointed at the taskbar button, not the title screen's. A control whose action changes on a timer would otherwise change under the player's cursor mid-reach |
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
  top(limit)                -> Promise<{ rows, total }>
  submit({ name, score, won }) -> Promise<{ id, rank }>   // rank is null if it couldn't be determined
  state()                   -> "ready" | "loading" | "offline" | "error"
  me()                      -> { clientId, name, lastId, lastRank }   // name/lastId/lastRank/rank may be null
```

A row is `{ id, rank, name, score, won, mine, isLast }`. `mine` marks every row
that belongs to this browser's `clientId`; `isLast` marks only the one row just
submitted, which is what actually drives the highlight and the pin — a returning
player with several old rows on the board should not see all of them lit up.
`me()` additionally returns `lastId`/`lastRank`, the id and rank from the most
recent `submit()` this session, which is what the pin text reads; `lastRank` is
a snapshot taken at submit time (or `null`, if the rank couldn't be determined
that time), never re-queried, so the pin copy is worded as a point-in-time fact
rather than a live standing.

Underneath `INAV.leaderboard` sits the actual swappable seam, `INAV.leaderboardSource`,
with four methods: `fetchTop(limit)`, `insert(entry)`, `rankOf({ score, at })` and
`state()`. `INAV.leaderboard` is the only thing that calls it; the UI never does.
`fetchTop` must return rows ordered `score DESC, at ASC`, and `rankOf` must
break ties with that identical rule (earlier submission wins on equal score).
`INAV.leaderboard` does not trust this ordering either way: it re-sorts
whatever `fetchTop` returns by the same rule before assigning positional ranks,
so a source that returns a different order (e.g. paginated by id) cannot
desync the rank shown on the board from the rank a player was told at submit
time. The sort is a backstop for when this isn't followed; the ordering
requirement above is so it's followed in the first place.

`INAV.leaderboard` also owns classifying a source failure as `"offline"` or
`"error"` — a rejection is `"offline"` when the source reports itself offline,
or `navigator.onLine` is `false`, or the rejection is a `TypeError` (what
`fetch` throws when it cannot reach the network); everything else is
`"error"`. Both `top()` and `submit()` re-reject with a plain `Error` carrying
that classification as `.code`; the UI branches on `.code`, never on
`.message`, and never renders a raw exception's text to the player.

Phase one shipped `js/leaderboard-local.js` (since deleted): about 30 seeded
rows stored in `localStorage`, simulating latency, failure and offline with
debug toggles to force each, so the loading, empty, offline and error states
got designed rather than discovered against a real network. Phase two replaced
that one file with a `fetch`-based implementation of the same four `leaderboardSource` methods;
nothing else in the game knows which source is behind the seam.

## 5. Screens

**Rotating button (taskbar).** The taskbar start button's label wheels between
`start` and `leaderboard` while the title screen is up; clicking does whatever
is showing. It stops on `pointerenter` and on focus and resumes on leave and
blur. A focus the game causes itself is tracked by a flag the wheel owns —
never inferred from `:focus-visible`, which is a UA heuristic and reads `true`
for programmatic focus on a cold load in Chromium. Its `aria-label` tracks the
current action and the button is **not** inside a live region — a label that
re-announced itself every three seconds would be unusable with a screen reader.
Off the title screen the wheel releases the label back to the HUD, which writes
`pause`/`resume` into it as before. Under `prefers-reduced-motion` it does not
rotate; the title screen's own `leaderboard` button carries the second action.

**Board (`board` phase).** A window titled `leaderboard.exe` over the desktop.
Columns rank / name / score, marked up as a real `<table>` with header cells.
Top three carry medal fills. No "survived" badge: every row is a winner, so a badge on each would say nothing. The row just submitted (`isLast`) gets the strong
highlight and `aria-current="true"`; any other row of this browser's own past
runs (`mine`) gets a quieter tint — the two are visually distinguishable, not
just semantically different. A player whose last run isn't among the visible
rows gets it pinned under a separator instead. Closing returns to wherever the
board was opened from — the title screen or an end screen.

**Name entry (success only).** Name field plus submit, below the result stats
on the win screen. Losing a round shows no form — a lost run cannot reach the
board. Validation is inline and specific: it says which character is not
allowed, or that the blocklist refuses the name, rather than refusing silently.
On success the form is replaced by the placement and a link into the board, and
the name is remembered in `localStorage` and prefilled next time.

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

## 8. The backend (shipped 2026-09-13)

Phase 1 shipped on 2026-09-12 against `js/leaderboard-local.js`. Phase 2
replaced that one file with `js/leaderboard-supabase.js` and changed nothing
else in the game — the seam held exactly as designed.

**Supabase project** `cjqxzszojziapsiljqwr`, free tier. The schema lives in
`supabase/schema.sql` and is applied by pasting it into the SQL Editor; it is
written to be safely re-runnable.

- One table, `public.scores`: `id` (identity, `generated always` so a client
  can never supply one), `name`, `score`, `won`, `client_id`, `created_at`.
- **Row-level security** with a `SELECT` policy and an `INSERT` policy and
  *no* `UPDATE` or `DELETE` policy, which under RLS means those are refused
  outright. Verified by attack, not by reading: a `DELETE` against `id=gt.0`
  and a `PATCH` setting every `score` to 999, both sent with the anon key,
  left all five rows and every score untouched. PostgREST answers both with
  `204` — that is "your request was valid and matched zero rows you are
  allowed to touch", not "done".
- **`CHECK` constraints** mirroring the client: `name ~ '^[A-Za-z0-9 ]{1,12}$'`
  and `score between 0 and 250`.
- **A `BEFORE INSERT` trigger** mirroring `js/names.js`, including the
  contiguous-token-span check, so `"a ss hole"` is refused server-side too.
  One deliberate difference: Postgres regex has no backreference in the search
  pattern, so the "collapse runs of 3+ identical characters" step is a loop
  rather than the single regex the client uses.

**The anon key ships in `js/config.js` and in git.** That is what it is for:
it grants only what the RLS policies above allow. The `service_role` key and
the database password appear nowhere in this repo and must never.

**Reading the total.** `fetchTop` and `rankOf` both need a count, which
PostgREST returns in a `Content-Range` header when the request carries
`Prefer: count=exact`. That header is in Supabase's
`Access-Control-Expose-Headers` by default, so browser JS can read it.

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
