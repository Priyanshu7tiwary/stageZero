import { describe, expect, it } from 'vitest';
import { createJobSchema } from '../src/schemas.js';

const job = { title: 'Backend Engineer', location: 'Pune', skills: ['Node.js'], minExperienceYears: 2 };

describe('create job: skills weight', () => {
  it('defaults to 50 when not sent', () => {
    expect(createJobSchema.parse(job).skillsWeight).toBe(50);
  });

  it('accepts whole numbers from 0 to 100', () => {
    expect(createJobSchema.parse({ ...job, skillsWeight: 0 }).skillsWeight).toBe(0);
    expect(createJobSchema.parse({ ...job, skillsWeight: 70 }).skillsWeight).toBe(70);
    expect(createJobSchema.parse({ ...job, skillsWeight: 100 }).skillsWeight).toBe(100);
  });

  it('rejects values outside 0–100 or with decimals', () => {
    for (const skillsWeight of [-1, 101, 55.5, '60']) {
      expect(createJobSchema.safeParse({ ...job, skillsWeight }).success).toBe(false);
    }
  });
});
