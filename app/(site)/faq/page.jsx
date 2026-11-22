import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { PageIntro } from "@/components/Site";
import { site } from "@/content/site";
export const metadata = { title: "FAQ", description: "Answers about exams, pricing, AI and privacy." };
export default function FAQPage() { return _jsxs(_Fragment, { children: [_jsx(PageIntro, { title: site.copy.faqTitle, text: "Plain answers about using College ReadyAI." }), _jsx("section", { className: "section", children: _jsx("div", { className: "container content-narrow faq-list", children: site.faqs.map(([q, a]) => _jsxs("details", { children: [_jsx("summary", { children: q }), _jsx("p", { children: a })] }, q)) }) })] }); }
