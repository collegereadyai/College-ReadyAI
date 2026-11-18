"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { callFunction } from "@/lib/supabase";

// The interactive half of /guardian. It lives in its own client component so
// the page itself stays a server component: Site.jsx adds `reveal-once` to
// every `#main section.section` after mount, and if React owned that element
// it would strip the class on the next render and warn about the mismatch.
//
// Opening the link decides nothing — only a button here does. Mail scanners and
// link prefetchers open links in messages, so a page that approved on load
// would approve on the guardian's behalf.

function Decision() {
  const token = useSearchParams().get("t") || "";
  const [busy, setBusy] = useState("");
  const [done, setDone] = useState(null);
  const [error, setError] = useState("");

  async function decide(ask) {
    if (busy) return;
    setBusy(ask);
    setError("");
    const result = await callFunction("guardian", { token, ask });
    setBusy("");
    if (!result.ok) { setError(result.error); return; }
    setDone({ title: result.title, body: result.body });
  }

  if (!token) {
    return <>
      <h2>This link is incomplete</h2>
      <p>Open the link from the message we sent you, exactly as it appears. If it keeps failing, ask the student to sign up again.</p>
      <p><Link className="button" href="/">Back to College ReadyAI</Link></p>
    </>;
  }

  if (done) {
    return <>
      <h2>{done.title}</h2>
      <p>{done.body}</p>
      <p className="form-note">You can close this page.</p>
      <p><Link className="text-button" href="/parents">What we collect, and the controls you keep</Link></p>
    </>;
  }

  return <>
    <h2>What you are approving</h2>
    <ul className="check-list">
      <li>Study plans, practice tests, and AI answers that are always labelled as AI.</li>
      <li>No ads, and we do not sell data.</li>
      <li>Marketing and AI training stay switched off for anyone under 18.</li>
      <li>You can withdraw approval later from this same link, and the account is paused.</li>
    </ul>

    {error && <p className="form-note" role="alert" style={{ color: "#b3261e", fontWeight: 600 }}>{error}</p>}

    <div className="button-row">
      <button className="button" type="button" onClick={() => decide("approve")} disabled={Boolean(busy)}>
        {busy === "approve" ? "Approving…" : "Approve"}
      </button>
      <button className="button button-outline" type="button" onClick={() => decide("decline")} disabled={Boolean(busy)}>
        {busy === "decline" ? "Saying no…" : "Say no"}
      </button>
    </div>

    <p className="form-note">
      Already approved and changed your mind?{" "}
      <button className="text-button" type="button" onClick={() => decide("withdraw")} disabled={Boolean(busy)}>
        Withdraw approval
      </button>
      , and the account is paused.
    </p>

    <p className="form-note">
      If you were not expecting this, ignore it and nothing will open. Read the{" "}
      <Link href="/legal/privacy">Privacy draft</Link> or the{" "}
      <Link href="/parents">parents page</Link> first if you would rather.
    </p>
  </>;
}

export function GuardianDecision() {
  return <Suspense fallback={<p>Loading…</p>}><Decision/></Suspense>;
}
