"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// Profile: who you are, what you are working towards, and the two rights that
// are not features — taking your data out, and closing the account.
//
// Plan and status are shown but not editable, because the database refuses to
// let an account change them: cr_protect_profile raises on status, approved,
// plan and org_id. Rendering them as inputs would offer something that cannot
// work, so they are stated with the reason instead.
//
// Marketing and AI-training stay off for anyone under 18 and cannot be turned
// on — enforced in cr_protect_private, not here. The switches are disabled and
// say why, so a minor is not left wondering whether they missed a step.

const STAGES = [
  ["", "Choose a stage"],
  ["secondary", "Senior secondary"],
  ["applying", "About to enter university"],
  ["university", "At university"],
];

const PLAN_LABEL = { free: "Free", plus: "Plus", pro: "Pro", institution: "Institution" };
const STATUS_TEXT = {
  active: "Active.",
  pending_guardian: "Waiting for a parent or guardian to approve.",
  paused: "Paused — a guardian withdrew approval.",
  closed: "Closed.",
};

export function ProfileView() {
  const router = useRouter();
  const [state, setState] = useState({ loading: true });
  const [form, setForm] = useState({});
  const [goal, setGoal] = useState({});
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const [profile, priv, goalRow] = await Promise.all([
        supabase.from("profiles").select("full_name, stage, class_level, state, status, plan").maybeSingle(),
        supabase.from("profile_private")
          .select("age_band, is_minor, guardian_email, ai_training_opt_in, marketing_opt_in").maybeSingle(),
        supabase.from("goals")
          .select("target_course, target_school, exam_on, hours_per_day, study_style, hardest_subjects").maybeSingle(),
      ]);
      if (!live) return;
      setState({ loading: false, userId: session?.user?.id, email: session?.user?.email, profile: profile.data, priv: priv.data });
      setForm({
        full_name: profile.data?.full_name || "",
        stage: profile.data?.stage || "",
        class_level: profile.data?.class_level || "",
        state: profile.data?.state || "",
        marketing_opt_in: !!priv.data?.marketing_opt_in,
        ai_training_opt_in: !!priv.data?.ai_training_opt_in,
      });
      setGoal({
        target_course: goalRow.data?.target_course || "",
        target_school: goalRow.data?.target_school || "",
        exam_on: goalRow.data?.exam_on || "",
        hours_per_day: goalRow.data?.hours_per_day ?? "",
        study_style: goalRow.data?.study_style || "",
        hardest_subjects: (goalRow.data?.hardest_subjects || []).join(", "),
      });
    })();
    return () => { live = false; };
  }, []);

  async function saveDetails(event) {
    event.preventDefault();
    setBusy(true); setError(""); setSaved("");

    const { error: profileError } = await supabase.from("profiles").update({
      full_name: form.full_name.trim(),
      stage: form.stage || null,
      class_level: form.class_level.trim() || null,
      state: form.state.trim() || null,
    }).eq("id", state.userId);

    const { error: privError } = await supabase.from("profile_private").update({
      marketing_opt_in: form.marketing_opt_in,
      ai_training_opt_in: form.ai_training_opt_in,
    }).eq("id", state.userId);

    if (profileError || privError) setError((profileError || privError).message);
    else setSaved("Saved.");
    setBusy(false);
  }

  async function saveGoal(event) {
    event.preventDefault();
    setBusy(true); setError(""); setSaved("");

    const subjects = goal.hardest_subjects.split(",").map((s) => s.trim()).filter(Boolean);

    const { error: goalError } = await supabase.from("goals").upsert({
      student_id: state.userId,
      target_course: goal.target_course.trim() || null,
      target_school: goal.target_school.trim() || null,
      exam_on: goal.exam_on || null,
      hours_per_day: goal.hours_per_day === "" ? null : Number(goal.hours_per_day),
      study_style: goal.study_style.trim() || null,
      hardest_subjects: subjects,
      updated_at: new Date().toISOString(),
    });

    if (goalError) setError(goalError.message);
    else setSaved("Goal saved. Your week on the home screen follows it.");
    setBusy(false);
  }

  // Everything the account holds, as a file they keep. Built by the database,
  // not assembled here, so it cannot quietly miss a table the app forgot.
  async function exportData() {
    setBusy(true); setError("");
    const { data, error: exportError } = await supabase.rpc("cr_export_my_data");
    setBusy(false);
    if (exportError) { setError(exportError.message); return; }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `college-readyai-data-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setSaved("Downloaded.");
  }

  async function closeAccount() {
    if (confirmText !== "DELETE") return;
    setClosing(true); setError("");
    const { error: deleteError } = await supabase.rpc("cr_delete_my_account");
    if (deleteError) { setError(deleteError.message); setClosing(false); return; }
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (state.loading) return <p>Loading your profile…</p>;

  const minor = state.priv?.is_minor;

  return <>
    <div className="topbar"><div className="greeting">
      <h1>Your profile</h1>
      <p>Signed in as {state.email}</p>
    </div></div>

    {error && <div className="card"><p role="alert">{error}</p></div>}
    {saved && <div className="card"><p role="status">{saved}</p></div>}

    <div className="card">
      <h3>Your details</h3>
      <form className="simple-form" onSubmit={saveDetails}>
        <label>Name
          <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required maxLength={120}/>
        </label>
        <label>Where you are
          <select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
            {STAGES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>Class or level
          <input value={form.class_level} onChange={(e) => setForm({ ...form, class_level: e.target.value })} maxLength={40} placeholder="SS2, 200 level…"/>
        </label>
        <label>State
          <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} maxLength={60}/>
        </label>

        <label className={`checkline${minor ? " disabled-choice" : ""}`}>
          <input type="checkbox" checked={form.marketing_opt_in} disabled={minor}
            onChange={(e) => setForm({ ...form, marketing_opt_in: e.target.checked })}/>
          <span>Email me occasional product updates.</span>
        </label>
        <label className={`checkline${minor ? " disabled-choice" : ""}`}>
          <input type="checkbox" checked={form.ai_training_opt_in} disabled={minor}
            onChange={(e) => setForm({ ...form, ai_training_opt_in: e.target.checked })}/>
          <span>Allow my work to help improve the AI.</span>
        </label>
        {minor && <p className="form-note">
          Both stay off for anyone under 18, and cannot be switched on. That is enforced in the
          database, not just on this page.
        </p>}

        <button className="btn-primary" type="submit" disabled={busy}>Save details</button>
      </form>
    </div>

    <div className="card">
      <h3>Your goal</h3>
      <form className="simple-form" onSubmit={saveGoal}>
        <label>Course you are aiming for
          <input value={goal.target_course} onChange={(e) => setGoal({ ...goal, target_course: e.target.value })}/>
        </label>
        <label>School you are aiming for
          <input value={goal.target_school} onChange={(e) => setGoal({ ...goal, target_school: e.target.value })}/>
        </label>
        <label>Next exam date
          <input type="date" value={goal.exam_on} onChange={(e) => setGoal({ ...goal, exam_on: e.target.value })}/>
        </label>
        <label>Hours you can study each day
          <input type="number" step="0.5" min="0" max="24" value={goal.hours_per_day}
            onChange={(e) => setGoal({ ...goal, hours_per_day: e.target.value })}/>
        </label>
        <label>Subjects you find hardest
          <input value={goal.hardest_subjects} onChange={(e) => setGoal({ ...goal, hardest_subjects: e.target.value })}
            placeholder="Physics, Further Maths"/>
        </label>
        <p className="form-note">Separate subjects with commas.</p>
        <button className="btn-primary" type="submit" disabled={busy}>Save goal</button>
      </form>
    </div>

    <div className="card">
      <h3>Plan and status</h3>
      <p>Plan: <b>{PLAN_LABEL[state.profile?.plan] || state.profile?.plan}</b></p>
      <p>{STATUS_TEXT[state.profile?.status] || state.profile?.status}</p>
      <p className="form-note">
        These are set by College ReadyAI rather than from this page — the database refuses a
        change to either from an account, which is what stops anyone granting themselves a plan.
      </p>
    </div>

    <div className="card">
      <h3>Your data</h3>
      <p>Take a copy of everything this account holds, as a file.</p>
      <button className="btn-outline" type="button" onClick={exportData} disabled={busy}>
        Download my data
      </button>

      <h3 style={{ marginTop: "24px" }}>Close this account</h3>
      <p>
        This deletes your profile, your goal, your decks, your cards, your chats and your test
        history. It cannot be undone, and we cannot bring it back for you afterwards.
      </p>
      <form className="simple-form" onSubmit={(e) => { e.preventDefault(); closeAccount(); }}>
        <label>Type DELETE to confirm
          <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off"/>
        </label>
        <button className="btn-primary" type="submit" style={{ background: "var(--red)" }}
          disabled={closing || confirmText !== "DELETE"}>
          {closing ? "Closing…" : "Delete my account"}
        </button>
      </form>
    </div>
  </>;
}
