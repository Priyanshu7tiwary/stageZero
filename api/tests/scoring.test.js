import { describe, expect, it } from 'vitest';
import { experienceScore, finalScore, rankByScore, skillsScore } from '../src/lib/scoring.js';

describe('auto-scoring maths', () => {
  it('scores skills as the share of required skills matched', () => {
    expect(skillsScore(2, 4)).toBe(50);
    expect(skillsScore(3, 3)).toBe(100);
    expect(skillsScore(0, 0)).toBe(100);
  });

  it('gives full experience credit at or above the requirement, partial below', () => {
    expect(experienceScore(5, 3)).toBe(100);
    expect(experienceScore(1.5, 3)).toBe(50);
    expect(experienceScore(0, 0)).toBe(100);
  });

  it('applies the slider weighting exactly', () => {
    expect(finalScore({ skillsScore: 100, experienceScore: 0, skillsWeight: 70, referred: false })).toBe(70);
    expect(finalScore({ skillsScore: 100, experienceScore: 0, skillsWeight: 30, referred: false })).toBe(30);
  });

  it('adds 5 for a referral, capped at 100', () => {
    expect(finalScore({ skillsScore: 50, experienceScore: 50, skillsWeight: 50, referred: true })).toBe(55);
    expect(finalScore({ skillsScore: 100, experienceScore: 100, skillsWeight: 50, referred: true })).toBe(100);
  });

  it('ranks by score, earlier applicant first on a tie', () => {
    const ranked = rankByScore([
      { id: 'a', score: 60, appliedAt: 3 },
      { id: 'b', score: 90, appliedAt: 2 },
      { id: 'c', score: 60, appliedAt: 1 },
    ]);
    expect(ranked.map((c) => c.id)).toEqual(['b', 'c', 'a']);
  });
});
