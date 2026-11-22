import { HomeView } from "@/components/app/HomeView";

export const metadata = {
  title: "Home",
  description: "Your week, your goal and what to do next.",
};

// The page is a server component and the screen is a client one, as on every
// route in this group: the shell owns the chrome and the screen owns the data.
export default function DashboardPage() {
  return <HomeView/>;
}
