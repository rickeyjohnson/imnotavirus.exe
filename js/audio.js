(function () {
  const C = INAV.config;
  const A = C.AUDIO;

  // One pool of <audio> elements per sound. Web Audio would be the nicer API,
  // but it needs fetch() to decode a buffer and fetch() cannot read a local
  // file from a file:// page -- which is how this game is meant to open. An
  // <audio> element loads there fine, so that is what this uses.
  const pools = {};
  const loops = {};

  let muted = false;

  // A sound the browser refused to start because the player hadn't
  // interacted with the page yet. Autoplay policy blocks audio until a real
  // gesture, so the title music is held here and started by the first click
  // or key press -- but only if its loop is still running by then.
  let pending = null;

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

  function silence(pool) {
    pool.voices.forEach((el) => {
      if (!el.paused) el.pause();
      try {
        el.currentTime = pool.cfg.offset || 0;
      } catch (e) {}
    });
  }

  function start(name, pool) {
    const el = freeVoice(pool);
    try {
      el.currentTime = pool.cfg.offset || 0;
    } catch (e) {}
    const p = el.play();
    if (p && p.catch) {
      p.catch((err) => {
        // NotAllowedError is the autoplay block. Anything else -- a newer
        // play() interrupting this one, a voice being paused on screen exit --
        // is routine and not worth surfacing.
        if (err && err.name === "NotAllowedError" && pool.cfg.holdUntilUnlocked) pending = name;
      });
    }
  }

  // Runs after the game's own click and key handlers (bubble phase on the
  // window), so if that click just left the title screen the loop is already
  // stopped and the held music is dropped rather than blurted out.
  function retryPending() {
    if (!pending || muted) return;
    const name = pending;
    pending = null;
    if (loops[name] && pools[name]) start(name, pools[name]);
  }

  INAV.audio = {
    init() {
      if (!A.ENABLED) return;
      muted = INAV.storage.get(C.STORAGE_KEYS.muted, false) === true;
      Object.keys(A.SOUNDS).forEach((name) => {
        pools[name] = build(name);
      });
      window.addEventListener("click", retryPending);
      window.addEventListener("keydown", retryPending);
    },

    play(name) {
      if (!A.ENABLED || muted) return;
      const pool = pools[name];
      if (!pool) return;

      // Rate limit so a dense stretch of spawns doesn't turn into a solid wall
      // of noise -- by the last ten seconds the game spawns over five a second.
      const now = Date.now();
      if (pool.cfg.minGapMs && now - pool.lastAt < pool.cfg.minGapMs) return;
      pool.lastAt = now;

      start(name, pool);
    },

    // Plays now and again every `everyMs` until stopped. The loop keeps
    // ticking while muted, so unmuting picks the rhythm back up rather than
    // restarting it.
    startLoop(name, everyMs) {
      if (!A.ENABLED) return;
      this.stopLoop(name);
      loops[name] = setInterval(() => INAV.audio.play(name), everyMs);
      this.play(name);
    },

    stopLoop(name) {
      if (loops[name]) {
        clearInterval(loops[name]);
        delete loops[name];
      }
      if (pending === name) pending = null;
      if (pools[name]) silence(pools[name]);
    },

    stopAll() {
      Object.keys(loops).forEach((name) => INAV.audio.stopLoop(name));
    },

    isMuted() {
      return muted;
    },

    setMuted(on) {
      muted = !!on;
      INAV.storage.set(C.STORAGE_KEYS.muted, muted);
      if (muted) {
        pending = null;
        Object.keys(pools).forEach((name) => silence(pools[name]));
      }
    },
  };
})();
