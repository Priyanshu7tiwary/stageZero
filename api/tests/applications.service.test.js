import { beforeEach, describe, expect, it, vi } from 'vitest';

// Replace the real database with a fake, so these tests need no Postgres.
const prisma = { application: { findUnique: vi.fn(), updateMany: vi.fn() } };
vi.mock('../src/db.js', () => ({ prisma }));

const { moveStage } = await import('../src/services/applications.service.js');

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
