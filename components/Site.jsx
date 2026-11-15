"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { site, placeholders } from "@/content/site";
export function BrandMark({ dark = false, showName = false }) {
    const mark = <span className={`brand-mark${dark ? " brand-mark-dark" : ""}`}><img src="/college-readyai-mark-white.svg" alt="" width="28" height="28"/></span>;
    if (showName) return <Link className="header-brand-lockup" href="/" aria-label="College ReadyAI home">{mark}<span className="header-brand-name">College ReadyAI</span></Link>;
    return _jsx(Link, { className: `brand-mark${dark ? " brand-mark-dark" : ""}`, href: "/", "aria-label": "College ReadyAI home", children: _jsx("img", { src: "/college-readyai-mark-white.svg", alt: "", width: "28", height: "28" }) });
}
export function Header() {
    const [open, setOpen] = useState(false);
    const menuToggleRef = useRef(null);
    const wasOpen = useRef(false);
    useEffect(() => {
        const esc = (event) => { if (event.key === "Escape")
            setOpen(false); };
        window.addEventListener("keydown", esc);
        return () => window.removeEventListener("keydown", esc);
    }, []);
    useEffect(() => { document.body.classList.toggle("menu-open", open); return () => document.body.classList.remove("menu-open"); }, [open]);
    useEffect(() => {
        if (open) {
            wasOpen.current = true;
            document.querySelector("#mobile-menu a")?.focus();
        } else if (wasOpen.current) {
            wasOpen.current = false;
            menuToggleRef.current?.focus();
        }
    }, [open]);
    return <header className="site-header"><a className="skip-link" href="#main">Skip to content</a><div className="header-inner">
      <BrandMark showName/><nav className="desktop-nav" aria-label="Main navigation">{site.nav.map(([label, href]) => <Link className={label === "Home" ? "nav-home" : undefined} key={href} href={href}>{label}</Link>)}</nav>
      <div className="header-actions"><Link className="login-link" href="/login">Log in</Link><Link className="button button-small" href="/signup">Start free</Link><button ref={menuToggleRef} className="menu-toggle" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(!open)}><span/><span/><span/></button></div>
    </div>{open && <nav id="mobile-menu" className="mobile-menu" aria-label="Mobile navigation">{site.nav.map(([label, href]) => <Link key={href} href={href} onClick={() => setOpen(false)}>{label}</Link>)}<Link href="/login" onClick={() => setOpen(false)}>Log in</Link><Link className="button" href="/signup" onClick={() => setOpen(false)}>Start free</Link></nav>}</header>;
}
function NewsletterPreview() {
    const [done, setDone] = useState(false);
    return <section className="footer-newsletter" aria-labelledby="footer-newsletter-title">
      <div className="footer-newsletter-copy"><h2 id="footer-newsletter-title">Stay up to date.</h2><p>Hear about new study tools and product updates from College ReadyAI.</p></div>
      <form className="footer-newsletter-form" onSubmit={(event) => { event.preventDefault(); setDone(true); }}>
        <label htmlFor="footer-email">Email address</label>
        <div className="footer-email-row"><input id="footer-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required/><button type="submit">Subscribe</button></div>
        <p className="footer-newsletter-note" role={done ? "status" : undefined}>{done ? "Preview only. Your email was not sent or stored." : <>No email will be sent in this preview. Read our <Link href="/legal/privacy">Privacy notice</Link>.</>}</p>
      </form>
    </section>;
}
export function Footer() {
    const groups = [
      { title: "Explore", links: [["Features", "/#features"], ["How it works", "/#how-it-works"], ["Pricing", "/#pricing"], ["For schools", "/#schools"]] },
      { title: "Support", links: [["FAQ", "/#faq"], ["For parents", "/#parents"], ["Contact", "/contact"], ["About", "/about"]] },
      { title: "Legal", links: [["Privacy", "/legal/privacy"], ["Terms", "/legal/terms"], ["Cookies", "/legal/cookies"], ["Refunds", "/legal/refunds"], ["AI notice", "/legal/ai-notice"], ["Subprocessors", "/legal/subprocessors"], ["Copyright", "/legal/copyright"], ["Credits", "/legal/credits"]] },
    ];
    return <footer className="site-footer"><div className="container footer-wrap"><NewsletterPreview/><div className="footer-top"><div className="footer-identity"><div className="footer-brandline"><BrandMark dark/><strong>{site.name}</strong></div><p className="footer-tagline">{site.tagline}</p></div><nav className="footer-nav" aria-label="Footer">{groups.map((group) => <div className="footer-link-group" key={group.title}><h2>{group.title}</h2>{group.links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}{group.title === "Legal" && <button className="text-button" onClick={() => window.dispatchEvent(new Event("open-cookie-preferences"))}>Cookie preferences</button>}</div>)}</nav></div><div className="footer-bottom"><p>Names of exams, universities and scholarships belong to their owners. We are not affiliated with them.</p><p>{placeholders.company}, {placeholders.email}, {placeholders.phone}</p></div></div></footer>;
}
export function CookieBanner() {
    const [visible, setVisible] = useState(false);
    const [choose, setChoose] = useState(false);
    const [adult, setAdult] = useState(false);
    useEffect(() => {
        if (!localStorage.getItem("crai-cookie-choice"))
            setVisible(true);
        const handler = () => { setVisible(true); setChoose(true); setAdult(localStorage.getItem("crai-cookie-choice") === "analytics"); };
        window.addEventListener("open-cookie-preferences", handler);
        return () => window.removeEventListener("open-cookie-preferences", handler);
    }, []);
    const save = (choice) => { localStorage.setItem("crai-cookie-choice", choice); setVisible(false); setChoose(false); };
    if (!visible)
        return null;
    return _jsxs("aside", { className: "cookie-banner", "aria-label": "Cookie preferences", children: [_jsxs("div", { children: [_jsx("strong", { children: "Your privacy choices" }), _jsx("p", { children: "Essential storage keeps this site working. Analytics is not configured in this preview. Your choice will be saved for any approved optional analytics added later." }), choose && _jsxs("label", { className: "checkline", children: [_jsx("input", { type: "checkbox", checked: adult, onChange: (e) => setAdult(e.target.checked) }), " I am 18 or older"] })] }), _jsxs("div", { className: "cookie-actions", children: [_jsx("button", { className: "button button-outline", onClick: () => save("essential"), children: "Essential only" }), _jsx("button", { className: "button button-outline", onClick: () => setChoose(!choose), children: "Choose" }), _jsx("button", { className: "button", onClick: () => choose ? (adult ? save("analytics") : save("essential")) : setChoose(true), children: choose ? "Save choice" : "Allow analytics" })] })] });
}
export function Shell({ children }) {
    useEffect(() => {
        if (!("IntersectionObserver" in window)) return;
        const sections = document.querySelectorAll("#main .hero, #main section.section");
        const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
            if (entry.isIntersecting) { entry.target.classList.add("revealed"); observer.unobserve(entry.target); }
        }), { threshold: 0.08 });
        sections.forEach((section) => { section.classList.add("reveal-once"); observer.observe(section); });
        return () => observer.disconnect();
    }, []);
    return <><Header/><main id="main">{children}</main><Footer/><CookieBanner/></>;
}
export function PageIntro({ eyebrow, title, text }) {
    return _jsx("section", { className: "page-intro", children: _jsxs("div", { className: "container", children: [eyebrow && _jsx("p", { className: "eyebrow", children: eyebrow }), _jsx("h1", { children: title }), text && _jsx("p", { className: "lead", children: text })] }) });
}
export function UIFrame({ kind = "dashboard" }) {
    const isAdvisor = kind === "advisor";
    const isDecks = kind === "decks";
    return <div className={`ui-frame frame-${kind}`} role="img" aria-label="Illustrative College ReadyAI study path preview, not a live product screenshot">
      <div className="study-preview-head"><span className="preview-brand">College ReadyAI</span><span className="preview-avatar">A</span></div>
      <div className="study-preview-body">
        <div className="preview-welcome"><p>{isAdvisor ? "AI Advisor" : isDecks ? "Study decks" : "Your study path"}</p><h2>{isAdvisor ? "Plan a revision session" : isDecks ? "Review what you know" : "Build a plan around your goals"}</h2><span>{isAdvisor ? "Ask a question about your next exam." : isDecks ? "Turn your notes into flashcards." : "A clear next step for JAMB and WAEC."}</span></div>
        <div className="preview-next"><span className="preview-mark" aria-hidden="true">{isAdvisor ? "?" : isDecks ? "▤" : "1"}</span><div><small>{isAdvisor ? "Ask your question" : isDecks ? "From your notes" : "Next step"}</small><strong>{isAdvisor ? "How should I revise this week?" : isDecks ? "Create a deck to review" : "Choose a subject to begin"}</strong></div></div>
        <div className="preview-subjects"><span>JAMB</span><span>WAEC</span><span>Study plan</span></div>
      </div>
    </div>;
}
export function FeaturePreview({ type }) {
    const items = {
      advisor: ["Ask a study question", "Get a labelled AI reply"],
      decks: ["Your uploaded notes", "Flashcards to review"],
      scholarship: ["Your answers", "Scholarship suggestions"],
      university: ["Schools and courses", "Compare suggestions"],
      exams: ["JAMB and WAEC", "Tasks and timed practice"],
      progress: ["Study activity", "Streaks and achievements"],
    }[type] || ["Your goals", "A clear next step"];
    return <div className={`mini-preview preview-${type}`} aria-hidden="true"><div className="feature-preview-paper"><span className="feature-preview-rule"/><p>{items[0]}</p><div className="feature-preview-line"/><div className="feature-preview-line short"/><div className="feature-preview-result"><span className="feature-preview-dot"/><strong>{items[1]}</strong></div></div></div>;
}
export function SimpleForm({ kind }) {
    const [done, setDone] = useState(false);
    const label = kind === "waitlist" ? "Paid plan waitlist" : kind === "school" ? "School enquiry" : "Contact";
    return _jsxs("form", { className: "simple-form", onSubmit: (e) => { e.preventDefault(); setDone(true); }, children: [_jsx("h3", { children: label }), _jsxs("p", { children: [kind === "waitlist" ? "We use your name and email to contact you about paid plan availability. This is not a subscription. See the " : "We use these details only to respond to your request. See the ", _jsx(Link, { href: "/legal/privacy", children: "Privacy draft" }), "."] }), _jsxs("label", { children: ["Name", _jsx("input", { required: true, name: "name", autoComplete: "name" })] }), _jsxs("label", { children: ["Email", _jsx("input", { required: true, name: "email", type: "email", autoComplete: "email" })] }), kind !== "waitlist" && _jsxs("label", { children: [kind === "school" ? "School or organisation" : "What can we help with?", _jsx("input", { required: true, name: "message" })] }), done ? _jsx("p", { className: "form-note", role: "status", children: "This form preview is not connected yet. Add the approved destination before launch." }) : _jsx("button", { className: "button", type: "submit", children: kind === "waitlist" ? "Join waitlist" : "Send enquiry" }), _jsx("p", { className: "form-note", children: placeholders.backend })] });
}
