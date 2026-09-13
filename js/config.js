window.INAV = window.INAV || {};

INAV.config = {
  STAGE_W: 1280,
  STAGE_H: 720,
  TASKBAR_H: 56,

  CAP: 18,
  ROUND_SECONDS: 60,

  FIRST_SPAWN_MS: 600,
  // Each keyframe is a RANGE, rolled fresh at the start of every round, so no
  // two rounds ramp identically. `slow` and `fast` are gaps in milliseconds —
  // a bigger gap is an easier round. The bounds span the two ramps this game
  // has actually shipped: the eased one and the harder one before it, so the
  // last fifteen seconds land somewhere between about 3.3 and 4.4 spawns a
  // second. The roll is then forced to stay monotonic, so a round can never
  // get slower as it goes on.
  // Measured across 1500 simulated rounds per click speed: 2.5 clicks/sec
  // never survives, 2.8 wins a quarter of the time, 3.0 is a coin flip at 61%,
  // 3.2 wins 92%, 3.5 always wins. The roll is what turns the old hard cliff
  // between 2.5 and 3.0 into that gradient.
  SPAWN_RAMP_RANGE: [
    { t: 0, slow: 1080, fast: 1000 },
    { t: 10, slow: 1050, fast: 1000 },
    { t: 30, slow: 370, fast: 333 },
    { t: 60, slow: 270, fast: 200 },
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
  // Winning: the desk sweeps itself clear, holds a beat, then the wizard ticks its steps.
  WIN_SWEEP_STEP_MS: 50,
  WIN_SWEEP_HOLD_MS: 180,
  WIN_TICK_STEP_MS: 220,
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

  STORAGE_KEYS: {
    last: "inav.last",
    best: "inav.best",
    clientId: "inav.clientId",
    playerName: "inav.playerName",
    fakeRows: "inav.fakeRows",
  },

  // Project URL and anon/public key from Supabase's Project Settings -> API.
  // Both are meant to be public: the anon key only grants what the schema's
  // row-level security policies allow (insert and select, never update or
  // delete), so shipping it in this file -- and in the page's source, and in
  // git history -- is the intended way to use it, not a leak.
  SUPABASE: {
    URL: "https://cjqxzszojziapsiljqwr.supabase.co",
    ANON_KEY:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqcXh6c3pvanppYXBzaWxqcXdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyOTQzNjcsImV4cCI6MjEwNDg3MDM2N30.8hB_7u09JM_bhj84Jp4TmLUAtMaD2cUGfTLEjXNffbg",
  },

  LEADERBOARD: {
    VISIBLE: 25,
    WHEEL_MS: 3000,
    NAME_MAX: 12,
    SCORE_MAX: 250,
    FAKE_LATENCY_MS: { min: 220, max: 650 },
    SEED_COUNT: 30,
  },

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
