(function () {
  const C = INAV.config;
  const $ = (id) => document.getElementById(id);
  let token = 0; // guards against a slow response landing after a newer one

  function medal(rank) {
    if (rank > 3) return String(rank);
    return '<span class="medal medal-' + rank + '">' + rank + "</span>";
  }

  function rowHtml(r) {
    // isLast (the run just submitted) and mine (any of this browser's rows)
    // are different claims and must not render identically -- isLast wins
    // when both are true, since it is the more specific, stronger claim.
    const rowClass = r.isLast ? "row-current" : r.mine ? "row-mine" : "";
    const cls = rowClass ? ' class="' + rowClass + '"' : "";
    const current = r.isLast ? ' aria-current="true"' : "";
    return (
      "<tr" + cls + current + ">" +
      "<td>" + medal(r.rank) + "</td>" +
      "<td></td>" +
      '<td class="col-score"></td>' +
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
    // Score is likewise routed through textContent rather than the innerHTML
    // template above -- it is server data too, and phase 2 points this seam
    // at the internet.
    data.rows.forEach((r, i) => {
      const row = body.rows[i];
      const cell = row.cells[1];
      cell.textContent = r.name;
      if (r.won) {
        const badge = document.createElement("span");
        badge.className = "won-badge";
        badge.textContent = "survived";
        cell.appendChild(badge);
      }
      row.cells[2].textContent = r.score;
    });

    // If the run just submitted placed below the visible cut, pin it rather
    // than making the player hunt for it. lastRank is a snapshot taken at
    // submit time, not a live lookup, so the copy says so instead of
    // implying it is current -- and never prints a literal "?" when the
    // rank is unknown (rankOf failed after a successful insert).
    const shown = data.rows.some((r) => r.isLast);
    const pin = $("board-mine");
    if (me.lastId && !shown) {
      pin.hidden = false;
      pin.textContent = me.lastRank
        ? "Your last run was #" + me.lastRank + " of " + data.total + " when submitted."
        : "Your last run is on the board.";
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
          if (err && err.code === "offline") {
            status("The global board needs the online version of the game. Your scores are still saved on this computer.");
          } else {
            status('Could not load the board. <button class="btn small" id="board-retry" type="button">retry</button>');
            const retry = $("board-retry");
            if (retry) retry.addEventListener("click", () => INAV.boardUI.load());
          }
        });
    },

    // Bumps the token so a response still in flight when the board is closed
    // renders into hidden DOM instead of the (possibly reused) live view.
    close() {
      token++;
    },
  };
})();
