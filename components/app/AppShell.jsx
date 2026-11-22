"use client";
import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase, configured } from "@/lib/supabase";
import {
  HomeIcon, AdvisorIcon, ExamsHubIcon, StudyToolsIcon,
  DiscoverIcon, UniversitiesIcon, ScholarshipsIcon, ProfileIcon,
} from "./icons";

// The frame every logged-in screen sits inside: sidebar, mobile bar, topbar.
//
// It also holds the one profile fetch the whole area needs, so eight screens
// do not each ask who is signed in.
//
// The route guard here is a convenience, not the security boundary: every
// query is filtered by row-level security, so a forged guard still returns
// nothing. See supabase/migrations/…_rls.sql.

const NAV = [
  { group: null, items: [{ href: "/dashboard", label: "Home", Icon: HomeIcon }] },
  { group: "Study", items: [
    { href: "/advisor", label: "AI Advisor", Icon: AdvisorIcon },
    { href: "/exams", label: "Exams hub", Icon: ExamsHubIcon },
    { href: "/study", label: "Study tools", Icon: StudyToolsIcon },
  ] },
  { group: "Explore", items: [
    { href: "/discover", label: "Discover", Icon: DiscoverIcon },
    { href: "/universities", label: "Universities", Icon: UniversitiesIcon },
    { href: "/scholarships", label: "Scholarships", Icon: ScholarshipsIcon },
  ] },
  { group: "Account", items: [
    { href: "/profile", label: "Profile", Icon: ProfileIcon },
  ] },
];

const PLAN_LABEL = { free: "Free plan", plus: "Plus plan", pro: "Pro plan", institution: "Institution" };

// The shell has already asked who is signed in, so screens read it from here
// rather than each repeating the query.
const ProfileContext = createContext({ profile: null, email: null });
export const useProfile = () => useContext(ProfileContext);

function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

// An account that is not active sees why, on every screen, instead of eight
// empty ones. Row-level security already returns nothing to these accounts —
// this only explains the emptiness rather than creating the protection.
function Gate({ state, onSignOut, children }) {
  const status = state.profile?.status;

  if (state.error) return <>
    <h1>Something went wrong</h1>
    <p role="alert">{state.error}</p>
    <button className="btn-outline" type="button" onClick={onSignOut}>Log out</button>
  </>;

  if (!state.profile) return <>
    <h1>We could not find your account</h1>
    <p>Signed in as {state.email}, but there is no profile attached to it.</p>
    <button className="btn-outline" type="button" onClick={onSignOut}>Log out</button>
  </>;

  if (status === "pending_guardian") return <>
    <h1>Waiting for your guardian</h1>
    <p>We have asked your parent or guardian to approve your account. Nothing opens until they answer.</p>
    <p>If they did not get the message, ask them to check their spam folder, or <Link href="/contact">tell us</Link> and we will send it again.</p>
    <button className="btn-outline" type="button" onClick={onSignOut}>Log out</button>
  </>;

  if (status === "paused" || status === "closed") return <>
    <h1>Your account is paused</h1>
    <p>A parent or guardian has withdrawn their approval, so College ReadyAI is closed for now. Your work is kept and nothing has been deleted.</p>
    <p>They can approve again from the link we sent them, or <Link href="/contact">ask us</Link>.</p>
    <button className="btn-outline" type="button" onClick={onSignOut}>Log out</button>
  </>;

  return children;
}

export function AppShell({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    let live = true;
    (async () => {
      if (!configured) { if (live) setState({ loading: false, unconfigured: true }); return; }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("full_name, plan, status")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!live) return;
      setState({ loading: false, email: session.user.email, profile, error: error?.message });
    })();
    return () => { live = false; };
  }, [router]);

  // A route change should never leave the mobile drawer or a dropdown open
  // behind the new screen.
  useEffect(() => { setMenuOpen(false); setAccountOpen(false); }, [pathname]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (state.unconfigured) {
    return <div className="app"><main className="main" id="main-content">
      <h1>Not connected yet</h1>
      <p>This site has no Supabase keys set, so there is nothing to sign in to.</p>
    </main></div>;
  }

  const name = state.profile?.full_name || "";
  const plan = PLAN_LABEL[state.profile?.plan] || "Free plan";

  return <>
    <a className="skip-link" href="#main-content">Skip to main content</a>

    <div className="app">
      <div
        className={`mobile-nav-backdrop${menuOpen ? " open" : ""}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />

      <aside className={`sidebar${menuOpen ? " open" : ""}`}>
        <div className="logo">
          <Link href="/dashboard">College ReadyAI</Link>
        </div>

        <nav className="primary-nav" aria-label="Main">
          {NAV.map((block) => {
            const items = block.items.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                className={`nav-item${pathname === href ? " active" : ""}`}
                aria-current={pathname === href ? "page" : undefined}
              >
                <Icon/><span>{label}</span>
              </Link>
            ));

            if (!block.group) return items;

            return <div className="nav-group" key={block.group}>
              <div className="ng-label"><span>{block.group}</span></div>
              <div className="ng-body"><div className="ng-in">{items}</div></div>
            </div>;
          })}
        </nav>

        <div className="sidebar-foot dropdown-wrap">
          <button
            type="button"
            className="sidebar-foot-btn"
            onClick={() => setAccountOpen((open) => !open)}
            aria-expanded={accountOpen}
          >
            <div className="avatar-ring" id="sb-av">{initials(name)}</div>
            <div>
              <div className="sidebar-foot-name">{name || "Your account"}</div>
              <div className="sidebar-foot-sub">{plan}</div>
            </div>
          </button>

          {accountOpen && <div className="dropdown-panel open" id="dd-account">
            <Link className="dropdown-item" href="/profile"><div className="t">View profile</div></Link>
            <Link className="dropdown-item" href="/legal/privacy"><div className="t">Privacy and data</div></Link>
            <Link className="dropdown-item" href="/legal/terms"><div className="t">Terms and policies</div></Link>
            <button type="button" className="dropdown-item" onClick={signOut}>
              <div className="t">Log out</div>
            </button>
          </div>}
        </div>
      </aside>

      <div className="mobile-topbar" id="mobile-topbar">
        <button
          type="button"
          className="mobile-nav-toggle"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          <span/><span/><span/>
        </button>
        <span>College ReadyAI</span>
      </div>

      <main className="main" id="main-content" tabIndex={-1}>
        {state.loading ? <p>Loading…</p> : <Gate state={state} onSignOut={signOut}>
          <ProfileContext.Provider value={{ profile: state.profile, email: state.email }}>
            {children}
          </ProfileContext.Provider>
        </Gate>}
      </main>
    </div>
  </>;
}
