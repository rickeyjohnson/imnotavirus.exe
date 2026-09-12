window.INAV = window.INAV || {};

INAV.config = {
  STAGE_W: 1280,
  STAGE_H: 720,
  TASKBAR_H: 56,

  CAP: 24,
  ROUND_SECONDS: 60,

  FIRST_SPAWN_MS: 600,
  INTERVAL_START_MS: 1000,
  INTERVAL_END_MS: 260,
  INTERVAL_CURVE: 0.55,
  MAX_DT_MS: 100,

  BURST_GAP_S: { min: 3, max: 6 },
  BURST_SIZE: { start: 2, end: 7 },
  SPAWN_MIN_DISTANCE: 420,
  SPAWN_PLACE_TRIES: 14,

  POPUP_W: { min: 195, max: 235 },
  POPUP_H: { min: 150, max: 170 },
  SAFE: { left: 130, top: 16, right: 16, bottom: 16 },

  CLOSE_ANIM_MS: 100,
  END_LOCKOUT_MS: 500,

  CRASH_DELAY_MS: 420,
  CRASH_PCT_TICK_MS: 90,
  CRASH_PCT_STEP_MAX: 9,
  CLOCK_TICK_MS: 10000,
  GHOST_TOGGLE_MS: { min: 200, max: 700 },
  GHOSTS: { count: 14, w: { min: 230, max: 285 }, h: { min: 160, max: 180 } },
  GHOST_MARGIN: 16,
  GHOST_TRIES: 16,
  GHOST_OVERLAP_MAX: 0.5,
  PRACTICE_START_DELAY_MS: 250,

  STORAGE_KEYS: { last: "inav.last", best: "inav.best" },

  PRACTICE: {
    title: "practice_popup.exe",
    message: "Click anywhere on me to close me. That's the whole trick.",
    w: 330,
    h: 170,
    y: 150,
  },

  WARN_AT: 7,
  CRIT_AT: 10,

  TITLES: [
    "WARNING.exe", "FreeRAM_Download", "YOU_WON!!!.exe", "System Alert", "toolbar_setup.exe",
    "Congratulations!", "hot_deals.exe", "PC_Cleaner_Pro", "Update Required", "definitely_safe.zip",
  ],
  MESSAGES: [
    "Your PC is running SLOW! Click to fix now.",
    "You are visitor #1,000,000! Claim your prize.",
    "Download 16GB more RAM for free!",
    "3 viruses found. Install cleaner?",
    "Your toolbar is out of date.",
    "Limited offer: 99% off a new mouse!",
    "Warning: low disk vibes detected.",
    "Allow notifications? (you have no choice)",
    "Your warranty is expiring. Probably.",
    "A new update is ready. And another.",
  ],

  BUTTONS: [
    ["OK", "Cancel"],
    ["Claim", "Later"],
    ["Fix now", "No"],
    ["Yes", "Also yes"],
  ],
};
