import { PageIntro } from "@/components/Site";
import { WelcomeForm } from "@/components/WelcomeForm";

export const metadata = {
  title: "Finish setting up",
  robots: { index: false, follow: false },
};

export default function WelcomePage() {
  return <>
    <PageIntro
      title="Finish setting up"
      text="Google told us your email address. The rest is up to you."
    />
    <section className="section">
      <div className="container account-wrap">
        <WelcomeForm/>
      </div>
    </section>
  </>;
}
