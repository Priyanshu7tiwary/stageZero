// Sign-in with two tokens:
//
//  - ACCESS token: a short-lived JWT (15 min) signed with JWT_SECRET. Sent with
//    every API call (cookie) and checked by requireAuth.
//  - REFRESH token: a long-lived random string (7 days) used only to get a new
//    access token. Only its SHA-256 hash is stored, so a database leak doesn't
//    reveal usable tokens. It is never put in a response body.
//
// Refresh tokens ROTATE: each refresh replaces the token with a new one. If a
// replaced token is ever used again, someone has a stolen copy, so the whole
// login session (its "family") is revoked and the user must sign in again.
import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { prisma } from '../db.js';
import { conflict, HttpError } from '../lib/errors.js';

const unauthorized = (code, message) => new HttpError(401, code, message);

// Compared against when the email is unknown, so response time doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser', 10);

export const hashPassword = (password) => bcrypt.hash(password, 10);
const hashToken = (token) => createHash('sha256').update(token).digest('hex');

export const publicUser = (user) => ({ id: user.id, email: user.email, name: user.name });

function issueAccessToken(userId) {
  const token = jwt.sign({}, config.jwtSecret, {
    subject: userId,
    expiresIn: config.accessTokenTtlSeconds,
    algorithm: 'HS256',
  });
  const expiresAt = new Date(Date.now() + config.accessTokenTtlSeconds * 1000);
  return { token, expiresAt };
}

async function issueRefreshToken(userId, familyId = randomBytes(16).toString('hex')) {
  const token = randomBytes(48).toString('base64url');
  const expiresAt = new Date(Date.now() + config.refreshTokenTtlDays * 86_400_000);
  await prisma.refreshToken.create({ data: { userId, tokenHash: hashToken(token), familyId, expiresAt } });
  return { token, expiresAt };
}

// Everything a sign-in or refresh hands back. The route puts the tokens in
// cookies and sends only `user` and `accessTokenExpiresAt` in the body.
async function issueSession(user, familyId) {
  const access = issueAccessToken(user.id);
  const refresh = await issueRefreshToken(user.id, familyId);
  return { user: publicUser(user), access, refresh };
}

export async function login(email, password) {
  const user = await prisma.user.findUnique({ where: { email } });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw unauthorized('INVALID_CREDENTIALS', 'Invalid email or password.');
  return issueSession(user);
}

// Create an account and sign straight in.
export async function signup({ name, email, password }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw conflict('EMAIL_TAKEN', 'An account with this email already exists. Sign in instead.');
  const user = await prisma.user.create({ data: { name, email, passwordHash: await hashPassword(password) } });
  return issueSession(user);
}

// Swap a valid refresh token for a new access token AND a new refresh token.
export async function refresh(refreshToken) {
  if (!refreshToken) throw unauthorized('NO_SESSION', 'Please sign in.');

  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(refreshToken) }, include: { user: true } });
  if (!stored) throw unauthorized('NO_SESSION', 'Please sign in.');

  if (stored.revokedAt) {
    // A token that was already replaced is being used again: treat it as stolen.
    await revokeFamily(stored.familyId);
    throw unauthorized('SESSION_REVOKED', 'Your session was ended for security. Please sign in again.');
  }
  if (stored.expiresAt <= new Date()) {
    throw unauthorized('SESSION_EXPIRED', 'Your session has expired. Please sign in again.');
  }

  // Mark this one used, only if nobody else used it a moment ago.
  const { count } = await prisma.refreshToken.updateMany({
    where: { id: stored.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (count === 0) {
    await revokeFamily(stored.familyId);
    throw unauthorized('SESSION_REVOKED', 'Your session was ended for security. Please sign in again.');
  }

  return issueSession(stored.user, stored.familyId);
}

export async function logout(refreshToken) {
  if (!refreshToken) return;
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(refreshToken) } });
  if (stored) await revokeFamily(stored.familyId);
}

async function revokeFamily(familyId) {
  await prisma.refreshToken.updateMany({ where: { familyId, revokedAt: null }, data: { revokedAt: new Date() } });
}

// Checks an access token. Returns { user, expiresAt } or throws 401.
export async function verifyAccessToken(token) {
  if (!token) throw unauthorized('UNAUTHORIZED', 'Please sign in.');
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) throw unauthorized('TOKEN_EXPIRED', 'Your session needs refreshing.');
    throw unauthorized('UNAUTHORIZED', 'Please sign in.');
  }
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) throw unauthorized('UNAUTHORIZED', 'Please sign in.');
  return { user: publicUser(user), expiresAt: new Date(payload.exp * 1000) };
}

// Creates the recruiter account from ADMIN_EMAIL / ADMIN_PASSWORD on startup, if missing.
export async function ensureAdminUser() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return;
  await prisma.user.create({
    data: { email, name: process.env.ADMIN_NAME || 'Recruiter', passwordHash: await hashPassword(password) },
  });
  console.log(`Created sign-in account ${email}`);
}
