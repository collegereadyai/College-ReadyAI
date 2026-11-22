import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { PageIntro, SimpleForm } from "@/components/Site";
import { site, placeholders } from "@/content/site";
export const metadata = { title: "Contact", description: "Get in touch with College ReadyAI." };
export default function ContactPage() { return _jsxs(_Fragment, { children: [_jsx(PageIntro, { title: site.copy.contactTitle, text: site.copy.contactIntro }), _jsx("section", { className: "section", children: _jsxs("div", { className: "container two-col", children: [_jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "College ReadyAI" }), _jsx("p", { children: placeholders.company }), _jsx("p", { children: placeholders.address }), _jsx("p", { children: placeholders.email }), _jsx("p", { children: placeholders.phone })] }), _jsx(SimpleForm, { kind: "contact" })] }) })] }); }
