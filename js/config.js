window.INAV = window.INAV || {};

INAV.config = {
  STAGE_W: 1280,
  STAGE_H: 720,
  TASKBAR_H: 56,

  CAP: 18,
  ROUND_SECONDS: 60,

  FIRST_SPAWN_MS: 600,
  // Spawns per second at each keyframe: 1.0 flat to 0:10, 3.0 at 0:30, 5.0 at 1:00.
  // Gaps interpolate linearly in milliseconds, so the rate curve is back-loaded:
  // it still reads as ~1/s until about 0:22, then accelerates hard.
  SPAWN_RAMP: [
    { t: 0, ms: 1000 },
    { t: 10, ms: 1000 },
    { t: 30, ms: 333 },
    { t: 60, ms: 200 },
  ],
  SPAWN_JITTER_PCT: 0.3,
  MAX_DT_MS: 100,

  SPAWN_GRID: { cols: 6, rows: 3 },
  SPAWN_JITTER: 6,

  POPUP_W: { min: 225, max: 255 },
  POPUP_H: { min: 190, max: 210 },
  SAFE: { left: 16, top: 16, right: 16, bottom: 16 },

  CLOSE_ANIM_MS: 100,
  END_LOCKOUT_MS: 500,

  CRASH_DELAY_MS: 420,
  CRASH_PCT_TICK_MS: 90,
  CRASH_PCT_STEP_MAX: 9,
  CLOCK_TICK_MS: 10000,
  GHOST_TOGGLE_MS: { min: 200, max: 700 },
  GHOSTS: { count: 10, w: { min: 230, max: 285 }, h: { min: 160, max: 180 } },
  GHOST_COPY: { title: "popup", message: "popup" },
  GHOST_MARGIN: 16,
  GHOST_TRIES: 16,
  GHOST_MIN_DISTANCE: 340,
  GHOST_OVERLAP_MAX: 0.5,
  PRACTICE_START_DELAY_MS: 250,

  STORAGE_KEYS: { last: "inav.last", best: "inav.best" },

  PRACTICE: {
    title: "practice_popup.exe",
    type: "plain",
    message: "Click anywhere on me to close me. That's the whole trick.",
    w: 330,
    h: 170,
    y: 150,
  },

  POPUP_TYPES: [
    {
      id: "plain",
      weight: 4,
      titles: ["System Alert", "Congratulations!", "hot_deals.exe", "toolbar_setup.exe"],
      messages: [
        "You are visitor #1,000,000!",
        "Your toolbar is out of date.",
        "99% off a new mouse!",
        "Allow notifications?",
      ],
    },
    {
      id: "warning",
      weight: 3,
      titles: ["WARNING.exe", "Low Disk Space", "Update Required"],
      messages: [
        "Your PC is running SLOW!",
        "Low disk vibes detected.",
        "Your warranty is expiring.",
      ],
    },
    {
      id: "error",
      weight: 2,
      titles: ["CRITICAL ERROR", "virus_found.exe", "SECURITY ALERT"],
      messages: [
        "3 viruses found. Clean now?",
        "Your files are at risk!",
        "Unauthorized access detected.",
      ],
    },
    {
      id: "download",
      weight: 2,
      titles: ["definitely_safe.zip", "FreeRAM_Download", "setup_1.exe"],
      messages: [
        "> downloading payload...",
        "> unpacking 16GB of RAM...",
        "> installing 4 toolbars...",
      ],
    },
  ],

  BUTTONS: [
    ["OK", "Cancel"],
    ["Claim", "Later"],
    ["Fix now", "No"],
    ["Yes", "Also yes"],
  ],
};
