(function () {
  const C = INAV.config;

  const LEET = { "0": "o", "1": "i", "!": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s" };

  // Matched anywhere in the fully compacted name (spaces stripped). These are
  // slurs/profanity with no ordinary-word collisions worth worrying about.
  const BLOCKED_ANYWHERE = [
    "fuck", "bitch", "faggot", "whore", "dildo", "bastard",
    "wank", "jizz", "clit", "scrotum", "penis", "vagina", "molest",
  ];

  // Short or word-forming: these would wrongly catch ordinary words as
  // substrings ("ass" inside "classic", "arse" inside "sparse", "cum" inside
  // "cumulus", "sex" inside "Essex"), so they're substring-matched only after
  // ALLOW has stripped the tokens that would trigger those false positives.
  const BLOCKED_WORDS = [
    "anus", "arse", "ass", "bollocks", "boner", "cock", "coon", "cum", "cunt",
    "dick", "dyke", "fag", "kike", "nazi", "nigg", "piss", "porn", "prick",
    "pussy", "queer", "rape", "retard", "sex", "shit", "slut", "spic", "tits",
    "tranny", "twat",
  ];

  // Innocent stems. A folded token that STARTS WITH one of these is dropped
  // before the BLOCKED_WORDS substring check, so real words and names built
  // on top of a blocked fragment ("classic", "Hancock", "Cassidy") survive
  // while the fragment itself ("ass", "cock", "ass") stays caught everywhere
  // else. Grouped by which BLOCKED_WORDS entry they'd otherwise trip.
  const ALLOW = [
    // anus
    "uranus", "manuscript",
    // arse
    "spars", "coars", "hoars", "pars", "arsen", "marseill",
    // ass
    "bass", "class", "glass", "grass", "brass", "mass", "pass", "compass",
    "bypass", "surpass", "trespass", "harass", "embarrass", "molasses",
    "assassin", "assess", "assist", "associate", "assign", "asset",
    "assemble", "assume", "assault", "assortment", "cass", "sassy",
    "lassie", "nassau", "massachusetts",
    // cock
    "cockpit", "cocktail", "cockroach", "cockerel", "cockney", "cockatoo",
    "peacock", "shuttlecock", "woodcock", "hancock", "babcock", "hitchcock",
    "alcock", "adcock", "cockburn",
    // coon
    "raccoon", "racoon", "cocoon", "tycoon",
    // cum
    "cumul", "accumul", "cumbersome", "cumming", "circumstance",
    "circumference", "circumvent", "encumber", "incumbent", "recumbent",
    "cucumber", "document",
    // cunt
    "scunthorpe",
    // dick
    "dickens", "dickinson", "dickson", "dickerson", "dickie", "dicky",
    // nigg
    "niggle", "niggardly",
    // piss
    "pissarro",
    // prick
    "prickl",
    // pussy
    "pussycat", "pussywillow",
    // rape
    "grape", "drape",
    // retard
    "retardant",
    // sex
    "essex", "sussex", "middlesex", "sextant", "sextet", "sexton",
    "sextuplet", "asexual",
    // spic
    "spice", "spicy", "despicable", "hospice", "conspicuous", "auspic",
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

    // Drop innocent tokens first, then concatenate the survivors and
    // substring-match against that. This catches fused compounds
    // ("asshole", "jackass", "bullshit") and token-straddling splits
    // ("a ss hole", "as hit") alike, without flagging words ALLOW cleared.
    const survivors = words.filter((w) => !ALLOW.some((stem) => w.startsWith(stem)));
    const filtered = survivors.join("");

    if (BLOCKED_ANYWHERE.some((w) => compact.includes(w))) return { ok: false, error: "Pick a different name." };
    if (BLOCKED_WORDS.some((w) => filtered.includes(w))) return { ok: false, error: "Pick a different name." };

    return { ok: true, name: name };
  }

  INAV.names = { check, normalise };
})();
