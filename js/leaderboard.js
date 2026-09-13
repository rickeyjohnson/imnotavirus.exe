(function () {
  const C = INAV.config;
  const K = C.STORAGE_KEYS;

  let lastId = null; // the row from the run just submitted, highlighted on the board
  let lastRank = null;

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
      return { clientId: clientId(), name: storedName(), lastId: lastId, lastRank: lastRank };
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

      const score = Number(entry.score);
      if (!Number.isInteger(score) || score < 0 || score > C.LEADERBOARD.SCORE_MAX) {
        return Promise.reject(new Error("That score isn't valid."));
      }

      INAV.storage.set(K.playerName, checked.name);

      return INAV.leaderboardSource
        .insert({ name: checked.name, score: score, won: !!entry.won, clientId: clientId() })
        .then((res) => {
          lastId = res.id;
          return INAV.leaderboardSource.rankOf({ score: score, at: res.at }).then((rank) => {
            lastRank = rank;
            return { id: res.id, rank: rank, total: 0 };
          });
        });
    },
  };
})();
