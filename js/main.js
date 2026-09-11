(function () {
  const C = INAV.config;
  const $ = (id) => document.getElementById(id);

  INAV.stage.init($("stage"));
  INAV.hud.init();
  INAV.debug.init($("debug"));
  INAV.popups.init($("popups"), () => INAV.game.handleClose());

  INAV.game.init((result, s) => {
    if (result === "crash") {
      $("end-title").textContent = "CRASHED";
      $("end-detail").textContent =
        `${C.CAP} pop-ups were open at ${s.t.toFixed(1)}s. You closed ${s.score}.`;
    } else {
      $("end-title").textContent = "SURVIVED";
      $("end-detail").textContent = `Antivirus installed. You closed ${s.score}.`;
    }
    INAV.screens.show("end");
    $("restart-btn").focus();
  });

  function begin() {
    INAV.game.start();
    INAV.screens.show("play");
  }

  $("start-btn").addEventListener("click", begin);
  $("restart-btn").addEventListener("click", begin);

  INAV.screens.show("start");
})();
