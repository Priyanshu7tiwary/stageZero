"use client";

import { useState, type FormEvent } from "react";
import { ApiError, bannerError } from "@/lib/api";
import { useAddCandidate } from "@/lib/queries";
import { addCandidateSchema, fieldErrors } from "@/lib/validation";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Alert } from "@/components/ui/States";
import { TagInput } from "@/components/ui/TagInput";

type Values = {
  fullName: string;
  email: string;
  phone: string;
  skills: string[];
  /** String until validated, so an empty box reads "required". */
  experienceYears: string;
};
const EMPTY: Values = { fullName: "", email: "", phone: "", skills: [], experienceYears: "" };

export function AddCandidateForm({ jobId, onDone }: { jobId: string; onDone: () => void }) {
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [added, setAdded] = useState<string | null>(null);
  const addCandidate = useAddCandidate(jobId);

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setAdded(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = addCandidateSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    try {
      const app = await addCandidate.mutateAsync(parsed.data);
      setValues(EMPTY);
      setAdded(app.candidate.fullName);
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fields);
    }
  }

  const serverError = bannerError(addCandidate.error);

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4 sm:p-5"
    >
      <div>
        <h2 className="text-sm font-semibold">Add candidate</h2>
        <p className="text-xs text-zinc-500">
          If the email already belongs to a candidate, their existing profile is reused and
          updated with these skills and experience.
        </p>
      </div>
      {serverError && <Alert>{serverError}</Alert>}
      {added && (
        <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {added} was added to Applied.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          label="Full name"
          placeholder="Priya Sharma"
          autoComplete="off"
          value={values.fullName}
          onChange={(e) => set("fullName", e.target.value)}
          error={errors.fullName}
          autoFocus
        />
        <TextField
          label="Email"
          type="email"
          placeholder="priya@example.com"
          autoComplete="off"
          value={values.email}
          onChange={(e) => set("email", e.target.value)}
          error={errors.email}
        />
        <TextField
          label="Phone"
          hint="(optional)"
          type="tel"
          placeholder="+91 98765 43210"
          autoComplete="off"
          value={values.phone}
          onChange={(e) => set("phone", e.target.value)}
          error={errors.phone}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <TagInput
          label="Skills"
          placeholder="e.g. React, SQL"
          values={values.skills}
          onChange={(skills) => set("skills", skills)}
          error={errors.skills}
        />
        <TextField
          label="Total experience"
          hint="(years)"
          type="number"
          inputMode="decimal"
          min={0}
          max={60}
          step={0.5}
          placeholder="4"
          value={values.experienceYears}
          onChange={(e) => set("experienceYears", e.target.value)}
          error={errors.experienceYears}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone} disabled={addCandidate.isPending}>
          Close
        </Button>
        <Button type="submit" loading={addCandidate.isPending}>
          Add to job
        </Button>
      </div>
    </form>
  );
}
