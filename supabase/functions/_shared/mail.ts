// College ReadyAI — turning a guardian message into one provider's request.
//
// _shared/notify.ts stays provider-agnostic: it posts {to, channel, subject,
// text} to whatever GUARDIAN_NOTIFY_URL names. This is the other side of that
// line — the piece that knows what Resend and Brevo want.
//
// Kept apart from the handler so the mapping can be tested without Deno and
// without sending anything. Getting a field name wrong here means a guardian
// is never asked, which is the one failure this whole flow exists to prevent.

import type { Message } from './notify.ts';

export type Provider = 'resend' | 'brevo';

export type MailEnv = {
  MAIL_PROVIDER?: string;
  MAIL_API_KEY?: string;
  MAIL_FROM?: string;
  MAIL_FROM_NAME?: string;
};

export class MailNotConfigured extends Error {
  constructor(detail: string) {
    super(detail);
    this.name = 'MailNotConfigured';
  }
}

export type ProviderRequest = {
  url: string;
  headers: Record<string, string>;
  body: string;
};

const PROVIDERS: Provider[] = ['resend', 'brevo'];

/**
 * Builds the HTTP call for the configured provider.
 *
 * Throws rather than guessing when something is missing. A send that silently
 * does nothing is the worst outcome available here: the student is told their
 * guardian was asked, and nobody was.
 */
export function buildProviderRequest(env: MailEnv, message: Message): ProviderRequest {
  const provider = (env.MAIL_PROVIDER || '').trim().toLowerCase() as Provider;
  const key = (env.MAIL_API_KEY || '').trim();
  const from = (env.MAIL_FROM || '').trim();
  const fromName = (env.MAIL_FROM_NAME || 'College ReadyAI').trim();

  if (!provider) throw new MailNotConfigured('MAIL_PROVIDER is not set.');
  if (!PROVIDERS.includes(provider)) {
    throw new MailNotConfigured(`MAIL_PROVIDER must be one of ${PROVIDERS.join(', ')}.`);
  }
  if (!key) throw new MailNotConfigured('MAIL_API_KEY is not set.');
  if (!from) throw new MailNotConfigured('MAIL_FROM is not set.');

  // SMS is a different provider with a different account. Refusing is honest;
  // quietly emailing a phone number is not.
  if (message.channel !== 'email') {
    throw new MailNotConfigured(
      `This endpoint sends email only, and the message was for ${message.channel}.`,
    );
  }

  if (provider === 'resend') {
    return {
      url: 'https://api.resend.com/emails',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({
        from: `${fromName} <${from}>`,
        to: [message.to],
        subject: message.subject,
        text: message.text,
      }),
    };
  }

  // Brevo. Note the key goes in `api-key`, not an Authorization header, and
  // the body is textContent rather than text.
  return {
    url: 'https://api.brevo.com/v3/smtp/email',
    headers: { 'content-type': 'application/json', accept: 'application/json', 'api-key': key },
    body: JSON.stringify({
      sender: { email: from, name: fromName },
      to: [{ email: message.to }],
      subject: message.subject,
      textContent: message.text,
    }),
  };
}

/**
 * Whether the caller is allowed to make us send mail.
 *
 * This endpoint turns a request into an email to an address of the sender's
 * choosing, so it cannot be open. The token is the same one the signup
 * function sends as GUARDIAN_NOTIFY_TOKEN.
 *
 * The comparison runs over every character rather than stopping at the first
 * difference, so the time it takes says nothing about how much of the token
 * was right.
 */
export function tokenAccepted(expected: string, given: string): boolean {
  const want = (expected || '').trim();
  const got = (given || '').trim();
  if (!want) return false;
  if (want.length !== got.length) return false;

  let difference = 0;
  for (let i = 0; i < want.length; i++) {
    difference |= want.charCodeAt(i) ^ got.charCodeAt(i);
  }
  return difference === 0;
}
