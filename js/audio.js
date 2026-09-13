(function () {
  const C = INAV.config;
  const A = C.AUDIO;

  // One pool of <audio> elements per sound. Web Audio would be the nicer API,
  // but it needs fetch() to decode a buffer and fetch() cannot read a local
  // file from a file:// page -- which is how this game is meant to open. An
  // <audio> element loads there fine, so that is what this uses.
  const pools = {};

  const loops = {};

  function build(name) {
    const cfg = A.SOUNDS[name];
    const voices = [];
    for (let i = 0; i < cfg.voices; i++) {
      const el = new Audio(cfg.src);
      el.preload = "auto";
      el.volume = Math.min(1, cfg.volume * A.MASTER);
      voices.push(el);
    }
    return { cfg: cfg, voices: voices, next: 0, lastAt: 0 };
  }

  function freeVoice(pool) {
    // Prefer one that has finished; otherwise steal the oldest, which is what
    // caps how many copies of a sound can stack up at once.
    for (const el of pool.voices) {
      if (el.paused || el.ended) return el;
    }
    const el = pool.voices[pool.next];
    pool.next = (pool.next + 1) % pool.voices.length;
    return el;
  }

  function start(el, cfg) {
    try {
      el.currentTime = cfg.offset || 0;
    } catch (e) {}
    const p = el.play();
    if (p && p.catch) {
      p.catch(() => {
        // Blocked by autoplay policy, or interrupted by a newer play() on the
        // same element. Neither is worth surfacing to the player.
      });
    }
    return p;
  }

  INAV.audio = {
    init() {
      if (!A.ENABLED) return;
      Object.keys(A.SOUNDS).forEach((name) => {
        pools[name] = build(name);
      });
    },

    play(name) {
      if (!A.ENABLED) return;
      const pool = pools[name];
      if (!pool) return;

      // Rate limit so a dense stretch of spawns doesn't turn into a solid wall
      // of noise -- by the last ten seconds the game spawns over five a second.
      const now = Date.now();
      if (pool.cfg.minGapMs && now - pool.lastAt < pool.cfg.minGapMs) return;
      pool.lastAt = now;

      start(freeVoice(pool), pool.cfg);
    },

    // Plays now and again every `everyMs` until stopped. Used for the crash
    // screen's error tone.
    startLoop(name, everyMs) {
      if (!A.ENABLED) return;
      this.stopLoop(name);
      this.play(name);
      loops[name] = setInterval(() => INAV.audio.play(name), everyMs);
    },

    stopLoop(name) {
      if (loops[name]) {
        clearInterval(loops[name]);
        delete loops[name];
      }
      const pool = pools[name];
      if (!pool) return;
      pool.voices.forEach((el) => {
        if (!el.paused) {
          el.pause();
          try {
            el.currentTime = pool.cfg.offset || 0;
          } catch (e) {}
        }
      });
    },

    stopAll() {
      Object.keys(loops).forEach((name) => INAV.audio.stopLoop(name));
    },
  };
})();
