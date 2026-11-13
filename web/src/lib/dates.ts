/** Today's date in the user's timezone as YYYY-MM-DD. */
export function todayISO(): string {
  return new Date().toLocaleDateString("en-CA");
}

/** Parse YYYY-MM-DD as a local calendar date (not UTC midnight). */
function parseDay(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** "30 Nov 2026" */
export function formatDay(iso: string): string {
  return parseDay(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Whole days from today until the given day; negative once it has passed. */
export function daysUntil(iso: string): number {
  return Math.round((parseDay(iso).getTime() - parseDay(todayISO()).getTime()) / 86_400_000);
}
