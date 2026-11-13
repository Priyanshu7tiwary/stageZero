import { config } from '../config.js';

// Today's date as "YYYY-MM-DD" in the app's timezone (APP_TIMEZONE).
export function today() {
  return new Date().toLocaleDateString('en-CA', { timeZone: config.timeZone });
}

// Postgres DATE columns come back as a Date at UTC midnight.
export const dateToDay = (date) => (date ? date.toISOString().slice(0, 10) : null);
export const dayToDate = (day) => (day ? new Date(`${day}T00:00:00Z`) : null);

// A job takes applications while it's OPEN and its closing date (if any) hasn't
// passed. The closing day itself still counts.
export function isAcceptingApplications(job, todayDay = today()) {
  if (job.status !== 'OPEN') return false;
  const closing = dateToDay(job.closingDate);
  return closing === null || closing >= todayDay;
}
