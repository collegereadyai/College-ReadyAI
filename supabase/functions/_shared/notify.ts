// College ReadyAI — getting the guardian's link to the guardian.
//
// There is no mail provider wired in here on purpose. Rather than pick one and
// leave a stub that looks like it works, this posts the message to one endpoint
// you configure — your provider's API, or a small relay in front of it.
//
//   GUARDIAN_NOTIFY_URL    where to POST
//   GUARDIAN_NOTIFY_TOKEN  sent as `authorization: Bearer …` (optional)
//
// If that is not set, sending FAILS. It does not quietly succeed. A 15-year-old
// whose guardian was never asked would have an account that can never open, and
// a sign-up that says "check your email" when no email exists is worse than one
// that refuses. The handler rolls the whole sign-up back when this throws.

export type Message = {
  to: string;
  channel: 'email' | 'sms';
  subject: string;
  text: string;
};

export type Sender = (message: Message) => Promise<void>;

export class NotConfigured extends Error {
  constructor() {
    super('No guardian notification endpoint is configured (GUARDIAN_NOTIFY_URL).');
    this.name = 'NotConfigured';
  }
}

export class SendFailed extends Error {
  constructor(detail: string) {
    super(`The guardian message could not be sent: ${detail}`);
    this.name = 'SendFailed';
  }
}

export function senderFromEnv(env: Record<string, string | undefined>, fetchImpl: typeof fetch = fetch): Sender {
  const url = (env.GUARDIAN_NOTIFY_URL || '').trim();
  const token = (env.GUARDIAN_NOTIFY_TOKEN || '').trim();

  return async (message: Message) => {
    if (!url) throw new NotConfigured();

    let response: Response;
    try {
      response = await fetchImpl(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(message),
      });
    } catch (cause) {
      throw new SendFailed(cause instanceof Error ? cause.message : 'the request did not complete');
    }

    if (!response.ok) {
      throw new SendFailed(`the endpoint answered ${response.status}`);
    }
  };
}

/**
 * The message itself. Plain, says who it is about and what happens if they do
 * nothing — the site's own line is "No reply means the account stays locked."
 */
export function guardianRequestMessage(args: {
  studentName: string;
  ageBand: string;
  to: string;
  channel: 'email' | 'sms';
  link: string;
}): Message {
  const { studentName, to, channel, link } = args;

  if (channel === 'sms') {
    return {
      to,
      channel,
      subject: 'College ReadyAI',
      text: `${studentName} has asked to use College ReadyAI and needs your approval. Open ${link} to approve or say no. No reply means the account stays locked.`,
    };
  }

  return {
    to,
    channel,
    subject: `Please review ${studentName}'s request to join College ReadyAI`,
    text: [
      `${studentName} has asked to use College ReadyAI and has given your address as their parent or guardian.`,
      '',
      'What the app does: study plans, practice tests, and AI answers that are always labelled as AI.',
      'What it collects: their age group, name and contact, the subjects and goal they choose, their practice answers, and the questions they type to the study guide.',
      '',
      'There are no ads, we do not sell data, and we do not train AI on their work.',
      'Marketing messages are switched off and unavailable for anyone under 18.',
      '',
      `Approve or say no here: ${link}`,
      '',
      'No reply means the account stays locked. You can withdraw approval later from the same link, and the account is paused.',
      'If you were not expecting this, you can ignore it and nothing will open.',
    ].join('\n'),
  };
}
