-- College Ready-AI — the rights the Privacy policy promises, as code.
--
--   "Download a copy of everything stored on the account, from Profile."
--   "Delete the account and its data from Profile."
--
-- Both are `security definer` on purpose. A paused account cannot read its own
-- tasks through the ordinary policies, and that is correct — but taking your
-- data out, or deleting it, is a right that does not depend on a guardian still
-- saying yes. These two functions are the only way past that gate, and each is
-- hard-wired to auth.uid(): there is no argument to point them at someone else.

create or replace function public.cr_export_my_data()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_out jsonb;
begin
  if v_uid is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'exported_at', now(),
    'account',     (select to_jsonb(p) from public.profiles p where p.id = v_uid),
    'private',     (select to_jsonb(pp) from public.profile_private pp where pp.id = v_uid),
    'goal',        (select to_jsonb(g) from public.goals g where g.student_id = v_uid),
    'tasks',       coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at) from public.tasks t where t.student_id = v_uid), '[]'::jsonb),
    'decks',       coalesce((select jsonb_agg(to_jsonb(d) order by d.created_at) from public.decks d where d.student_id = v_uid), '[]'::jsonb),
    'deck_files',  coalesce((select jsonb_agg(to_jsonb(f)) from public.deck_files f
                               join public.decks d on d.id = f.deck_id where d.student_id = v_uid), '[]'::jsonb),
    'cards',       coalesce((select jsonb_agg(to_jsonb(c)) from public.cards c
                               join public.decks d on d.id = c.deck_id where d.student_id = v_uid), '[]'::jsonb),
    'chats',       coalesce((select jsonb_agg(to_jsonb(ch) order by ch.created_at) from public.chats ch where ch.student_id = v_uid), '[]'::jsonb),
    'mock_tests',  coalesce((select jsonb_agg(to_jsonb(m) order by m.started_at) from public.mock_tests m where m.student_id = v_uid), '[]'::jsonb),
    'attempts',    coalesce((select jsonb_agg(to_jsonb(a) order by a.answered_at) from public.attempts a where a.student_id = v_uid), '[]'::jsonb),
    'scholarship_matches',
                   coalesce((select jsonb_agg(to_jsonb(sm) order by sm.matched_at) from public.scholarship_matches sm where sm.student_id = v_uid), '[]'::jsonb),
    'usage',       coalesce((select jsonb_agg(to_jsonb(u) order by u.period_start) from public.usage_counters u where u.student_id = v_uid), '[]'::jsonb)
  ) into v_out;

  return v_out;
end;
$$;

-- Removes the profile; every table above hangs off it with `on delete cascade`,
-- so one delete clears the lot. Files in storage are not reached by a foreign
-- key, so the caller (the Edge Function behind the Delete button) must empty
-- study-uploads/<uid>/ first. The Privacy policy's "backups clear within 30
-- days" is a retention setting on the database, not something SQL can promise.
create or replace function public.cr_delete_my_account()
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;

  delete from public.profiles where id = v_uid;
  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.cr_export_my_data()  from public, anon;
revoke all on function public.cr_delete_my_account() from public, anon;
grant execute on function public.cr_export_my_data()  to authenticated;
grant execute on function public.cr_delete_my_account() to authenticated;
