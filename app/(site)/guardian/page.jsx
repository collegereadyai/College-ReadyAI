import { PageIntro } from "@/components/Site";
import { GuardianDecision } from "@/components/GuardianDecision";

export const metadata = {
  title: "Guardian approval",
  description: "Approve or decline a student's request to use College ReadyAI.",
  robots: { index: false, follow: false },
};

// Where the approval link in a guardian's email lands.
export default function GuardianPage() {
  return <>
    <PageIntro
      title="A student has asked for your approval"
      text="They gave your address as their parent or guardian. Their account is locked and nothing opens until you answer."
    />
    <section className="section">
      <div className="container content-narrow">
        <GuardianDecision/>
      </div>
    </section>
  </>;
}
