// College Ready-AI — runs the migrations against a real Postgres (PGlite, WASM)
// and checks that the security rules actually hold.
//
//   node backend/test/run.mjs
//
// There is no Supabase here, so the harness first builds the small part of it the
// migrations lean on: an `auth` schema with a users table and auth.uid(), and the
// three roles PostgREST switches between. Acting "as" someone is exactly what
// Supabase does — SET ROLE, plus the jwt claims that auth.uid() reads.

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = join(HERE, '..', 'supabase', 'migrations');
const PGLITE = 'C:/Users/hp/Downloads/Code-Projects/passerelle/node_modules/@electric-sql/pglite/dist/index.js';

const { PGlite } = await import(pathToFileURL(PGLITE).href);
const db = new PGlite();

// ---------------------------------------------------------------- scaffolding
const AUTH_STUB = `
create schema if not exists auth;

create table auth.users (
  id    uuid primary key default gen_random_uuid(),
  email text unique
);

-- Supabase reads the signed JWT that PostgREST puts in a setting.
create or replace function auth.uid() returns uuid
language sql stable
as $$
  select nullif(
    nullif(current_setting('request.jwt.claims', true), '')::json ->> 'sub',
  '')::uuid
$$;

create role anon          nologin;
create role authenticated nologin;
create role service_role   nologin bypassrls;

-- Supabase makes these grants when a project is created. Policies call
-- auth.uid() as the caller, so without them every policy errors instead of
-- simply returning no rows.
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant all on auth.users to service_role;

-- Enough of Supabase Storage for the policies in 0005 to be exercised.
create schema if not exists storage;
create table storage.buckets (
  id text primary key, name text, public boolean default false, file_size_limit bigint
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text not null,
  owner uuid,
  created_at timestamptz default now()
);
alter table storage.objects enable row level security;
grant usage on schema storage to anon, authenticated, service_role;
grant select, insert, delete on storage.objects to authenticated;
grant select on storage.buckets to authenticated;
grant all on storage.buckets, storage.objects to service_role;
`;

const results = [];
let failures = 0;

function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  if (!ok) failures++;
}

// Act as a role, with an optional signed-in user.
async function as(role, uid = null) {
  await db.exec(`reset role;`);
  await db.exec(`select set_config('request.jwt.claims', ${uid ? `'{"sub":"${uid}"}'` : `''`}, false);`);
  if (role) await db.exec(`set role ${role};`);
}

// Expect a statement to be refused, and say why we expected it.
async function refuses(name, sql, matcher) {
  try {
    await db.query(sql);
    check(name, false, 'it was allowed');
  } catch (e) {
    const msg = String(e.message || e);
    check(name, matcher ? matcher.test(msg) : true, matcher && !matcher.test(msg) ? `wrong error: ${msg}` : msg.slice(0, 90));
  }
}

async function allows(name, sql) {
  try {
    await db.query(sql);
    check(name, true);
  } catch (e) {
    check(name, false, String(e.message || e).slice(0, 140));
  }
}

const rows = async (sql) => (await db.query(sql)).rows;

// ---------------------------------------------------------------- apply
console.log('\n== applying migrations ==\n');
await db.exec(AUTH_STUB);

for (const file of readdirSync(MIGRATIONS).filter(f => f.endsWith('.sql')).sort()) {
  try {
    await db.exec(readFileSync(join(MIGRATIONS, file), 'utf8'));
    console.log('  ok   ' + file);
  } catch (e) {
    console.error('  FAIL ' + file + '\n       ' + String(e.message || e));
    process.exit(1);
  }
}

// ---------------------------------------------------------------- fixtures
const dob = (years) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
};

await as('service_role');
const [{ id: ORG }] = await rows(`insert into public.orgs (name, kind) values ('Demo Secondary', 'school') returning id`);

async function makeUser(email) {
  const [{ id }] = await rows(`insert into auth.users (email) values ('${email}') returning id`);
  return id;
}

const TOBI = await makeUser('tobi@example.com');     // 15 — needs a guardian
const AMAKA = await makeUser('amaka@example.com');   // 20 — straight in
const CHIDI = await makeUser('chidi@example.com');   // 16 — stays locked
const TEACHER = await makeUser('teacher@example.com');
const OUTSIDER = await makeUser('other@example.com');

