// College ReadyAI — POST /functions/v1/complete-profile
//
// Finishes an account that signed in with Google.
//
// Google hands us an email address and sometimes a name. It does not say how
// old someone is, whether they accept the Terms, or who their guardian is —
// and those are the three things this product may not guess. So a Google
// sign-in creates an auth user with no profile, and stays unusable until this
// runs: same validation as the sign-up form, same age gate, same guardian
// lock for anyone 13 to 17.
//
// Why a function rather than letting the page write the rows: a student could
// otherwise insert their own profile_private with age_band '25plus' and skip
// the guardian entirely. The browser must not be the thing that decides
// someone's age band.
//
// The caller is identified by their own access token, never by a user id in
// the body. A body is something the sender chooses.
//
// Environment:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY      provided by Supabase
//   SITE_URL, ALLOWED_ORIGIN                     as for signup
//   GUARDIAN_NOTIFY_URL, GUARDIAN_NOTIFY_TOKEN   see ../_shared/notify.ts

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { runCompleteProfile } from '../_shared/flow.ts';
import { senderFromEnv } from '../_shared/notify.ts';
import { corsFor } from '../_shared/cors.ts';

const env = (key: string): string => Deno.env.get(key) ?? '';

Deno.serve(async (req: Request) => {
  const cors = corsFor(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...cors } });

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);

  // verify_jwt is off at the gateway so a browser preflight can get through,
  // which means this function has to check the token itself. Everything below
  // depends on it: without a verified user there is nothing to complete.
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return json({ error: 'Sign in first.' }, 401);

  const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userError } = await db.auth.getUser(token);
  const user = userData?.user;
  // The anon key is public, so an unverified token must get no further here.
  if (userError || !user?.id || !user.email) {
    return json({ error: 'That sign-in could not be verified. Please sign in again.' }, 401);
  }

  let input: Record<string, unknown>;
  try {
    input = await req.json();
  } catch {
    return json({ error: 'Send JSON.' }, 400);
  }

  // Already finished. Saying so plainly beats a unique-violation from the
  // insert, and a second tab should not look like a failure.
  const { data: existing } = await db.from('profiles').select('id').eq('id', user.id).maybeSingle();
  if (existing) {
    return json({ ok: true, needsGuardian: false, message: 'Your account is already set up.' }, 200);
  }

  const fail = (what: string) => (res: { error: { message: string } | null }) => {
    if (res.error) throw new Error(`${what}: ${res.error.message}`);
  };

  const result = await runCompleteProfile(
    { ...input, userId: user.id, email: user.email },
    {
      insertProfile: async (row) => fail('profile')(await db.from('profiles').insert(row)),
      insertPrivate: async (row) => fail('profile_private')(await db.from('profile_private').insert(row)),
      insertGuardianRequest: async (row) => fail('guardian_request')(await db.from('guardian_requests').insert(row)),
      // Deletes the profile only. The auth user stays: they signed in with
      // Google and can try again.
      deleteProfile: async (id) => {
        const { error } = await db.from('profiles').delete().eq('id', id);
        if (error) throw new Error(error.message);
      },
      send: senderFromEnv({
        GUARDIAN_NOTIFY_URL: env('GUARDIAN_NOTIFY_URL'),
        GUARDIAN_NOTIFY_TOKEN: env('GUARDIAN_NOTIFY_TOKEN'),
      }),
      siteUrl: env('SITE_URL'),
    },
  );

  if (!result.ok) {
    return json({ error: result.error, field: result.field, hint: result.hint }, result.status);
  }

  return json({ ok: true, needsGuardian: result.needsGuardian, message: result.message }, result.status);
});
