import { config } from '../config.js';

// Cookie names. Both are httpOnly, so page JavaScript can never read them.
export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';

// The refresh token is only ever sent to the /auth routes (refresh, logout),
// never with ordinary API calls.
const REFRESH_PATH = '/auth';

const base = () => ({ httpOnly: true, secure: config.secureCookies, sameSite: 'strict' });

export function setAuthCookies(res, { access, refresh }) {
  res.cookie(ACCESS_COOKIE, access.token, { ...base(), path: '/', expires: access.expiresAt });
  res.cookie(REFRESH_COOKIE, refresh.token, { ...base(), path: REFRESH_PATH, expires: refresh.expiresAt });
}

export function clearAuthCookies(res) {
  res.clearCookie(ACCESS_COOKIE, { ...base(), path: '/' });
  res.clearCookie(REFRESH_COOKIE, { ...base(), path: REFRESH_PATH });
}
