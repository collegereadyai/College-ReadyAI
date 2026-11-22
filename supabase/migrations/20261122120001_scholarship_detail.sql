-- College ReadyAI — what a scholarship record has to carry.
--
-- The original table assumed every scholarship could be pointed at: source_url
-- was `not null`, on the principle that we never show a student something we
-- cannot send them to.
--
-- The research says otherwise. Of the twenty scholarships gathered so far, two
-- have an application link. The rest are real awards whose official page has
-- not been found yet, and dropping eighteen of twenty would not make a student
-- better informed — it would just hide what we know.
--
-- So the promise changes rather than weakens. A record may now arrive without
-- a link, but it must say how far it has been checked, and the screen shows
-- that next to the name. `verification` is `not null`, so a row cannot quietly
-- present itself as confirmed; the default is the most cautious value.
--
-- The warning the student sees when there is no link matters as much as the
-- record: scholarship scams charge to apply.

alter table public.scholarships
  -- Stable identifier from the research list (NG-001, INT-004 …), so a record
  -- can be re-checked and updated rather than duplicated on the next import.
  add column if not exists record_ref             text unique,

  add column if not exists scope                  text,
  add column if not exists country                text,
  add column if not exists continent              text,
  add column if not exists category               text,
  add column if not exists level                  text,
  add column if not exists level_note             text,

  add column if not exists eligibility            text,
  add column if not exists academic_requirements  text,
  add column if not exists nationality            text,

  add column if not exists funding_type           text,
  -- Free text, not a number: these are reported as "a one-time grant of
  -- ₦15,000" or "full tuition", and rounding that into a numeric column would
  -- invent a precision the source does not have.
  add column if not exists amount                 text,

  add column if not exists opens_on               date,

  -- Where a student actually applies, and where they read about it. Separate
  -- from source_url, which is where *we* found the record.
  add column if not exists application_url        text,
  add column if not exists info_url               text,

  add column if not exists documents              text,
  add column if not exists benefits               text,
  add column if not exists how_to_apply           text,
  add column if not exists status_note            text,

  add column if not exists verification           text not null default 'Unverified',
  add column if not exists verification_note      text,
  add column if not exists last_verified_on       date;

-- See the note above: a record without a link is still worth showing, as long
-- as it says so.
alter table public.scholarships alter column source_url drop not null;

alter table public.scholarships
  drop constraint if exists scholarships_verification_check;

alter table public.scholarships
  add constraint scholarships_verification_check
  check (verification in ('Unverified', 'Partially Verified', 'Verified'));

-- A record claiming to be verified has to say when it was checked. Without
-- this, 'Verified' is just a word someone typed.
alter table public.scholarships
  drop constraint if exists scholarships_verified_needs_date;

alter table public.scholarships
  add constraint scholarships_verified_needs_date
  check (verification <> 'Verified' or last_verified_on is not null);

create index if not exists scholarships_deadline_idx on public.scholarships (deadline_on);
create index if not exists scholarships_scope_idx on public.scholarships (scope);

comment on column public.scholarships.verification is
  'How far this record has been checked: Unverified, Partially Verified, Verified. Shown to the student beside the name.';
comment on column public.scholarships.source_url is
  'Where we found the record. Nullable: see 20261122120001_scholarship_detail.sql.';
