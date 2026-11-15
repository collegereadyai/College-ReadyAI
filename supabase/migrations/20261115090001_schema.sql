-- College ReadyAI — schema
--
-- Aligned to the product facts in the public site's content/site.js. Where this
-- file and that file disagree, that file wins: it is the founder's copy of the
-- plans, limits, stages and age rules.
--
-- Postgres (Supabase). Sign-in is Supabase Auth's job: this schema never stores a
-- password. Two rules shape it:
--
--   1. Personal data is split away from the roster. `profiles` holds what a
--      school's staff may see; `profile_private` holds the age band, guardian
--      contact, consent record and the student's own switches, and nobody but
--      the student (and the server) ever reads it.
--   2. Nothing here trusts the client. The age gate, the approval state and the
--      plan are set by triggers or the server, never by an UPDATE from the app.

-- gen_random_uuid() is core Postgres since 13, so no extension is needed.

-- ---------------------------------------------------------------- enumerations
-- Stage values match the sign-up form's <option value> exactly, so nothing has
-- to be translated between the site and the database.
create type cr_stage              as enum ('secondary', 'applying', 'university');

-- The sign-up form asks for a band, not a birth date — less personal data for
-- the same decision. '25plus' is not offered on the form; it exists for staff
-- accounts a school creates.
create type cr_age_band           as enum ('under13', '13-17', '18-24', '25plus');

create type cr_account_status     as enum ('pending_guardian', 'active', 'paused', 'closed');
create type cr_org_role           as enum ('teacher', 'school_admin');
create type cr_plan               as enum ('free', 'plus', 'pro', 'institution');
create type cr_cycle              as enum ('weekly', 'monthly', 'yearly');
create type cr_deck_status        as enum ('uploaded', 'extracting', 'generating', 'ready', 'failed');
create type cr_task_status        as enum ('todo', 'doing', 'done');
create type cr_guardian_decision  as enum ('pending', 'approved', 'declined', 'withdrawn');
create type cr_meter_window       as enum ('day', 'month');

-- ---------------------------------------------------------------- schools
create table public.orgs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(btrim(name)) between 2 and 160),
  kind        text not null default 'school' check (kind in ('school', 'centre', 'college', 'other')),
  state       text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- the roster
-- Safe to show a teacher. No age, no guardian contact, no email.
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  full_name     text not null check (length(btrim(full_name)) between 1 and 120),
  stage         cr_stage,
  class_level   text check (class_level is null or length(class_level) <= 40),
  state         text check (state is null or length(state) <= 60),
  status        cr_account_status not null default 'pending_guardian',
  approved      boolean not null default false,
  plan          cr_plan not null default 'free',
  org_id        uuid references public.orgs (id) on delete set null,
  last_seen_at  timestamptz,
  created_at    timestamptz not null default now(),
  constraint profiles_active_needs_approval check (status <> 'active' or approved)
);
create index profiles_org_idx on public.profiles (org_id) where org_id is not null;

