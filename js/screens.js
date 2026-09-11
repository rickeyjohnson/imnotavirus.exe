(function () {
  INAV.screens = {
    show(name) {
      document.querySelectorAll("[data-screen]").forEach((el) => {
        el.hidden = el.dataset.screen !== name;
      });
    },
  };
})();
