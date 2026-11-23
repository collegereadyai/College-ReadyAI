// College ReadyAI — tests for the sign-up and guardian-approval logic.
//
//   node backend/test/functions.mjs
//
// No Supabase, no Deno, no network: the flow takes its database and its sender
// as arguments, so the interesting paths — including the rollback — can be run
// here. Node strips the TypeScript types on import.

import { validateSignup, mintGuardianToken, sha256, guardianLink } from '../supabase/functions/_shared/signup.ts';
import { checkDecision, parseAsk, looksLikeToken } from '../supabase/functions/_shared/guardian.ts';
import { runSignup, runGuardianDecision, runCompleteProfile } from '../supabase/functions/_shared/flow.ts';
import { senderFromEnv, NotConfigured, guardianRequestMessage } from '../supabase/functions/_shared/notify.ts';

let failures = 0;
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  if (!ok) failures++;
}

const ADULT = {
  email: 'Amaka@Example.com ',
  password: 'a-good-password',
  fullName: 'Amaka Obi',
  ageBand: '18-24',
  stage: 'university',
  acceptedTerms: true,
  acceptedPrivacy: true,
  marketingOptIn: true,
};

const MINOR = {
  email: 'tobi@example.com',
  password: 'a-good-password',
  fullName: 'Tobi Adeyemi',
  ageBand: '13-17',
  stage: 'secondary',
  guardianEmail: 'parent@example.com',
  acceptedTerms: true,
  acceptedPrivacy: true,
  marketingOptIn: true,
};

// --------------------------------------------------------------- validation
console.log('\n== the sign-up form ==\n');

{
  const r = validateSignup({ ...ADULT, ageBand: 'under13' });
  check('under 13 is refused, and says so plainly',
    !r.ok && r.status === 403 && r.hint === 'cr_under_13' && /ages 13 and up/i.test(r.error));
}
check('an age group is required', !validateSignup({ ...ADULT, ageBand: '' }).ok);
check('a made-up age group is refused', !validateSignup({ ...ADULT, ageBand: 'ancient' }).ok);
check('a bad email is refused', !validateSignup({ ...ADULT, email: 'nope' }).ok);
check('a short password is refused', !validateSignup({ ...ADULT, password: 'short' }).ok);
check('a missing name is refused', !validateSignup({ ...ADULT, fullName: '  ' }).ok);
check('sign-up without accepting the Terms is refused',
  !validateSignup({ ...ADULT, acceptedTerms: false }).ok);
check('sign-up without acknowledging Privacy is refused',
  !validateSignup({ ...ADULT, acceptedPrivacy: false }).ok);
check('an unknown stage is refused', !validateSignup({ ...ADULT, stage: 'primary' }).ok);

{
  const r = validateSignup(ADULT);
  check('a good adult sign-up is accepted', r.ok);
  check('the email is trimmed and lower-cased', r.ok && r.value.email === 'amaka@example.com');
  check('an adult may opt in to marketing', r.ok && r.value.marketingOptIn === true);
  check('an adult needs no guardian', r.ok && r.value.needsGuardian === false);
}

{
  const r = validateSignup({ ...MINOR, guardianEmail: '', guardianPhone: '' });
  check('a 13-17 sign-up needs a guardian contact',
    !r.ok && r.hint === 'cr_guardian_contact_required');
}
check('a guardian cannot be the student themselves',
  !validateSignup({ ...MINOR, guardianEmail: MINOR.email }).ok);
check('a guardian phone number is enough on its own',
  validateSignup({ ...MINOR, guardianEmail: '', guardianPhone: '+234 803 123 4567' }).ok);

{
  const r = validateSignup(MINOR);
  check('a minor is marked as needing a guardian', r.ok && r.value.needsGuardian === true);
  check('marketing is forced off for a minor even when the form sends true',
    r.ok && r.value.marketingOptIn === false);
}

// --------------------------------------------------------------- the token
console.log('\n== the guardian link ==\n');

