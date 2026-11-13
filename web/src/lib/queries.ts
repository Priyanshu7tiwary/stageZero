"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "./api";
import type {
  AddCandidateInput,
  ApplicationFilters,
  CreateJobInput,
  Stage,
} from "./types";

export const queryKeys = {
  dashboard: ["dashboard"] as const,
  jobs: ["jobs"] as const,
  job: (jobId: string) => ["jobs", jobId] as const,
  applications: (jobId: string) => ["applications", jobId] as const,
  applicationList: (jobId: string, filters: ApplicationFilters) =>
    ["applications", jobId, filters] as const,
};

export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: ({ signal }) => api.getDashboard(signal),
  });
}

export function useJobs() {
  return useQuery({
    queryKey: queryKeys.jobs,
    queryFn: ({ signal }) => api.listJobs(signal),
  });
}

export function useJob(jobId: string) {
  return useQuery({
    queryKey: queryKeys.job(jobId),
    queryFn: ({ signal }) => api.getJob(jobId, signal),
  });
}

export function useApplications(jobId: string, filters: ApplicationFilters) {
  return useQuery({
    queryKey: queryKeys.applicationList(jobId, filters),
    queryFn: ({ signal }) => api.listApplications(jobId, filters, signal),
    // Keep the board on screen while a new search/filter result loads.
    placeholderData: keepPreviousData,
  });
}

export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateJobInput) => api.createJob(input),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.jobs }),
        qc.invalidateQueries({ queryKey: queryKeys.dashboard }),
      ]),
  });
}

/** Invalidate everything that shows application data for a job. */
export function useInvalidateJob(jobId: string) {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.applications(jobId) }),
      // Job list, job detail and dashboard all show application counts.
      qc.invalidateQueries({ queryKey: queryKeys.jobs }),
      qc.invalidateQueries({ queryKey: queryKeys.dashboard }),
    ]);
}

export function useAddCandidate(jobId: string) {
  const invalidate = useInvalidateJob(jobId);
  return useMutation({
    mutationFn: (input: AddCandidateInput) => api.addCandidate(jobId, input),
    onSuccess: invalidate,
  });
}

export function useMoveStage(jobId: string) {
  const invalidate = useInvalidateJob(jobId);
  return useMutation({
    mutationFn: ({
      applicationId,
      stage,
    }: {
      applicationId: string;
      stage: Stage;
    }) => api.moveStage(applicationId, stage),
    onSettled: invalidate,
  });
}


