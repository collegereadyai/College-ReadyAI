"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase, configured, callFunction } from "@/lib/supabase";

// The step a Google sign-in cannot skip.
//
// Signing in with Google proves an email address. It says nothing about
// whether someone is thirteen, whether they accept the Terms, or who their
// guardian is — so this collects those before the account can be used, and
// the server checks them again before writing anything.
//
// An under-13 is refused here exactly as on the sign-up form. The difference
// is that an auth user already exists by this point, so refusing means
// signing them out rather than declining to create anything. They are told
// plainly, and no profile is made.

function Setup() {
  const params = useSearchParams();
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const under13 = age === "under13";
  const under18 = age === "13-17";

  useEffect(() => {
    let live = true;
    (async () => {
      if (!configured) { if (live) { setError("This site is not connected to its backend yet."); setChecking(false); } return; }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.assign("/login"); return; }

      // Already finished — a reload or a second tab should not offer the form
      // again.
      const { data: profile } = await supabase
        .from("profiles").select("id").eq("id", session.user.id).maybeSingle();
      if (!live) return;
      if (profile) { window.location.assign(params.get("next") || "/dashboard"); return; }

      setEmail(session.user.email || "");
      setChecking(false);
    })();
    return () => { live = false; };
  }, [params]);

  async function onSubmit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const result = await callFunction("complete-profile", {
      fullName: String(form.get("fullName") || "").trim(),
      ageBand: String(form.get("age") || ""),
      stage: String(form.get("stage") || ""),
      guardianEmail: String(form.get("guardianEmail") || "").trim(),
      acceptedTerms: form.get("acceptedTerms") === "on",
      acceptedPrivacy: form.get("acceptedTerms") === "on",
      marketingOptIn: form.get("marketingOptIn") === "on",
    });

    if (!result.ok) {
      setError(result.error);
      // An under-13 has an auth user but must not keep a usable session.
      if (result.hint === "cr_under_13") await supabase.auth.signOut();
      setBusy(false);
      return;
    }

    if (result.needsGuardian) { setDone(result.message); setBusy(false); return; }
    window.location.assign(params.get("next") || "/dashboard");
  }

  if (checking) return <p>Checking your account…</p>;

  if (done) return <>
    <h2>Almost there</h2>
    <p role="status">{done}</p>
    <p className="form-note">You can close this page. Nothing opens until they answer.</p>
  </>;

  return <form className="simple-form account-form" onSubmit={onSubmit}>
    <h3>Finish setting up</h3>
    <p>Signed in with Google as {email}. We need a few things Google does not tell us.</p>

    <label>Your name<input name="fullName" autoComplete="name" required/></label>

    <label>Where are you now?<select name="stage" defaultValue="">
      <option value="">Choose a stage</option>
      <option value="secondary">Senior secondary</option>
      <option value="applying">About to enter university</option>
      <option value="university">At university</option>
    </select></label>

    <label>Age group<select name="age" value={age} onChange={(e) => setAge(e.target.value)} required>
      <option value="">Choose an age group</option>
      <option value="under13">Under 13</option>
      <option value="13-17">13 to 17</option>
      <option value="18-24">18 to 24</option>
      <option value="25plus">25 or older</option>
    </select></label>
    <p className="form-note">
      Under-13s cannot use College ReadyAI. Students aged 13 to 17 need a parent or guardian to
      approve first.
    </p>

    {under13 && <p className="form-note" role="alert">
      College ReadyAI is for ages 13 and up. Choosing this will sign you out and no account will
      be set up.
    </p>}

    {under18 && <>
      <label>Parent or guardian&apos;s email<input name="guardianEmail" type="email" required/></label>
      <p className="form-note">We write to them to ask for approval. Your account stays locked until they answer.</p>
    </>}

    <label className="checkline">
      <input type="checkbox" name="acceptedTerms" required/>
      <span>I agree to the <Link href="/legal/terms">Terms</Link> and acknowledge the <Link href="/legal/privacy">Privacy Policy</Link>.</span>
    </label>
    <label className={`checkline ${under18 ? "disabled-choice" : ""}`}>
      <input type="checkbox" name="marketingOptIn" disabled={under18}/>
      <span>I agree to receive optional product updates by email. (Optional)</span>
    </label>

    {error && <p className="form-note" role="alert" style={{ color: "#b3261e", fontWeight: 600 }}>{error}</p>}

    <button className="button" type="submit" disabled={busy}>
      {busy ? "Setting up…" : "Finish setting up"}
    </button>
  </form>;
}

export function WelcomeForm() {
  return <Suspense fallback={<p>Loading…</p>}><Setup/></Suspense>;
}
