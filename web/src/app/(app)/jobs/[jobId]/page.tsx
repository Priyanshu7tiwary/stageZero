import { Suspense } from "react";
import { JobDetail, JobDetailSkeleton } from "@/components/job/JobDetail";

// The job id is only known at request time, so it is read inside a Suspense
// boundary (required with cacheComponents). Data is fetched client-side so
// stage changes update without a reload.
export default function JobPage({ params }: PageProps<"/jobs/[jobId]">) {
  return (
    <Suspense fallback={<JobDetailSkeleton />}>
      <JobDetailForParams params={params} />
    </Suspense>
  );
}

async function JobDetailForParams({ params }: { params: PageProps<"/jobs/[jobId]">["params"] }) {
  const { jobId } = await params;
  return <JobDetail jobId={jobId} />;
}
