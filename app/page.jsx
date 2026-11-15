import Link from "next/link";
import { site } from "@/content/site";
import { FeatureCarousel } from "@/components/FeatureCarousel";

export const metadata = { title: "Your next step, made clearer", description: "An AI study guide for students at every academic level." };

function HeroProductPreview() {
  return <div className="hero-collage" aria-hidden="true">
    <article className="hero-product-card hero-decks-card">
      <div className="hero-mini-head"><span className="mock-icon mock-icon-lilac">D</span><div><strong>Study decks</strong><small>Biology notes</small></div><span className="mock-menu">•••</span></div>
      <div className="mock-flashcard"><small>FLASHCARD 01</small><strong>What is the function of a cell membrane?</strong><span>Tap to reveal answer</span></div>
      <div className="mock-card-footer"><span>Review your notes</span><span className="mock-progress-dots"><i/><i/><i/><i/></span></div>
    </article>

    <article className="hero-product-card hero-path-card">
      <div className="hero-mini-head"><span className="mock-icon">C</span><div><strong>Your study path</strong><small>Built around your goals</small></div><span className="mock-avatar">A</span></div>
      <div className="hero-path-welcome"><span>This week</span><h2>Choose a subject to begin</h2><p>A clear next step for JAMB and WAEC.</p></div>
      <div className="hero-path-choices"><div><span className="mock-subject">J</span><div><strong>JAMB</strong><small>Exam preparation</small></div><span className="mock-check">✓</span></div><div><span className="mock-subject mock-subject-sky">W</span><div><strong>WAEC</strong><small>Exam preparation</small></div><span className="mock-check">✓</span></div></div>
    </article>

    <article className="hero-product-card hero-advisor-card">
      <div className="hero-mini-head"><span className="mock-icon mock-icon-navy">✦</span><div><strong>AI Advisor</strong><small>Study and planning help</small></div><span className="mock-menu">•••</span></div>
      <div className="mock-question">How should I revise this week?</div>
      <div className="mock-answer"><span>AI-generated answer</span><div className="mock-answer-lines"><i/><i/><i/></div></div>
      <div className="mock-card-footer"><span>Check important dates with the official source.</span></div>
    </article>
  </div>;
}

