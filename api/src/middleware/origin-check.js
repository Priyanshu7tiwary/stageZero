import { config } from '../config.js';
import { HttpError } from '../lib/errors.js';

// Extra CSRF protection for cookie auth: requests that change data must come
// from one of our own web origins. (SameSite=Strict cookies already stop other
// sites; this is a second, independent check.)
export function originCheck(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  if (origin && !config.corsOrigins.includes(origin)) {
    return next(new HttpError(403, 'FORBIDDEN_ORIGIN', 'Request blocked: unknown origin.'));
  }
  next();
}
