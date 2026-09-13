(function () {
  const $ = (id) => document.getElementById(id);
  let form = null;
  let pending = false;
  // Every run that has been successfully submitted, keyed by the result
  // object's identity (game.js's own state.result, which screens.js passes
  // through unchanged), mapped to the rank it placed at. A WeakMap rather
  // than a single "last submitted" slot: re-mounting ANY previously-submitted
  // run -- not just the most recent one -- must restore its placement
  // instead of a fresh, resubmittable form, since the row is already in the
  // backend. A single slot was tried first and failed exactly this case: a
  // second run's submission overwrote the first run's record, so remounting
  // the first run later showed a fresh form even though it had already been
  // inserted. WeakMap also means an old, discarded run's entry can be
  // garbage-collected once nothing else references it.
  const placedRanks = new WeakMap();
  // The run currently mounted, so a submit's .then()/.catch() -- which can
  // resolve well after the player has moved to a different run (try again,
  // crash again, all inside the FAKE_LATENCY_MS window) -- never mutates a
  // form that now belongs to a different run. Same guard shape as board-ui's
  // `token`, keyed on the result's identity instead of a counter since we
  // already have it.
  let mounted = null;

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
        // The row is inserted server-side the moment this resolves, no
        // matter what is on screen -- so remembering the placement (to block
        // a second insert if this exact run is ever mounted again) is NOT
        // conditional on being the currently-mounted run. Only the visible
        // DOM mutation is: a stale resolution must never overwrite whatever
        // run the player has since moved on to.
        placedRanks.set(result, res.rank);
        if (mounted !== result) return;
        setBusy(false);
        placed(res.rank);
      })
      .catch((err) => {
        if (mounted !== result) return;
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
      mounted = result;

      if (placedRanks.has(result)) {
        // Already submitted (possibly while a different run was mounted) --
        // show the placement again rather than handing back an empty,
        // resubmittable form for a run already recorded.
        placed(placedRanks.get(result));
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
      mounted = null;
    },
  };
})();
