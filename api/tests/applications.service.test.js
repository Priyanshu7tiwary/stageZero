import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Prisma } from '@prisma/client';

// Replace the real database with a fake, so these tests need no Postgres.
const prisma = {
  job: { findUnique: vi.fn() },
  candidate: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  application: { findUnique: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
  // The fake transaction just runs the callback with the same fake client.
  $transaction: vi.fn((fn) => fn(prisma)),
};
vi.mock('../src/db.js', () => ({ prisma }));

const { moveStage, addCandidate } = await import('../src/services/applications.service.js');

const row = (stage) => ({
  id: 'app-1',
  jobId: 'job-1',
  stage,
  referred: false,
  createdAt: new Date('2026-11-01'),
  updatedAt: new Date('2026-11-01'),
  candidate: { id: 'c-1', fullName: 'Priya Sharma', email: 'priya@example.com', phone: null, skills: [], experienceYears: 3 },
});

describe('moveStage', () => {
  beforeEach(() => vi.resetAllMocks());

  it('saves an allowed move, only if the stage is still the one we checked', async () => {
    prisma.application.findUnique.mockResolvedValueOnce(row('INTERVIEW')).mockResolvedValueOnce(row('OFFER'));
    prisma.application.updateMany.mockResolvedValue({ count: 1 });

    const moved = await moveStage('app-1', 'OFFER');

    expect(moved.stage).toBe('OFFER');
    expect(moved.allowedNextStages).toEqual(['HIRED', 'REJECTED']);
    expect(prisma.application.updateMany).toHaveBeenCalledWith({
      where: { id: 'app-1', stage: 'INTERVIEW' },
      data: { stage: 'OFFER' },
    });
  });

  it('refuses a move the rules do not allow, with 409, and never writes', async () => {
    prisma.application.findUnique.mockResolvedValue(row('APPLIED'));

    await expect(moveStage('app-1', 'HIRED')).rejects.toMatchObject({ status: 409, code: 'INVALID_TRANSITION' });
    expect(prisma.application.updateMany).not.toHaveBeenCalled();
  });

  it('refuses any move out of a final stage', async () => {
    prisma.application.findUnique.mockResolvedValue(row('REJECTED'));
    await expect(moveStage('app-1', 'INTERVIEW')).rejects.toMatchObject({ status: 409 });
  });

  it('reports 409 if someone else moved it first', async () => {
    prisma.application.findUnique.mockResolvedValue(row('SCREENING'));
    prisma.application.updateMany.mockResolvedValue({ count: 0 });
    await expect(moveStage('app-1', 'INTERVIEW')).rejects.toMatchObject({ status: 409, code: 'STAGE_CHANGED' });
  });

  it('returns 404 for an unknown application', async () => {
    prisma.application.findUnique.mockResolvedValue(null);
    await expect(moveStage('nope', 'SCREENING')).rejects.toMatchObject({ status: 404 });
  });
});

// The error Prisma throws when a unique index rejects an insert.
const uniqueError = (modelName, target) =>
  new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test', meta: { modelName, target } });

describe('addCandidate', () => {
  const job = { id: 'job-2', status: 'OPEN', closingDate: null };
  const input = { fullName: 'Asha Verma', email: 'asha@example.com', phone: null, skills: [], experienceYears: 0, referred: false };
  const asha = { id: 'c-1', fullName: 'Asha Verma', email: 'asha@example.com', phone: null, skills: ['SQL', 'Python'], experienceYears: 5 };
  const created = (candidate) => ({ ...row('APPLIED'), jobId: 'job-2', candidate });

  beforeEach(() => {
    vi.resetAllMocks();
    prisma.$transaction.mockImplementation((fn) => fn(prisma));
    prisma.job.findUnique.mockResolvedValue(job);
  });

  it("merges an existing candidate's profile instead of wiping it", async () => {
    prisma.candidate.findUnique.mockResolvedValue(asha);
    prisma.application.findUnique.mockResolvedValue(null);
    prisma.candidate.update.mockImplementation(async ({ data }) => ({ ...asha, ...data }));
    prisma.application.create.mockImplementation(async () => created({ ...asha }));

    await addCandidate('job-2', input);

    expect(prisma.candidate.update).toHaveBeenCalledWith({
      where: { id: 'c-1' },
      data: { skills: ['SQL', 'Python'], experienceYears: 5, phone: null },
    });
  });

  it('retries when another request created the same new candidate a moment earlier', async () => {
    // Attempt 1: nobody has this email yet, but creating it loses the race.
    // Attempt 2: the candidate now exists and is reused.
    prisma.candidate.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(asha);
    prisma.candidate.create.mockRejectedValueOnce(uniqueError('Candidate', ['email']));
    prisma.application.findUnique.mockResolvedValue(null);
    prisma.candidate.update.mockImplementation(async ({ data }) => ({ ...asha, ...data }));
    prisma.application.create.mockImplementation(async () => created(asha));

    const app = await addCandidate('job-2', input);

    expect(app.candidate.email).toBe('asha@example.com');
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(prisma.application.create).toHaveBeenCalledTimes(1);
  });

  it('still answers 409 ALREADY_APPLIED when the same person hits the same job twice at once', async () => {
    prisma.candidate.findUnique.mockResolvedValue(asha);
    prisma.application.findUnique.mockResolvedValue(null);
    prisma.candidate.update.mockResolvedValue(asha);
    prisma.application.create.mockRejectedValue(uniqueError('Application', ['jobId', 'candidateId']));

    await expect(addCandidate('job-2', input)).rejects.toMatchObject({ status: 409, code: 'ALREADY_APPLIED' });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
