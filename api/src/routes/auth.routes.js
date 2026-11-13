import { Router } from 'express';
import { clearAuthCookies, REFRESH_COOKIE, setAuthCookies } from '../lib/cookies.js';
import { validate } from '../lib/validate.js';
import { loginSchema, signupSchema } from '../schemas.js';
import { login, logout, refresh, signup } from '../services/auth.service.js';

// The tokens go into httpOnly cookies. The body only says WHO is signed in and
// WHEN the access token expires (so the app knows when to refresh), never the tokens.
const sessionBody = (session) => ({ user: session.user, accessTokenExpiresAt: session.access.expiresAt.toISOString() });

// No sign-in needed for these.
export const publicAuthRoutes = Router();

publicAuthRoutes.post('/auth/login', async (req, res) => {
  const { email, password } = validate(loginSchema, req.body);
  const session = await login(email, password);
  setAuthCookies(res, session);
  res.json(sessionBody(session));
});

publicAuthRoutes.post('/auth/signup', async (req, res) => {
  const session = await signup(validate(signupSchema, req.body));
  setAuthCookies(res, session);
  res.status(201).json(sessionBody(session));
});

publicAuthRoutes.post('/auth/refresh', async (req, res) => {
  try {
    const session = await refresh(req.cookies?.[REFRESH_COOKIE]);
    setAuthCookies(res, session);
    res.json(sessionBody(session));
  } catch (err) {
    clearAuthCookies(res); // a dead refresh token is no use to keep around
    throw err;
  }
});

publicAuthRoutes.post('/auth/logout', async (req, res) => {
  await logout(req.cookies?.[REFRESH_COOKIE]);
  clearAuthCookies(res);
  res.status(204).end();
});

// Needs a signed-in user.
export const authRoutes = Router();

authRoutes.get('/auth/me', (req, res) => {
  res.json({ user: req.user, accessTokenExpiresAt: req.tokenExpiresAt.toISOString() });
});
