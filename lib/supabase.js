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
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    })
  : null;

export const functionsUrl = (name) => `${url}/functions/v1/${name}`;

/** Calls one of our Edge Functions and returns its JSON, whatever the status. */
export async function callFunction(name, body) {
  if (!configured) {
    return { ok: false, status: 0, error: "This site is not connected to its backend yet." };
  }
  let response;
  try {
    response = await fetch(functionsUrl(name), {
      method: "POST",
      headers: { "content-type": "application/json", apikey: anonKey, authorization: `Bearer ${anonKey}` },
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
