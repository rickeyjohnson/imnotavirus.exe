(function () {
  const C = INAV.config;
  const S = C.SUPABASE;
  const TABLE = S.URL + "/rest/v1/scores";

  const HEADERS = {
    apikey: S.ANON_KEY,
    Authorization: "Bearer " + S.ANON_KEY,
  };

  let lastState = "ready";

  // PostgREST returns the total row count in a "Content-Range: 0-24/137"
  // header when the request carries `Prefer: count=exact` -- the number
  // after the slash is the total regardless of how many rows were returned.
  function totalFrom(res) {
    const range = res.headers.get("Content-Range");
    if (!range) return null;
    const n = Number(range.split("/")[1]);
    return Number.isFinite(n) ? n : null;
  }

  function toRow(r) {
    return {
      id: r.id,
      name: r.name,
      score: r.score,
      won: !!r.won,
      clientId: r.client_id,
      at: new Date(r.created_at).getTime(),
    };
  }

  // fetch() only rejects on a transport failure (offline, DNS, CORS); a 400
  // or 500 from Postgres still resolves normally. This turns a non-2xx
  // response into a rejection so the facade's error handling sees it, and
  // classifies it as a plain Error (never TypeError) so it reads as "error",
  // not "offline" -- fetch's own TypeError is what carries the real offline
  // signal, and only a genuine transport failure should produce one.
  function ok(res) {
    if (res.ok) {
      lastState = "ready";
      return res;
    }
    lastState = "error";
    return res
      .json()
      .catch(() => ({}))
      .then((body) => {
        throw new Error(body.message || "Request failed (" + res.status + ")");
      });
  }

  INAV.leaderboardSource = {
    state() {
      return lastState;
    },

    fetchTop(limit) {
      const url =
        TABLE + "?select=id,name,score,won,client_id,created_at&order=score.desc,created_at.asc&limit=" + limit;
      return fetch(url, { headers: Object.assign({ Prefer: "count=exact" }, HEADERS) })
        .then(ok)
        .then((res) =>
          res.json().then((rows) => ({
            rows: rows.map(toRow),
            total: totalFrom(res),
          }))
        );
    },

    insert(entry) {
      const body = JSON.stringify({
        name: entry.name,
        score: entry.score,
        won: !!entry.won,
        client_id: entry.clientId,
      });
      return fetch(TABLE, {
        method: "POST",
        headers: Object.assign(
          { "Content-Type": "application/json", Prefer: "return=representation" },
          HEADERS
        ),
        body: body,
      })
        .then(ok)
        .then((res) =>
          res.json().then((rows) => {
            const row = rows[0];
            return { id: row.id, at: new Date(row.created_at).getTime() };
          })
        );
    },

    // Counts rows that outrank { score, at } under the same score DESC,
    // created_at ASC tiebreak the facade sorts by, then adds one. limit=1
    // keeps the response body tiny -- only the Content-Range header matters.
    rankOf(entry) {
      const iso = new Date(entry.at).toISOString();
      const filter = "or=(score.gt." + entry.score + ",and(score.eq." + entry.score + ",created_at.lt." + iso + "))";
      const url = TABLE + "?select=id&limit=1&" + filter;
      return fetch(url, { headers: Object.assign({ Prefer: "count=exact" }, HEADERS) })
        .then(ok)
        .then((res) => {
          const total = totalFrom(res);
          return (total === null ? 0 : total) + 1;
        });
    },
  };
})();
