"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreateJobForm } from "./CreateJobForm";

export function NewJobPage() {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Link href="/jobs" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← All jobs
        </Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">Create job</h1>
        <p className="text-sm text-zinc-500">
          Open a new role. Candidates can apply while it&apos;s open.
        </p>
      </div>
      <CreateJobForm
        // Take the recruiter straight to the new job's pipeline.
        onCreated={(job) => router.push(`/jobs/${job.id}`)}
        onCancel={() => router.push("/jobs")}
      />
    </div>
  );
}
