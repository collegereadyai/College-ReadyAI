import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { PageIntro } from "@/components/Site";
import { site, placeholders } from "@/content/site";
export const metadata = { title: "About", description: "Why College ReadyAI is being built." };
export default function AboutPage() { return _jsxs(_Fragment, { children: [_jsx(PageIntro, { title: site.copy.aboutTitle, text: site.copy.aboutIntro }), _jsx("section", { className: "section", children: _jsxs("div", { className: "container content-narrow", children: [_jsx("h2", { children: "Why it exists" }), _jsx("p", { children: site.copy.aboutWhy }), _jsx("h2", { children: "Our team" }), _jsx("p", { children: site.copy.teamText }), _jsxs("p", { className: "small-note", children: ["Company: ", placeholders.company] })] }) })] }); }
