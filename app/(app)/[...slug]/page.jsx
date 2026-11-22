import Link from "next/link";

// Anything inside the logged-in area that has no screen yet.
//
// The sidebar links to all eight destinations because that is the shape of the
// product, but only some are built. Without this they fall through to the
// marketing 404, which loads the other stylesheet and tells a signed-in
// student the page does not exist — when the truth is that it is not finished.
//
// A route with its own folder takes precedence over this catch-all, so each
// screen quietly stops being caught here as it lands. Nothing to remove later.

const COMING = {
  advisor: {
    title: "AI Advisor",
    text: "The Advisor is not connected to a model yet. When it is, every answer will be labelled as AI-generated and kept in your account so you can look back at it.",
  },
  study: {
    title: "Study tools",
    text: "Decks, flashcards and uploads. The storage and the limits are in place; the screen that uses them is not built yet.",
  },
  discover: {
    title: "Discover",
    text: "Reading and ideas picked for where you are. Not built yet.",
  },
  profile: {
    title: "Your profile",
    text: "Your goal, your stage and your settings, plus exporting or deleting your data. Not built yet.",
  },
};

export async function generateMetadata({ params }) {
  const { slug } = await params;
  return { title: COMING[slug?.[0]]?.title || "Not here yet" };
}

export default async function NotBuiltYet({ params }) {
  const { slug } = await params;
  const entry = COMING[slug?.[0]];

  return <>
    <div className="topbar"><div className="greeting">
      <h1>{entry?.title || "Not here yet"}</h1>
      <p>{entry?.text || "There is no screen at this address."}</p>
    </div></div>

    <div className="card">
      <p>In the meantime:</p>
      <ul className="check-list">
        <li><Link href="/dashboard">Your week</Link></li>
        <li><Link href="/exams">Practice questions</Link></li>
        <li><Link href="/scholarships">Scholarships</Link></li>
        <li><Link href="/universities">Universities</Link></li>
      </ul>
    </div>
  </>;
}
