-- College Ready-AI — helpers used by the policies in 0004.
--
-- Every one is `security definer` with a pinned, empty search_path. Two reasons:
--   * a definer function is not itself subject to row-level security, so a policy
--     on `profiles` may call a helper that reads `profiles` without recursing;
--   * an empty search_path means a caller cannot shadow `public` with their own
--     schema and have these resolve somewhere else.
-- Because of the first point, `profiles` must never be given FORCE ROW LEVEL
-- SECURITY, or the helpers would be filtered by the policies that call them.

-- Who is asking. null for an unauthenticated request. Reads a setting, touches no
-- table, so it needs no elevated rights.
create or replace function public.cr_uid()
returns uuid
language sql stable set search_path = ''
as $$ select auth.uid() $$;

-- The server, holding the service key, or a direct database connection.
--
-- This one must NOT be `security definer`. Inside a definer function Postgres
-- sets current_user to the function's owner, so a definer version would answer
-- "yes, the server" to whoever asked — and the protection triggers below would
-- never fire. As an invoker function it reports the role that is really calling.
create or replace function public.cr_is_service()
returns boolean
language sql stable set search_path = ''
as $$ select current_user in ('service_role', 'postgres') $$;

-- An account that has passed the age gate and the guardian, and has not been
-- paused or closed. Everything a student can reach is gated on this, so pausing
-- an account genuinely closes the door rather than only hiding the screen.
create or replace function public.cr_is_active()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.status = 'active' and p.approved
  )
$$;

-- Staff of a given school.
create or replace function public.cr_staff_of(p_org uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select p_org is not null and exists (
    select 1 from public.org_members m
    where m.user_id = auth.uid() and m.org_id = p_org
      and m.role in ('teacher', 'school_admin')
  )
$$;

-- Staff may see the roster of their own school, and nothing of another's.
create or replace function public.cr_can_see_student(p_student uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles s
    join public.org_members m on m.org_id = s.org_id
    where s.id = p_student
      and m.user_id = auth.uid()
      and m.role in ('teacher', 'school_admin')
  )
$$;

-- Age in whole years on a given day. Immutable, so a check constraint could use
-- it — the age gate still lives in a trigger (0003) because it has to compare
-- against today, and `current_date` is not immutable.
create or replace function public.cr_age_years(p_dob date, p_on date)
returns int
language sql immutable
as $$ select extract(year from age(p_on, p_dob))::int $$;

-- The month a usage counter belongs to.
create or replace function public.cr_period(p_on date default current_date)
returns date
language sql stable
as $$ select date_trunc('month', p_on)::date $$;
