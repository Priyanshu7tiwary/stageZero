import { NewJobPage } from "@/components/jobs/NewJobPage";

// Rendered behind the client-side AuthGate; see jobs/[jobId]/page.tsx.
export const instant = false;

export default function NewJob() {
  return <NewJobPage />;
}
