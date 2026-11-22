import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { notFound } from "next/navigation";
import { PageIntro } from "@/components/Site";
import { site, placeholders } from "@/content/site";
export function generateStaticParams() { return ["privacy", "terms", "cookies", "refunds", "subprocessors", "ai-notice", "copyright", "credits"].map((slug) => ({ slug })); }
const descriptions = {
    privacy: "This draft explains the data College ReadyAI uses to provide accounts, onboarding, study tools and support. No ads. No selling of data. No AI training on a user's content unless they opt in. Users can copy data in one tap and delete their account in Profile. Under-13s cannot sign up; ages 13 to 17 need parent or guardian approval first.",
    terms: "This draft sets out account use, age and consent rules, service limits, AI limitations, acceptable use, changes to service and contact routes. The AI Advisor can make mistakes. Verify requirements, dates and decisions with official sources.",
    cookies: "Essential storage supports site operation and remembers your cookie choice. Analytics is not configured in this preview. If approved analytics is added, it must stay off until an eligible visitor gives consent and is not offered to visitors under 18. No third-party script, font, map, video or tracker loads before consent.",
    refunds: "This draft will explain billing, renewal, cancellation and refunds before paid plans launch. Paid plans are not live yet. Taxes, if any, will be shown before payment.",
    subprocessors: "This draft will list service providers that process data for College ReadyAI, the purpose of processing and relevant safeguards. Add the approved current list before launch.",
    "ai-notice": "The Advisor and Finder suggestions use AI. AI outputs can be wrong or incomplete. Every Advisor reply is labelled. Check dates, eligibility and requirements with the relevant official source. User content is not used to train AI unless the user opts in.",
    copyright: "Names of exams, universities and scholarships belong to their owners. College ReadyAI is not affiliated with JAMB, WAEC, universities or scholarship providers. Add approved copyright and takedown contact details before launch.",
    credits: "Brand assets were supplied for this project. Add credits for any other approved content or assets before launch. No third-party logos or partnerships are represented here.",
};
export async function generateMetadata({ params }) { const { slug } = await params; const label = site.legalPages.find((name) => name.toLowerCase().replace(" ", "-") === slug); return { title: label || "Legal information", description: `College ReadyAI ${label || "legal"} information draft.` }; }
export default async function LegalPage({ params }) { const { slug } = await params; const label = site.legalPages.find((name) => name.toLowerCase().replace(" ", "-") === slug); if (!label)
    notFound(); return _jsxs(_Fragment, { children: [_jsx(PageIntro, { eyebrow: "Legal", title: label }), _jsx("section", { className: "section", children: _jsxs("div", { className: "container content-narrow", children: [_jsx("p", { className: "draft-banner", children: site.copy.legalBanner }), _jsx("p", { className: "lead", children: descriptions[slug] }), _jsx("h2", { children: "Before launch" }), _jsx("p", { children: placeholders.legalReview }), _jsxs("p", { children: ["Contact: ", placeholders.email] })] }) })] }); }
