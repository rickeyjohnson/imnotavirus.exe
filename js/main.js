(function () {
  const $ = (id) => document.getElementById(id);

  INAV.stage.init($("stage"));
  INAV.hud.init();
  INAV.debug.init($("debug"));
  INAV.screens.init();
  INAV.popups.init($("popups"), (el) => INAV.game.handleClose(el));
  INAV.game.init((phase, s) => INAV.screens.show(phase, s));
  INAV.wheel.init();

  $("wheel-btn").addEventListener("click", () => {
    if (INAV.wheel.action() === "board") {
      INAV.game.showBoard();
      return;
    }
    INAV.game.startTutorial();
  });
  $("board-btn").addEventListener("click", () => INAV.game.showBoard());
  $("board-close").addEventListener("click", () => INAV.game.closeBoard());
  $("board-back").addEventListener("click", () => INAV.game.closeBoard());
  $("try-again-btn").addEventListener("click", () => INAV.game.goTitle());
  $("play-again-btn").addEventListener("click", () => INAV.game.goTitle());
  $("start-menu").addEventListener("click", () => INAV.game.togglePause());
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
