import { describe, expect, it } from 'vitest';
import { mergeProfile } from '../src/lib/candidates.js';

const existing = { skills: ['SQL', 'Python'], experienceYears: 5, phone: '+91 90000 00000' };

describe('mergeProfile (re-applying never wipes a candidate)', () => {
  it('keeps skills and experience when the new application leaves them empty', () => {
    expect(mergeProfile(existing, { skills: [], experienceYears: 0, phone: null })).toEqual(existing);
  });

  it('adds new skills without case-insensitive duplicates', () => {
    expect(mergeProfile(existing, { skills: ['python', 'Tableau'], experienceYears: 1 }).skills).toEqual(['SQL', 'Python', 'Tableau']);
  });

  it('keeps the higher experience and uses a new phone if given', () => {
    const merged = mergeProfile(existing, { skills: [], experienceYears: 7, phone: '+91 91111 11111' });
    expect(merged.experienceYears).toBe(7);
    expect(merged.phone).toBe('+91 91111 11111');
  });
});
