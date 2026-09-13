window.INAV = window.INAV || {};

INAV.config = {
  STAGE_W: 1280,
  STAGE_H: 720,
  TASKBAR_H: 56,

  CAP: 15,
  ROUND_SECONDS: 60,

  FIRST_SPAWN_MS: 600,
  // Each keyframe is a RANGE, rolled fresh at the start of every round, so no
  // two rounds ramp identically. `slow` and `fast` are gaps in milliseconds —
  // a bigger gap is an easier round. The roll is clamped monotonic, so a round
  // can never get slower as it goes on.
  //
  // The t=40 keyframe exists to make the last twenty seconds their own, steeper
  // segment rather than a straight interpolation from 0:30 to the end.
  //
  // Spawns per second at each keyframe: ~0.93-1.0 until 0:10, 2.7-3.0 at 0:30,
  // 3.4-3.9 at 0:40, 4.0-5.5 at 1:00.
  //
  // Measured over 2000 simulated rounds per click speed: 3.0 clicks/sec never
  // survives, 3.2 wins 6% of the time, 3.5 is a coin flip at 53%, 3.8 wins 97%.
  SPAWN_RAMP_RANGE: [
    { t: 0, slow: 1080, fast: 1000 },
    { t: 10, slow: 1050, fast: 1000 },
    { t: 30, slow: 370, fast: 333 },
    { t: 40, slow: 292, fast: 255 },
    { t: 60, slow: 250, fast: 182 },
  ],
  // The roll is deliberately not uniform: `Math.random()` is raised to 1/BIAS,
  // which pushes it toward each keyframe's `fast` (harder) end. 1 would be an
  // even spread; 2 lands the median at roughly two thirds of the way up the
  // range. Easy rounds still happen, they are just no longer as common as hard
  // ones.
  SPAWN_ROLL_BIAS: 2,
  SPAWN_JITTER_PCT: 0.3,
  MAX_DT_MS: 100,

  SPAWN_GRID: { cols: 6, rows: 3 },
  SPAWN_JITTER: 6,

  POPUP_W: { min: 225, max: 255 },
  POPUP_H: { min: 190, max: 210 },
  SAFE: { left: 16, top: 16, right: 16, bottom: 16 },
  SOUND_TOGGLE_CLEARANCE: 10,

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
    muted: "inav.muted",
  },

  // Volumes are RMS-matched from the actual decoded files, not picked by ear.
  // Raw levels were nearly 9x apart (button_click 0.036 RMS, failed_error
  // 0.306), which is exactly how one sound ends up drowning another. Each
  // volume below brings its file to roughly the same perceived level, then the
  // two "moment" sounds -- the title music and the crash tone -- are nudged up
  // on purpose, since nothing competes with them.
  //
  // `offset` skips measured leading silence. popup_clicked has 113 ms of it,
  // which would otherwise read as input lag on every close.
  AUDIO: {
    ENABLED: true,
    MASTER: 1,
    SOUNDS: {
      // Title screen. Browsers refuse sound until the player has interacted
      // with the page, so on a cold load this is held and played on the first
      // click or key press instead -- as long as the title screen is still up.
      startup: {
        src: "audio/windows_startup.mp3",
        volume: 0.7,
        offset: 0.1,
        voices: 1,
        holdUntilUnlocked: true,
      },
      // A pop-up arriving. Also used for the title screen's background ghosts.
      popup: { src: "audio/popup_appears.wav", volume: 1, offset: 0, voices: 6, minGapMs: 60 },
      // The player closing a pop-up.
      close: { src: "audio/popup_clicked.mp3", volume: 0.25, offset: 0.1, voices: 6, minGapMs: 45 },
      // Any UI button.
      button: { src: "audio/button_click.mp3", volume: 1, offset: 0.05, voices: 2 },
      // The crash screen.
      crash: { src: "audio/failed_error_screen.wav", volume: 0.3, offset: 0.04, voices: 1 },
    },
    STARTUP_REPEAT_MS: 30000,
    CRASH_REPEAT_MS: 60000,
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