// The sign-up form collects a band, so that is what the fixtures use.
const band = (age) => (age < 13 ? 'under13' : age < 18 ? '13-17' : age < 25 ? '18-24' : '25plus');

for (const [id, name, age] of [[TOBI, 'Tobi Adeyemi', 15], [AMAKA, 'Amaka Obi', 20], [CHIDI, 'Chidi Eze', 16], [TEACHER, 'Mrs Bello', 34], [OUTSIDER, 'Ngozi Okeke', 19]]) {
  await db.query(`insert into public.profiles (id, full_name, org_id) values ('${id}', '${name}', ${id === OUTSIDER ? 'null' : `'${ORG}'`})`);
  await db.query(`insert into public.profile_private (id, age_band, guardian_email, accepted_terms_at, accepted_privacy_at)
                  values ('${id}', '${band(age)}', ${age < 18 ? `'parent@example.com'` : 'null'}, now(), now())`);
}
await db.query(`insert into public.org_members (org_id, user_id, role) values ('${ORG}', '${TEACHER}', 'teacher')`);

console.log('\n== the age gate ==\n');

const status = async (id) => (await rows(`select status, approved from public.profiles where id = '${id}'`))[0];

check('an adult is active straight away',
  (await status(AMAKA)).status === 'active' && (await status(AMAKA)).approved === true);
check('a 15-year-old is created locked',
  (await status(TOBI)).status === 'pending_guardian' && (await status(TOBI)).approved === false);

const UNDER13 = await makeUser('small@example.com');
await db.query(`insert into public.profiles (id, full_name) values ('${UNDER13}', 'Too Young')`);
await refuses('the under-13 band is refused',
  `insert into public.profile_private (id, age_band, guardian_email, accepted_terms_at, accepted_privacy_at)
   values ('${UNDER13}', 'under13', 'parent@example.com', now(), now())`,
  /ages 13 and up/i);
await refuses('an 11-year-old date of birth is refused even in an adult band',
  `insert into public.profile_private (id, age_band, date_of_birth, guardian_email, accepted_terms_at, accepted_privacy_at)
   values ('${UNDER13}', '18-24', '${dob(11)}', 'parent@example.com', now(), now())`,
  /ages 13 and up/i);

const NOGUARDIAN = await makeUser('nog@example.com');
await db.query(`insert into public.profiles (id, full_name) values ('${NOGUARDIAN}', 'No Guardian')`);
await refuses('a minor needs a guardian contact',
  `insert into public.profile_private (id, age_band, accepted_terms_at, accepted_privacy_at)
   values ('${NOGUARDIAN}', '13-17', now(), now())`,
  /guardian/i);

await refuses('a date of birth in the future is refused',
  `insert into public.profile_private (id, age_band, date_of_birth, accepted_terms_at, accepted_privacy_at)
   values ('${NOGUARDIAN}', '18-24', '2999-01-01', now(), now())`,
  /future/i);

await refuses('an account cannot be created without recording consent',
  `insert into public.profile_private (id, age_band) values ('${NOGUARDIAN}', '18-24')`,
  /not-null|null value/i);

// A date of birth wins over the band — the only way a minor ages out by itself.
const AGEDOUT = await makeUser('agedout@example.com');
await db.query(`insert into public.profiles (id, full_name) values ('${AGEDOUT}', 'Just Turned 18')`);
await db.query(`insert into public.profile_private (id, age_band, date_of_birth, guardian_email, accepted_terms_at, accepted_privacy_at)
                values ('${AGEDOUT}', '13-17', '${dob(19)}', 'parent@example.com', now(), now())`);
check('a date of birth overrides a stale band',
  (await status(AGEDOUT)).status === 'active');

console.log('\n== what a locked account can reach ==\n');

await as('authenticated', TOBI);
check('a locked student still sees their own profile (for the waiting screen)',
  (await rows(`select 1 from public.profiles where id = '${TOBI}'`)).length === 1);
check('a locked student reads no tasks',
  (await rows(`select * from public.tasks`)).length === 0);
await refuses('a locked student cannot write a task',
  `insert into public.tasks (student_id, title) values ('${TOBI}', 'Sneak in')`,
  /row-level security|policy/i);
await refuses('a locked student cannot start a chat',
  `insert into public.chats (student_id, question) values ('${TOBI}', 'hello?')`,
  /row-level security|policy/i);

