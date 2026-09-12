(function () {
  const C = INAV.config;

  const LEET = { "0": "o", "1": "i", "!": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s" };

  // Matched anywhere in the name. Deliberately over-broad: these also catch a
  // few innocent words ("Scunthorpe", "niggle"), which is the trade we want —
  // a false positive costs a retype, a false negative goes on a public board.
  const BLOCKED_ANYWHERE = [
    "fuck", "cunt", "bitch", "nigg", "faggot", "whore", "dildo", "bastard",
    "wank", "jizz", "clit", "scrotum", "penis", "vagina", "molest",
  ];

  // Short or word-forming: whole-word matches only. Substring-matching these
  // is the Scunthorpe problem — "ass" is inside "classic", "arse" inside
  // "sparse", "cum" inside "cumulus", "sex" inside "Essex".
  const BLOCKED_WORDS = [
    "anus", "arse", "ass", "bollocks", "boner", "cock", "coon", "cum", "dick",
    "dyke", "fag", "kike", "nazi", "piss", "porn", "prick", "pussy", "queer",
    "rape", "retard", "sex", "shit", "slut", "spic", "tits", "tranny", "twat",
  ];

  // Folds leetspeak, drops anything that isn't a letter or a space, and
  // collapses runs of THREE or more so "fuuuuck" becomes "fuck" while "ass"
  // survives with both letters intact.
  function normalise(raw) {
    return String(raw == null ? "" : raw)
      .toLowerCase()
      .replace(/[013457!@$]/g, (ch) => LEET[ch] || ch)
      .replace(/[^a-z ]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/(.)\1{2,}/g, "$1");
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
    const compact = folded.replace(/ /g, "");
    const words = folded.split(" ").filter(Boolean);

    // Spacing a word out is the obvious way past a whole-word filter, so join
    // runs of single-character tokens: "a s s player" -> ["ass", "player"],
    // while "bass player" keeps its tokens and stays allowed.
    const joined = [];
    let run = "";
    words.forEach((word) => {
      if (word.length === 1) {
        run += word;
        return;
      }
      if (run) {
        joined.push(run);
        run = "";
      }
      joined.push(word);
    });
    if (run) joined.push(run);

    const isWord = (w) => words.includes(w) || joined.includes(w) || compact === w;

    if (BLOCKED_ANYWHERE.some((w) => compact.includes(w))) return { ok: false, error: "Pick a different name." };
    if (BLOCKED_WORDS.some(isWord)) return { ok: false, error: "Pick a different name." };

    return { ok: true, name: name };
  }

  INAV.names = { check, normalise };
})();