export default function Home() {
  return <>
    <section className="hero hero-reference" id="home">
      <div className="container"><div className="hero-banner">
        <div className="hero-center-copy">
          <h1>Know your next step. Get ready for it.</h1>
          <p>{site.copy.heroText}</p>
          <Link className="button button-light hero-button" href="/signup">Start free</Link>
        </div>
        <HeroProductPreview/>
      </div></div>
    </section>

    <section className="section landing-overview">
      <div className="container">
        <div className="landing-overview-heading"><div><h2>A clearer next step, from day one.</h2><p>College ReadyAI is made for the decisions and study days ahead.</p></div><Link className="button" href="/signup">Make your plan</Link></div>
        <div className="fact-row">
          <article className="fact-card"><span className="fact-icon">◎</span><div><strong>13–24</strong><p>For students from senior secondary school through university</p></div></article>
          <article className="fact-card"><span className="fact-icon">✦</span><div><strong>5 questions</strong><p>Start with what you know and where you want to go</p></div></article>
          <article className="fact-card"><span className="fact-icon">↗</span><div><strong>3 stages</strong><p>Choose the path that fits where you are today</p></div></article>
        </div>
      </div>
    </section>

    <section className="section section-tint landing-process" id="how-it-works">
      <div className="container">
        <div className="section-heading section-heading-center"><h2>From a few answers to a plan you can use.</h2><p>Start with your stage, set a goal, then work through the next step.</p></div>
        <div className="three-grid steps">{site.steps.map((step, index) => <article className="step-card" key={step.title}><span className="step-number">{String(index + 1).padStart(2, "0")}</span><h3>{step.title}</h3><p>{step.text}</p></article>)}</div>
        <div className="landing-center-link"><Link className="text-link" href="/#how-it-works">See how it works</Link></div>
      </div>
    </section>

    <section className="section landing-features" id="features">
      <div className="container">
        <div className="section-heading"><h2>Tools for the work in front of you.</h2><p>{site.copy.featuresIntro}</p></div>
        <FeatureCarousel features={site.features}/>
        <div className="coming-row"><div><p className="small-intro">On the way</p><ul className="coming-list">{site.comingSoon.map((feature) => <li key={feature}>{feature}</li>)}</ul></div><Link className="text-link" href="/#features">Explore all features</Link></div>
      </div>
    </section>

    <section className="section landing-guidance">
      <div className="container guidance-grid">
        <article className="guidance-card guidance-ai"><span className="guidance-icon">✦</span><h2>{site.copy.advisorHonestyTitle}</h2><p className="lead">{site.copy.advisorHonestyText}</p><Link className="text-link" href="/#features">Learn about the tools</Link></article>
        <article className="guidance-card guidance-family" id="parents"><div><span className="guidance-icon guidance-icon-blue">♡</span><h2>{site.copy.parentTitle}</h2></div><ul className="check-list">{site.parents.map((item) => <li key={item}>{item}</li>)}</ul><Link className="text-link" href="/#parents">Read the parent guide</Link></article>
      </div>
    </section>

    <section className="section landing-pricing pricing-reference" id="pricing">
      <div className="container">
        <div className="pricing-reference-heading"><p className="reference-kicker">Pricing</p><h2>Free works today. <em>Paid plans are not live yet.</em></h2><p>Plus and Pro prices below are planned monthly prices in naira. Join the waitlist for an update when they become available.</p></div>
        <div className="pricing-reference-grid">
          <article className="price-plan-card plan-free"><div className="price-card-head"><h3>Free</h3><span className="plan-status status-live">Available now</span></div><p className="price-card-amount">{site.prices.Free.monthly}<small> / month</small></p><ul className="plan-benefits"><li>3 AI Advisor messages a day</li><li>1 mock test and 3 file uploads per month</li><li>3 scholarship matches and 1 study deck per month</li><li>Exam reminders</li></ul><Link className="plan-action plan-action-primary" href="/signup">Start free</Link></article>
          <article className="price-plan-card plan-plus"><div className="price-card-head"><h3>Plus</h3><span className="plan-status status-planned">Planned</span></div><p className="price-card-amount">{site.prices.Plus.monthly}<small> / month</small></p><ul className="plan-benefits"><li>150 AI Advisor messages and 4 mock tests per month</li><li>10 file uploads, 10 scholarship matches and 4 study decks per month</li><li>Exam reminders</li><li>Yearly billing saves 10%</li></ul><Link className="plan-action" href="/pricing#waitlist">Join the waitlist</Link></article>
          <article className="price-plan-card plan-pro"><div className="price-card-head"><h3>Pro</h3><span className="plan-status status-planned">Planned</span></div><p className="price-card-amount">{site.prices.Pro.monthly}<small> / month</small></p><ul className="plan-benefits"><li>400 AI Advisor messages and 12 mock tests per month</li><li>30 file uploads, 40 scholarship matches and 20 study decks per month</li><li>Priority AI responses</li><li>Textbook Library is planned, subject to licensing</li><li>Yearly billing saves 10%</li></ul><Link className="plan-action" href="/pricing#waitlist">Join the waitlist</Link></article>
          <article className="price-plan-card plan-institution"><div className="price-card-head"><h3>Institution</h3><span className="plan-status status-enquiry">By enquiry</span></div><p className="price-card-amount price-card-custom">Custom</p><ul className="plan-benefits">{site.institution.map((item) => <li key={item}>{item}</li>)}</ul><Link className="plan-action" href="/schools">Talk to us</Link></article>
        </div>
        <p className="pricing-reference-note">Prices are in naira. Plus and Pro are planned and may change before launch. Taxes, if any, will be shown before payment.</p>
      </div>
    </section>

    <section className="section landing-schools" id="schools">
      <div className="container"><div className="school-banner"><div className="school-banner-content"><h2>{site.copy.schoolTitle}</h2><p>Support your students with guided study tools, academic planning, and an overview for staff.</p><ul className="school-banner-points">{site.institution.map((item) => <li key={item}>{item}</li>)}</ul><Link className="button button-light" href="/schools">Talk to us</Link></div></div></div>
    </section>

    <section className="section landing-faq faq-reference" id="faq">
      <div className="container faq-reference-container"><div className="faq-reference-heading"><p className="reference-kicker">Questions</p><h2>What students and parents <em>ask first</em></h2></div><div className="faq-list">{site.faqs.slice(0, 6).map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div><div className="faq-reference-action"><Link className="faq-ask-button" href="/contact">Ask us a question</Link></div></div>
    </section>

    <section className="final-cta final-cta-reference"><div className="container"><h2>Start with five questions.</h2><p>Pick your stage and take the next step at your pace.</p><Link className="button button-light" href="/signup">Start free</Link></div></section>
  </>;
}