{
  const a = await mintGuardianToken();
  const b = await mintGuardianToken();
  check('a token is url-safe and long enough', /^[A-Za-z0-9_-]{43}$/.test(a.token), a.token);
  check('its hash is a sha-256 hex digest', /^[a-f0-9]{64}$/.test(a.tokenHash));
  check('the stored hash really is the hash of the token', a.tokenHash === (await sha256(a.token)));
  check('two tokens are never the same', a.token !== b.token);
  check('the raw token is not derivable from the hash', !a.tokenHash.includes(a.token));
  check('a link carries the token in the query',
    guardianLink('https://collegereadyai.com/', a.token).startsWith('https://collegereadyai.com/guardian?t='));
}

// --------------------------------------------------------------- the flow
console.log('\n== creating the account ==\n');

function fakeDeps(overrides = {}) {
  const log = { users: [], deleted: [], profiles: [], privates: [], requests: [], sent: [] };
  const deps = {
    createUser: async (email) => { const u = { id: 'user-' + log.users.length }; log.users.push({ ...u, email }); return u; },
    deleteUser: async (id) => { log.deleted.push(id); },
    insertProfile: async (row) => { log.profiles.push(row); },
    insertPrivate: async (row) => { log.privates.push(row); },
    insertGuardianRequest: async (row) => { log.requests.push(row); },
    send: async (m) => { log.sent.push(m); },
    siteUrl: 'https://collegereadyai.com',
    ...overrides,
  };
  return { deps, log };
}

{
  const { deps, log } = fakeDeps();
  const r = await runSignup(ADULT, deps);
  check('an adult sign-up succeeds', r.ok && r.status === 201);
  check('an adult account asks no guardian', r.ok && r.needsGuardian === false && log.requests.length === 0);
  check('no message is sent for an adult', log.sent.length === 0);
  check('consent is recorded with a timestamp',
    !!log.privates[0]?.accepted_terms_at && !!log.privates[0]?.accepted_privacy_at);
}

{
  const { deps, log } = fakeDeps();
  const r = await runSignup(MINOR, deps);
  check('a minor sign-up succeeds and says who was asked',
    r.ok && r.needsGuardian === true && /parent@example\.com/.test(r.message));
  check('a guardian request is stored as a hash, never the token',
    log.requests.length === 1 && /^[a-f0-9]{64}$/.test(log.requests[0].token_hash));
  check('the guardian is actually messaged', log.sent.length === 1 && log.sent[0].to === 'parent@example.com');
  check('the message carries a working link',
    /\/guardian\?t=[A-Za-z0-9_-]{43}$/.test(log.sent[0].text.match(/https:\S+/)?.[0] || ''));
  check('the message says what happens if they ignore it', /stays locked/i.test(log.sent[0].text));
}

{
  const { deps, log } = fakeDeps();
  const r = await runSignup({ ...ADULT, ageBand: 'under13' }, deps);
  check('an under-13 never reaches the auth system at all',
    !r.ok && log.users.length === 0 && log.profiles.length === 0);
}

console.log('\n== when something fails half way ==\n');

{
  const { deps, log } = fakeDeps({ send: async () => { throw new Error('the endpoint answered 500'); } });
  const r = await runSignup(MINOR, deps);
  check('a sign-up whose guardian message fails is refused', !r.ok && r.status === 502);
  check('and the half-made account is deleted', log.deleted.length === 1 && log.deleted[0] === log.users[0].id);
  check('the reason is passed on, not swallowed', !r.ok && /answered 500/.test(r.error));
}

{
  const { deps, log } = fakeDeps({ insertPrivate: async () => { throw new Error('College ReadyAI is for ages 13 and up'); } });
  const r = await runSignup(MINOR, deps);
  check('a database refusal also rolls the account back', !r.ok && log.deleted.length === 1);
}

