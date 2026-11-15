import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { PageIntro } from "@/components/Site";
import { AccountForm } from "@/components/AccountForm";
import { site } from "@/content/site";
export const metadata = { title: "Log in", description: "Log in to College ReadyAI." };
export default function LoginPage() { return _jsxs(_Fragment, { children: [_jsx(PageIntro, { title: site.copy.loginTitle, text: "Your study plan is waiting for you." }), _jsx("section", { className: "section", children: _jsx("div", { className: "container account-wrap", children: _jsx(AccountForm, { mode: "login" }) }) })] }); }
