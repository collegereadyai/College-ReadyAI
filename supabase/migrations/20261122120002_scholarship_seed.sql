-- College ReadyAI — the scholarships gathered so far.
--
-- Twenty records, carried over from the owner's research with their own
-- verification labels intact. Eighteen have no application link yet; those say
-- so on screen rather than being dropped or given a guessed URL.
--
-- Seeded through a migration so the list is reproducible and reviewable in the
-- diff. record_ref is the stable key, so re-running updates a record in place
-- instead of duplicating it, and a later research pass can raise a row's
-- verification without touching anything else.
--
-- Deadlines go stale. Nothing here should be presented to a student as
-- confirmed; the screen reads `verification` and says what it says.

insert into public.scholarships
  (record_ref, name, provider, scope, country, continent, category, level, level_note, eligibility, academic_requirements, nationality, funding_type, amount, opens_on, deadline_on, application_url, info_url, documents, benefits, how_to_apply, status_note, verification, verification_note, last_verified_on, ai_suggested)
values
  ('NG-001', 'NNPC/SNEPCo National University Scholarship 2026', 'NNPC / SNEPCo', 'Nigerian', 'Nigeria', 'Africa', 'Corporate', 'Undergraduate', null, '200-level students in Nigerian public universities.', 'Stated minimum CGPA of 3.5/5.0.', 'Nigerian public university students', null, null, null, date '2026-11-30', 'https://candidate.scholastica.ng/schemes/NNPCLTDSNEPCo26', null, null, null, null, null, 'Unverified', 'The application link comes from our research list and has not been checked.', null, false),
  ('NG-002', 'The ICON Scholarship 2026', null, 'Nigerian', 'Nigeria', 'Africa', 'Private initiative', 'Undergraduate', null, 'Newly admitted Nigerian undergraduates.', null, 'Nigerian', null, null, null, date '2026-11-15', null, null, null, null, null, null, 'Unverified', 'Official application source still to be found.', null, false),
  ('NG-003', 'BeHerRahmah Initiative Scholarship 2026', 'BeHerRahmah Initiative', 'Nigerian', 'Nigeria', 'Africa', 'Private initiative', 'Undergraduate', null, 'Female undergraduate students experiencing financial hardship.', null, null, 'Grant or Bursary', 'Reported one-time grant of ₦15,000', null, date '2026-11-30', null, null, null, null, null, null, 'Unverified', 'The amount is reported, not confirmed.', null, false),
  ('NG-004', 'Female Scholars Foundation Scholarship 2026', 'Female Scholars Foundation', 'Nigerian', 'Nigeria', 'Africa', 'Foundation', 'Undergraduate', null, 'Female students aged 20 or below, subject to the programme''s WAEC and JAMB requirements.', 'WAEC and JAMB requirements set by the programme.', null, null, null, null, date '2026-12-31', null, null, null, null, null, null, 'Unverified', null, null, false),
  ('NG-005', 'M. Kukoyi Foundation Medical Scholarship 2026', 'M. Kukoyi Foundation', 'Nigerian', 'Nigeria', 'Africa', 'Medical', 'Undergraduate', null, 'Eligible medical and health sciences undergraduates at UNILAG and LASU.', null, null, null, null, null, date '2026-11-22', null, null, null, null, null, null, 'Unverified', null, null, false),
  ('NG-006', 'TKA Solid Foundations Scholarship 2026', null, 'Nigerian', 'Nigeria', 'Africa', 'Foundation', 'Undergraduate', 'Undergraduate / Polytechnic', 'Students seeking admission into public universities and polytechnics for 2027.', null, null, null, null, null, date '2026-12-20', null, null, null, 'Reported 50 scholarship opportunities.', null, null, 'Unverified', 'The number of awards is reported, not confirmed.', null, false),
  ('NG-007', 'Kwara State Government Bursary 2025/2026', 'Kwara State Government', 'Nigerian', 'Nigeria', 'Africa', 'Government', 'Tertiary', null, 'Eligible Kwara State indigenes enrolled in tertiary institutions.', null, 'Kwara State indigenes', 'Grant or Bursary', null, null, date '2026-11-16', null, null, null, null, null, null, 'Unverified', null, null, false),
  ('NG-008', 'Indomie Scholarship 2026', null, 'Nigerian', 'Nigeria', 'Africa', 'Corporate', null, null, null, null, null, null, null, null, date '2026-10-31', null, null, null, null, null, 'Closed to new applicants. Existing applicants reportedly have until 18 Nov 2026 to finish their applications.', 'Unverified', null, null, false),
  ('NG-009', 'AMIR Fund Medical Scholarship', 'AMIR Fund', 'Nigerian', 'Nigeria', 'Africa', 'Medical', null, 'Medical education', null, null, null, null, null, null, date '2026-10-30', null, null, null, null, null, null, 'Unverified', null, null, false),
  ('NG-010', 'NDDC Postgraduate Scholarship', 'NDDC', 'Nigerian', 'Nigeria', 'Africa', 'Government', 'Postgraduate', null, null, null, null, null, null, null, date '2026-11-08', null, null, null, null, null, null, 'Unverified', null, null, false),
  ('INT-001', 'UBC International Scholars Program', 'University of British Columbia', 'International', 'Canada', 'North America', 'University', 'Undergraduate', null, 'International students with outstanding academic performance and significant financial need. The official page also mentions leadership, community contribution, an institutional nomination and a teacher referee.', null, 'International students', null, null, null, date '2026-11-15', 'https://undergraduatescholarships.ubc.ca/prog/2026_international_scholars_program_application', 'https://undergraduatescholarships.ubc.ca/prog/2026_international_scholars_program_application', null, 'The official page says the program gives meaningful financial support. It does not state an amount.', null, null, 'Partially Verified', 'The official page confirms the programme, but the page we could read shows a window that closed on 17 Nov 2025. The 15 Nov 2026 deadline from our research is not confirmed.', date '2026-11-12', false),
  ('INT-002', 'FMI International PhD Programme', 'Friedrich Miescher Institute (FMI)', 'International', 'Switzerland', 'Europe', 'Research programme', 'Doctoral', null, 'Eligible international doctoral research applicants.', null, 'International', null, null, null, date '2026-11-15', null, null, null, null, null, null, 'Unverified', 'Official programme still to be checked.', null, false),
  ('INT-003', 'A.S. Hornby Scholarship', null, 'International', 'United Kingdom', 'Europe', 'Education', 'Postgraduate', null, 'Eligible English-language teaching professionals pursuing an MEd TESOL.', null, null, null, null, null, date '2026-11-22', null, null, null, null, null, null, 'Unverified', 'Official cycle still to be checked.', null, false),
  ('INT-004', 'ETH Zurich Excellence Scholarship', 'ETH Zurich', 'International', 'Switzerland', 'Europe', 'University', 'Postgraduate', 'Master''s', 'International applicants with exceptional academic records.', 'Exceptional academic record.', 'International', null, null, null, date '2026-11-30', null, null, null, null, null, null, 'Unverified', 'Official cycle still to be checked.', null, false),
  ('INT-005', 'Yenching Academy Scholarship', 'Yenching Academy', 'International', 'China', 'Asia', 'University', 'Postgraduate', 'Master''s', 'International students applying to the Yenching Academy''s China Studies programme.', null, 'International', null, null, null, date '2026-11-30', null, null, null, null, null, null, 'Unverified', 'Official cycle still to be checked.', null, false),
  ('INT-006', 'Hong Kong PhD Fellowship Scheme', null, 'International', 'Hong Kong', 'Asia', 'Research programme', 'Doctoral', null, 'International students applying for eligible full-time PhD programmes.', null, 'International', null, null, null, date '2026-12-01', null, null, null, null, null, null, 'Unverified', 'Official cycle still to be checked.', null, false),
  ('INT-007', 'Wageningen University Africa Scholarship Programme', 'Wageningen University', 'International', 'Netherlands', 'Europe', 'University', 'Postgraduate', null, 'Eligible African applicants.', null, 'African applicants', null, null, null, date '2026-12-01', null, null, null, null, null, null, 'Unverified', 'Official cycle still to be checked.', null, false),
  ('INT-008', 'Gates Cambridge Scholarship', 'University of Cambridge', 'International', 'United Kingdom', 'Europe', 'University', 'Postgraduate', null, 'Eligible international applicants pursuing postgraduate study at Cambridge.', null, 'International', null, null, null, date '2026-12-08', null, null, null, null, null, null, 'Unverified', 'The deadline depends on the course. Confirm the course-specific date before you rely on this one.', null, false),
  ('INT-009', 'KAUST Fellowship', 'KAUST', 'International', 'Saudi Arabia', 'Asia', 'University', 'Postgraduate', 'Master''s and PhD', 'Eligible master''s and PhD research applicants.', null, null, null, null, null, date '2027-01-03', null, null, null, null, null, null, 'Unverified', 'Official admissions cycle still to be checked.', null, false),
  ('INT-010', 'Weidenfeld-Hoffmann Scholarships', 'University of Oxford', 'International', 'United Kingdom', 'Europe', 'University', 'Postgraduate', null, 'Eligible international postgraduate applicants at the University of Oxford.', null, 'International', null, null, null, date '2027-01-06', null, null, null, null, null, null, 'Unverified', 'The deadline depends on the course. Confirm the course-specific date before you rely on this one.', null, false)
on conflict (record_ref) do update set
  name = excluded.name,
  provider = excluded.provider,
  scope = excluded.scope,
  country = excluded.country,
  continent = excluded.continent,
  category = excluded.category,
  level = excluded.level,
  level_note = excluded.level_note,
  eligibility = excluded.eligibility,
  academic_requirements = excluded.academic_requirements,
  nationality = excluded.nationality,
  funding_type = excluded.funding_type,
  amount = excluded.amount,
  opens_on = excluded.opens_on,
  deadline_on = excluded.deadline_on,
  application_url = excluded.application_url,
  info_url = excluded.info_url,
  documents = excluded.documents,
  benefits = excluded.benefits,
  how_to_apply = excluded.how_to_apply,
  status_note = excluded.status_note,
  verification = excluded.verification,
  verification_note = excluded.verification_note,
  last_verified_on = excluded.last_verified_on,
  ai_suggested = excluded.ai_suggested,
  checked_on = current_date;