{
  const { deps } = fakeDeps({
    send: async () => { throw new Error('nope'); },
    deleteUser: async () => { throw new Error('cleanup also failed'); },
  });
  const r = await runSignup(MINOR, deps);
  check('a failed cleanup does not hide the original reason', !r.ok && /nope/.test(r.error));
}

// --------------------------------------------------------------- guardian
console.log('\n== the guardian answers ==\n');

const DAY = 86400000;
const NOW = new Date('2026-11-15T10:00:00Z');
const row = (over = {}) => ({
  id: 'req-1',
  student_id: 'user-0',
  student_name: 'Tobi Adeyemi',
  decision: 'pending',
  expires_at: new Date(NOW.getTime() + 30 * DAY).toISOString(),
  ...over,
});

check('an unknown link is refused', !checkDecision(null, 'approve', NOW).ok);
check('approving a pending request is allowed', checkDecision(row(), 'approve', NOW).ok);
check('declining a pending request is allowed', checkDecision(row(), 'decline', NOW).ok);
check('there is nothing to withdraw before approval', !checkDecision(row(), 'withdraw', NOW).ok);
check('an expired link cannot approve',
  !checkDecision(row({ expires_at: new Date(NOW.getTime() - DAY).toISOString() }), 'approve', NOW).ok);
check('approving twice is refused', !checkDecision(row({ decision: 'approved' }), 'approve', NOW).ok);
check('withdrawing after approval is allowed', checkDecision(row({ decision: 'approved' }), 'withdraw', NOW).ok);
check('withdrawal still works after the link would have expired — a standing right',
  checkDecision(row({ decision: 'approved', expires_at: new Date(NOW.getTime() - 400 * DAY).toISOString() }), 'withdraw', NOW).ok);
check('a declined request cannot be revived', !checkDecision(row({ decision: 'declined' }), 'approve', NOW).ok);
check('a withdrawn request cannot be re-approved from the same link',
  !checkDecision(row({ decision: 'withdrawn' }), 'approve', NOW).ok);

check('a nonsense action is refused', parseAsk('delete-everything') === null);
check('a token that is the wrong shape is refused early', !looksLikeToken('abc'));

{
  const token = (await mintGuardianToken()).token;
  const hash = await sha256(token);
  let stored = null;
  const deps = {
    findByTokenHash: async (h) => (h === hash ? row() : null),
    setDecision: async (id, decision, at) => { stored = { id, decision, at }; },
    sha256,
    now: () => NOW,
  };

  const r = await runGuardianDecision({ token, ask: 'approve' }, deps);
  check('a real link approves the account', r.ok && stored?.decision === 'approved');
  check('the guardian is told what happens next', r.ok && /withdraw/i.test(r.body));

  const bad = await runGuardianDecision({ token: (await mintGuardianToken()).token, ask: 'approve' }, deps);
  check('a different token approves nothing', !bad.ok && bad.status === 404);
}

// --------------------------------------------------------------- sending
console.log('\n== sending ==\n');

{
  const send = senderFromEnv({});
  let threw = null;
  try { await send({ to: 'a@b.co', channel: 'email', subject: 's', text: 't' }); } catch (e) { threw = e; }
  check('with no endpoint configured, sending fails loudly rather than pretending',
    threw instanceof NotConfigured);
}

{
  const calls = [];
  const send = senderFromEnv(
    { GUARDIAN_NOTIFY_URL: 'https://mail.example/send', GUARDIAN_NOTIFY_TOKEN: 'k' },
    async (url, init) => { calls.push({ url, init }); return { ok: true, status: 200 }; },
  );
  await send({ to: 'a@b.co', channel: 'email', subject: 's', text: 't' });
  check('a configured endpoint is called with the message',
    calls.length === 1 && calls[0].url === 'https://mail.example/send');
  check('the token is sent as a bearer header', calls[0].init.headers.authorization === 'Bearer k');
}