console.log('\n== nobody promotes themselves ==\n');

await refuses('a student cannot approve themselves',
  `update public.profiles set approved = true, status = 'active' where id = '${TOBI}'`,
  /set by College ReadyAI/i);
await refuses('a student cannot raise their own plan',
  `update public.profiles set plan = 'pro' where id = '${TOBI}'`,
  /set by College ReadyAI/i);
await refuses('a student cannot move themselves into another school',
  `update public.profiles set org_id = null where id = '${TOBI}'`,
  /set by College ReadyAI/i);
await allows('a student can still edit their own name',
  `update public.profiles set full_name = 'Tobi A.' where id = '${TOBI}'`);
await refuses('a student cannot change their own age band',
  `update public.profile_private set age_band = '18-24' where id = '${TOBI}'`,
  /Age and consent records cannot be changed/i);
await refuses('a student cannot rewrite when they accepted the terms',
  `update public.profile_private set accepted_terms_at = now() where id = '${TOBI}'`,
  /Age and consent records cannot be changed/i);
await refuses('a minor cannot switch on AI training',
  `update public.profile_private set ai_training_opt_in = true where id = '${TOBI}'`,
  /under 18/i);
await refuses('a student cannot read or write guardian requests',
  `select * from public.guardian_requests`,
  /permission denied|row-level security/i);

console.log('\n== the guardian decides ==\n');

await as('service_role');
const [{ id: REQ }] = await rows(
  `insert into public.guardian_requests (student_id, sent_to, token_hash)
   values ('${TOBI}', 'parent@example.com', 'sha256-of-the-token') returning id`);
await db.query(`update public.guardian_requests set decision = 'approved', decided_at = now() where id = '${REQ}'`);
check('approval opens the account', (await status(TOBI)).status === 'active' && (await status(TOBI)).approved === true);

await as('authenticated', TOBI);
await allows('an approved student can write a task',
  `insert into public.tasks (student_id, title) values ('${TOBI}', 'Use of English practice test')`);
await allows('an approved student can start a chat',
  `insert into public.chats (student_id, question) values ('${TOBI}', 'Subjects for Economics?')`);

await as('service_role');
await db.query(`update public.guardian_requests set decision = 'withdrawn', decided_at = now() where id = '${REQ}'`);
check('withdrawing approval pauses the account', (await status(TOBI)).status === 'paused');

await as('authenticated', TOBI);
check('a paused student reads none of their own work',
  (await rows(`select * from public.tasks`)).length === 0);
check('a paused student still sees their profile',
  (await rows(`select 1 from public.profiles where id = '${TOBI}'`)).length === 1);

console.log('\n== one student cannot read another ==\n');

await as('service_role');
await db.query(`insert into public.chats (student_id, question) values ('${AMAKA}', 'Private question')`);
await db.query(`insert into public.tasks (student_id, title) values ('${AMAKA}', 'Amaka task')`);

await as('authenticated', OUTSIDER);
check('another student sees none of Amaka\'s chats', (await rows(`select * from public.chats`)).length === 0);
check('another student sees none of Amaka\'s tasks', (await rows(`select * from public.tasks`)).length === 0);
check('another student cannot read Amaka\'s private half',
  (await rows(`select * from public.profile_private where id = '${AMAKA}'`)).length === 0);

console.log('\n== what a school can see ==\n');

await as('authenticated', TEACHER);
const seen = await rows(`select full_name, status from public.profiles order by full_name`);
check('a teacher sees the roster of their own school', seen.length === 4, `saw ${seen.length}: ${seen.map(r => r.full_name).join(', ')}`);
check('a teacher does not see a student from another school',
  !seen.some(r => r.full_name === 'Ngozi Okeke'));
check('a teacher sees who is still waiting on a guardian',
  seen.some(r => r.status === 'pending_guardian' || r.status === 'paused'));
check('a teacher reads no chats at all', (await rows(`select * from public.chats`)).length === 0);
check('a teacher reads no decks', (await rows(`select * from public.decks`)).length === 0);
check('a teacher reads no practice attempts', (await rows(`select * from public.attempts`)).length === 0);
check('a teacher reads nobody\'s date of birth or guardian contact',
  (await rows(`select * from public.profile_private`)).length === 1, 'only their own row');

console.log('\n== signed out ==\n');

