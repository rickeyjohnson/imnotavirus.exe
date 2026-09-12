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
