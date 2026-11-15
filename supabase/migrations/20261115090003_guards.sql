-- College ReadyAI — the rules the client cannot talk its way past.
--
-- The site makes these promises, so the database keeps them even if someone
-- drives the REST API by hand with a stolen session:
--   * "Under-13s cannot sign up."
--   * "Students aged 13 to 17 need a parent or guardian to approve first."
--   * "Marketing messages are optional and unavailable to under-18s."
--   * "We do not train AI on your content unless you opt in."
--   * nobody raises their own plan or approves themselves.
-- All of them are triggers, not application code, so every path into the
-- database obeys them.

-- --------------------------------------------------------------- the age gate
-- The sign-up form collects an age band. A date of birth is optional and wins
-- when present, because it is the only thing that can age a minor out on its
-- own; with a band alone, someone has to ask again when they turn 18.
--
-- Invoker, like the protection triggers below: it only inspects the row being
-- written, and must see the role that is really calling.
create or replace function public.cr_age_gate()
returns trigger
language plpgsql set search_path = ''
as $$
declare
  v_age int;
begin
  if new.age_band = 'under13' then
    raise exception 'College ReadyAI is for ages 13 and up'
      using errcode = '23514', hint = 'cr_under_13';
  end if;

  if new.date_of_birth is not null then
    if new.date_of_birth > current_date then
      raise exception 'A date of birth cannot be in the future'
        using errcode = '23514';
    end if;
    v_age := public.cr_age_years(new.date_of_birth, current_date);
    if v_age < 13 then
      raise exception 'College ReadyAI is for ages 13 and up'
        using errcode = '23514', hint = 'cr_under_13';
    end if;
    new.is_minor := v_age < 18;
  else
    new.is_minor := new.age_band = '13-17';
  end if;

  -- Under 18: these are not choices the account may hold at all.
  if new.is_minor then
    new.ai_training_opt_in := false;
    new.marketing_opt_in   := false;

    if coalesce(btrim(new.guardian_email), '') = ''
       and coalesce(btrim(new.guardian_phone), '') = '' then
      raise exception 'A parent or guardian''s email address or phone number is needed for an account under 18'
        using errcode = '23514', hint = 'cr_guardian_contact_required';
    end if;
  end if;

  return new;
end;
$$;

create trigger cr_age_gate_ins
  before insert or update of age_band, date_of_birth, guardian_email, guardian_phone
  on public.profile_private
  for each row execute function public.cr_age_gate();

-- ------------------------------------------------- opening or locking the door
-- An adult is active immediately. A minor is created locked, and only the
-- guardian's yes moves them on. The tick box on the sign-up form is the
-- student saying a guardian approved; this is the guardian actually doing it.
create or replace function public.cr_set_initial_status()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.is_minor then
    update public.profiles set status = 'pending_guardian', approved = false where id = new.id;
  else
    update public.profiles set approved = true, status = 'active' where id = new.id;
  end if;
  return new;
end;
$$;

create trigger cr_set_initial_status_ins
  after insert on public.profile_private
  for each row execute function public.cr_set_initial_status();

-- --------------------------------------------------- the guardian's answer
create or replace function public.cr_apply_guardian_decision()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.decision is distinct from old.decision then
    if new.decision = 'approved' then
      update public.profiles set approved = true, status = 'active' where id = new.student_id;
    elsif new.decision = 'declined' then
      update public.profiles set approved = false, status = 'pending_guardian' where id = new.student_id;
    elsif new.decision = 'withdrawn' then
      update public.profiles set approved = false, status = 'paused' where id = new.student_id;
    end if;
  end if;
  return new;
end;
$$;

create trigger cr_apply_guardian_decision_upd
  after update on public.guardian_requests
  for each row execute function public.cr_apply_guardian_decision();

-- ------------------------------------------------------ columns that give power
-- Invoker on purpose: see the note on cr_is_service in 0002. The two triggers
-- that legitimately move these columns are security definer, so by the time
-- their UPDATE reaches this one current_user is already the owner.
create or replace function public.cr_protect_profile()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if public.cr_is_service() then
    return new;
  end if;

  if new.status   is distinct from old.status
  or new.approved is distinct from old.approved
  or new.plan     is distinct from old.plan
  or new.org_id   is distinct from old.org_id then
    raise exception 'status, approved, plan and org_id are set by College ReadyAI, not by the account'
      using errcode = '42501', hint = 'cr_protected_column';
  end if;

  return new;
end;
$$;

create trigger cr_protect_profile_upd
  before update on public.profiles
  for each row execute function public.cr_protect_profile();

-- ------------------------------------------- the private half, after creation
create or replace function public.cr_protect_private()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if not public.cr_is_service() then
    if new.age_band           is distinct from old.age_band
    or new.date_of_birth      is distinct from old.date_of_birth
    or new.is_minor           is distinct from old.is_minor
    or new.accepted_terms_at  is distinct from old.accepted_terms_at
    or new.accepted_privacy_at is distinct from old.accepted_privacy_at then
      raise exception 'Age and consent records cannot be changed here. Ask us from the Contact page.'
        using errcode = '42501', hint = 'cr_protected_column';
    end if;
  end if;

  -- Holds whoever is writing, server included: under 18 these stay off.
  if new.is_minor and (new.ai_training_opt_in or new.marketing_opt_in) then
    raise exception 'Marketing and AI training are switched off for accounts under 18'
      using errcode = '23514', hint = 'cr_minor_opt_in';
  end if;

  return new;
end;
$$;

create trigger cr_protect_private_upd
  before update on public.profile_private
  for each row execute function public.cr_protect_private();

-- ------------------------------------------------- "up to 10 files at a time"
-- A product rule from the site, kept where it cannot be forgotten.
create or replace function public.cr_deck_file_cap()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if (select count(*) from public.deck_files f where f.deck_id = new.deck_id) >= 10 then
    raise exception 'A study deck takes up to 10 files at a time'
      using errcode = '23514', hint = 'cr_deck_file_cap';
  end if;
  return new;
end;
$$;

create trigger cr_deck_file_cap_ins
  before insert on public.deck_files
  for each row execute function public.cr_deck_file_cap();

-- ------------------------------------------------------------- housekeeping
create or replace function public.cr_touch_updated_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger cr_goals_touch
  before update on public.goals
  for each row execute function public.cr_touch_updated_at();