await as('anon');
// Stronger than "no rows": anon has no grant on these tables at all.
await refuses('a visitor cannot reach profiles', `select * from public.profiles`, /permission denied/i);
await refuses('a visitor cannot reach chats', `select * from public.chats`, /permission denied/i);
await refuses('a visitor cannot reach guardian requests', `select * from public.guardian_requests`, /permission denied/i);
check('a visitor can read the published exam dates and plan limits',
  (await rows(`select * from public.plan_limits`)).length === 4);

console.log('\n== plans and meters ==\n');

await as('anon');
const limits = Object.fromEntries((await rows(`select * from public.plan_limits`)).map(r => [r.plan, r]));
check('Free is 3 Advisor messages a day, not a month',
  limits.free.ai_messages_day === 3 && limits.free.ai_messages_month === null);
check('Plus and Pro are metered monthly (150 and 400)',
  limits.plus.ai_messages_month === 150 && limits.pro.ai_messages_month === 400);
check('deck, upload, mock-test and scholarship caps match the site',
  limits.free.study_decks_month === 1 && limits.free.file_uploads_month === 3 &&
  limits.free.mock_tests_month === 1 && limits.free.scholarship_matches_month === 3 &&
  limits.pro.study_decks_month === 20 && limits.pro.scholarship_matches_month === 40);
check('only Pro gets priority replies', limits.pro.priority_ai === true && limits.plus.priority_ai === false);

const prices = await rows(`select plan, cycle, amount_kobo from public.plan_prices where plan = 'plus' order by cycle`);
check('Plus is ₦2,000 weekly / ₦5,000 monthly / ₦54,000 yearly',
  prices.find(p => p.cycle === 'weekly').amount_kobo === '200000' || prices.find(p => p.cycle === 'weekly').amount_kobo === 200000,
  JSON.stringify(prices));

await as('authenticated', AMAKA);
await refuses('a student cannot mint their own scholarship matches',
  `insert into public.scholarship_matches (student_id) values ('${AMAKA}')`,
  /permission denied|row-level security/i);
await refuses('a student cannot move their own usage counters',
  `insert into public.usage_counters (student_id, meter_window, period_start) values ('${AMAKA}', 'day', current_date)`,
  /permission denied|row-level security/i);

console.log('\n== study decks ==\n');

const [{ id: DECK }] = await rows(`insert into public.decks (student_id, title) values ('${AMAKA}', 'Biology') returning id`);
for (let i = 1; i <= 10; i++) {
  await db.query(`insert into public.deck_files (deck_id, file_name, storage_path, byte_size)
                  values ('${DECK}', 'notes-${i}.pdf', '${AMAKA}/${DECK}/notes-${i}.pdf', 1024)`);
}
check('ten files go into one deck', (await rows(`select * from public.deck_files where deck_id = '${DECK}'`)).length === 10);
await refuses('an eleventh file is refused',
  `insert into public.deck_files (deck_id, file_name, storage_path, byte_size)
   values ('${DECK}', 'notes-11.pdf', '${AMAKA}/${DECK}/notes-11.pdf', 1024)`,
  /up to 10 files/i);
// A fresh deck: the ten-file cap above would otherwise fire first.
const [{ id: DECK2 }] = await rows(`insert into public.decks (student_id, title) values ('${AMAKA}', 'Chemistry') returning id`);
await refuses('a file over 100 MB is refused',
  `insert into public.deck_files (deck_id, file_name, storage_path, byte_size)
   values ('${DECK2}', 'huge.pdf', '${AMAKA}/${DECK2}/huge.pdf', 104857601)`,
  /violates check constraint/i);

await as('authenticated', OUTSIDER);
check('another student sees none of those files', (await rows(`select * from public.deck_files`)).length === 0);

console.log('\n== uploaded files ==\n');

await as('service_role');
check('both buckets are private',
  (await rows(`select count(*)::int as n from storage.buckets where public = false`))[0].n === 2);

await as('authenticated', AMAKA);   // active
await allows('an active student can upload into their own folder',
  `insert into storage.objects (bucket_id, name) values ('study-uploads', '${AMAKA}/deck-1/Biology.pdf')`);
await refuses('a student cannot upload into someone else\'s folder',
  `insert into storage.objects (bucket_id, name) values ('study-uploads', '${TOBI}/deck-1/Sneak.pdf')`,
  /row-level security|policy/i);
