import { beforeEach, describe, expect, it, vi } from 'vitest';

// Fake database, fake LLM and fake scoring: no Postgres, no Groq key, no cost.
const prisma = {
  job: { findUnique: vi.fn() },
  application: { findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
};
const chat = vi.fn();
const scoreApplicants = vi.fn();
vi.mock('../src/db.js', () => ({ prisma }));
vi.mock('../src/services/llm.js', () => ({ chat }));
vi.mock('../src/services/scoring.service.js', () => ({ scoreApplicants }));

const { askCopilot } = await import('../src/services/copilot.service.js');

const JOB = { id: 'job-1', title: 'Backend Engineer', location: 'Pune', status: 'OPEN', skills: ['Node.js'], minExperienceYears: 2, skillsWeight: 50, screeningPassCount: 2 };
const app = (id, name, stage) => ({ id, jobId: 'job-1', stage, referred: false, score: null, candidate: { fullName: name, skills: ['Node.js'], experienceYears: 3 } });
const priya = app('app-1', 'Priya Sharma', 'SCREENING');
const kabir = app('app-2', 'Kabir Rao', 'APPLIED');
const neha = app('app-3', 'Neha Gupta', 'HIRED');
const byId = { 'app-1': priya, 'app-2': kabir, 'app-3': neha };

// What the model "says" on each turn.
const callTool = (name, args) => ({ content: '', tool_calls: [{ id: `call-${name}`, type: 'function', function: { name, arguments: JSON.stringify(args) } }] });
const say = (text) => ({ content: text, tool_calls: [] });
// The tool result the copilot sent back to the model.
const toolResult = () => chat.mock.calls[1][0].messages.find((m) => m.role === 'tool').content;

beforeEach(() => {
  vi.resetAllMocks();
  prisma.job.findUnique.mockResolvedValue(JOB);
  prisma.application.findMany.mockResolvedValue([priya, kabir, neha]);
  prisma.application.findFirst.mockImplementation(async ({ where }) => (where.jobId === 'job-1' ? byId[where.id] ?? null : null));
});

describe('copilot', () => {
  it("answers from the job's data, sent along with the question", async () => {
    chat.mockResolvedValueOnce(say('Priya Sharma is in Screening.'));
    const res = await askCopilot('job-1', { question: 'Who is in Screening?', history: [] });
    expect(res).toEqual({ answer: 'Priya Sharma is in Screening.', pendingActions: [] });
    expect(chat.mock.calls[0][0].messages[0].content).toContain('Priya Sharma');
  });

  it('list_applications only reads this job, filtered by stage', async () => {
    chat.mockResolvedValueOnce(callTool('list_applications', { stage: 'APPLIED' })).mockResolvedValueOnce(say('Kabir Rao.'));
    await askCopilot('job-1', { question: 'Who applied?', history: [] });
    expect(prisma.application.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: { jobId: 'job-1', stage: 'APPLIED' } }));
  });

  it('move_stage proposes allowed moves for several candidates and never writes', async () => {
    chat
      .mockResolvedValueOnce(callTool('move_stage', { application_ids: ['app-1', 'app-3'], to_stage: 'INTERVIEW' }))
      .mockResolvedValueOnce(say('Priya can move to Interview once you confirm. Neha is already hired.'));

    const res = await askCopilot('job-1', { question: 'Move Priya and Neha to Interview', history: [] });

    expect(res.pendingActions).toEqual([
      { tool: 'move_stage', applicationId: 'app-1', candidateName: 'Priya Sharma', fromStage: 'SCREENING', toStage: 'INTERVIEW', score: null },
    ]);
    expect(toolResult()).toMatch(/Neha Gupta: not allowed\. .*Hired is a final stage/);
    expect(toolResult()).toMatch(/NOT moved yet/);
    expect(prisma.application.update).not.toHaveBeenCalled();
    expect(prisma.application.updateMany).not.toHaveBeenCalled();
  });

  it("can't propose moves for another job's applications", async () => {
    chat.mockResolvedValueOnce(callTool('move_stage', { application_ids: ['other'], to_stage: 'REJECTED' })).mockResolvedValueOnce(say('Not found.'));
    const res = await askCopilot('job-1', { question: 'Reject them', history: [] });
    expect(res.pendingActions).toEqual([]);
    expect(toolResult()).toMatch(/no application with that id on this job/);
  });

  it('auto_score scores, then proposes moving only those who passed to Screening', async () => {
    scoreApplicants.mockResolvedValue([
      { applicationId: 'app-2', name: 'Kabir Rao', score: 88, passed: true, summary: 'Has Node.js.' },
      { applicationId: 'app-9', name: 'Someone', score: 20, passed: false, summary: 'Lacks Node.js.' },
    ]);
    chat.mockResolvedValueOnce(callTool('auto_score', {})).mockResolvedValueOnce(say('Kabir scored 88 and passed. Confirm to move him to Screening.'));

    const res = await askCopilot('job-1', { question: 'Score the applicants and move the top ones', history: [] });

    expect(scoreApplicants).toHaveBeenCalledWith('job-1');
    expect(res.pendingActions).toEqual([
      { tool: 'move_stage', applicationId: 'app-2', candidateName: 'Kabir Rao', fromStage: 'APPLIED', toStage: 'SCREENING', score: null },
    ]);
    expect(JSON.parse(toolResult()).scores).toHaveLength(2);
  });
});
