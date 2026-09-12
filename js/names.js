(function () {
  const C = INAV.config;

  // Leetspeak folding, so "n00b" and "noob" hit the same blocklist entry.
  const LEET = { "0": "o", "1": "i", "!": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s" };

  // Deliberately short and dull. It is a speed bump, not a guarantee, and the
  // real floor is the server-side copy added in phase 2.
  const BLOCKED = [
    "anus", "arse", "ass", "bastard", "bitch", "bollocks", "boner", "clit",
    "cock", "coon", "cum", "cunt", "dick", "dildo", "dyke", "fag", "faggot",
    "fuck", "jizz", "kike", "nazi", "nigg", "penis", "piss", "porn", "prick",
    "pussy", "queer", "rape", "retard", "scrotum", "sex", "shit", "slut",
    "spic", "tits", "tranny", "twat", "vagina", "wank", "whore",
  ];

  function normalise(raw) {
    return String(raw == null ? "" : raw)
      .toLowerCase()
      .replace(/[^a-z0-9!@$]/g, "")
      .replace(/[013457!@$]/g, (ch) => LEET[ch] || ch)
      .replace(/(.)\1+/g, "$1");
  }

  function check(raw) {
    const name = String(raw == null ? "" : raw).trim().replace(/\s+/g, " ");

    if (!name) return { ok: false, error: "Type a name first." };
    if (name.length > C.LEADERBOARD.NAME_MAX) {
      return { ok: false, error: "Names are " + C.LEADERBOARD.NAME_MAX + " characters or fewer." };
    }

    const bad = name.match(/[^A-Za-z0-9 ]/);
    if (bad) return { ok: false, error: "“" + bad[0] + "” isn't allowed — letters, numbers and spaces only." };

    const folded = normalise(name);
    if (BLOCKED.some((word) => folded.includes(word))) {
      return { ok: false, error: "Pick a different name." };
    }

    return { ok: true, name: name };
  }

  INAV.names = { check, normalise };
})();
