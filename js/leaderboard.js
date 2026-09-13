(function () {
  const C = INAV.config;
  const K = C.STORAGE_KEYS;

  let lastId = null; // the row from the run just submitted, highlighted on the board
  let lastRank = null; // snapshot of the rank at submit time; never re-queried
  let lastKnownState = "ready"; // last classification recorded by call(), below

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

  // The facade owns classification so the UI never has to recognise a
  // particular source's error shape. A `fetch` source (phase 2) rejects with
  // `TypeError: Failed to fetch`; the fake local source rejects with a
  // hand-built `Error("offline")`. Both must end up as the same `"offline"`
  // code so the UI's offline copy is reachable no matter which source is
  // behind the seam.
  function classify(err) {
    let sourceOffline = false;
    try {
      sourceOffline = INAV.leaderboardSource.state() === "offline";
    } catch (e) {}
    const networkDown = typeof navigator !== "undefined" && navigator.onLine === false;
    const looksLikeTransportFailure = err instanceof TypeError;
    return sourceOffline || networkDown || looksLikeTransportFailure ? "offline" : "error";
  }

  // Wraps a promise from INAV.leaderboardSource: records the last known state
  // on both success and failure, and on failure re-rejects with a plain Error
  // carrying a `.code` ("offline" | "error") instead of the source's own
  // rejection. The UI branches on `err.code`, never on `err.message` -- so a
  // raw exception (e.g. "Failed to fetch") never reaches player-facing copy.
  function call(promise) {
    return promise.then(
      (result) => {
        lastKnownState = "ready";
        return result;
      },
      (err) => {
        const code = classify(err);
        lastKnownState = code;
        const wrapped = new Error(code);
        wrapped.code = code;
        return Promise.reject(wrapped);
      }
    );
  }

  INAV.leaderboard = {
    state() {
      return lastKnownState;
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
      return call(INAV.leaderboardSource.fetchTop(want)).then((res) => {
        // The facade does not trust the source's order: it re-sorts by the
        // same score DESC, at ASC rule before assigning positional ranks, so
        // a source that returns a different order (e.g. paginated by id)
        // cannot desync the rank shown here from the rank shown at submit.
        const rows = res.rows
          .slice()
          .sort((a, b) => b.score - a.score || a.at - b.at)
          .map((r, i) => ({
            id: r.id,
            rank: i + 1,
            name: r.name,
            score: r.score,
            won: !!r.won,
            mine: r.clientId === mine,
            isLast: r.id === lastId,
          }));
        return { rows: rows, total: res.total };
      });
    },

    // Validates, stores the name for next time, inserts, then resolves the
    // placement. Rank comes from the source so phase 2 can answer it with a
    // count query instead of shipping the whole table.
    //
    // Once insert() succeeds the submit has succeeded: the row already
    // exists. If rankOf() then fails, that failure must not fail the whole
    // submit (the caller would retry and insert a duplicate row) -- it
    // resolves with rank: null instead, and lastRank is set to null so the
    // pin can never show a rank paired with a different run's id.
    submit(entry) {
      const checked = INAV.names.check(entry.name);
      if (!checked.ok) return Promise.reject(new Error(checked.error));

      const score = Number(entry.score);
      if (!Number.isInteger(score) || score < 0 || score > C.LEADERBOARD.SCORE_MAX) {
        return Promise.reject(new Error("That score isn't valid."));
      }

      INAV.storage.set(K.playerName, checked.name);

      return call(
        INAV.leaderboardSource.insert({ name: checked.name, score: score, won: !!entry.won, clientId: clientId() })
      ).then((res) => {
        lastId = res.id;
        return call(INAV.leaderboardSource.rankOf({ score: score, at: res.at }))
          .then((rank) => {
            lastRank = rank;
            return { id: res.id, rank: rank };
          })
          .catch(() => {
            lastRank = null;
            return { id: res.id, rank: null };
          });
      });
    },
  };
})();
