"use client";
// College ReadyAI — the browser's connection to Supabase.
//
// Sessions are kept in the browser, so the dashboard is gated on the client.
// That is a convenience, not the security boundary: row-level security in the
// database decides what any session can actually read, so a forged route guard
// would still return nothing. See supabase/migrations/…_rls.sql.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const configured = Boolean(url && anonKey);

// A missing key must not crash the build or every page that imports this. The
// screens that need it check `configured` and say so plainly instead.
export const supabase = configured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // The OAuth return is handled by /auth/callback rather than by picking
        // a token out of whatever URL the browser happens to be on.
        detectSessionInUrl: false,
        // PKCE sends back a one-time code instead of an access token in the
        // URL fragment, so a token cannot be left behind in history, in a
        // referrer header, or in a link someone pastes to a friend.
        flowType: "pkce",
      },
    })
  : null;

/**
 * Starts a Google sign-in. Control leaves the page here and comes back to
 * /auth/callback with a code to exchange.
 *
 * This creates an auth user and nothing else: no age band, no consent, no
 * guardian. /auth/callback sends anyone without a profile to /welcome, which
 * collects those before the account can be used.
 */
export async function signInWithGoogle(next = "/dashboard") {
  if (!configured) return { error: { message: "This site is not connected to its backend yet." } };
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
}

export const functionsUrl = (name) => `${url}/functions/v1/${name}`;

/** Calls one of our Edge Functions and returns its JSON, whatever the status. */
export async function callFunction(name, body) {
  if (!configured) {
    return { ok: false, status: 0, error: "This site is not connected to its backend yet." };
  }
  // When someone is signed in, send their own token rather than the anon key.
  // `complete-profile` identifies the caller from it, and will not take a user
  // id from the body — a body is something the sender chooses.
  const { data: { session } } = await supabase.auth.getSession();
  const bearer = session?.access_token || anonKey;

  let response;
  try {
    response = await fetch(functionsUrl(name), {
      method: "POST",
      headers: { "content-type": "application/json", apikey: anonKey, authorization: `Bearer ${bearer}` },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, status: 0, error: "No connection. Check your internet and try again." };
  }

  let data = {};
  try { data = await response.json(); } catch { /* keep the status */ }

  if (!response.ok) {
    return { ok: false, status: response.status, error: data.error || "That did not work. Please try again.", field: data.field, hint: data.hint };
  }
  return { ok: true, status: response.status, ...data };
}
