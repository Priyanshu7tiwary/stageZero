import { ACCESS_COOKIE } from '../lib/cookies.js';
import { verifyAccessToken } from '../services/auth.service.js';

// Every route after this needs a valid access token cookie.
// Puts the signed-in user on req.user and the token's expiry on req.tokenExpiresAt.
export async function requireAuth(req, res, next) {
  const { user, expiresAt } = await verifyAccessToken(req.cookies?.[ACCESS_COOKIE]);
  req.user = user;
  req.tokenExpiresAt = expiresAt;
  next();
}
