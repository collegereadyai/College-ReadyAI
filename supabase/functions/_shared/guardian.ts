// College ReadyAI — what a guardian's link is allowed to do, with no I/O.
//
// The site promises a guardian can say yes, say no, and change their mind later
// ("Withdraw approval and the account is paused"). That last one is why expiry
// is not a blanket rule: the 30 days are for answering the first time, not a
// deadline on the right to take approval back.

export type Decision = 'pending' | 'approved' | 'declined' | 'withdrawn';
export type Ask = 'approve' | 'decline' | 'withdraw';

export type RequestRow = {
  id: string;
  student_id: string;
  decision: Decision;
  expires_at: string;
};

export type Refusal = { ok: false; status: number; error: string; hint?: string };
export type Allowed = { ok: true; decision: Exclude<Decision, 'pending'>; studentId: string; requestId: string };

const ASKS: Array<Ask> = ['approve', 'decline', 'withdraw'];

export const asDecision = (ask: Ask): Exclude<Decision, 'pending'> =>
  ask === 'approve' ? 'approved' : ask === 'decline' ? 'declined' : 'withdrawn';

export function parseAsk(raw: unknown): Ask | null {
  const v = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  return (ASKS as Array<string>).includes(v) ? (v as Ask) : null;
}

/** A token has to look like one before it is worth a database round trip. */
export function looksLikeToken(raw: unknown): boolean {
  return typeof raw === 'string' && /^[A-Za-z0-9_-]{40,64}$/.test(raw.trim());
}

/**
 * Decides whether this link may do this, given the row it points at.
 *
 * pending   -> approved | declined   (while the link is still in date)
 * approved  -> withdrawn             (no time limit: a standing right)
 * declined  -> nothing               (ask the student to sign up again)
 * withdrawn -> nothing               (the same, so one link cannot flip an
 *                                     account on and off repeatedly)
 */
export function checkDecision(row: RequestRow | null, ask: Ask, now: Date): Allowed | Refusal {
  if (!row) {
    return { ok: false, status: 404, error: 'This link is not valid. Ask the student to send a new request.', hint: 'cr_token_unknown' };
  }

  const want = asDecision(ask);
  const expired = new Date(row.expires_at).getTime() <= now.getTime();

  if (row.decision === 'pending') {
    if (want === 'withdrawn') {
      return { ok: false, status: 409, error: 'There is nothing to withdraw yet: this account has not been approved.', hint: 'cr_not_approved' };
    }
    if (expired) {
      return { ok: false, status: 410, error: 'This link has expired. Ask the student to send a new request.', hint: 'cr_token_expired' };
    }
    return { ok: true, decision: want, studentId: row.student_id, requestId: row.id };
  }

  if (row.decision === 'approved') {
    if (want === 'withdrawn') {
      // Deliberately ignores expiry.
      return { ok: true, decision: 'withdrawn', studentId: row.student_id, requestId: row.id };
    }
    return { ok: false, status: 409, error: 'You have already approved this account.', hint: 'cr_already_approved' };
  }

  if (row.decision === 'declined') {
    return { ok: false, status: 409, error: 'This request was already declined. Ask the student to send a new one.', hint: 'cr_already_declined' };
  }

  return { ok: false, status: 409, error: 'Approval was already withdrawn. Ask the student to send a new request.', hint: 'cr_already_withdrawn' };
}

/** What the guardian is told, once it has worked. */
export function decisionMessage(decision: Exclude<Decision, 'pending'>, studentName: string): { title: string; body: string } {
  if (decision === 'approved') {
    return {
      title: 'Approved',
      body: `${studentName} can now use College ReadyAI. You can withdraw this approval at any time from the same link, and the account will be paused.`,
    };
  }
  if (decision === 'declined') {
    return {
      title: 'Declined',
      body: `${studentName}'s account stays locked and nothing opens. If this was a mistake, ask them to sign up again.`,
    };
  }
  return {
    title: 'Approval withdrawn',
    body: `${studentName}'s account is now paused. Their work is kept, but they cannot use College ReadyAI until a guardian approves again.`,
  };
}
