import { PageIntro } from "@/components/Site";
import { AccountForm } from "@/components/AccountForm";
import { site } from "@/content/site";
export const metadata = { title: "Start free", description: "Create a College ReadyAI account." };
export default async function SignupPage({ searchParams }) {
  const { stage = "" } = await searchParams;
  return <><PageIntro title={site.copy.signupTitle} text="Tell us where you are. We'll start with five short questions."/><section className="section"><div className="container account-wrap"><AccountForm mode="signup" stage={Array.isArray(stage) ? stage[0] : stage}/></div></section></>;
}
