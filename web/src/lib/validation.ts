import { z } from "zod";
import { todayISO } from "./dates";
import { JOB_STATUSES } from "./types";

/**
 * Client-side validation for fast feedback. The API validates the same
 * fields again and its errors are shown too, so these never need to be
 * the only line of defence.
 *
 * Number inputs hold strings in form state; these schemas turn them into
 * numbers so an empty box reads "required" rather than silently becoming 0.
 */

function numberField(label: string, opts: { min: number; max: number; integer?: boolean }) {
  // z.number() rejects NaN, so "abc" gets the "must be a number" message.
  let n = z.number({ error: `${label} must be a number` });
  if (opts.integer) n = n.int(`${label} must be a whole number`);
  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .transform(Number)
    .pipe(
      n
        .min(opts.min, `${label} must be at least ${opts.min}`)
        .max(opts.max, `${label} must be ${opts.max} or less`),
    );
}

const skill = z.string().trim().min(1).max(40, "Each skill must be 40 characters or fewer");

export const createJobSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(120, "Title must be 120 characters or fewer"),
  location: z
    .string()
    .trim()
    .min(1, "Location is required")
    .max(120, "Location must be 120 characters or fewer"),
  status: z.enum(JOB_STATUSES),
  skills: z.array(skill).min(1, "Add at least one required skill").max(20, "Add 20 skills at most"),
  minExperienceYears: numberField("Experience", { min: 0, max: 50, integer: true }),
  skillsWeight: z.number().int().min(0).max(100),
  closingDate: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Enter a valid date")
    .refine((v) => v === "" || v >= todayISO(), "Closing date can't be in the past")
    .transform((v) => v || null),
});

export const addCandidateSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Full name is required")
    .max(120, "Full name must be 120 characters or fewer"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .pipe(z.email("Enter a valid email address")),
  phone: z
    .string()
    .trim()
    .max(30, "Phone must be 30 characters or fewer")
    .regex(/^[+\d\s().-]*$/, "Phone can contain digits, spaces and + ( ) - .")
    .optional()
    .transform((v) => (v ? v : undefined)),
  skills: z.array(skill).max(30, "Add 30 skills at most"),
  experienceYears: numberField("Experience", { min: 0, max: 60 }),
});

/** Map a zod error to `{ field: firstMessage }` for inline form errors. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
