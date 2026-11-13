"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { ApiError, bannerError } from "@/lib/api";
import { todayISO } from "@/lib/dates";
import { useCreateJob } from "@/lib/queries";
import type { Job, JobStatus } from "@/lib/types";
import { createJobSchema, fieldErrors } from "@/lib/validation";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { Alert } from "@/components/ui/States";
import { TagInput } from "@/components/ui/TagInput";
import { WeightSlider } from "./WeightSlider";

/** Form state: number inputs stay strings until validation. */
interface Values {
  title: string;
  location: string;
  status: JobStatus;
  skills: string[];
  minExperienceYears: string;
  skillsWeight: number;
  closingDate: string;
  screeningPassCount: string;
}

const EMPTY: Values = {
  title: "",
  location: "",
  status: "OPEN",
  skills: [],
  minExperienceYears: "",
  skillsWeight: 60,
  closingDate: "",
  screeningPassCount: "5",
};

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4 border-t border-zinc-200 pt-5 first:border-t-0 first:pt-0">
      <div>
        <legend className="text-sm font-semibold text-zinc-900">{title}</legend>
        {description && <p className="text-xs text-zinc-500">{description}</p>}
      </div>
      {children}
    </fieldset>
  );
}

export function CreateJobForm({
  onCreated,
  onCancel,
}: {
  onCreated: (job: Job) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const createJob = useCreateJob();

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = createJobSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    try {
      const job = await createJob.mutateAsync(parsed.data);
      setValues(EMPTY);
      onCreated(job);
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fields);
    }
  }

  const serverError = bannerError(createJob.error);

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="space-y-5 rounded-lg border border-zinc-200 bg-white p-5 sm:p-6"
    >
      {serverError && <Alert>{serverError}</Alert>}

      <Section title="Role">
        <TextField
          label="Title"
          placeholder="Backend Engineer"
          value={values.title}
          onChange={(e) => set("title", e.target.value)}
          error={errors.title}
          autoFocus
        />
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <TextField
            label="Location"
            placeholder="Bengaluru / Remote"
            value={values.location}
            onChange={(e) => set("location", e.target.value)}
            error={errors.location}
          />
          <SelectField
            label="Status"
            value={values.status}
            onChange={(e) => set("status", e.target.value as JobStatus)}
            error={errors.status}
          >
            <option value="OPEN">Open</option>
            <option value="CLOSED">Closed</option>
          </SelectField>
        </div>
      </Section>

      <Section title="Requirements" description="What the AI screening checks candidates against.">
        <TagInput
          label="Skills required"
          placeholder="e.g. Node.js, PostgreSQL, TypeScript"
          values={values.skills}
          onChange={(skills) => set("skills", skills)}
          error={errors.skills}
        />
        <div className="sm:w-1/2">
          <TextField
            label="Total experience required"
            hint="(years)"
            type="number"
            inputMode="numeric"
            min={0}
            max={50}
            placeholder="3"
            value={values.minExperienceYears}
            onChange={(e) => set("minExperienceYears", e.target.value)}
            error={errors.minExperienceYears}
          />
        </div>
      </Section>

      <Section title="AI screening" description="How candidates in Applied are scored and how many go through.">
        <WeightSlider skillsWeight={values.skillsWeight} onChange={(w) => set("skillsWeight", w)} />
        <div className="sm:w-1/2">
          <TextField
            label="Candidates who pass screening"
            hint="(top scores)"
            type="number"
            inputMode="numeric"
            min={1}
            max={500}
            value={values.screeningPassCount}
            onChange={(e) => set("screeningPassCount", e.target.value)}
            error={errors.screeningPassCount}
          />
        </div>
      </Section>

      <Section title="Applications">
        <div className="sm:w-1/2">
          <TextField
            label="Closing date"
            hint="(optional)"
            type="date"
            min={todayISO()}
            value={values.closingDate}
            onChange={(e) => set("closingDate", e.target.value)}
            error={errors.closingDate}
          />
        </div>
        <p className="-mt-2 text-xs text-zinc-500">
          Applications are accepted until the end of this day. Leave empty to keep the job open until you close it.
        </p>
      </Section>

      <div className="flex justify-end gap-2 border-t border-zinc-200 pt-5">
        <Button variant="ghost" onClick={onCancel} disabled={createJob.isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={createJob.isPending}>
          Create job
        </Button>
      </div>
    </form>
  );
}
