"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// The Exams Hub: pick a subject, answer the questions, keep the result.
//
// Two honesty points, both of which the screen states rather than hides.
//
// These are practice questions written for the app. They are not past papers
// and we have not licensed any. `origin` carries that per row and it is shown
// before a student starts, because someone revising for JAMB has a right to
// know whether they are drilling the real thing.
//
// Marking happens in the browser, so a determined student can read the answers
// out of the network traffic. For self-study that is a fair trade — the point
// is practice, not invigilation — but it does mean a score here is not
// evidence of anything to anyone else. Server-side marking would need the
// answers kept out of the client entirely, which is a different build.

function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const LETTER = ["A", "B", "C", "D", "E", "F"];

function Results({ questions, chosen, score, onRestart }) {
  return <>
    <div className="card">
      <h2>You scored {score} out of {questions.length}</h2>
      <p>
        {score === questions.length
          ? "Every one right."
          : `Review the ${questions.length - score} you missed below — the right answer is marked.`}
      </p>
      <button className="btn-primary" type="button" onClick={onRestart}>Back to the hub</button>
    </div>

    {questions.map((question, index) => {
      const picked = chosen[question.id];
      const right = picked === question.answer_index;
      return <div className="card" key={question.id}>
        <p><b>{index + 1}.</b> {question.prompt}</p>
        <ul className="check-list">
          {question.options.map((option, i) => {
            const isAnswer = i === question.answer_index;
            const isPicked = i === picked;
            return <li key={i} style={{ fontWeight: isAnswer ? 700 : 400 }}>
              {LETTER[i]}. {option}
              {isAnswer && " ← correct"}
              {isPicked && !isAnswer && " ← you picked this"}
            </li>;
          })}
        </ul>
        {picked === undefined && <p className="form-note">You left this one blank.</p>}
        {!right && question.explanation && <p className="sch-note">{question.explanation}</p>}
      </div>;
    })}
  </>;
}

export function ExamsView() {
  const [state, setState] = useState({ loading: true });
  const [test, setTest] = useState(null);      // questions being answered
  const [chosen, setChosen] = useState({});
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    (async () => {
      const [questions, past] = await Promise.all([
        supabase.from("practice_questions").select("*"),
        supabase.from("mock_tests").select("id, board, subject, question_count, score, submitted_at")
          .not("submitted_at", "is", null).order("submitted_at", { ascending: false }).limit(5),
      ]);
      if (!live) return;
      setState({
        loading: false,
        questions: questions.data || [],
        past: past.data || [],
        error: questions.error?.message,
      });
    })();
    return () => { live = false; };
  }, []);

  function start(subject, board) {
    const pool = state.questions.filter((q) => q.subject === subject && q.board === board);
    setTest({ subject, board, questions: shuffle(pool), startedAt: new Date().toISOString() });
    setChosen({});
    setResult(null);
    setError("");
  }

  async function submit() {
    if (saving) return;
    setSaving(true);
    setError("");

    const questions = test.questions;
    const score = questions.reduce((n, q) => n + (chosen[q.id] === q.answer_index ? 1 : 0), 0);

    const { data: { session } } = await supabase.auth.getSession();
    const studentId = session?.user?.id;

    // The test is saved before the result is shown. If saving fails the
    // student still sees their marks — losing the record is bad, but throwing
    // away the work they just did is worse.
    const { data: saved, error: testError } = await supabase.from("mock_tests").insert({
      student_id: studentId,
      board: test.board,
      subject: test.subject,
      question_count: questions.length,
      started_at: test.startedAt,
      submitted_at: new Date().toISOString(),
      score,
    }).select("id").maybeSingle();

    if (testError) {
      setError("Your answers are marked below, but we could not save this attempt: " + testError.message);
    } else if (saved) {
      const { error: attemptsError } = await supabase.from("attempts").insert(
        questions.map((q) => ({
          student_id: studentId,
          mock_test_id: saved.id,
          subject: q.subject,
          question_ref: q.ref,
          chosen: chosen[q.id] === undefined ? null : String(chosen[q.id]),
          correct: chosen[q.id] === q.answer_index,
        })),
      );
      if (attemptsError) setError("Saved the score, but not the per-question answers: " + attemptsError.message);
    }

    setResult({ score, questions });
    setSaving(false);
  }

  if (state.loading) return <p>Loading the Exams Hub…</p>;
  if (state.error) return <><h1>Exams Hub</h1><p role="alert">{state.error}</p></>;

  if (result) {
    return <>
      {error && <p className="sch-note" role="alert">{error}</p>}
      <Results
        questions={result.questions}
        chosen={chosen}
        score={result.score}
        onRestart={() => { setTest(null); setResult(null); }}
      />
    </>;
  }

  if (test) {
    const answered = Object.keys(chosen).length;
    return <>
      <div className="topbar"><div className="greeting">
        <h1>{test.subject} practice</h1>
        <p>{answered} of {test.questions.length} answered. Nothing is timed.</p>
      </div></div>

      {test.questions.map((question, index) => (
        <div className="card" key={question.id}>
          <p><b>{index + 1}.</b> {question.prompt}</p>
          {question.options.map((option, i) => (
            <label className="checkline" key={i}>
              <input
                type="radio"
                name={question.id}
                checked={chosen[question.id] === i}
                onChange={() => setChosen((prev) => ({ ...prev, [question.id]: i }))}
              />
              <span>{LETTER[i]}. {option}</span>
            </label>
          ))}
        </div>
      ))}

      <div className="card">
        <div className="button-row">
          <button className="btn-primary" type="button" onClick={submit} disabled={saving}>
            {saving ? "Marking…" : "Submit answers"}
          </button>
          <button className="btn-outline" type="button" onClick={() => setTest(null)} disabled={saving}>
            Leave without submitting
          </button>
        </div>
        {answered < test.questions.length && <p className="form-note">
          You can submit with questions left blank; they will be marked wrong.
        </p>}
      </div>
    </>;
  }

  // The hub itself.
  const sets = [...new Map(
    state.questions.map((q) => [`${q.board}|${q.subject}`, { board: q.board, subject: q.subject }]),
  ).values()];
  const origins = [...new Set(state.questions.map((q) => q.origin))];

  return <>
    <div className="topbar"><div className="greeting">
      <h1>Exams Hub</h1>
      <p>Practice questions with instant marking. Your score is kept so you can see it move.</p>
    </div></div>

    {sets.length === 0
      ? <div className="card"><p>No practice questions loaded yet.</p></div>
      : sets.map(({ board, subject }) => {
        const count = state.questions.filter((q) => q.board === board && q.subject === subject).length;
        return <div className="card" key={`${board}-${subject}`}>
          <h3>{board} — {subject}</h3>
          <p>{count} question{count === 1 ? "" : "s"}, in a random order each time.</p>
          <button className="btn-primary" type="button" onClick={() => start(subject, board)}>
            Start practice
          </button>
        </div>;
      })}

    {origins.length > 0 && <div className="card">
      <h3>Where these questions come from</h3>
      {origins.map((origin) => <p key={origin} className="ai-note">{origin}</p>)}
      <p className="ai-note">
        Use them to practise the shape of the exam, not to predict it. Past papers from your
        exam board are the real thing.
      </p>
    </div>}

    {state.past.length > 0 && <div className="card">
      <h3>Your recent attempts</h3>
      <ul className="check-list">
        {state.past.map((row) => <li key={row.id}>
          {row.subject} — {row.score}/{row.question_count} on {row.submitted_at.slice(0, 10)}
        </li>)}
      </ul>
    </div>}
  </>;
}
