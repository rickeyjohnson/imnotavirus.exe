(function () {
  const $ = (id) => document.getElementById(id);

  INAV.stage.init($("stage"));
  INAV.hud.init();
  INAV.debug.init($("debug"));
  INAV.screens.init();
  INAV.popups.init($("popups"), (el) => INAV.game.handleClose(el));
  INAV.game.init((phase, s) => INAV.screens.show(phase, s));
  INAV.wheel.init();
  INAV.audio.init();

  const soundToggle = $("sound-toggle");
  const paintSoundToggle = () => {
    const off = INAV.audio.isMuted();
    soundToggle.setAttribute("aria-pressed", String(off));
    soundToggle.setAttribute("aria-label", off ? "Unmute sound" : "Mute sound");
    soundToggle.title = off ? "Sound off" : "Sound on";
  };
  paintSoundToggle();
  soundToggle.addEventListener("click", () => {
    INAV.audio.setMuted(!INAV.audio.isMuted());
    paintSoundToggle();
    // Unmuting gives no feedback otherwise: the click sound fired on
    // pointerdown, while the game was still muted.
    if (!INAV.audio.isMuted()) INAV.audio.play("button");
  });

  // Every button in the game shares one click sound.
  document.addEventListener(
    "pointerdown",
    (e) => {
      if (e.button === 0 && e.target.closest("button")) INAV.audio.play("button");
    },
    true
  );

  $("start-btn").addEventListener("click", () => INAV.game.startTutorial());
  $("board-btn").addEventListener("click", () => INAV.game.showBoard());
  $("board-close").addEventListener("click", () => INAV.game.closeBoard());
  $("board-back").addEventListener("click", () => INAV.game.closeBoard());
  $("try-again-btn").addEventListener("click", () => INAV.game.goTitle());
  $("play-again-btn").addEventListener("click", () => INAV.game.goTitle());
  // On the title screen this button is the wheel and does whatever its label
  // says; everywhere else it is the pause button it has always been.
  $("start-menu").addEventListener("click", () => {
    if (INAV.wheel.owns()) {
      if (INAV.wheel.action() === "board") {
        INAV.game.showBoard();
        return;
      }
      INAV.game.startTutorial();
      return;
    }
    INAV.game.togglePause();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || e.repeat) return;
    if (INAV.game.snapshot().phase === "board") {
      INAV.game.closeBoard();
      return;
    }
    INAV.game.togglePause();
  });

  INAV.game.goTitle();
})();
