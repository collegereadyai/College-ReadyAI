-- College ReadyAI — a scholarship whose status is not simply its deadline.
--
-- Status is normally derived: past the deadline is Closed, within a week is
-- Closing Soon, otherwise Open. Three records in the research list carry a
-- deadline we have not been able to stand behind, and showing them as "Open"
-- on the strength of that date would be the app asserting something nobody
-- checked.
--
-- They are marked "Verification Pending" instead, which is the honest answer:
-- there is a date, and we are not yet willing to count on it.
--
-- A separate migration because the two before it are already applied; editing
-- those would leave this column missing wherever they have run.

alter table public.scholarships
  add column if not exists status_override text;

comment on column public.scholarships.status_override is
  'Overrides the deadline-derived status. Use when the deadline itself is not trusted.';

update public.scholarships
   set status_override = 'Verification Pending'
 where record_ref in ('INT-001', 'INT-008', 'INT-010');
