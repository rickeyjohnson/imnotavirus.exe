(function () {
  const $ = (id) => document.getElementById(id);
  let form = null;
  let pending = false;
  // Remembers the run (by object identity) that was last submitted, and the
  // rank it placed at, so re-mounting for that SAME run (closeBoard() returns
  // to the phase it was opened from, which re-runs enterCrash/enterSuccess
  // and calls mount() again) restores the placement instead of a fresh, empty
  // form that would let the same run be submitted twice. A genuinely new run
  // is a different result object -- screens.js hands us game.js's own result
  // object, which is only replaced when a new round actually ends.
  let placedForResult = null;
  let placedRank = null;

  function showError(message) {
    const el = $("name-error");
    el.hidden = !message;
    el.textContent = message || "";
  }

  function setBusy(on) {
    pending = on;
    $("name-submit").disabled = on;
    $("name-input").disabled = on;
    $("name-submit").textContent = on ? "sending…" : "submit";
  }

  function placed(rank) {
    $("name-input").closest(".name-entry-row").hidden = true;
    form.querySelector("label").hidden = true;
    $("name-error").hidden = true;
    form.querySelector(".name-note").hidden = true;
    const el = $("name-placed");
    el.hidden = false;
    el.textContent = "";
    el.textContent = "You're #" + rank + " on the board.";
    const link = document.createElement("button");
    link.type = "button";
    link.className = "btn small";
    link.textContent = "see the board";
    link.addEventListener("click", () => INAV.game.showBoard());
    el.appendChild(document.createElement("br"));
    el.appendChild(link);
  }

  function showFreshForm() {
    $("name-input").closest(".name-entry-row").hidden = false;
    form.querySelector("label").hidden = false;
    form.querySelector(".name-note").hidden = false;
    $("name-placed").hidden = true;
    $("name-placed").textContent = "";
    showError("");
    setBusy(false);
  }

  function onSubmit(e, result) {
    e.preventDefault();
    if (pending) return;

    const raw = $("name-input").value;
    const checked = INAV.names.check(raw);
    if (!checked.ok) {
      showError(checked.error);
      $("name-input").focus();
      return;
    }

    showError("");
    setBusy(true);
    INAV.leaderboard
      .submit({ name: checked.name, score: result.score, won: result.won })
      .then((res) => {
        setBusy(false);
        placedForResult = result;
        placedRank = res.rank;
        placed(res.rank);
      })
      .catch((err) => {
        setBusy(false);
        const offline = err && err.message === "offline";
        showError(offline ? "No connection to the board. Your score is still saved here." : err.message || "That didn't send.");
        $("name-input").focus();
      });
  }

  INAV.nameEntry = {
    // One form instance, moved into whichever end screen is showing. Keeps a
    // single set of element ids no matter how many screens can submit.
    mount(slot, result) {
      if (!slot) return;
      form = $("name-entry");
      slot.appendChild(form);
      form.hidden = false;

      if (placedForResult === result) {
        // Same run as the last successful submit -- show the placement again
        // rather than handing back an empty form for a run already recorded.
        placed(placedRank);
        form.onsubmit = (e) => e.preventDefault();
        return;
      }

      showFreshForm();

      const me = INAV.leaderboard.me();
      $("name-input").value = me.name || "";

      form.onsubmit = (e) => onSubmit(e, result);
    },

    unmount() {
      if (form) form.hidden = true;
    },
  };
})();
