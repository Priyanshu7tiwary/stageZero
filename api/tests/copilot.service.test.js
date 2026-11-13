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

  it('move_stage proposes Applied -> Screening for several candidates and never writes', async () => {
    const sara = app('app-4', 'Sara Khan', 'APPLIED');
    byId['app-4'] = sara;
    chat
      .mockResolvedValueOnce(callTool('move_stage', { application_ids: ['app-2', 'app-4'], to_stage: 'SCREENING' }))
      .mockResolvedValueOnce(say('Kabir and Sara can move to Screening once you confirm.'));

    const res = await askCopilot('job-1', { question: 'Move Kabir and Sara to Screening', history: [] });

    expect(res.pendingActions.map((a) => [a.candidateName, a.fromStage, a.toStage])).toEqual([
      ['Kabir Rao', 'APPLIED', 'SCREENING'],
      ['Sara Khan', 'APPLIED', 'SCREENING'],
    ]);
    expect(toolResult()).toMatch(/NOT moved yet/);
    expect(prisma.application.update).not.toHaveBeenCalled();
    expect(prisma.application.updateMany).not.toHaveBeenCalled();
  });

  // Even if the AI ignores its instructions and asks, the code refuses.
  it.each([
    ['Screening -> Interview', 'app-1', 'INTERVIEW'],
    ['Applied -> Rejected', 'app-2', 'REJECTED'],
    ['Applied -> Interview (skipping a stage)', 'app-2', 'INTERVIEW'],
    ['Hired -> anything', 'app-3', 'SCREENING'],
  ])('refuses %s even when the AI asks for it', async (_label, id, toStage) => {
    chat.mockResolvedValueOnce(callTool('move_stage', { application_ids: [id], to_stage: toStage })).mockResolvedValueOnce(say('Not allowed.'));

    const res = await askCopilot('job-1', { question: 'move them', history: [] });

    expect(res.pendingActions).toEqual([]);
    expect(toolResult()).toMatch(/not allowed\. The assistant can only move candidates from Applied to Screening/);
  });

  it('tells the AI it may only move Applied -> Screening', async () => {
    chat.mockResolvedValueOnce(say('ok'));
    await askCopilot('job-1', { question: 'hi', history: [] });
    const { messages, tools } = chat.mock.calls[0][0];
    expect(messages[0].content).toMatch(/ONLY move candidates from Applied to Screening/);
    expect(tools.find((t) => t.function.name === 'move_stage').function.parameters.properties.to_stage.enum).toEqual(['SCREENING']);
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
