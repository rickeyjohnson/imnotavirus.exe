-- imnotavirus.exe -- leaderboard schema
--
-- Paste this whole file into the Supabase SQL Editor (SQL Editor -> New
-- query) and run it once, right after creating the project. It creates the
-- table the game reads and writes through the auto-generated REST API,
-- with row-level security so a visitor can insert and read scores but never
-- rewrite or delete one, and a name filter that mirrors js/names.js so a
-- direct API call can't post a name the game's own UI would have refused.
--
-- Re-running this file is safe: every statement is written to not fail if
-- it has already been applied.

create table if not exists public.scores (
  id bigint generated always as identity primary key,
  name text not null,
  score integer not null,
  won boolean not null default true,
  client_id text not null,
  created_at timestamptz not null default now(),

  -- Mirrors js/names.js's charset rule exactly: 1-12 characters, letters,
  -- digits and spaces only.
  constraint scores_name_charset check (name ~ '^[A-Za-z0-9 ]{1,12}$'),
  -- Mirrors js/config.js's LEADERBOARD.SCORE_MAX. A round spawns at most
  -- ~170 pop-ups even on an unlucky roll, so 250 is comfortably above any
  -- honest score while still rejecting an obvious 99999.
  constraint scores_score_range check (score between 0 and 250),
  constraint scores_client_id_length check (char_length(client_id) between 1 and 64)
);

-- Read and insert are the only two things the site is ever allowed to do,
-- so update and delete get no policy at all -- under row-level security
-- that means "refused", full stop, not "refused unless you're the owner".
alter table public.scores enable row level security;

drop policy if exists "scores are publicly readable" on public.scores;
create policy "scores are publicly readable"
  on public.scores for select
  using (true);

drop policy if exists "anyone can submit a score" on public.scores;
create policy "anyone can submit a score"
  on public.scores for insert
  with check (true);

-- Every leaderboard query orders by score desc, then by created_at asc to
-- break ties -- this index makes both that query and the rank-counting
-- query in js/leaderboard-supabase.js fast without a sequential scan.
create index if not exists scores_score_created_idx
  on public.scores (score desc, created_at asc);

-- Server-side name filter, mirroring js/names.js's BLOCKED_ANYWHERE and
-- BLOCKED_WORDS. The client already runs this exact filter before a score
-- is ever submitted -- this trigger exists only to catch someone who posts
-- straight to the REST API and skips the game's own UI. It is deliberately
-- not byte-for-byte identical to the client (see the note on span checking
-- below); it is the floor, not a duplicate of the speed bump.
create or replace function public.reject_blocked_names()
returns trigger
language plpgsql
as $$
declare
  folded text;
  compact text;
  words text[];
  n int;
  span text;
  i int;
  j int;
  out_text text := '';
  ch text;
  blocked_anywhere text[] := array[
    'fuck','bitch','faggot','whore','dildo','bastard','wank','jizz',
    'clit','scrotum','molest','nigger','nigga','niggaz'
  ];
  blocked_words text[] := array[
    'anus','arse','arsehole','ass','asses','asshole','assholes',
    'badass','bollocks','boner','bullshit','cock','cocks','cocksucker',
    'coon','coons','cum','cunt','cunts','dick','dickhead','dicks',
    'dumbass','dyke','fag','fags','jackass','kike','masshole','nazi',
    'penis','piss','porn','prick','pussy','queer','rape','rapist',
    'retard','sex','shit','shithead','shitty','slut','smartass','spic',
    'tits','tranny','twat','vagina','wanker'
  ];
begin
  -- normalise(): fold leetspeak, drop anything that isn't a letter or a
  -- space, collapse whitespace. Postgres regex doesn't support a
  -- backreference inside the search pattern, so the "collapse runs of 3+
  -- identical characters" step (fuuuuck -> fuck) is a small loop instead of
  -- the single regex js/names.js uses for the same thing.
  folded := lower(new.name);
  folded := translate(folded, '013457!@$', 'oieastias');
  folded := regexp_replace(folded, '[^a-z ]', '', 'g');
  folded := trim(regexp_replace(folded, '\s+', ' ', 'g'));

  for i in 1..length(folded) loop
    ch := substr(folded, i, 1);
    if i >= 3 and ch = substr(folded, i - 1, 1) and ch = substr(folded, i - 2, 1) then
      continue;
    end if;
    out_text := out_text || ch;
  end loop;
  folded := out_text;

  compact := replace(folded, ' ', '');
  words := regexp_split_to_array(folded, ' ');
  n := array_length(words, 1);

  foreach ch in array blocked_anywhere loop
    if position(ch in compact) > 0 then
      raise exception 'blocked_name' using errcode = 'P0001';
    end if;
  end loop;

  -- A blocked word can be spelled across token boundaries ("a ss hole"), so
  -- test every contiguous run of tokens joined together -- the same span
  -- check js/names.js runs client-side, as an equality match, never a
  -- substring one: "bassplayer" must not match "ass".
  if n is not null then
    for i in 1..n loop
      span := '';
      for j in i..n loop
        span := span || words[j];
        if span = any(blocked_words) then
          raise exception 'blocked_name' using errcode = 'P0001';
        end if;
      end loop;
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists scores_reject_blocked_names on public.scores;
create trigger scores_reject_blocked_names
  before insert on public.scores
  for each row
  execute function public.reject_blocked_names();
