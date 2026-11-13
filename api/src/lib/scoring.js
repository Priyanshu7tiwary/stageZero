// The maths behind auto-scoring. The AI only decides WHICH required skills a
// candidate has; the score is computed here, so the job's skills/experience
// weighting is applied exactly.

export const REFERRAL_BONUS = 5;

// Share of the required skills the candidate has, 0–100.
export function skillsScore(matchedCount, requiredCount) {
  if (requiredCount === 0) return 100;
  return Math.round((matchedCount / requiredCount) * 100);
}

// 100 when they meet the required years; partial credit below that.
export function experienceScore(years, requiredYears) {
  if (requiredYears <= 0) return 100;
  return Math.round(Math.min(1, years / requiredYears) * 100);
}

// skillsWeight is 0–100 (the slider); experience gets the rest.
// Referred candidates get +5, capped at 100.
export function finalScore({ skillsScore, experienceScore, skillsWeight, referred }) {
  const weighted = (skillsScore * skillsWeight + experienceScore * (100 - skillsWeight)) / 100;
  return Math.min(100, Math.round(weighted) + (referred ? REFERRAL_BONUS : 0));
}

// Highest score first; ties go to whoever applied first.
export function rankByScore(candidates) {
  return [...candidates].sort((a, b) => b.score - a.score || a.appliedAt - b.appliedAt);
}
