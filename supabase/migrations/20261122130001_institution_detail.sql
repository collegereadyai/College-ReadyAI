-- College ReadyAI — what a university record has to carry.
--
-- Unlike the scholarships, `source_url` stays `not null` here. Every one of
-- these records already points at the institution's own website, and a
-- university that cannot be linked to is not a university we should be
-- describing to a student.
--
-- The figures are a different matter. Acceptance rates and fees are given as
-- ranges because that is how they are known — "Under 10%", "₦150k – ₦350k /
-- yr" — and they change every year. They are text, not numbers: storing
-- "₦150k – ₦350k" as a numeric would mean picking one end of a range the
-- source never picked, and the screen would then quote a precise figure
-- nobody stated.
--
-- The screen carries the matching sentence: figures are rough estimates for
-- guidance only, confirm with the university, and we are not affiliated with
-- it. A student choosing where to apply on the strength of a stale fee
-- estimate is exactly the harm that line prevents.

alter table public.institutions
  -- Stable key from the research list (UL, CU, BU), so a re-import updates a
  -- record rather than adding a second copy of it.
  add column if not exists ref              text unique,

  -- 'Federal university', 'Private university' — narrower than `kind`, which
  -- separates universities from polytechnics and colleges.
  add column if not exists classification   text,

  add column if not exists about            text,
  add column if not exists established      int check (established is null or established between 1800 and 2100),

  add column if not exists acceptance_rate  text,
  add column if not exists acceptance_note  text,
  add column if not exists fees             text,
  add column if not exists fees_note        text,
  add column if not exists entry_exam       text,

  -- Whether this one was surfaced by the Advisor rather than browsed to. Shown
  -- as a label, so a student always knows which suggestions were machine-made.
  add column if not exists ai_suggested     boolean not null default false;

create index if not exists institutions_state_idx on public.institutions (state);

comment on column public.institutions.fees is
  'A range, as published, e.g. "₦150k – ₦350k / yr". Text on purpose: see 20261122130001_institution_detail.sql.';
comment on column public.institutions.acceptance_rate is
  'A range, as published, e.g. "Under 10%". Text on purpose, for the same reason as fees.';
