import { JobsPage } from "@/components/jobs/JobsPage";

// Rendered behind the client-side AuthGate; see jobs/[jobId]/page.tsx.
export const instant = false;

export default function Jobs() {
  return <JobsPage />;
}
