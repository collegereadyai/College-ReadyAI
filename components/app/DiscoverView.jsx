"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

// Discover: search across what we have, with the nearest deadlines first.
//
// The prototype headed the second section "Top Universities in Africa —
// prestigious institutions on the continent". We have three Nigerian
// universities and no ranking of anything, so that heading would be a claim
// the data cannot support. It says what it is instead.
//
// Nothing here is personalised. The prototype's "Recommended for you — based
// on your math performance" was computed from nothing, and a recommendation
// that is really just the first row of a table teaches a student to trust
// something that has not earned it. When the Advisor exists it can suggest
// properly, and it will say that it did.

const DAY = 86400000;

function daysTo(dateString) {
  if (!dateString) return null;
  const then = new Date(dateString + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((then - now) / DAY);
}

function statusOf(row) {
  if (row.status_override) return row.status_override;
  if (!row.deadline_on) return "Unavailable";
  const days = daysTo(row.deadline_on);
  if (days < 0) return "Closed";
  if (days <= 7) return "Closing Soon";
  return "Open";
}

const BANNER = { "Open": "green", "Closing Soon": "blue", "Closed": "purple" };

export function DiscoverView() {
  const [state, setState] = useState({ loading: true });
  const [query, setQuery] = useState("");
  const [pill, setPill] = useState("All");

  useEffect(() => {
    let live = true;
    (async () => {
      const [scholarships, institutions] = await Promise.all([
        supabase.from("scholarships")
          .select("id, name, provider, scope, country, level, verification, application_url, deadline_on, status_override")
          .order("deadline_on", { ascending: true, nullsFirst: false }),
        supabase.from("institutions").select("id, name, state, classification, source_url").order("name"),
      ]);
      if (!live) return;
      setState({
        loading: false,
        scholarships: scholarships.data || [],
        institutions: institutions.data || [],
        error: scholarships.error?.message || institutions.error?.message,
      });
    })();
    return () => { live = false; };
  }, []);

  const scholarships = state.scholarships || [];

  const pills = useMemo(() => {
    const scopes = [...new Set(scholarships.map((s) => s.scope).filter(Boolean))].sort();
    const levels = [...new Set(scholarships.map((s) => s.level).filter(Boolean))].sort();
    return ["All", ...scopes, ...levels];
  }, [scholarships]);

  const needle = query.trim().toLowerCase();
  const matching = scholarships.filter((row) => {
    if (pill !== "All" && row.scope !== pill && row.level !== pill) return false;
    if (!needle) return true;
    return [row.name, row.provider, row.country, row.level]
      .filter(Boolean).some((field) => field.toLowerCase().includes(needle));
  });

  // Nearest deadline first, and a date that has already passed is not
  // "soonest" whatever the record's status says. Filtering on status alone was
  // not enough: a row whose deadline we do not trust carries the override
  // "Verification Pending" rather than "Closed", so it slipped through here
  // and rendered as "-9 days left".
  const soonest = matching
    .filter((row) => statusOf(row) !== "Closed")
    .filter((row) => {
      const days = daysTo(row.deadline_on);
      return days === null || days >= 0;
    })
    .slice(0, 6);

  if (state.loading) return <p>Loading…</p>;
  if (state.error) return <><h1>Discover</h1><p role="alert">{state.error}</p></>;

  return <>
    <div className="page-head">
      <h1>Discover</h1>
      <p>Scholarships and universities to explore. Nothing here is picked for you.</p>
    </div>

    <div className="search-row">
      <div className="search-box">
        <input
          type="text"
          aria-label="Search scholarships"
          placeholder="Search scholarships…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
    </div>

    <div className="pill-row">
      {pills.map((name) => (
        <button
          key={name}
          type="button"
          className={`pill${pill === name ? " active" : ""}`}
          onClick={() => setPill(name)}
        >{name}</button>
      ))}
    </div>

    <section>
      <div className="section-head">
        <div>
          <h2>Closing soonest</h2>
          <p>Open scholarships, nearest deadline first. Check each provider for eligibility.</p>
        </div>
        <Link href="/scholarships">See all</Link>
      </div>

      {soonest.length === 0
        ? <div className="card"><p>
            {needle || pill !== "All"
              ? "Nothing matches that search."
              : "No open scholarships on the list right now."}
          </p></div>
        : <div className="scholar-grid">
            {soonest.map((row) => {
              const status = statusOf(row);
              const days = daysTo(row.deadline_on);
              return <article className="scholar-card" key={row.id}>
                <div className={`scholar-banner ${BANNER[status] || "purple"}`}/>
                <div className="scholar-body">
                  <h3>{row.name}</h3>
                  <p className="sub">
                    {[row.provider, row.country].filter(Boolean).join(" · ")}
                  </p>
                  <div className="scholar-foot">
                    <span className="pill">
                      {days === null || days < 0 ? status
                        : days === 0 ? "Due today"
                        : days === 1 ? "Due tomorrow"
                        : `${days} days left`}
                    </span>
                    <span className="sub">{row.verification}</span>
                  </div>
                </div>
              </article>;
            })}
          </div>}
    </section>

    <section style={{ marginTop: "40px" }}>
      <div className="section-head">
        <div>
          <h2>Universities on the list</h2>
          <p>{(state.institutions || []).length} so far, each linking to its own official site.</p>
        </div>
        <Link href="/universities">See all</Link>
      </div>

      <div className="uni-list">
        {(state.institutions || []).map((row) => (
          <article className="card" key={row.id}>
            <h3>{row.name}</h3>
            <p className="uni-loc">{[row.state, row.classification].filter(Boolean).join(" · ")}</p>
            <a href={row.source_url} target="_blank" rel="noopener noreferrer">Official website</a>
          </article>
        ))}
      </div>
    </section>
  </>;
}