-- ---------------------------------------------------------------- private half
-- `age_band` is what the sign-up form collects and what the age gate reads.
-- `date_of_birth` is optional: supply it and the gate prefers it, which is the
-- only way an account stops being a minor without someone asking again.
-- Consent is recorded, not assumed — the form requires the Terms and Privacy
-- box, so the columns are NOT NULL and the server must pass a time.
create table public.profile_private (
  id                   uuid primary key references public.profiles (id) on delete cascade,
  age_band             cr_age_band not null,
  date_of_birth        date,
  is_minor             boolean not null default true,
  guardian_email       text check (guardian_email is null or guardian_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  guardian_phone       text check (guardian_phone is null or length(guardian_phone) between 7 and 20),
  accepted_terms_at    timestamptz not null,
  accepted_privacy_at  timestamptz not null,
  policy_version       text not null default '2026-11',
  ai_training_opt_in   boolean not null default false,
  marketing_opt_in     boolean not null default false,
  created_at           timestamptz not null default now()
);

-- ---------------------------------------------------------------- approval
-- The site's own placeholders file asks for "a verifiable parent or guardian
-- approval step before enabling account creation for ages 13 to 17". The
-- sign-up form's tick box is a statement by the student, not the guardian.
-- This is that step: the guardian is not a user of the app and acts on a
-- tokenised link. Only the hash is stored, so a leaked row approves nothing.
create table public.guardian_requests (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.profiles (id) on delete cascade,
  sent_to      text not null,
  channel      text not null default 'email' check (channel in ('email', 'sms')),
  token_hash   text not null unique,
  decision     cr_guardian_decision not null default 'pending',
  decided_at   timestamptz,
  expires_at   timestamptz not null default now() + interval '30 days',
  created_at   timestamptz not null default now(),
  constraint guardian_decided_has_time check ((decision = 'pending') = (decided_at is null))
);
create index guardian_requests_student_idx on public.guardian_requests (student_id);

-- ---------------------------------------------------------------- school staff
create table public.org_members (
  org_id      uuid not null references public.orgs (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  role        cr_org_role not null,
  created_at  timestamptz not null default now(),
  primary key (org_id, user_id)
);

-- ---------------------------------------------------------------- the plan
create table public.goals (
  student_id        uuid primary key references public.profiles (id) on delete cascade,
  target_course     text,
  target_school     text,
  exam_on           date,
  hours_per_day     numeric(3,1) check (hours_per_day is null or hours_per_day between 0 and 24),
  study_style       text,
  hardest_subjects  text[] not null default '{}',
  updated_at        timestamptz not null default now()
);

create table public.tasks (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.profiles (id) on delete cascade,
  title       text not null check (length(btrim(title)) between 1 and 200),
  detail      text,
  due_on      date,
  minutes     int check (minutes is null or minutes between 1 and 600),
  status      cr_task_status not null default 'todo',
  created_at  timestamptz not null default now()
);
create index tasks_student_idx on public.tasks (student_id, status);

-- ---------------------------------------------------------------- study decks
-- The site offers "up to 10 files at a time", so a deck holds many files. The
-- two are metered separately: plans cap study decks per month and file uploads
-- per month with different numbers.
create table public.decks (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.profiles (id) on delete cascade,
  title         text not null default 'Study deck',
  status        cr_deck_status not null default 'uploaded',
  card_count    int not null default 0,
  error         text,
  created_at    timestamptz not null default now()
);
create index decks_student_idx on public.decks (student_id, created_at desc);

create table public.deck_files (
  id            uuid primary key default gen_random_uuid(),
  deck_id       uuid not null references public.decks (id) on delete cascade,
  file_name     text not null,
  storage_path  text not null unique,
  byte_size     bigint not null check (byte_size > 0 and byte_size <= 104857600), -- 100 MB per file
  page_count    int,
  created_at    timestamptz not null default now()
);
create index deck_files_deck_idx on public.deck_files (deck_id);

create table public.cards (
  id            uuid primary key default gen_random_uuid(),
  deck_id       uuid not null references public.decks (id) on delete cascade,
  question      text not null,
  answer        text not null,
  source_page   int,
  ai_generated  boolean not null default true,
  created_at    timestamptz not null default now()
);
create index cards_deck_idx on public.cards (deck_id);

-- ---------------------------------------------------------------- advisor
-- Never visible to a school. See the policies in 0004.
create table public.chats (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.profiles (id) on delete cascade,
  question    text not null,
  answer      text,
  is_ai       boolean not null default true,
  created_at  timestamptz not null default now()
);
create index chats_student_idx on public.chats (student_id, created_at desc);

-- ---------------------------------------------------------------- exams
-- A mock test is the metered unit ("1 mock test / month" on Free); an attempt is
-- one question inside one.
create table public.mock_tests (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.profiles (id) on delete cascade,
  board         text not null check (board in ('JAMB', 'WAEC', 'NECO', 'OTHER')),
  subject       text not null,
  question_count int not null default 0,
  started_at    timestamptz not null default now(),
  submitted_at  timestamptz,
  score         int
);
create index mock_tests_student_idx on public.mock_tests (student_id, started_at desc);

create table public.attempts (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.profiles (id) on delete cascade,
  mock_test_id  uuid references public.mock_tests (id) on delete cascade,
  subject       text not null,
  question_ref  text not null,
  chosen        text,
  correct       boolean,
  flagged       boolean not null default false,
  answered_at   timestamptz not null default now()
);
create index attempts_student_idx on public.attempts (student_id, answered_at desc);

-- ---------------------------------------------------------------- plans
-- Straight from content/site.js. A null means that window does not apply:
-- Free is capped per day, Plus and Pro per month.
create table public.plan_limits (
  plan                        cr_plan primary key,
  ai_messages_day             int,
  ai_messages_month           int,
  mock_tests_month            int,
  file_uploads_month          int,
  scholarship_matches_month   int,
  study_decks_month           int,
  priority_ai                 boolean not null default false
);
insert into public.plan_limits
  (plan, ai_messages_day, ai_messages_month, mock_tests_month, file_uploads_month, scholarship_matches_month, study_decks_month, priority_ai) values
  ('free',           3, null,  1,  3,  3,  1, false),
  ('plus',        null,  150,  4, 10, 10,  4, false),
  ('pro',         null,  400, 12, 30, 40, 20, true),
  ('institution', null,  400, 12, 30, 40, 20, true);   -- agreed per school; these are the defaults

-- Prices in kobo, so nothing is held as a float. Paid plans are not live yet;
-- these are the planned figures the site shows.
create table public.plan_prices (
  plan         cr_plan not null references public.plan_limits (plan),
  cycle        cr_cycle not null,
  amount_kobo  bigint not null check (amount_kobo >= 0),
  currency     text not null default 'NGN',
  primary key (plan, cycle)
);
insert into public.plan_prices (plan, cycle, amount_kobo) values
  ('free', 'weekly',        0), ('free', 'monthly',        0), ('free', 'yearly',         0),
  ('plus', 'weekly',   200000), ('plus', 'monthly',   500000), ('plus', 'yearly',   5400000),
  ('pro',  'weekly',   400000), ('pro',  'monthly',  1000000), ('pro',  'yearly',  10800000);

-- One row per student per window. Written by the server only: if the browser
-- could increment this, the limit would not be a limit.
-- `meter_window`, not `window`: WINDOW is a reserved word in Postgres.
create table public.usage_counters (
  student_id           uuid not null references public.profiles (id) on delete cascade,
  meter_window         cr_meter_window not null,
  period_start         date not null,
  ai_messages          int not null default 0 check (ai_messages >= 0),
  mock_tests           int not null default 0 check (mock_tests >= 0),
  file_uploads         int not null default 0 check (file_uploads >= 0),
  scholarship_matches  int not null default 0 check (scholarship_matches >= 0),
  study_decks          int not null default 0 check (study_decks >= 0),
  primary key (student_id, meter_window, period_start)
);

-- ---------------------------------------------------------------- reference data
-- Public, non-personal, and every row carries the official page it came from.
-- The site is explicit that suggestions are not guarantees and dates must be
-- checked with the provider, so `source_url` is required on all of these.
create table public.exam_dates (
  id          uuid primary key default gen_random_uuid(),
  board       text not null check (board in ('JAMB', 'WAEC', 'NECO', 'OTHER')),
  name        text not null,
  exam_on     date,
  source_url  text not null,
  checked_on  date not null default current_date
);

create table public.institutions (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  state       text,
  kind        text check (kind in ('university', 'polytechnic', 'college', 'other')),
  source_url  text not null,
  checked_on  date not null default current_date
);

create table public.courses (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions (id) on delete cascade,
  name            text not null,
  utme_subjects   text[] not null default '{}',
  note            text,
  source_url      text not null,
  checked_on      date not null default current_date
);
create index courses_institution_idx on public.courses (institution_id);

create table public.scholarships (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  provider      text,
  state         text,
  deadline_on   date,
  source_url    text not null,
  ai_suggested  boolean not null default false,
  checked_on    date not null default current_date
);

-- ------------------------------------------------------- scholarship matches
-- Metered: "3 scholarship matches / month" on Free. Kept per student so the
-- count is real rather than a number the browser reports. Defined here, after
-- `scholarships`, because it points at it.
create table public.scholarship_matches (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references public.profiles (id) on delete cascade,
  scholarship_id  uuid references public.scholarships (id) on delete set null,
  ai_suggested    boolean not null default true,
  matched_at      timestamptz not null default now()
);
create index scholarship_matches_student_idx on public.scholarship_matches (student_id, matched_at desc);
