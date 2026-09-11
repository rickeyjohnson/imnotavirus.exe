(function () {
  const $ = (id) => document.getElementById(id);

  INAV.stage.init($("stage"));
  INAV.hud.init();
  INAV.debug.init($("debug"));
  INAV.screens.init();
  INAV.popups.init($("popups"), (el) => INAV.game.handleClose(el));
  INAV.game.init((phase, s) => INAV.screens.show(phase, s));

  $("start-btn").addEventListener("click", () => INAV.game.startTutorial());
  $("try-again-btn").addEventListener("click", () => INAV.game.goTitle());
  $("play-again-btn").addEventListener("click", () => INAV.game.goTitle());
  $("resume-btn").addEventListener("click", () => INAV.game.togglePause());
  $("start-menu").addEventListener("click", (e) => {
    INAV.game.togglePause();
    e.currentTarget.blur();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !e.repeat) INAV.game.togglePause();
  });

  INAV.game.goTitle();
})();
