import "./dashboard.css";
import { AppShell } from "@/components/app/AppShell";

// A second root layout, not a nested one. The logged-in area and the public
// site have separate stylesheets that genuinely conflict: the dashboard's CSS
// styles bare `body`, `a`, `button`, `h1`–`h4`, `p` and `input`, and its
// `--blue` is #0050D6 against the marketing site's #1F4DFF. Loading both on
// one page would mean one of them losing.
//
// Route groups with their own <html>/<body> keep them apart, so neither needs
// defensive scoping. The cost is a full page load when crossing between the
// two areas, which happens at the login boundary anyway.

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "College ReadyAI", template: "%s | College ReadyAI" },
  // Nothing in here should turn up in a search result.
  robots: { index: false, follow: false },
};

export default function AppAreaLayout({ children }) {
  return <html lang="en"><body><AppShell>{children}</AppShell></body></html>;
}
