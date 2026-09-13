(function () {
  const C = INAV.config;
  const LABELS = ["start", "leaderboard"];
  const ACTIONS = ["start", "board"];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let index = 0;
  let timer = null;
  let frozen = false;
  let running = false;
  let btn = null;
  let track = null;
  let programmatic = false;

  function paint() {
    track.classList.toggle("at-1", index === 1);
    if (!running) return;
    // The label is the button's accessible name, updated in place. The button
    // is deliberately NOT in a live region: a name that re-announced itself
    // every three seconds would be unusable with a screen reader.
    btn.setAttribute("aria-label", LABELS[index]);
  }

  function tick() {
    if (frozen) return;
    // Re-checked live, so toggling the OS setting mid-session takes effect
    // immediately in both directions.
    if (reducedMotion.matches) {
      if (index !== 0) {
        index = 0;
        paint();
      }
      return;
    }
    // Defensive: a tick queued just before a pointerenter could otherwise
    // advance the label at the moment the player's cursor arrives.
    if (btn.matches(":hover")) return;
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
      btn = document.getElementById("start-menu");
      track = document.getElementById("wheel-track");
      // Freezing on hover and focus is what stops the button changing action
      // under the player's cursor mid-reach.
      btn.addEventListener("pointerenter", freeze);
      btn.addEventListener("pointerleave", thaw);
      // A focus we caused ourselves must not freeze the wheel — nothing would
      // ever blur it and it would stop forever. Tracked as a fact we own
      // rather than inferred from :focus-visible, which is a UA heuristic and
      // is true for programmatic focus on a cold load in Chromium.
      btn.addEventListener("focus", () => {
        if (!programmatic) freeze();
      });
      btn.addEventListener("blur", thaw);
      paint();
    },

    // Focus without freezing: used when a screen mounts and moves focus here.
    focusSilently() {
      programmatic = true;
      btn.focus();
      programmatic = false;
    },

    // True while the wheel owns the taskbar label, so the HUD leaves it alone.
    owns() {
      return running;
    },

    start() {
      frozen = false;
      running = true;
      this.stop();
      btn.classList.add("wheeling");
      if (reducedMotion.matches) {
        index = 0;
      }
      paint();
      timer = setInterval(tick, C.LEADERBOARD.WHEEL_MS);
    },

    stop() {
      clearInterval(timer);
      timer = null;
    },

    // Hands the label back to the HUD (pause/resume) when leaving the title.
    release() {
      this.stop();
      running = false;
      index = 0;
      frozen = false;
      if (btn) {
        btn.classList.remove("wheeling");
        btn.removeAttribute("aria-label");
        paint();
      }
    },

    action() {
      return reducedMotion.matches ? "start" : ACTIONS[index];
    },
  };
})();
