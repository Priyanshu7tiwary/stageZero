// What each request is allowed to contain. Used by validate() in the routes.
import { z } from 'zod';
import { STAGES } from './lib/stages.js';

const requiredText = (label, max) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be ${max} characters or fewer`);

const email = z
  .string({ error: 'Email is required' })
  .trim()
  .min(1, 'Email is required')
  .pipe(z.email('Enter a valid email address'))
  .transform((e) => e.toLowerCase());

// Trimmed, no blanks, no duplicates (case-insensitive).
const skills = (max) =>
  z
    .array(z.string().trim().max(40, 'Each skill must be 40 characters or fewer'), { error: 'Skills must be a list' })
    .transform((list) => {
      const seen = new Set();
      return list.filter((skill) => skill && !seen.has(skill.toLowerCase()) && seen.add(skill.toLowerCase()));
    })
    .pipe(z.array(z.string()).max(max, `Add ${max} skills at most`));

const wholeNumber = (label, min, max) =>
  z
    .number({ error: `${label} must be a number` })
    .int(`${label} must be a whole number`)
    .min(min, `${label} must be at least ${min}`)
    .max(max, `${label} must be ${max} or less`);

// "YYYY-MM-DD" that is a real date (rejects 2026-02-30).
const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD')
  .refine((s) => new Date(`${s}T00:00:00Z`).toISOString().startsWith(s), 'Enter a valid date');

const stage = z.enum(STAGES, { error: `Stage must be one of ${STAGES.join(', ')}` });

export const createJobSchema = z.object({
  title: requiredText('Title', 120),
  location: requiredText('Location', 120),
  status: z.enum(['OPEN', 'CLOSED'], { error: 'Status must be OPEN or CLOSED' }).default('OPEN'),
  skills: skills(20).refine((list) => list.length > 0, 'Add at least one required skill'),
  minExperienceYears: wholeNumber('Experience', 0, 50),
  // 0–100: how much skills count against experience (experience gets the rest).
  skillsWeight: wholeNumber('Skills weight', 0, 100).default(50),
  // How many top-scoring Applied candidates pass auto-scoring.
  screeningPassCount: wholeNumber('Number of candidates', 1, 100).default(2),
  closingDate: calendarDate.nullable().default(null),
});

export const addCandidateSchema = z.object({
  fullName: requiredText('Full name', 120),
  email,
  phone: z
    .string()
    .trim()
    .max(30, 'Phone must be 30 characters or fewer')
    .regex(/^[+\d\s().-]*$/, 'Phone can contain digits, spaces and + ( ) - .')
    .nullish()
    .transform((p) => p || null),
  skills: skills(30).default([]),
  experienceYears: z
    .number({ error: 'Experience must be a number' })
    .min(0, 'Experience must be at least 0')
    .max(60, 'Experience must be 60 or less'),
  // The referral flow isn't built yet; the API accepts the flag so it can be set directly.
  referred: z.boolean().default(false),
});

export const moveStageSchema = z.object({ stage });

export const listApplicationsSchema = z.object({
  stage: stage.optional(),
  search: z.string().trim().max(100, 'Search must be 100 characters or fewer').optional(),
});

export const copilotSchema = z.object({
  question: requiredText('Question', 1000),
  // Earlier turns, so follow-up questions have context.
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(8000) }))
    .max(20)
    .default([]),
});
