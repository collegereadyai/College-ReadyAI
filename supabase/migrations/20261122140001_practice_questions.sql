-- College ReadyAI — somewhere for practice questions to live.
--
-- `attempts.question_ref` was left as bare text, on the assumption that
-- questions would come from an external bank with its own identifiers. None
-- exists yet, so the questions need a home, and an attempt needs something it
-- can be checked against.
--
-- `origin` is `not null` and says where a question came from. The ten seeded
-- with this are practice questions written for the app — they are not past
-- papers, and the screen says so. A student who believes they are revising
-- real JAMB questions, and is not, has been misled about the one thing they
-- came here for.
--
-- `source_url` is nullable for the same reason as on scholarships: a question
-- written for practice has no page to point at, and pretending otherwise
-- would be worse than leaving it empty.

create table if not exists public.practice_questions (
  id            uuid primary key default gen_random_uuid(),
  ref           text unique,
  board         text not null check (board in ('JAMB', 'WAEC', 'NECO', 'OTHER')),
  subject       text not null,
  prompt        text not null check (length(btrim(prompt)) between 1 and 2000),

  options       text[] not null check (array_length(options, 1) between 2 and 6),
  -- Zero-based, and it has to point at an option that exists. Without this a
  -- question could be unanswerable and nobody would find out until a student
  -- got it wrong no matter what they picked.
  answer_index  int not null check (answer_index >= 0),

  explanation   text,

  -- Where this question came from, in words a student could read.
  origin        text not null,
  source_url    text,
  checked_on    date not null default current_date,

  constraint practice_questions_answer_in_range
    check (answer_index < array_length(options, 1))
);

create index if not exists practice_questions_board_subject_idx
  on public.practice_questions (board, subject);

alter table public.practice_questions enable row level security;

-- Reference data, like scholarships and institutions: readable by anyone, and
-- written only with the service key.
create policy practice_questions_read on public.practice_questions for select using (true);

grant select on public.practice_questions to anon, authenticated;

-- The original RLS migration said `grant all on all tables in schema public to
-- service_role`, which covered only the tables that existed when it ran. Every
-- table added afterwards has to say so itself, or the server cannot read its
-- own data. Worth remembering for the next one.
grant all on public.practice_questions to service_role;

comment on table public.practice_questions is
  'Practice questions. `origin` says where each came from; these are not past papers unless it says so.';
comment on column public.practice_questions.answer_index is
  'Zero-based index into options. Constrained to be a real option.';
