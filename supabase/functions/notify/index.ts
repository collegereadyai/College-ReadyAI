// College ReadyAI — POST /functions/v1/notify
//
// The endpoint GUARDIAN_NOTIFY_URL points at. It takes the message the sign-up
// flow produced and hands it to a mail provider.
//
// This exists as its own function rather than inside signup for two reasons.
// The flow was built to post a message to one configured URL and know nothing
// about providers, which is what lets the provider change without touching the
// age gate. And an endpoint that sends mail to an address of the caller's
// choosing is a thing worth being able to reason about on its own.
//
// It is NOT open. Every request must carry the shared token, because otherwise
// anyone who found the URL could send mail from your domain to anyone they
// liked — and it would arrive looking exactly like a real College ReadyAI
// guardian request, carrying a link.
//
// There is no browser involved, so there is no CORS handling here. The only
// caller is another Edge Function.
//
// Environment:
//   GUARDIAN_NOTIFY_TOKEN   the shared secret the sign-up flow sends
//   MAIL_PROVIDER           'resend' or 'brevo'
//   MAIL_API_KEY            that provider's key
//   MAIL_FROM               a verified sender address on your domain
//   MAIL_FROM_NAME          optional display name

import { buildProviderRequest, tokenAccepted, MailNotConfigured } from '../_shared/mail.ts';
import type { Message } from '../_shared/notify.ts';

const env = (key: string): string => Deno.env.get(key) ?? '';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);

  const header = req.headers.get('authorization') ?? '';
  const given = header.toLowerCase().startsWith('bearer ') ? header.slice(7) : '';

  // An unset token means refuse everything, not allow everything. Without
  // this, forgetting to set the secret would quietly open the endpoint.
  if (!tokenAccepted(env('GUARDIAN_NOTIFY_TOKEN'), given)) {
    return json({ error: 'Not allowed.' }, 401);
  }

  let message: Message;
  try {
    message = await req.json();
  } catch {
    return json({ error: 'Send JSON.' }, 400);
  }

  if (!message?.to || !message?.subject || !message?.text) {
    return json({ error: 'A message needs to, subject and text.' }, 400);
  }

  let request;
  try {
    request = buildProviderRequest(
      {
        MAIL_PROVIDER: env('MAIL_PROVIDER'),
        MAIL_API_KEY: env('MAIL_API_KEY'),
        MAIL_FROM: env('MAIL_FROM'),
        MAIL_FROM_NAME: env('MAIL_FROM_NAME'),
      },
      message,
    );
  } catch (cause) {
    // Misconfiguration is ours, not the caller's. 500 so the sign-up rolls
    // back and nobody is told their guardian was asked.
    const detail = cause instanceof MailNotConfigured ? cause.message : 'Mail is not configured.';
    return json({ error: detail }, 500);
  }

  let response: Response;
  try {
    response = await fetch(request.url, { method: 'POST', headers: request.headers, body: request.body });
  } catch (cause) {
    return json({ error: cause instanceof Error ? cause.message : 'The provider did not answer.' }, 502);
  }

  if (!response.ok) {
    // Pass the provider's own words through. "Resend answered 403: domain not
    // verified" is something you can act on; "sending failed" is not.
    const detail = await response.text().catch(() => '');
    return json({ error: `The provider answered ${response.status}`, detail: detail.slice(0, 500) }, 502);
  }

  return json({ ok: true }, 200);
});
