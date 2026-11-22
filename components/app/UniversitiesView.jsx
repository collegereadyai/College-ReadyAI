"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

// Universities, read from the table with their courses.
//
// The disclaimer under every card is not decoration. Acceptance rates and fees
// are ranges that change every year, and a student who picks where to apply on
// the strength of a stale fee estimate has been actively misled. The line says
// the figures are rough, says to confirm with the university, and says we are
// not affiliated with it — all three matter, and none should be dropped to
// tidy the layout.

function Field({ label, value, note }) {
  if (!value) return null;
  return <div className="uni-stat">
    <dt>{label}</dt>
    <dd>{value}{note ? <small> — {note}</small> : null}</dd>
  </div>;
}

function Card({ row, courses }) {
  const [open, setOpen] = useState(false);
  const mine = courses.filter((course) => course.institution_id === row.id);

  return <div className="card uni-card">
    <div className="uni-head">
      <h3>{row.name}</h3>
      {row.ai_suggested && <span className="pill">Suggested by the Advisor</span>}
    </div>

    <p className="sch-meta">
      {[row.state, row.classification, row.established ? `Founded ${row.established}` : null]
        .filter(Boolean).join(" · ")}
    </p>

    {row.about && <p>{row.about}</p>}

    <dl className="uni-stats">
      <Field label="Entry" value={row.entry_exam}/>
      <Field label="Acceptance rate" value={row.acceptance_rate} note={row.acceptance_note}/>
      <Field label="Fees" value={row.fees} note={row.fees_note}/>
    </dl>

    {mine.length > 0 && <>
      <button className="btn-outline" type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {open ? "Hide courses" : `Available courses (${mine.length})`}
      </button>
      {open && <ul className="check-list">
        {mine.map((course) => <li key={course.id}>{course.name}</li>)}
      </ul>}
    </>}

    <div className="uni-actions">
      <a className="btn-primary" href={row.source_url} target="_blank" rel="noopener noreferrer">
        Official website
      </a>
    </div>

    <p className="uni-disclaimer">
      Figures are rough estimates for guidance only and change every year. Confirm admission
      requirements, courses and fees on the university&apos;s official website. We are not
      affiliated with this university.
    </p>
  </div>;
}

export function UniversitiesView() {
  const [state, setState] = useState({ loading: true });
  const [place, setPlace] = useState("All");

  useEffect(() => {
    let live = true;
    (async () => {
      const [institutions, courses] = await Promise.all([
        supabase.from("institutions").select("*").order("name"),
        supabase.from("courses").select("id, institution_id, name").order("name"),
      ]);
      if (!live) return;
      setState({
        loading: false,
        rows: institutions.data || [],
        courses: courses.data || [],
        error: institutions.error?.message || courses.error?.message,
      });
    })();
    return () => { live = false; };
  }, []);

  const rows = state.rows || [];
  const places = useMemo(
    () => ["All", ...[...new Set(rows.map((r) => r.state).filter(Boolean))].sort()],
    [rows],
  );
  const shown = place === "All" ? rows : rows.filter((row) => row.state === place);

  if (state.loading) return <p>Loading universities…</p>;
  if (state.error) return <><h1>Universities</h1><p role="alert">{state.error}</p></>;

  return <>
    <div className="topbar">
      <div className="greeting">
        <h1>Universities</h1>
        <p>
          {rows.length} institution{rows.length === 1 ? "" : "s"} so far, each linking to its own
          website. More will be added as they are checked.
        </p>
      </div>
    </div>

    {places.length > 2 && <div className="card">
      <div className="sf-filters">
        {places.map((name) => (
          <button
            key={name}
            type="button"
            className={`filter-chip${place === name ? " active" : ""}`}
            onClick={() => setPlace(name)}
          >{name}</button>
        ))}
      </div>
    </div>}

    {shown.length
      ? shown.map((row) => <Card key={row.id} row={row} courses={state.courses}/>)
      : <div className="card"><p>No universities loaded yet.</p></div>}
  </>;
}
