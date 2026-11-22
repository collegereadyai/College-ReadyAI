"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useProfile } from "./AppShell";
import { StudyToolsIcon, AdvisorIcon, ExamsHubIcon, ProfileIcon } from "./icons";

// The home screen. Every number on it comes from the student's own rows —
// where there is nothing yet, it says so rather than showing a plausible
// figure. A study app that invents progress is worse than one that admits it
// has none.
//
// No query here filters by student id. It does not need to: row-level
// security answers each of these with only the caller's own rows.

/** Monday 00:00 of the week containing `date`, and the Sunday that ends it. */
function weekBounds(date = new Date()) {
  const start = new Date(date);
  const weekday = (start.getDay() + 6) % 7; // Monday = 0
  start.setDate(start.getDate() - weekday);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return [start, end];
}

const iso = (date) => date.toISOString().slice(0, 10);

function daysUntil(dateString) {
  const then = new Date(dateString + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((then - now) / 86400000);
}

function whenLabel(dateString) {
  const days = daysUntil(dateString);
  if (days < 0) return "Passed";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 7) return `In ${days} days`;
  if (days < 14) return "Next week";
  return `In ${Math.round(days / 7)} weeks`;
}

export function HomeView() {
  const { profile } = useProfile();
  const [data, setData] = useState({ loading: true });

  useEffect(() => {
    let live = true;
    (async () => {
      const [monday, sunday] = weekBounds();

      const [goal, tasks, advice, exams] = await Promise.all([
        supabase.from("goals").select("hours_per_day, target_course, target_school, exam_on").maybeSingle(),
        supabase.from("tasks").select("id, title, minutes, status, due_on")
          .gte("due_on", iso(monday)).lte("due_on", iso(sunday)),
        supabase.from("chats").select("question, answer, created_at")
          .not("answer", "is", null).order("created_at", { ascending: false }).limit(1),
        supabase.from("exam_dates").select("board, name, exam_on, source_url")
          .not("exam_on", "is", null).gte("exam_on", iso(new Date()))
          .order("exam_on").limit(3),
      ]);

      if (!live) return;
      setData({
        loading: false,
        goal: goal.data,
        weekTasks: tasks.data || [],
        advice: (advice.data || [])[0] || null,
        exams: exams.data || [],
      });
    })();
    return () => { live = false; };
  }, []);

  if (data.loading) return <p>Loading your week…</p>;

  const first = (profile?.full_name || "").trim().split(/\s+/)[0] || "there";
  const { goal, weekTasks, advice, exams } = data;

  // Planned and finished minutes for the week. The target is whatever the
  // student said they would do per day; failing that, what they have actually
  // scheduled. If neither exists there is no goal to report, and the card
  // says so instead of showing 0%.
  const plannedMinutes = weekTasks.reduce((sum, task) => sum + (task.minutes || 0), 0);
  const doneMinutes = weekTasks
    .filter((task) => task.status === "done")
    .reduce((sum, task) => sum + (task.minutes || 0), 0);

  const targetMinutes = goal?.hours_per_day ? Math.round(goal.hours_per_day * 7 * 60) : plannedMinutes;
  const hasTarget = targetMinutes > 0;
  const percent = hasTarget ? Math.min(100, Math.round((doneMinutes / targetMinutes) * 100)) : 0;
  const hrs = (mins) => (mins / 60).toFixed(1).replace(/\.0$/, "");

  const openTasks = weekTasks.filter((task) => task.status !== "done").slice(0, 3);

  return <>
    <div className="topbar">
      <div className="greeting">
        <h1>Hello, {first}! 👋</h1>
        <p>
          {goal?.target_course || goal?.target_school
            ? `Working towards ${[goal.target_course, goal.target_school].filter(Boolean).join(" at ")}.`
            : "Set your goal and we can build a path towards it."}
        </p>
      </div>
    </div>

    <div className="row row-goals">
      <div className="card goals-card">
        <div className="goals-top">
          <div>
            <p className="eyebrow">This week</p>
            <h2>{hasTarget ? `Study ${hrs(targetMinutes)} hours` : "No goal set yet"}</h2>
          </div>
          {hasTarget && <div className="goals-badge">{percent}% complete</div>}
        </div>

        {hasTarget ? <>
          <div className="goals-track"><div className="goals-fill" style={{ width: `${percent}%` }}/></div>
          <div className="goals-meta">
            <span>{hrs(doneMinutes)} / {hrs(targetMinutes)} hrs</span>
            <span>{doneMinutes >= targetMinutes
              ? "Done for the week"
              : `${hrs(targetMinutes - doneMinutes)} hrs to go`}</span>
          </div>
        </> : (
          <p>Tell us how long you can study each day and we will track the week against it.</p>
        )}
      </div>

      <div className="card advice-card">
        <div>
          <div className="advice-top"><span>AI Advice</span></div>
          {advice
            ? <>
                <p>{advice.answer}</p>
                <p className="ai-note">
                  <span className="m-full">AI-generated. Check it before you rely on it.</span>
                  <span className="m-short">AI-generated. Please check it.</span>
                </p>
              </>
            : <p>Nothing yet. Ask the Advisor a question and your most recent answer will show here.</p>}
        </div>
        <Link className="advice-link" href="/advisor">
          {advice ? "Back to the Advisor" : "Ask the Advisor"}
        </Link>
      </div>
    </div>

    <div className="row row-mid">
      <div className="card">
        <div className="exam-head"><h3>Quick actions</h3></div>
        <div className="quick-grid">
          <Link className="quick-tile" href="/study">
            <div className="icon-chip tint-blue"><StudyToolsIcon/></div><span>Start studying</span>
          </Link>
          <Link className="quick-tile" href="/advisor">
            <div className="icon-chip tint-purple"><AdvisorIcon/></div><span>Ask AI Advisor</span>
          </Link>
          <Link className="quick-tile" href="/exams">
            <div className="icon-chip tint-green"><ExamsHubIcon/></div><span>Take a mock test</span>
          </Link>
          <Link className="quick-tile" href="/profile">
            <div className="icon-chip tint-grey"><ProfileIcon/></div><span>Your profile</span>
          </Link>
        </div>
      </div>

      <div className="card">
        <div className="exam-head"><h3>This week</h3></div>
        {openTasks.length
          ? <ul className="check-list">
              {openTasks.map((task) => <li key={task.id}>
                {task.title}{task.minutes ? ` — ${task.minutes} min` : ""}
              </li>)}
            </ul>
          : <p>{weekTasks.length
              ? "Everything scheduled for this week is done."
              : "Nothing scheduled for this week yet."}</p>}
      </div>
    </div>

    <div className="row row-mid">
      <div className="card">
        <div className="exam-head"><h3>Exam reminders</h3></div>
        {exams.length
          ? <>
              <ul className="check-list">
                {exams.map((exam) => <li key={`${exam.board}-${exam.name}-${exam.exam_on}`}>
                  <strong>{exam.board}</strong> {exam.name} — {exam.exam_on} ({whenLabel(exam.exam_on)})
                  {" "}<a href={exam.source_url} target="_blank" rel="noopener noreferrer">source</a>
                </li>)}
              </ul>
              <p className="ai-note">
                <span className="m-full">Always confirm official dates with JAMB, WAEC or your school.</span>
                <span className="m-short">Confirm with your exam board.</span>
              </p>
            </>
          : <p>No exam dates loaded yet. When they are, each one will carry a link to where it came from.</p>}
      </div>
    </div>
  </>;
}
