"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, configured } from "@/lib/supabase";

// The interactive half of /dashboard, kept out of the page for the same reason
// as GuardianDecision: Site.jsx adds `reveal-once` to `#main section.section`
// after mount, so React must not own that element.
//
// The route guard below is a convenience. Every query is filtered by row-level
// security, so a locked or paused account returns nothing even if it reaches
// this component.

const STAGES = {
  secondary: "Senior secondary",
  applying: "About to enter university",
  university: "At university",
};

export function DashboardView() {
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

      // Only an active account can see its own work, so there is no point asking
      // otherwise: the policies would return nothing.
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

  if (state.loading) return <p>Loading your dashboard…</p>;

  if (state.unconfigured) return <>
    <h2>Not connected yet</h2>
    <p>This site has no Supabase keys set, so there is nothing to sign in to. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY and redeploy.</p>
  </>;

  if (state.error) return <>
    <h2>Something went wrong</h2>
    <p role="alert">{state.error}</p>
    <button className="button" type="button" onClick={signOut}>Log out</button>
  </>;

  const { profile, goal, tasks, limits, used } = state;
  const first = (profile.full_name || "").split(" ")[0];

  if (profile.status === "pending_guardian") return <>
    <h2>Waiting for your guardian</h2>
    <p>Hello {first}. We have asked your parent or guardian to approve your account. Nothing opens until they answer.</p>
    <p className="form-note">If they did not get the message, ask them to check their spam folder, or <Link href="/contact">tell us</Link> and we will send it again.</p>
    <button className="button" type="button" onClick={signOut}>Log out</button>
  </>;

  if (profile.status === "paused" || profile.status === "closed") return <>
    <h2>Your account is paused</h2>
    <p>A parent or guardian has withdrawn their approval, so College ReadyAI is closed for now. Your work is kept and nothing has been deleted.</p>
    <p className="form-note">They can approve again from the link we sent them, or <Link href="/contact">ask us</Link>.</p>
    <button className="button" type="button" onClick={signOut}>Log out</button>
  </>;

  const allowance = limits?.ai_messages_day
    ? `${limits.ai_messages_day} Advisor messages a day`
    : limits?.ai_messages_month ? `${limits.ai_messages_month} Advisor messages a month` : null;

  return <>
    <p className="form-note">Signed in as {state.email}</p>

    <div className="guidance-grid">
      <article className="guidance-card">
        <h3>Your stage</h3>
        <p>{STAGES[profile.stage] || "Not set yet"}</p>
        <p className="form-note">Plan: {profile.plan}{allowance ? ` — ${allowance}` : ""}</p>
      </article>

      <article className="guidance-card">
        <h3>Your goal</h3>
        {goal?.target_course || goal?.target_school
          ? <p>{[goal.target_course, goal.target_school].filter(Boolean).join(", ")}</p>
          : <p>Not set yet. The five questions build this.</p>}
        {goal?.exam_on && <p className="form-note">Next exam: {goal.exam_on}</p>}
      </article>

      <article className="guidance-card">
        <h3>Next steps</h3>
        {tasks.length
          ? <ul className="check-list">{tasks.map((task) => <li key={task.id}>{task.title}{task.minutes ? ` — ${task.minutes} min` : ""}</li>)}</ul>
          : <p>Nothing scheduled yet.</p>}
      </article>

      <article className="guidance-card">
        <h3>Used this period</h3>
        <p>{used?.ai_messages ?? 0} Advisor messages, {used?.study_decks ?? 0} study decks</p>
        <p className="form-note">Counted on our side, not in your browser.</p>
      </article>
    </div>

    <p className="form-note">
      The Advisor, study decks, Exams Hub and the finders are still being built.
      What is above is real data from your account.
    </p>

    <div className="button-row">
      <Link className="button button-outline" href="/">Back to the site</Link>
      <button className="button" type="button" onClick={signOut}>Log out</button>
    </div>
  </>;
}
