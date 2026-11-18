import { PageIntro } from "@/components/Site";
import { DashboardView } from "@/components/DashboardView";

export const metadata = {
  title: "Dashboard",
  description: "Your stage, your goal and what to do next.",
  robots: { index: false, follow: false },
};

export default function DashboardPage() {
  return <>
    <PageIntro
      title="Your dashboard"
      text="Where you are, what you are working towards, and what to do next."
    />
    <section className="section">
      <div className="container content-narrow">
        <DashboardView/>
      </div>
    </section>
  </>;
}
