import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import Link from "next/link";
import { PageIntro } from "@/components/Site";
export const metadata = { title: "You're offline", description: "Reconnect to continue using College ReadyAI." };
export default function OfflinePage() { return _jsxs(_Fragment, { children: [_jsx(PageIntro, { title: "You're offline.", text: "Your connection may have dropped. Check it and try again." }), _jsx("section", { className: "section", children: _jsx("div", { className: "container", children: _jsx(Link, { className: "button", href: "/", children: "Go home" }) }) })] }); }
