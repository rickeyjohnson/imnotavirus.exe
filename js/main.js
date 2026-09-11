(function () {
  INAV.stage.init(document.getElementById("stage"));
  INAV.popups.init(document.getElementById("popups"), () => {
    console.log("closed; open now:", INAV.popups.count());
  });
  INAV.popups.setEnabled(true);
})();
