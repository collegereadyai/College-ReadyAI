import { PageIntro } from "@/components/Site";
import { AuthCallback } from "@/components/AuthCallback";

export const metadata = {
  title: "Signing you in",
  robots: { index: false, follow: false },
};

export default function AuthCallbackPage() {
  return <>
    <PageIntro title="Signing you in" text="One moment while we finish with Google."/>
    <section className="section">
      <div className="container content-narrow">
        <AuthCallback/>
      </div>
    </section>
  </>;
}
