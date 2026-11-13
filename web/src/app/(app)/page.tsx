import { DashboardPage } from "@/components/dashboard/DashboardPage";

// Rendered behind the client-side AuthGate; see jobs/[jobId]/page.tsx.
export const instant = false;

export default function Home() {
  return <DashboardPage />;
}
