"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, configured } from "@/lib/supabase";

// The first screen behind sign-in.
//
// Deliberately small: it shows the state of the account and the plan, and
// nothing that does not exist yet. The route guard here is a convenience —
// every query below is filtered by row-level security in the database, so a
// paused or unapproved account returns nothing even if it reaches this page.

const STAGES = {
  secondary: "Senior secondary",
  applying: "About to enter university",
  university: "At university",
};

export default function Dashboard() {
  const router = useRouter();
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    let live = true;

    (async () => {
      if (!configured) {
        if (live) setState({ loading: false, unconfigured: true });
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("full_name, stage, status, plan")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!live) return;
      if (error) { setState({ loading: false, error: error.message }); return; }
      if (!profile) { setState({ loading: false, error: "We could not find your account." }); return; }

      // Only an active account can see its own work; the policies return
      // nothing otherwise, so there is no point asking.
      let goal = null, tasks = [], limits = null, used = null;
      if (profile.status === "active") {
        const [g, t, l, u] = await Promise.all([
          supabase.from("goals").select("target_course, target_school, exam_on").maybeSingle(),
          supabase.from("tasks").select("id, title, minutes, status").neq("status", "done").order("created_at").limit(3),
          supabase.from("plan_limits").select("*").eq("plan", profile.plan).maybeSingle(),
          supabase.from("usage_counters").select("ai_messages, study_decks").order("period_start", { ascending: false }).limit(1),
        ]);
        goal = g.data; tasks = t.data || []; limits = l.data; used = (u.data || [])[0] || null;
      }

      if (live) setState({ loading: false, email: session.user.email, profile, goal, tasks, limits, used });
    })();

    return () => { live = false; };
  }, [router]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (state.loading) return <section className="section"><p>Loading your dashboard…</p></section>;

  if (state.unconfigured) {
    return <section className="section">
      <h1>Not connected yet</h1>
      <p>This site has no Supabase keys set, so there is nothing to sign in to. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY and redeploy.</p>
    </section>;
  }

  if (state.error) {
    return <section className="section">
      <h1>Something went wrong</h1>
      <p role="alert">{state.error}</p>
      <button className="button" type="button" onClick={signOut}>Log out</button>
    </section>;
  }

  const { profile, goal, tasks, limits, used } = state;
  const first = (profile.full_name || "").split(" ")[0];

  // The two locked states. Both are honest about what is happening and what
  // the student can still do.
  if (profile.status === "pending_guardian") {
    return <section className="section">
      <h1>Waiting for your guardian</h1>
      <p>
        Hello {first}. We have asked your parent or guardian to approve your
        account. Nothing opens until they answer, and we will not ask you again.
      </p>
      <p className="form-note">If they did not get the message, ask them to check their spam folder, or <Link href="/contact">tell us</Link> and we will resend it.</p>
      <button className="button" type="button" onClick={signOut}>Log out</button>
    </section>;
  }

  if (profile.status === "paused" || profile.status === "closed") {
    return <section className="section">
      <h1>Your account is paused</h1>
      <p>
        A parent or guardian has withdrawn their approval, so College ReadyAI is
        closed for now. Your work is kept and nothing has been deleted.
      </p>
      <p className="form-note">They can approve again from the link we sent them, or <Link href="/contact">ask us</Link>.</p>
      <button className="button" type="button" onClick={signOut}>Log out</button>
    </section>;
  }

  const dayLimit = limits?.ai_messages_day;
  const monthLimit = limits?.ai_messages_month;
  const allowance = dayLimit ? `${dayLimit} Advisor messages a day` : monthLimit ? `${monthLimit} Advisor messages a month` : null;

  return <section className="section">
    <h1>Hello {first}</h1>
    <p className="form-note">{state.email}</p>

    <div className="card-grid">
      <article className="card">
        <h2>Your stage</h2>
        <p>{STAGES[profile.stage] || "Not set yet"}</p>
        <p className="form-note">Plan: {profile.plan}{allowance ? ` — ${allowance}` : ""}</p>
      </article>

      <article className="card">
        <h2>Your goal</h2>
        {goal?.target_course || goal?.target_school
          ? <p>{[goal.target_course, goal.target_school].filter(Boolean).join(", ")}</p>
          : <p>Not set yet. The five questions build this.</p>}
        {goal?.exam_on && <p className="form-note">Next exam: {goal.exam_on}</p>}
      </article>

      <article className="card">
        <h2>Next steps</h2>
        {tasks.length
          ? <ul>{tasks.map((task) => <li key={task.id}>{task.title}{task.minutes ? ` — ${task.minutes} min` : ""}</li>)}</ul>
          : <p>Nothing scheduled yet.</p>}
      </article>

      <article className="card">
        <h2>Used this period</h2>
        <p>{used?.ai_messages ?? 0} Advisor messages, {used?.study_decks ?? 0} study decks</p>
        <p className="form-note">Counted on our side, not in your browser.</p>
      </article>
    </div>

    <p className="form-note">
      The Advisor, study decks, Exams Hub and the finders are still being built.
      What is above is real data from your account.
    </p>

    <div className="button-row">
      <Link className="button secondary" href="/">Back to the site</Link>
      <button className="button" type="button" onClick={signOut}>Log out</button>
    </div>
  </section>;
}
