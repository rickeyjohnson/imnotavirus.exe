(function () {
  const memory = {};

  INAV.storage = {
    get(key, fallback) {
      if (Object.prototype.hasOwnProperty.call(memory, key)) return memory[key];
      try {
        const raw = localStorage.getItem(key);
        if (raw !== null) return JSON.parse(raw);
      } catch (e) {}
      return fallback;
    },

    set(key, value) {
      memory[key] = value;
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {}
    },
  };
})();
