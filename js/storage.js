(function () {
  const memory = {};

  INAV.storage = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        if (raw !== null) return JSON.parse(raw);
      } catch (e) {}
      return key in memory ? memory[key] : fallback;
    },

    set(key, value) {
      memory[key] = value;
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {}
    },
  };
})();
