"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

// The scholarship list, read from the table rather than hardcoded.
//
// Two things here are deliberate and should survive any redesign.
//
// Every record wears how far it has been checked, right next to its name.
// Eighteen of the twenty have no confirmed application link, and saying so is
// the point: a student who believes an unverified deadline and misses a real
// one is worse off than a student who was told to go and check.
//
// Where there is no link, the card says so and warns about sites that charge
// to apply. Scholarship scams are the reason that sentence exists; it is not
// filler and should not be trimmed to tidy the layout.

const DAY = 86400000;

function daysTo(dateString) {
  if (!dateString) return null;
  const then = new Date(dateString + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((then - now) / DAY);
}

/** Open / Closing Soon / Closed — unless the record says not to trust its date. */
function statusOf(row) {
  if (row.status_override) return row.status_override;
  if (!row.deadline_on) return "Unavailable";
  const days = daysTo(row.deadline_on);
  if (days < 0) return "Closed";
  if (days <= 7) return "Closing Soon";
  return "Open";
}

const STATUS_CLASS = {
  "Open": "st-open",
  "Closing Soon": "st-soon",
  "Closed": "st-closed",
  "Upcoming": "st-up",
};

function daysText(row, status) {
  const days = daysTo(row.deadline_on);
  if (days === null) return "";
  if (status === "Closed") return days === -1 ? "Closed yesterday" : `Closed ${-days} days ago`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `${days} days left`;
}

function Field({ label, value }) {
  if (!value) return null;
  return <><dt>{label}</dt><dd>{value}</dd></>;
}

function Card({ row }) {
  const [open, setOpen] = useState(false);
  const status = statusOf(row);
  const meta = [row.country, row.level_note || row.level, row.category, row.funding_type].filter(Boolean).join(" · ");
  const verClass = `ver-${String(row.verification || "Unverified").split(" ")[0].toLowerCase()}`;

  return <div className={`sf-item sch${status === "Closed" ? " is-closed" : ""}`}>
    <div className="sf-item-body">
      <h3>{row.name}</h3>

      <div className="sch-badges">
        <span className={`sch-st ${STATUS_CLASS[status] || "st-pend"}`}>{status}</span>
        <span className={`sch-ver ${verClass}`}>{row.verification}</span>
      </div>

      {meta && <p className="sch-meta">{meta}</p>}
      {row.deadline_on && <p className="sch-meta">{row.deadline_on} — {daysText(row, status)}</p>}

      <button className="btn-outline" type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {open ? "Hide details" : "Details"}
      </button>

      {open && <>
        <dl className="sch-grid">
          <Field label="Awarding organisation" value={row.provider}/>
          <Field label="Category" value={row.category}/>
          <Field label="Education level" value={row.level_note || row.level}/>
          <Field label="Country" value={row.country && row.continent ? `${row.country} (${row.continent})` : row.country}/>
          <Field label="Eligibility" value={row.eligibility}/>
          <Field label="Academic requirements" value={row.academic_requirements}/>
          <Field label="Nationality restrictions" value={row.nationality}/>
          <Field label="Funding type" value={row.funding_type}/>
          <Field label="Funding amount" value={row.amount}/>
          <Field label="Applications open" value={row.opens_on}/>
          <Field label="Application deadline" value={row.deadline_on}/>
          <Field label="Required documents" value={row.documents}/>
          <Field label="Benefits" value={row.benefits}/>
          <Field label="How to apply" value={row.how_to_apply}/>
          <Field label="Verification" value={row.verification}/>
          <Field label="Last verified" value={row.last_verified_on}/>
          <Field label="Record ID" value={row.record_ref}/>
        </dl>

        {row.status_note && <p className="sch-note"><b>Note:</b> {row.status_note}</p>}
        {row.verification_note && <p className="sch-note"><b>Verification:</b> {row.verification_note}</p>}

        <div className="sch-links">
          {row.application_url && <a className="btn-primary sch-link" href={row.application_url}
            target="_blank" rel="noopener noreferrer">Apply on official site</a>}
          {row.info_url && row.info_url !== row.application_url && <a className="btn-outline sch-link"
            href={row.info_url} target="_blank" rel="noopener noreferrer">Official information</a>}
          {!row.application_url && !row.info_url && <p className="sch-nolink">
            We have not confirmed an official application link yet. Search the awarding
            organisation&apos;s own website, and be careful of sites that charge to apply.
          </p>}
        </div>
      </>}
    </div>
  </div>;
}

export function ScholarshipsView() {
  const [state, setState] = useState({ loading: true });
  const [scope, setScope] = useState("All");
  const [hideClosed, setHideClosed] = useState(true);

  useEffect(() => {
    let live = true;
    (async () => {
      const { data, error } = await supabase
        .from("scholarships")
        .select("*")
        .order("deadline_on", { ascending: true, nullsFirst: false });
      if (!live) return;
      setState({ loading: false, rows: data || [], error: error?.message });
    })();
    return () => { live = false; };
  }, []);

  const rows = state.rows || [];
  const scopes = useMemo(
    () => ["All", ...[...new Set(rows.map((r) => r.scope).filter(Boolean))].sort()],
    [rows],
  );

  const shown = rows.filter((row) => {
    if (scope !== "All" && row.scope !== scope) return false;
    if (hideClosed && statusOf(row) === "Closed") return false;
    return true;
  });

  if (state.loading) return <p>Loading scholarships…</p>;
  if (state.error) return <>
    <h1>Scholarships</h1>
    <p role="alert">{state.error}</p>
  </>;

  const closedCount = rows.filter((row) => statusOf(row) === "Closed").length;

  return <>
    <div className="topbar">
      <div className="greeting">
        <h1>Scholarships</h1>
        <p>
          {rows.length} record{rows.length === 1 ? "" : "s"} gathered so far. Each one shows how far
          we have checked it — treat anything marked Unverified as a lead to follow, not a fact.
        </p>
      </div>
    </div>

    <div className="card">
      <div className="sf-filters">
        {scopes.map((name) => (
          <button
            key={name}
            type="button"
            className={`filter-chip${scope === name ? " active" : ""}`}
            onClick={() => setScope(name)}
          >{name}</button>
        ))}
        {closedCount > 0 && <button
          type="button"
          className={`filter-chip${hideClosed ? "" : " active"}`}
          onClick={() => setHideClosed((v) => !v)}
        >{hideClosed ? `Show ${closedCount} closed` : "Hide closed"}</button>}
      </div>
    </div>

    {shown.length
      ? <div className="sf-list">{shown.map((row) => <Card key={row.id} row={row}/>)}</div>
      : <div className="card"><p>Nothing matches that filter.</p></div>}
  </>;
}