{
  const send = senderFromEnv({ GUARDIAN_NOTIFY_URL: 'https://mail.example/send' }, async () => ({ ok: false, status: 503 }));
  let threw = null;
  try { await send({ to: 'a@b.co', channel: 'email', subject: 's', text: 't' }); } catch (e) { threw = e; }
  check('a provider error is reported, not ignored', !!threw && /503/.test(threw.message));
}

{
  const m = guardianRequestMessage({ studentName: 'Tobi', ageBand: '13-17', to: '+2348031234567', channel: 'sms', link: 'https://x/guardian?t=abc' });
  check('an sms version exists and stays short', m.channel === 'sms' && m.text.length < 320, String(m.text.length));
}

// ------------------------------------------- finishing a Google sign-in
// The account already exists in auth; only the profile is missing. Everything
// Google cannot tell us still has to be collected and checked.

function googleDeps(overrides = {}) {
  const { deps, log } = fakeDeps(overrides);
  // There is no auth user to undo here — they signed in with Google.
  deps.deleteProfile = async (id) => { log.deleted.push(id); };
  delete deps.createUser;
  delete deps.deleteUser;
  return { deps, log };
}

const GOOGLE_USER = { userId: 'google-user-1', email: 'amaka@example.com' };

{
  const { deps, log } = googleDeps();
  // No password: Google accounts do not have one with us.
  const { password, email, ...rest } = ADULT;
  const r = await runCompleteProfile({ ...rest, ...GOOGLE_USER }, deps);
  check('a Google adult can finish without a password', r.ok && r.status === 201);
  check('the profile is written against the verified user, not a body field',
    log.profiles[0]?.id === 'google-user-1');
  check('consent is still recorded with a timestamp',
    !!log.privates[0]?.accepted_terms_at && !!log.privates[0]?.accepted_privacy_at);
  check('no guardian is asked for an adult', log.requests.length === 0 && log.sent.length === 0);
}

{
  // The whole reason this step exists.
  const { deps, log } = googleDeps();
  const r = await runCompleteProfile({ ...MINOR, ...GOOGLE_USER, ageBand: 'under13' }, deps);
  check('an under-13 is refused even though Google let them in',
    !r.ok && r.status === 403 && r.hint === 'cr_under_13');
  check('nothing is written for an under-13',
    log.profiles.length === 0 && log.privates.length === 0);
}

{
  const { deps, log } = googleDeps();
  const { password, ...rest } = MINOR;
  const r = await runCompleteProfile({ ...rest, ...GOOGLE_USER, email: 'tobi@example.com' }, deps);
  check('a Google 13-17 account still needs a guardian', r.ok && r.needsGuardian === true);
  check('the guardian is asked, and only the hash is stored',
    log.requests.length === 1 && !!log.requests[0].token_hash && !('token' in log.requests[0]));
  check('the approval message is sent', log.sent.length === 1);
}

{
  const { deps } = googleDeps();
  const { password, ...rest } = ADULT;
  const r = await runCompleteProfile({ ...rest, ...GOOGLE_USER, acceptedTerms: false }, deps);
  check('consent cannot be skipped on the Google path', !r.ok && r.status === 400);
}

{
  // A failure must not cost them their Google login.
  const { deps, log } = googleDeps({
    insertPrivate: async () => { throw new Error('database said no'); },
  });
  const { password, ...rest } = ADULT;
  const r = await runCompleteProfile({ ...rest, ...GOOGLE_USER }, deps);
  check('a failure rolls the profile back', !r.ok && r.hint === 'cr_profile_rolled_back');
  check('the rollback removes the profile, not the account',
    log.deleted.length === 1 && log.deleted[0] === 'google-user-1');
  check('the original reason survives the rollback', !r.ok && /database said no/.test(r.error));
}

// --------------------------------------------------------------- report
console.log('\n== results ==\n');
for (const r of results) console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.ok ? '' : '   <-- ' + r.detail}`);
console.log(`\n  ${results.length - failures}/${results.length} passed\n`);
process.exit(failures ? 1 : 0);
