-- College Ready-AI — row-level security.
--
-- The shape of it:
--   * a student reaches their own rows, and only while the account is active;
--   * `profiles` is the one table a school's staff can read, and it holds nothing
--     personal — no date of birth, no guardian contact, no email. That is the
--     whole of "staff see progress, not private chats": there is no policy
--     anywhere that lets staff reach chats, decks, cards or attempts;
--   * the service role bypasses all of this, so the sign-up function, the
--     guardian link and the usage meter are the only writers of the columns
--     that matter.
--
-- Note: no table here uses FORCE ROW LEVEL SECURITY. The helpers in 0002 are
-- security definer and must not be filtered by the policies that call them.

alter table public.profiles           enable row level security;
alter table public.profile_private    enable row level security;
alter table public.guardian_requests  enable row level security;
alter table public.orgs               enable row level security;
alter table public.org_members        enable row level security;
alter table public.goals              enable row level security;
alter table public.tasks              enable row level security;
alter table public.decks               enable row level security;
alter table public.deck_files          enable row level security;
alter table public.cards               enable row level security;
alter table public.chats               enable row level security;
alter table public.mock_tests          enable row level security;
alter table public.attempts            enable row level security;
alter table public.scholarship_matches enable row level security;
alter table public.usage_counters      enable row level security;
alter table public.plan_limits         enable row level security;
alter table public.plan_prices         enable row level security;
alter table public.exam_dates         enable row level security;
alter table public.institutions       enable row level security;
alter table public.courses            enable row level security;
alter table public.scholarships       enable row level security;

-- ------------------------------------------------------------------ profiles
-- Readable while locked, so the "waiting for your guardian" screen can load.
create policy profiles_select_own on public.profiles
  for select using (id = public.cr_uid());

create policy profiles_select_staff on public.profiles
  for select using (public.cr_can_see_student(id));

create policy profiles_update_own on public.profiles
  for update using (id = public.cr_uid()) with check (id = public.cr_uid());

create policy profiles_delete_own on public.profiles
  for delete using (id = public.cr_uid());

-- ----------------------------------------------------------- profile_private
-- The student and the server. Nobody else, ever.
create policy private_select_own on public.profile_private
  for select using (id = public.cr_uid());

create policy private_insert_own on public.profile_private
  for insert with check (id = public.cr_uid());

create policy private_update_own on public.profile_private
  for update using (id = public.cr_uid()) with check (id = public.cr_uid());

-- -------------------------------------------------------- guardian_requests
-- Deliberately no policy. Only the service role may read or write these: the
-- token hash must never reach a browser, and a student must never be able to
-- approve themselves by writing their own request row.

-- ------------------------------------------------------------ schools, staff
create policy orgs_select_member on public.orgs
  for select using (public.cr_staff_of(id) or id = (select p.org_id from public.profiles p where p.id = public.cr_uid()));

create policy org_members_select on public.org_members
  for select using (user_id = public.cr_uid() or public.cr_staff_of(org_id));

-- ------------------------------------------------------- the student's work
-- One shape, repeated: your own row, and only while the account is open.
create policy goals_own on public.goals
  for all using (student_id = public.cr_uid() and public.cr_is_active())
  with check (student_id = public.cr_uid() and public.cr_is_active());

create policy tasks_own on public.tasks
  for all using (student_id = public.cr_uid() and public.cr_is_active())
  with check (student_id = public.cr_uid() and public.cr_is_active());

create policy decks_own on public.decks
  for all using (student_id = public.cr_uid() and public.cr_is_active())
  with check (student_id = public.cr_uid() and public.cr_is_active());

create policy cards_own on public.cards
  for all using (
    public.cr_is_active() and exists (
      select 1 from public.decks d where d.id = cards.deck_id and d.student_id = public.cr_uid()
    ))
  with check (
    public.cr_is_active() and exists (
      select 1 from public.decks d where d.id = cards.deck_id and d.student_id = public.cr_uid()
    ));

-- Files hang off a deck, so ownership is read through it, as with cards.
create policy deck_files_own on public.deck_files
  for all using (
    public.cr_is_active() and exists (
      select 1 from public.decks d where d.id = deck_files.deck_id and d.student_id = public.cr_uid()
    ))
  with check (
    public.cr_is_active() and exists (
      select 1 from public.decks d where d.id = deck_files.deck_id and d.student_id = public.cr_uid()
    ));

create policy chats_own on public.chats
  for all using (student_id = public.cr_uid() and public.cr_is_active())
  with check (student_id = public.cr_uid() and public.cr_is_active());

create policy mock_tests_own on public.mock_tests
  for all using (student_id = public.cr_uid() and public.cr_is_active())
  with check (student_id = public.cr_uid() and public.cr_is_active());

create policy attempts_own on public.attempts
  for all using (student_id = public.cr_uid() and public.cr_is_active())
  with check (student_id = public.cr_uid() and public.cr_is_active());

-- Read only. A match is created by the server after it has checked the monthly
-- allowance, so the client cannot mint itself more matches by inserting rows.
create policy scholarship_matches_read on public.scholarship_matches
  for select using (student_id = public.cr_uid() and public.cr_is_active());

-- ---------------------------------------------------------------- usage
-- Readable so the app can show "you have used 40 of 60 questions". Written only
-- by the server, which is what makes the limit a limit.
create policy usage_select_own on public.usage_counters
  for select using (student_id = public.cr_uid());

-- ------------------------------------------------- public, non-personal data
create policy plan_limits_read   on public.plan_limits   for select using (true);
create policy plan_prices_read   on public.plan_prices   for select using (true);
create policy exam_dates_read    on public.exam_dates    for select using (true);
create policy institutions_read  on public.institutions  for select using (true);
create policy courses_read       on public.courses       for select using (true);
create policy scholarships_read  on public.scholarships  for select using (true);

-- ---------------------------------------------------------------- grants
-- Row-level security decides which rows; these decide which tables are visible
-- at all. Anything not listed is unreachable without the service key.
grant usage on schema public to anon, authenticated, service_role;

-- Supabase grants this already; repeated here so the migrations stand up on any
-- Postgres. The service role also carries BYPASSRLS, which is what lets the
-- sign-up function, the guardian link and the usage meter do their work.
grant all on all tables in schema public to service_role;

grant select on public.plan_limits, public.plan_prices, public.exam_dates,
                public.institutions, public.courses, public.scholarships to anon, authenticated;

grant select, update, delete on public.profiles to authenticated;
grant select, insert, update on public.profile_private to authenticated;
grant select on public.orgs, public.org_members to authenticated;
grant select on public.usage_counters to authenticated;
grant select, insert, update, delete on
  public.goals, public.tasks, public.decks, public.deck_files, public.cards,
  public.chats, public.mock_tests, public.attempts to authenticated;

-- Read only: the server writes these after metering.
grant select on public.scholarship_matches to authenticated;
