"use client";
import { useState } from "react";
import { site } from "@/content/site";
import Link from "next/link";
import { SimpleForm } from "@/components/Site";

export function PricingGrid() {
  const [period, setPeriod] = useState("monthly");
  const labels = { weekly: "Weekly", monthly: "Monthly", yearly: "Yearly, save 10%" };
  return <>
    <div className="billing-toggle" role="group" aria-label="Billing period">{Object.keys(labels).map((key) => <button key={key} aria-pressed={period === key} onClick={() => setPeriod(key)}>{labels[key]}</button>)}</div>
    <p className="billing-note">Plans renew at the selected interval and can be cancelled before the next renewal. Weekly plans receive one quarter of the monthly allowance each week, rounded down. Taxes, if any, are shown before payment.</p>
    <div className="pricing-grid">{["Free", "Plus", "Pro"].map((name) => <article className="pricing-card" key={name}>
      <p className="eyebrow">{name}</p><p className="price">{site.prices[name][period]}<small>{period === "yearly" ? " / year" : ` / ${period === "weekly" ? "week" : "month"}`}</small></p>
      <p className="renewal">{name === "Free" ? "No recurring charge." : `Renews ${period}; cancel before renewal. Paid plans are not live yet.`}</p>
      <ul>{site.prices[name].lines.map((line) => <li key={line}>{line}</li>)}</ul>
      {name === "Free" ? <Link className="button button-outline" href="/signup">Start free</Link> : <Link className="button button-outline" href="#waitlist">Join waitlist</Link>}
    </article>)}</div>
  </>;
}
export function PricingWaitlist() { return <div id="waitlist" className="waitlist-wrap"><div><p className="eyebrow">Paid plans are not live yet</p><h2>Hear when plans are ready.</h2><p>We will use your details to contact you about plan availability. This is not a subscription.</p></div><SimpleForm kind="waitlist"/></div>; }
