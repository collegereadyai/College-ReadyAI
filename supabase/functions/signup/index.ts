// College ReadyAI — POST /functions/v1/signup
//
// A Supabase Edge Function. Thin on purpose: the decisions live in
// ../_shared/flow.ts, which is covered by backend/test/functions.mjs.
//
// Why this exists rather than calling supabase.auth.signUp() from the browser:
// an under-13 must never reach the auth system at all, the guardian's token has
// to be minted and hashed somewhere the browser cannot see, and a sign-up that
// cannot notify the guardian has to be rolled back. None of that is safe in a
// page.
//
// Environment:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY      provided by Supabase
//   SITE_URL                                     where the guardian page lives
//   ALLOWED_ORIGIN                               comma-separated; ../_shared/cors.ts
//   GUARDIAN_NOTIFY_URL, GUARDIAN_NOTIFY_TOKEN   see ../_shared/notify.ts

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { runSignup } from '../_shared/flow.ts';
import { senderFromEnv } from '../_shared/notify.ts';
import { corsFor } from '../_shared/cors.ts';

const env = (key: string): string => Deno.env.get(key) ?? '';

Deno.serve(async (req: Request) => {
  // Built per request, not once at startup: the reply names the caller's own
  // origin, so it cannot be a module-level constant shared by every caller.
  const cors = corsFor(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...cors } });

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);

  let input: Record<string, unknown>;
  try {
    input = await req.json();
  } catch {
    return json({ error: 'Send JSON.' }, 400);
  }

  const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const fail = (what: string) => (res: { error: { message: string } | null }) => {
    if (res.error) throw new Error(`${what}: ${res.error.message}`);
  };

  const result = await runSignup(input, {
    createUser: async (email, password) => {
      // email_confirm is true because this account is created through the admin
      // API, and that path does not send Supabase's verification email — it just
      // marks the address unconfirmed. With `false` the student was then refused
      // at login with "Email not confirmed", and no email ever arrived to fix it,
      // so every account was created already locked.
      //
      // Nothing is lost that we had: the address is still unproven either way.
      // When a mail provider is connected, send a verification from here and set
      // this back to false.
      const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
      if (error || !data.user) throw new Error(error?.message || 'The account could not be created.');
      return { id: data.user.id };
    },
    deleteUser: async (id) => {
      const { error } = await db.auth.admin.deleteUser(id);
      if (error) throw new Error(error.message);
    },
    insertProfile: async (row) => fail('profile')(await db.from('profiles').insert(row)),
    insertPrivate: async (row) => fail('profile_private')(await db.from('profile_private').insert(row)),
    insertGuardianRequest: async (row) => fail('guardian_request')(await db.from('guardian_requests').insert(row)),
    send: senderFromEnv({
      GUARDIAN_NOTIFY_URL: env('GUARDIAN_NOTIFY_URL'),
      GUARDIAN_NOTIFY_TOKEN: env('GUARDIAN_NOTIFY_TOKEN'),
    }),
    siteUrl: env('SITE_URL'),
  });

  if (!result.ok) {
    // Never echo the password or the rest of the payload back.
    return json({ error: result.error, field: result.field, hint: result.hint }, result.status);
  }

  return json(
    { ok: true, needsGuardian: result.needsGuardian, message: result.message },
    result.status,
  );
});
