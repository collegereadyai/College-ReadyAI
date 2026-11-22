-- College ReadyAI — the universities gathered so far.
--
-- Three records, each pointing at the institution's own website. The course
-- lists are the well-known programmes at each, not a prospectus: a student
-- checking whether a course exists should still open the university's site,
-- which is what the screen tells them to do.
--
-- ref is the stable key, so re-running updates a record in place.

insert into public.institutions
  (ref, name, state, kind, classification, source_url, about, established,
   acceptance_rate, acceptance_note, fees, fees_note, entry_exam, ai_suggested)
values
  ('UL', 'University of Lagos', 'Lagos', 'university', 'Federal university', 'https://unilag.edu.ng', 'A large public university on the Akoka campus in Lagos, known for strong programmes in law, medicine, engineering and the sciences.', 1962, 'Under 10%', 'Highly competitive', '₦150k – ₦350k / yr', 'Varies by course', 'JAMB + Post-UTME', true),
  ('CU', 'Covenant University', 'Ogun', 'university', 'Private university', 'https://covenantuniversity.edu.ng', 'A private university in Ota, Ogun State, with a residential campus and a focus on science, technology and business.', 2002, 'About 10 – 20%', 'Competitive', '₦1.5m – ₦3.5m / yr', 'Plus accommodation', 'JAMB + screening', false),
  ('BU', 'Babcock University', 'Ogun', 'university', 'Private university', 'https://babcock.edu.ng', 'A private university in Ilishan-Remo, Ogun State, known for medicine, nursing, law and business programmes.', 1999, 'About 20 – 35%', 'Moderately competitive', '₦2m – ₦5m / yr', 'Medical courses cost more', 'JAMB + screening', false)
on conflict (ref) do update set
  name = excluded.name, state = excluded.state, kind = excluded.kind,
  classification = excluded.classification, source_url = excluded.source_url,
  about = excluded.about, established = excluded.established,
  acceptance_rate = excluded.acceptance_rate, acceptance_note = excluded.acceptance_note,
  fees = excluded.fees, fees_note = excluded.fees_note,
  entry_exam = excluded.entry_exam, ai_suggested = excluded.ai_suggested,
  checked_on = current_date;

-- Courses have no natural key of their own, so a re-import clears this
-- institution's rows and writes them again rather than accumulating copies.
delete from public.courses
 where institution_id in (select id from public.institutions where ref in ('UL', 'CU', 'BU'));

insert into public.courses (institution_id, name, source_url)
values
  ((select id from public.institutions where ref = 'UL'), 'Law', 'https://unilag.edu.ng'),
  ((select id from public.institutions where ref = 'UL'), 'Medicine', 'https://unilag.edu.ng'),
  ((select id from public.institutions where ref = 'UL'), 'Computer Science', 'https://unilag.edu.ng'),
  ((select id from public.institutions where ref = 'UL'), 'Engineering', 'https://unilag.edu.ng'),
  ((select id from public.institutions where ref = 'UL'), 'Accounting', 'https://unilag.edu.ng'),
  ((select id from public.institutions where ref = 'UL'), 'Mass Communication', 'https://unilag.edu.ng'),
  ((select id from public.institutions where ref = 'UL'), 'Economics', 'https://unilag.edu.ng'),
  ((select id from public.institutions where ref = 'UL'), 'Architecture', 'https://unilag.edu.ng'),
  ((select id from public.institutions where ref = 'CU'), 'Computer Science', 'https://covenantuniversity.edu.ng'),
  ((select id from public.institutions where ref = 'CU'), 'Software Engineering', 'https://covenantuniversity.edu.ng'),
  ((select id from public.institutions where ref = 'CU'), 'Electrical Engineering', 'https://covenantuniversity.edu.ng'),
  ((select id from public.institutions where ref = 'CU'), 'Architecture', 'https://covenantuniversity.edu.ng'),
  ((select id from public.institutions where ref = 'CU'), 'Accounting', 'https://covenantuniversity.edu.ng'),
  ((select id from public.institutions where ref = 'CU'), 'Business Administration', 'https://covenantuniversity.edu.ng'),
  ((select id from public.institutions where ref = 'CU'), 'Mass Communication', 'https://covenantuniversity.edu.ng'),
  ((select id from public.institutions where ref = 'CU'), 'Biochemistry', 'https://covenantuniversity.edu.ng'),
  ((select id from public.institutions where ref = 'BU'), 'Medicine', 'https://babcock.edu.ng'),
  ((select id from public.institutions where ref = 'BU'), 'Nursing', 'https://babcock.edu.ng'),
  ((select id from public.institutions where ref = 'BU'), 'Law', 'https://babcock.edu.ng'),
  ((select id from public.institutions where ref = 'BU'), 'Computer Science', 'https://babcock.edu.ng'),
  ((select id from public.institutions where ref = 'BU'), 'Accounting', 'https://babcock.edu.ng'),
  ((select id from public.institutions where ref = 'BU'), 'Public Health', 'https://babcock.edu.ng'),
  ((select id from public.institutions where ref = 'BU'), 'Mass Communication', 'https://babcock.edu.ng'),
  ((select id from public.institutions where ref = 'BU'), 'Architecture', 'https://babcock.edu.ng');
