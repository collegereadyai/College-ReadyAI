// College ReadyAI — the order things happen in, and what to undo when they fail.
//
// The handlers are thin wrappers around these two. Everything the flow touches
// arrives as `deps`, so the whole path — including the rollback — can be tested
// without Supabase.

import { validateSignup, mintGuardianToken, guardianLink } from './signup.ts';
import type { SignupInput, CleanSignup } from './signup.ts';
import { checkDecision, decisionMessage, looksLikeToken, parseAsk } from './guardian.ts';
import type { RequestRow } from './guardian.ts';
import { guardianRequestMessage } from './notify.ts';
import type { Sender } from './notify.ts';

export type SignupDeps = {
  createUser: (email: string, password: string) => Promise<{ id: string }>;
  deleteUser: (id: string) => Promise<void>;
  insertProfile: (row: { id: string; full_name: string; stage: string | null }) => Promise<void>;
  insertPrivate: (row: {
    id: string;
    age_band: string;
    guardian_email: string | null;
    guardian_phone: string | null;
    marketing_opt_in: boolean;
    accepted_terms_at: string;
    accepted_privacy_at: string;
  }) => Promise<void>;
  insertGuardianRequest: (row: {
    student_id: string;
    sent_to: string;
    channel: 'email' | 'sms';
    token_hash: string;
  }) => Promise<void>;
  send: Sender;
  siteUrl: string;
  now?: () => Date;
};

export type SignupResult =
  | { ok: true; status: 201; userId: string; needsGuardian: boolean; message: string }
  | { ok: false; status: number; error: string; field?: string; hint?: string };

export async function runSignup(input: SignupInput, deps: SignupDeps): Promise<SignupResult> {
  const checked = validateSignup(input);
  if (!checked.ok) return checked;

  const v: CleanSignup = checked.value;
  const now = (deps.now || (() => new Date()))().toISOString();

  // Nothing exists yet, so an under-13 — already refused above — never gets this
  // far. From here on, every failure has to clean up after itself.
  const user = await deps.createUser(v.email, v.password);

  try {
    await deps.insertProfile({ id: user.id, full_name: v.fullName, stage: v.stage });

    // This insert is what fires the age gate and locks a minor's account.
    await deps.insertPrivate({
      id: user.id,
      age_band: v.ageBand,
      guardian_email: v.guardianEmail,
      guardian_phone: v.guardianPhone,
      marketing_opt_in: v.marketingOptIn,
      accepted_terms_at: now,
      accepted_privacy_at: now,
    });

    if (v.needsGuardian) {
      const channel: 'email' | 'sms' = v.guardianEmail ? 'email' : 'sms';
      const to = (v.guardianEmail || v.guardianPhone) as string;
      const { token, tokenHash } = await mintGuardianToken();

      await deps.insertGuardianRequest({ student_id: user.id, sent_to: to, channel, token_hash: tokenHash });

      // Last, and allowed to fail the whole sign-up: an account nobody can
      // approve is worse than no account.
      await deps.send(
        guardianRequestMessage({
          studentName: v.fullName,
          ageBand: v.ageBand,
          to,
          channel,
          link: guardianLink(deps.siteUrl, token),
        }),
      );

      return {
        ok: true,
        status: 201,
        userId: user.id,
        needsGuardian: true,
        message: `We have asked ${to} to approve your account. Nothing opens until they do.`,
      };
    }

    return {
      ok: true,
      status: 201,
      userId: user.id,
      needsGuardian: false,
      message: 'Your account is ready.',
    };
  } catch (cause) {
    // Undo the user so a half-made account cannot sit there. Failing to clean
    // up must not hide the original reason.
    try {
      await deps.deleteUser(user.id);
    } catch {
      /* reported below as part of the original failure */
    }
    const detail = cause instanceof Error ? cause.message : 'Sign-up could not be completed.';
    return { ok: false, status: 502, error: detail, hint: 'cr_signup_rolled_back' };
  }
}

// ---------------------------------------------------------------------------

export type GuardianDeps = {
  findByTokenHash: (hash: string) => Promise<(RequestRow & { student_name: string }) | null>;
  setDecision: (requestId: string, decision: string, decidedAt: string) => Promise<void>;
  sha256: (value: string) => Promise<string>;
  now?: () => Date;
};

export type GuardianResult =
  | { ok: true; status: 200; title: string; body: string; decision: string }
  | { ok: false; status: number; error: string; hint?: string };

export async function runGuardianDecision(
  raw: { token?: unknown; ask?: unknown },
  deps: GuardianDeps,
): Promise<GuardianResult> {
  const ask = parseAsk(raw.ask);
  if (!ask) {
    return { ok: false, status: 400, error: 'Say whether you approve, decline or withdraw.', hint: 'cr_bad_ask' };
  }
  if (!looksLikeToken(raw.token)) {
    return { ok: false, status: 400, error: 'This link is not valid.', hint: 'cr_bad_token' };
  }

  const now = (deps.now || (() => new Date()))();
  const row = await deps.findByTokenHash(await deps.sha256(String(raw.token).trim()));
  const verdict = checkDecision(row, ask, now);
  if (!verdict.ok) return verdict;

  // The database does the rest: a trigger on guardian_requests moves the
  // account to active, pending_guardian or paused.
  await deps.setDecision(verdict.requestId, verdict.decision, now.toISOString());

  const said = decisionMessage(verdict.decision, row?.student_name || 'The student');
  return { ok: true, status: 200, title: said.title, body: said.body, decision: verdict.decision };
}
