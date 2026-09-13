(function () {
  const C = INAV.config;

  const LEET = { "0": "o", "1": "i", "!": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s" };

  // Long and unambiguous — these cannot occur inside a real name or ordinary
  // word, so matching them anywhere in the name is safe.
  const BLOCKED_ANYWHERE = [
    "fuck", "bitch", "faggot", "whore", "dildo", "bastard", "wank", "jizz",
    "clit", "scrotum", "molest", "nigger", "nigga", "niggaz",
  ];

  // Short, or found inside real names and ordinary words. Matched ONLY as a
  // whole token, the whole name, or a run of tokens joined together — never as
  // a substring. "Assange", "Nasser", "Fagan", "Cockcroft", "Prickett" and
  // "sparse" are real names and words; refusing one of those is a false
  // accusation against a real person, which is worse than letting an
  // obfuscated spelling like "cassholes" through. Compounds are listed
  // explicitly because substring matching is what we gave up to get here.
  const BLOCKED_WORDS = [
    "anus", "arse", "arsehole", "ass", "asses", "asshole", "assholes",
    "badass", "bollocks", "boner", "bullshit", "cock", "cocks", "cocksucker",
    "coon", "coons", "cum", "cunt", "cunts", "dick", "dickhead", "dicks",
    "dumbass", "dyke", "fag", "fags", "jackass", "kike", "masshole", "nazi",
    "penis", "piss", "porn", "prick", "pussy", "queer", "rape", "rapist",
    "retard", "sex", "shit", "shithead", "shitty", "slut", "smartass", "spic",
    "tits", "tranny", "twat", "vagina", "wanker",
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

    // A blocked word can be spelled across token boundaries ("a ss hole"), so
    // test every contiguous run of tokens joined together. These are equality
    // matches, never substring ones: the span "bassplayer" must not match
    // "ass", which is the whole reason this list is separate.
    const spans = [];
    for (let i = 0; i < words.length; i++) {
      let span = "";
      for (let j = i; j < words.length; j++) {
        span += words[j];
        spans.push(span);
      }
    }

    const isWord = (w) => spans.indexOf(w) !== -1;

    if (BLOCKED_ANYWHERE.some((w) => compact.includes(w))) return { ok: false, error: "Pick a different name." };
    if (BLOCKED_WORDS.some(isWord)) return { ok: false, error: "Pick a different name." };

    return { ok: true, name: name };
  }

  INAV.names = { check, normalise };
})();
