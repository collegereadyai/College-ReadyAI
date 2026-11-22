import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Link from "next/link";
export default function NotFound() { return _jsx("section", { className: "page-intro", children: _jsxs("div", { className: "container", children: [_jsx("p", { className: "eyebrow", children: "404" }), _jsx("h1", { children: "We can't find that page." }), _jsx("p", { className: "lead", children: "Let's get you back to a clear next step." }), _jsx(Link, { className: "button", href: "/", children: "Go home" })] }) }); }
