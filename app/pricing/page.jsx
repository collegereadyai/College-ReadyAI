import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { PricingGrid, PricingWaitlist } from "@/components/Pricing";
import { PageIntro } from "@/components/Site";
export const metadata = { title: "Pricing", description: "Compare Free, Plus, Pro and Institution plans in naira." };
export default function PricingPage() { return _jsxs(_Fragment, { children: [_jsx(PageIntro, { title: "Simple plans, clear limits.", text: "Start free. Paid plans are not live yet. Choose a billing period to compare the listed prices." }), _jsx("section", { className: "section", children: _jsxs("div", { className: "container", children: [_jsx(PricingGrid, {}), _jsx("p", { className: "small-note", children: "Exam reminders are included on every plan. Pro includes Priority AI responses and the Textbook Library, coming soon and subject to content licensing. Institution pricing is custom for schools." }), _jsx(PricingWaitlist, {})] }) })] }); }
