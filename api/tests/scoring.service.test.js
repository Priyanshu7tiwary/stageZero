import { beforeEach, describe, expect, it, vi } from 'vitest';

const prisma = {
  job: { findUnique: vi.fn() },
  application: { findMany: vi.fn(), update: vi.fn((args) => args) },
  $transaction: vi.fn(async (ops) => ops),
};
const chat = vi.fn();
vi.mock('../src/db.js', () => ({ prisma }));
vi.mock('../src/services/llm.js', () => ({ chat }));

const { scoreApplicants } = await import('../src/services/scoring.service.js');

// 70% skills / 30% experience, 2 required skills, 4 years, top 1 passes.
const JOB = { id: 'job-1', skills: ['React', 'PostgreSQL'], minExperienceYears: 4, skillsWeight: 70, screeningPassCount: 1 };
const app = (id, name, skills, years, referred = false, t = 1) => ({
  id, referred, createdAt: new Date(t), candidate: { fullName: name, skills, experienceYears: years },
});
const asha = app('a', 'Asha', ['React.js', 'Postgres'], 4, false, 1);
const ben = app('b', 'Ben', ['React'], 2, true, 2);

beforeEach(() => {
  vi.clearAllMocks();
  prisma.job.findUnique.mockResolvedValue(JOB);
  prisma.application.findMany.mockResolvedValue([asha, ben]);
});

const aiSays = (candidates) => chat.mockResolvedValue({ content: JSON.stringify({ candidates }) });

describe('scoreApplicants', () => {
  it('uses the AI skill matches, applies the weighting and referral bonus, and passes the top N', async () => {
    aiSays([
      { applicationId: 'a', matchedSkills: ['React', 'PostgreSQL'], summary: 'Has both skills.' },
      { applicationId: 'b', matchedSkills: ['React'], summary: 'Has React only.' },
    ]);

    const ranked = await scoreApplicants('job-1');

    // Asha: skills 100, experience 100 -> 100.  Ben: skills 50*0.7 + experience 50*0.3 = 50, +5 referral -> 55.
    expect(ranked).toEqual([
      { applicationId: 'a', name: 'Asha', score: 100, passed: true, summary: 'Has both skills.' },
      { applicationId: 'b', name: 'Ben', score: 55, passed: false, summary: 'Has React only.' },
    ]);
    expect(prisma.application.update).toHaveBeenCalledWith({
      where: { id: 'a' },
      data: { score: 100, scoreSummary: 'Has both skills.', passedScreening: true },
    });
    // Only candidates still in Applied are scored.
    expect(prisma.application.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { jobId: 'job-1', stage: 'APPLIED' } }));
  });

  it("ignores skills the AI claims that the job doesn't require", async () => {
    aiSays([
      { applicationId: 'a', matchedSkills: ['React', 'Kubernetes'], summary: '' },
      { applicationId: 'b', matchedSkills: [], summary: '' },
    ]);
    const [first] = await scoreApplicants('job-1');
    expect(first.score).toBe(65); // 1 of 2 skills (50) * 0.7 + experience 100 * 0.3
  });

  it('falls back to exact matching if the AI returns something unusable', async () => {
    chat.mockResolvedValue({ content: 'not json' });
    const ranked = await scoreApplicants('job-1');
    // Exact matching: Asha's "React.js"/"Postgres" don't match exactly; Ben's "React" does.
    expect(ranked.find((c) => c.applicationId === 'b').score).toBe(55);
    expect(ranked.find((c) => c.applicationId === 'a').score).toBe(30);
  });

  it('does nothing when nobody is in Applied', async () => {
    prisma.application.findMany.mockResolvedValue([]);
    expect(await scoreApplicants('job-1')).toEqual([]);
    expect(chat).not.toHaveBeenCalled();
  });
});