check('a student sees only their own files',
  (await rows(`select * from storage.objects`)).length === 1);

await as('authenticated', TOBI);    // paused
await refuses('a paused student cannot upload',
  `insert into storage.objects (bucket_id, name) values ('study-uploads', '${TOBI}/deck-9/Late.pdf')`,
  /row-level security|policy/i);
check('a paused student sees none of another student\'s files',
  (await rows(`select * from storage.objects`)).length === 0);

await as('service_role');
await db.query(`insert into storage.objects (bucket_id, name) values ('study-uploads', '${TOBI}/deck-2/Old.pdf')`);
await as('authenticated', TOBI);
await allows('a paused student can still delete their own files',
  `delete from storage.objects where name = '${TOBI}/deck-2/Old.pdf'`);

console.log('\n== taking your data out, and deleting it ==\n');

await as('authenticated', AMAKA);
const [{ cr_export_my_data: exported }] = await rows(`select public.cr_export_my_data()`);
check('export carries the account and its chats',
  exported.account?.full_name === 'Amaka Obi' && Array.isArray(exported.chats) && exported.chats.length === 1,
  JSON.stringify(exported?.account ?? null).slice(0, 80));
check('export carries the private half too — band and consent, no birth date needed',
  exported.private?.age_band === '18-24' && !!exported.private?.accepted_terms_at);

await as('authenticated', TOBI);    // still paused
const [{ cr_export_my_data: pausedExport }] = await rows(`select public.cr_export_my_data()`);
check('a paused account can still export — a right, not a feature of the plan',
  pausedExport.account?.full_name === 'Tobi A.');

await as('anon');
await refuses('a signed-out visitor cannot call export',
  `select public.cr_export_my_data()`, /permission denied|Sign in first/i);

await as('authenticated', CHIDI);
await allows('a student can delete their own account', `select public.cr_delete_my_account()`);
await as('service_role');
check('deleting the account clears the private half as well',
  (await rows(`select * from public.profile_private where id = '${CHIDI}'`)).length === 0);
check('deleting the account removes the auth user',
  (await rows(`select * from auth.users where id = '${CHIDI}'`)).length === 0);

// ------------------------------------------------- scholarships, as gathered
await as('service_role');

check('the research list is seeded',
  (await rows(`select count(*)::int as n from public.scholarships`))[0].n === 20);

// The point of the migration: a record with no official link is still shown,
// because hiding eighteen of twenty would not make a student better informed.
check('most records have no application link yet, and are kept anyway',
  (await rows(`select count(*)::int as n from public.scholarships where application_url is null`))[0].n === 18);

check('every record says how far it has been checked',
  (await rows(`select count(*)::int as n from public.scholarships
               where verification in ('Unverified', 'Partially Verified', 'Verified')`))[0].n === 20);

await refuses('a record cannot invent a verification state',
  `insert into public.scholarships (name, verification) values ('Made up', 'Totally Legit')`,
  /scholarships_verification_check/i);

// 'Verified' without a date is just a word someone typed.
await refuses('claiming verified without a date is refused',
  `insert into public.scholarships (name, verification) values ('No date', 'Verified')`,
  /scholarships_verified_needs_date/i);

await allows('claiming verified with a date is fine',
  `insert into public.scholarships (name, verification, last_verified_on)
   values ('Checked today', 'Verified', current_date)`);

// Re-importing the list must refresh a record, not duplicate it.
await allows('re-importing a record updates it in place',
  `insert into public.scholarships (record_ref, name, verification)
   values ('NG-001', 'NNPC/SNEPCo National University Scholarship 2026', 'Unverified')
   on conflict (record_ref) do update set name = excluded.name`);
check('re-importing did not duplicate the record',
  (await rows(`select count(*)::int as n from public.scholarships where record_ref = 'NG-001'`))[0].n === 1);

await as('authenticated', AMAKA);
check('an active student can read the list',
  (await rows(`select id from public.scholarships limit 1`)).length === 1);

// ---------------------------------------------------------------- report
await as(null);
console.log('\n== results ==\n');
for (const r of results) console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.ok ? '' : '   <-- ' + r.detail}`);
console.log(`\n  ${results.length - failures}/${results.length} passed\n`);
await db.close();
process.exit(failures ? 1 : 0);
