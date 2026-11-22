-- College ReadyAI — ten physics practice questions.
--
-- These were written for the app. They are not JAMB past papers, they are not
-- licensed from anyone, and `origin` says so on every row — the Exams Hub
-- repeats it on screen before a student starts.
--
-- Worth knowing before this set grows: in all ten, the correct answer is the
-- second or third option. Never the first, never the last. A student can score
-- well here by always picking B or C and learn nothing, which makes the score
-- meaningless as a signal. Any real question bank should spread the answer
-- across all positions.
--
-- ref is the stable key. A re-import replaces this set rather than adding to
-- it, so fixing a question does not leave the old wording behind.

delete from public.practice_questions where ref like 'PQ-PHY-%';

insert into public.practice_questions
  (ref, board, subject, prompt, options, answer_index, origin)
values
  ('PQ-PHY-001', 'JAMB', 'Physics', 'A car accelerates uniformly from rest to 20 m/s in 8 seconds. What is its acceleration?', array['1.6 m/s²', '2.5 m/s²', '3.2 m/s²', '4.0 m/s²'], 1, 'Written as practice for College ReadyAI. Not a past paper.'),
  ('PQ-PHY-002', 'JAMB', 'Physics', 'Which law states that for every action there is an equal and opposite reaction?', array['Newton''s First Law', 'Newton''s Second Law', 'Newton''s Third Law', 'Law of Conservation of Energy'], 2, 'Written as practice for College ReadyAI. Not a past paper.'),
  ('PQ-PHY-003', 'JAMB', 'Physics', 'The SI unit of electric current is the:', array['Volt', 'Ohm', 'Ampere', 'Coulomb'], 2, 'Written as practice for College ReadyAI. Not a past paper.'),
  ('PQ-PHY-004', 'JAMB', 'Physics', 'A concave mirror is also known as a:', array['Diverging mirror', 'Converging mirror', 'Plane mirror', 'Convex mirror'], 1, 'Written as practice for College ReadyAI. Not a past paper.'),
  ('PQ-PHY-005', 'JAMB', 'Physics', 'The energy possessed by a body due to its motion is called:', array['Potential energy', 'Kinetic energy', 'Thermal energy', 'Chemical energy'], 1, 'Written as practice for College ReadyAI. Not a past paper.'),
  ('PQ-PHY-006', 'JAMB', 'Physics', 'Which of these is a vector quantity?', array['Mass', 'Speed', 'Displacement', 'Time'], 2, 'Written as practice for College ReadyAI. Not a past paper.'),
  ('PQ-PHY-007', 'JAMB', 'Physics', 'The resistance of a wire is directly proportional to its:', array['Cross-sectional area', 'Temperature only', 'Length', 'Colour'], 2, 'Written as practice for College ReadyAI. Not a past paper.'),
  ('PQ-PHY-008', 'JAMB', 'Physics', 'What is the frequency of a wave with period 0.02s?', array['5 Hz', '20 Hz', '50 Hz', '200 Hz'], 2, 'Written as practice for College ReadyAI. Not a past paper.'),
  ('PQ-PHY-009', 'JAMB', 'Physics', 'Which instrument is used to measure atmospheric pressure?', array['Thermometer', 'Barometer', 'Hydrometer', 'Manometer'], 1, 'Written as practice for College ReadyAI. Not a past paper.'),
  ('PQ-PHY-010', 'JAMB', 'Physics', 'The process by which a liquid changes to vapour below its boiling point is:', array['Boiling', 'Condensation', 'Evaporation', 'Sublimation'], 2, 'Written as practice for College ReadyAI. Not a past paper.');
