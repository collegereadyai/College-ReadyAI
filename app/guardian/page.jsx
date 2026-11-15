"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { callFunction } from "@/lib/supabase";

// Where a guardian's emailed link lands.
//
// Opening this page decides nothing — it only shows what is being asked. The
// account moves when a button here is pressed, which posts to the `guardian`
// function. That split matters: mail scanners and link prefetchers open links
// in messages, so a page that approved on load would approve on their behalf.

function Guardian() {
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
    return <section className="section">
      <h1>This link is incomplete</h1>
      <p>Open the link from the message we sent you, exactly as it appears. If it keeps failing, ask the student to sign up again.</p>
      <p><Link href="/">Back to College ReadyAI</Link></p>
    </section>;
  }

  if (done) {
    return <section className="section">
      <h1>{done.title}</h1>
      <p>{done.body}</p>
      <p className="form-note">You can close this page.</p>
      <p><Link href="/parents">What we collect, and the controls you keep</Link></p>
    </section>;
  }

  return <section className="section">
    <h1>A student has asked for your approval</h1>
    <p>
      They gave your address as their parent or guardian. Their account is locked
      and nothing opens until you answer.
    </p>

    <ul>
      <li>Study plans, practice tests, and AI answers that are always labelled as AI.</li>
      <li>No ads, and we do not sell data.</li>
      <li>Marketing and AI training stay switched off for anyone under 18.</li>
      <li>You can withdraw approval later from this same link, and the account is paused.</li>
    </ul>

    {error && <p role="alert" style={{ color: "#b3261e", fontWeight: 600 }}>{error}</p>}

    <div className="button-row">
      <button className="button" type="button" onClick={() => decide("approve")} disabled={Boolean(busy)}>
        {busy === "approve" ? "Approving…" : "Approve"}
      </button>
      <button className="button secondary" type="button" onClick={() => decide("decline")} disabled={Boolean(busy)}>
        {busy === "decline" ? "Saying no…" : "Say no"}
      </button>
    </div>

    <p className="form-note">
      Already approved and changed your mind?{" "}
      <button className="linklike" type="button" onClick={() => decide("withdraw")} disabled={Boolean(busy)}>
        Withdraw approval
      </button>
      , and the account is paused.
    </p>

    <p className="form-note">
      If you were not expecting this, ignore it and nothing will open. Read the{" "}
      <Link href="/legal/privacy">Privacy draft</Link> or the{" "}
      <Link href="/parents">parents page</Link> first if you would rather.
    </p>
  </section>;
}

export default function GuardianPage() {
  return <Suspense fallback={<section className="section"><p>Loading…</p></section>}>
    <Guardian/>
  </Suspense>;
}
