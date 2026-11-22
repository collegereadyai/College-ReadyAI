// College ReadyAI — which origins may call our Edge Functions.
//
// ALLOWED_ORIGIN holds a comma-separated list, so the deployed site and a
// developer's machine can both be named:
//
//   ALLOWED_ORIGIN="https://collegereadyai.netlify.app,http://localhost:3400"
//
// Why a list rather than one value: pinning a single origin is right for
// production, but it also locks out local development, where sign-up then
// fails in a way that looks exactly like a broken backend. Naming localhost
// explicitly costs nothing — an attacker cannot serve a page from the
// victim's own localhost, so it is not a way in.
//
// A request is answered with its OWN origin echoed back, never the whole
// list, because `access-control-allow-origin` may only name one. An origin
// that is not on the list gets the first entry instead, which does not match
// the caller, so the browser refuses it — a refusal, not an error page.
//
// `vary: origin` is essential: the reply differs per caller, and without it a
// CDN could hand one origin's reply to another.

const env = (key: string): string => Deno.env.get(key) ?? '';

/** The configured origins, in order. Empty means "allow any". */
export function allowedOrigins(): string[] {
  return env('ALLOWED_ORIGIN')
    .split(',')
    .map((value) => value.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

/** The value to answer this request with, given what it asked for. */
export function originFor(request: Request): string {
  const list = allowedOrigins();
  if (list.length === 0) return '*';

  const asked = (request.headers.get('origin') ?? '').trim().replace(/\/$/, '');
  return list.includes(asked) ? asked : list[0];
}

/** The CORS headers for one request. Build these per request, not once. */
export function corsFor(request: Request): Record<string, string> {
  return {
    'access-control-allow-origin': originFor(request),
    'access-control-allow-methods': 'POST, OPTIONS',
    // 'apikey' and 'x-client-info' are sent by supabase-js and by
    // lib/supabase.js. A header the preflight does not name is refused by the
    // browser before the request is ever sent, and fetch() then throws the
    // same way it does when a machine is offline — which is why the sign-up
    // form once reported 'No connection'.
    'access-control-allow-headers': 'content-type, authorization, apikey, x-client-info',
    'vary': 'origin',
  };
}
