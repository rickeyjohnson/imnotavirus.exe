(function () {
  const C = INAV.config;
  const LABELS = ["start", "leaderboard"];
  const ACTIONS = ["start", "board"];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let index = 0;
  let timer = null;
  let frozen = false;
  let btn = null;
  let track = null;

  function paint() {
    track.classList.toggle("at-1", index === 1);
    // The label is the button's accessible name, updated in place. The button
    // is deliberately NOT in a live region: a name that re-announced itself
    // every three seconds would be unusable with a screen reader.
    btn.setAttribute("aria-label", LABELS[index]);
  }

  function tick() {
    if (frozen) return;
    index = (index + 1) % LABELS.length;
    paint();
  }

  function freeze() {
    frozen = true;
  }

  function thaw() {
    frozen = false;
  }

  INAV.wheel = {
    init() {
      btn = document.getElementById("wheel-btn");
      track = document.getElementById("wheel-track");
      // Freezing on hover and focus is what stops the button changing action
      // under the player's cursor mid-reach.
      btn.addEventListener("pointerenter", freeze);
      btn.addEventListener("pointerleave", thaw);
      // enterTitle() programmatically focuses this button on every entry to
      // the title screen (for keyboard/screen-reader users landing on the
      // screen). That focus() call is not a real hover/keyboard interaction,
      // and freezing on it would stop the wheel dead on load with no way to
      // resume, since nothing ever blurs an untouched, auto-focused button.
      // :focus-visible is false for that programmatic focus and true for a
      // real Tab keypress, so it is what actually distinguishes "the player
      // is reaching for this button" from "the screen just mounted".
      btn.addEventListener("focus", () => {
        if (btn.matches(":focus-visible")) freeze();
      });
      btn.addEventListener("blur", thaw);
      paint();
    },

    start() {
      if (reducedMotion.matches) {
        index = 0;
        paint();
        return;
      }
      this.stop();
      timer = setInterval(tick, C.LEADERBOARD.WHEEL_MS);
    },

    stop() {
      clearInterval(timer);
      timer = null;
    },

    action() {
      return reducedMotion.matches ? "start" : ACTIONS[index];
    },
  };
})();
