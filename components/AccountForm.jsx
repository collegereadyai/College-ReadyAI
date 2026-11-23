"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { site } from "@/content/site";
import { supabase, configured, callFunction, signInWithGoogle } from "@/lib/supabase";

// Sign-up never calls supabase.auth.signUp() directly. It posts to our own
// `signup` function, which refuses an under-13 before any account exists, mints
// the guardian's approval link, and undoes the whole thing if that link cannot
// be delivered. See supabase/functions/signup/index.ts.
export function AccountForm({ mode, stage = "" }) {
  const router = useRouter();
  const signup = mode === "signup";

  const [age, setAge] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [waiting, setWaiting] = useState("");

  const under18 = age === "13-17";
  const under13 = age === "under13";

  async function onSubmit(event) {
    event.preventDefault();
    if (busy) return;
    setError("");

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");

    if (!configured) {
      setError("This site is not connected to its backend yet.");
      return;
    }

    setBusy(true);
    try {
      if (!signup) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) { setError(signInError.message); return; }
        router.push("/dashboard");
        return;
      }

      const result = await callFunction("signup", {
        email,
        password,
        fullName: String(form.get("fullName") || "").trim(),
        ageBand: String(form.get("age") || ""),
        stage: String(form.get("stage") || ""),
        guardianEmail: String(form.get("guardianEmail") || "").trim(),
        acceptedTerms: form.get("acceptedTerms") === "on",
        acceptedPrivacy: form.get("acceptedTerms") === "on",
        marketingOptIn: form.get("marketingOptIn") === "on",
      });

      if (!result.ok) { setError(result.error); return; }

      // A 13-17 account exists but is locked until a guardian answers, so there
      // is nothing useful to sign in to yet.
      if (result.needsGuardian) { setWaiting(result.message); return; }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setWaiting("Your account is ready. Please log in.");
        return;
      }
      router.push("/dashboard");
    } finally {
      setBusy(false);
    }
  }

  if (waiting) {
    return <div className="simple-form account-form">
      <h3>Almost there</h3>
      <p role="status">{waiting}</p>
      <p className="form-note">You can close this page. Nothing opens until they answer.</p>
    </div>;
  }

  // Google is offered on both screens, because someone who signed up with it
  // has no password to log in with. It only proves an email address: anyone
  // without a profile is sent to /welcome for the age gate and consent.
  async function onGoogle() {
    if (busy) return;
    setError("");
    setBusy(true);
    const { error: oauthError } = await signInWithGoogle();
    if (oauthError) { setError(oauthError.message); setBusy(false); }
    // On success the browser leaves for Google, so there is nothing to reset.
  }

  return <form className="simple-form account-form" onSubmit={onSubmit}>
    <button className="button button-outline" type="button" onClick={onGoogle} disabled={busy}>
      Continue with Google
    </button>
    <p className="form-note">
      {signup
        ? "We will still ask your age group and for the Terms — Google does not tell us those."
        : "Use this if you created your account with Google."}
    </p>
    <p className="form-note" aria-hidden="true">or</p>

    {signup && <label>Where are you now?<select name="stage" defaultValue={stage}>
      <option value="">Choose a stage</option>
      <option value="secondary">Senior secondary</option>
      <option value="applying">About to enter university</option>
      <option value="university">At university</option>
    </select></label>}

    {signup && <label>Your name<input name="fullName" autoComplete="name" required/></label>}

    <label>Email<input name="email" type="email" autoComplete="email" required/></label>
    <label>Password<input name="password" type="password" autoComplete={signup ? "new-password" : "current-password"} required minLength={signup ? 8 : undefined}/></label>
    {signup && <p className="form-note">At least 8 characters.</p>}

    {signup && <>
      <label>Age group<select name="age" value={age} onChange={(event) => setAge(event.target.value)} required>
        <option value="">Choose an age group</option>
        <option value="under13">Under 13</option>
        <option value="13-17">13 to 17</option>
        <option value="18-24">18 to 24</option>
      </select></label>
      <p className="form-note">{under13 ? "Under-13s cannot sign up." : site.copy.ageRule}</p>

      {under18 && <>
        <label>Parent or guardian&rsquo;s email
          <input name="guardianEmail" type="email" autoComplete="off" required/>
        </label>
        <p className="form-note">We write to them to ask for approval. Your account stays locked until they answer.</p>
      </>}

      {!under13 && <>
        {/* The text goes in a span of its own. `.checkline` is a flex row with a
            gap, so without it the two links become flex items in their own right
            and the gap opens a hole either side of them, mid-sentence. */}
        <label className="checkline">
          <input type="checkbox" name="acceptedTerms" required/>
          <span>I agree to the <Link href="/legal/terms">Terms</Link> and acknowledge the <Link href="/legal/privacy">Privacy Policy</Link>.</span>
        </label>
        <label className={`checkline ${under18 ? "disabled-choice" : ""}`}>
          <input type="checkbox" name="marketingOptIn" disabled={under18}/>
          <span>I agree to receive optional product updates by email. (Optional)</span>
        </label>
        <p className="form-note">{site.copy.signupNote}</p>
      </>}
    </>}

    {error && <p className="form-note" role="alert" style={{ color: "#b3261e", fontWeight: 600 }}>{error}</p>}

    {!under13 && <button className="button" type="submit" disabled={busy}>
      {busy ? (signup ? "Creating your account…" : "Logging in…") : (signup ? "Create account" : "Log in")}
    </button>}

    {signup
      ? <p className="form-note">Already have an account? <Link href="/login">Log in</Link>.</p>
      : <p className="form-note">New here? <Link href="/signup">Start with five questions</Link>.</p>}
  </form>;
}
