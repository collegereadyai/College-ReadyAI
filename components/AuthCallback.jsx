"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase, configured } from "@/lib/supabase";

// Where Google sends the browser back to.
//
// The code in the URL is exchanged for a session here rather than by the
// client picking a token out of the address bar, which is why
// detectSessionInUrl is off. With PKCE the URL carries a one-time code, not an
// access token, so nothing usable is left in history or a referrer header.
//
// Then the important part: a Google sign-in proves an email address and
// nothing else. If the account has no profile it has no age band, no recorded
// consent and no guardian, so it goes to /welcome rather than the dashboard.
// Sending it straight to /dashboard would put someone inside the product
// without the age gate ever having run.

function Exchange() {
  const params = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    (async () => {
      if (!configured) { setError("This site is not connected to its backend yet."); return; }

      // Google reports a refusal in the URL rather than by failing the
      // redirect, so a cancelled sign-in arrives here looking like a success.
      const denied = params.get("error_description") || params.get("error");
      if (denied) { setError(denied); return; }

      const code = params.get("code");
      if (!code) { setError("That sign-in link is incomplete. Please try again."); return; }

      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (!live) return;
      if (exchangeError) { setError(exchangeError.message); return; }

      const next = params.get("next") || "/dashboard";
      const { data: profile } = await supabase
        .from("profiles").select("id").eq("id", data.session.user.id).maybeSingle();

      if (!live) return;
      // Crossing between the public site and the logged-in area is a full page
      // load, since they are separate route groups with their own stylesheets.
      window.location.assign(profile ? next : `/welcome?next=${encodeURIComponent(next)}`);
    })();
    return () => { live = false; };
  }, [params]);

  if (error) return <>
    <h2>That sign-in did not complete</h2>
    <p role="alert">{error}</p>
    <p><Link className="button" href="/login">Back to log in</Link></p>
  </>;

  return <p role="status">Signing you in…</p>;
}

export function AuthCallback() {
  return <Suspense fallback={<p>Signing you in…</p>}><Exchange/></Suspense>;
}
