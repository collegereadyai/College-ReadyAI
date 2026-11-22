// College ReadyAI — POST /functions/v1/guardian
//
// What the guardian's link does when they answer it.
//
// POST only, deliberately. The link in the email points at the site's own
// /guardian page, which shows who is asking and offers Approve / Say no; only
// pressing one of those reaches this function. If a GET could approve an
// account, every corporate mail scanner and link prefetcher that opens the
// message would approve it for them.
//
// Environment: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ALLOWED_ORIGIN
// (a comma-separated list — see ../_shared/cors.ts).

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { runGuardianDecision } from '../_shared/flow.ts';
import { sha256 } from '../_shared/signup.ts';
import { corsFor } from '../_shared/cors.ts';

const env = (key: string): string => Deno.env.get(key) ?? '';

Deno.serve(async (req: Request) => {
  // Built per request, not once at startup: the reply names the caller's own
  // origin, so it cannot be a module-level constant shared by every caller.
  const cors = corsFor(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...cors } });

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') {
    return json({ error: 'Open this link from the email and choose an answer.' }, 405);
  }

  let input: { token?: unknown; ask?: unknown };
  try {
    input = await req.json();
  } catch {
    return json({ error: 'Send JSON.' }, 400);
  }

  const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const result = await runGuardianDecision(input, {
    findByTokenHash: async (hash) => {
      const { data, error } = await db
        .from('guardian_requests')
        .select('id, student_id, decision, expires_at, profiles!inner(full_name)')
        .eq('token_hash', hash)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      const profile = data.profiles as unknown as { full_name: string } | null;
      return {
        id: data.id as string,
        student_id: data.student_id as string,
        decision: data.decision as 'pending' | 'approved' | 'declined' | 'withdrawn',
        expires_at: data.expires_at as string,
        student_name: profile?.full_name ?? 'The student',
      };
    },
    setDecision: async (requestId, decision, decidedAt) => {
      const { error } = await db
        .from('guardian_requests')
        .update({ decision, decided_at: decidedAt })
        .eq('id', requestId);
      // A trigger on this table moves the account to active, pending_guardian
      // or paused. Nothing else here has to remember to do it.
      if (error) throw new Error(error.message);
    },
    sha256,
  });

  if (!result.ok) return json({ error: result.error, hint: result.hint }, result.status);
  return json({ ok: true, decision: result.decision, title: result.title, body: result.body }, 200);
});
