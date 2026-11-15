import "./globals.css";
import { Shell } from "@/components/Site";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
export const metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "College ReadyAI | Your next step, made clearer", template: "%s | College ReadyAI" },
  description: "An AI study guide for students at every academic level. Get a path, study tools and planning support.",
  openGraph: { title: "College ReadyAI", description: "Your AI study guide for every academic level.", type: "website", images: ["/og-card.svg"] },
  twitter: { card: "summary_large_image", title: "College ReadyAI", description: "Your AI study guide for every academic level.", images: ["/og-card.svg"] },
};

export default function RootLayout({ children }) {
  const jsonLd = { "@context": "https://schema.org", "@type": "Organization", name: "College ReadyAI", url: siteUrl, logo: `${siteUrl}/college-readyai-mark-white.svg` };
  return <html lang="en"><body><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}/><Shell>{children}</Shell></body></html>;
}
