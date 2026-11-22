import Link from "next/link";
import { site } from "@/content/site";
import { FeaturePreview, PageIntro } from "@/components/Site";
export const metadata = { title: "Features", description: "Explore the College ReadyAI study and planning tools." };
export default function FeaturesPage() { return <>
  <PageIntro title={site.copy.featureTitle} text="A study companion for the decisions and routines around school."/>
  <section className="section"><div className="container feature-grid">{site.features.map((feature) => <article className={`feature-card ${feature.size === "large" ? "feature-large" : ""}`} key={feature.type}><div><h2>{feature.title}</h2><p>{feature.text}</p></div><FeaturePreview type={feature.type}/></article>)}</div><div className="container"><p className="small-note">{site.copy.studyDeckLimits}</p></div></section>
  <section className="section section-tint"><div className="container"><h2>More tools are on the way.</h2><div className="coming-row"><p>{site.comingSoon.join(", ")}</p><span>These features are not available today.</span></div></div></section>
  <section className="section"><div className="container honest-grid"><h2>{site.copy.advisorHonestyTitle}</h2><div><p className="lead">{site.copy.advisorHonestyText}</p><p>Scholarship and University Finder suggestions are AI-assisted and depend on your answers. Check dates, eligibility and requirements with the official source. College ReadyAI is not affiliated with JAMB, WAEC, universities or scholarship providers.</p><Link className="button" href="/signup">Start free</Link></div></div></section>
</>; }
