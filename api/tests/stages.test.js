import { describe, expect, it } from 'vitest';
import { allowedNextStages, canTransition, isFinal, STAGE_TRANSITIONS, STAGES, transitionError } from '../src/lib/stages.js';

// The table from the brief, written out separately from the code it checks.
const EXPECTED = {
  APPLIED: ['SCREENING', 'REJECTED'],
  SCREENING: ['INTERVIEW', 'REJECTED'],
  INTERVIEW: ['OFFER', 'REJECTED'],
  OFFER: ['HIRED', 'REJECTED'],
  HIRED: [],
  REJECTED: [],
};

describe('stage rules', () => {
  // All 6 x 6 = 36 (from, to) pairs: any added, removed or changed rule fails a named case.
  const pairs = STAGES.flatMap((from) => STAGES.map((to) => [from, to]));

  it.each(pairs)('%s -> %s is allowed only if the brief lists it', (from, to) => {
    expect(canTransition(from, to)).toBe(EXPECTED[from].includes(to));
  });

  it('matches the brief exactly', () => {
    for (const stage of STAGES) expect(allowedNextStages(stage).sort()).toEqual([...EXPECTED[stage]].sort());
    expect(Object.keys(STAGE_TRANSITIONS).sort()).toEqual([...STAGES].sort());
  });

  it('never allows skipping a stage or going backwards', () => {
    expect(canTransition('APPLIED', 'INTERVIEW')).toBe(false);
    expect(canTransition('APPLIED', 'HIRED')).toBe(false);
    expect(canTransition('INTERVIEW', 'SCREENING')).toBe(false);
    expect(canTransition('OFFER', 'APPLIED')).toBe(false);
  });

  it('lets any non-final stage be rejected', () => {
    for (const stage of ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER']) expect(canTransition(stage, 'REJECTED')).toBe(true);
  });

  it('treats Hired and Rejected as final', () => {
    expect(isFinal('HIRED')).toBe(true);
    expect(isFinal('REJECTED')).toBe(true);
    expect(allowedNextStages('HIRED')).toEqual([]);
    expect(isFinal('OFFER')).toBe(false);
  });

  it('explains why a move is not allowed', () => {
    expect(transitionError('APPLIED', 'HIRED')).toBe(
      "Can't move from Applied to Hired. From Applied the next stage can only be Screening or Rejected.",
    );
    expect(transitionError('HIRED', 'OFFER')).toMatch(/Hired is a final stage/);
  });

  it('hands out a copy, so callers cannot change the rules', () => {
    allowedNextStages('APPLIED').push('HIRED');
    expect(canTransition('APPLIED', 'HIRED')).toBe(false);
  });
});
