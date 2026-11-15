// What a candidate's profile becomes when they apply to another job.
// A candidate is shared by all their applications, so we MERGE instead of
// replacing: a new application can add to their profile but never wipe it.
//  - skills: existing ones kept, new ones added (no case-insensitive duplicates)
//  - experience: the higher of the two (people gain experience, not lose it)
//  - phone: the new one if given, otherwise the one we already have
//  - name and email: unchanged
export function mergeProfile(existing, incoming) {
  const seen = new Set(existing.skills.map((s) => s.toLowerCase()));
  const added = incoming.skills.filter((s) => !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase()));
  return {
    skills: [...existing.skills, ...added],
    experienceYears: Math.max(existing.experienceYears, incoming.experienceYears ?? 0),
    phone: incoming.phone ?? existing.phone,
  };
}
