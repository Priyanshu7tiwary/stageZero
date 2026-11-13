import { Suspense } from "react";
import { NewJobPage } from "@/components/jobs/NewJobPage";

// The form uses today's date (the earliest allowed closing date), which
// changes daily, so it renders per visit inside Suspense instead of being
// frozen into the prerendered page.
export default function NewJob() {
  return (
    <Suspense>
      <NewJobPage />
    </Suspense>
  );
}
