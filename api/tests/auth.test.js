import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// A tiny in-memory stand-in for the user and refresh-token tables.
const db = { users: [], tokens: [] };
const matches = (row, where) => Object.entries(where).every(([k, v]) => row[k] === v);
const prisma = {
  user: {
    findUnique: vi.fn(async ({ where }) => db.users.find((u) => matches(u, where)) ?? null),
    create: vi.fn(async ({ data }) => {
      const row = { id: `u${db.users.length + 1}`, ...data };
      db.users.push(row);
      return row;
    }),
  },
  refreshToken: {
    create: vi.fn(async ({ data }) => {
      const row = { id: `rt${db.tokens.length + 1}`, revokedAt: null, ...data };
      db.tokens.push(row);
      return row;
    }),
    findUnique: vi.fn(async ({ where, include }) => {
      const row = db.tokens.find((t) => matches(t, where));
      if (!row) return null;
      return include?.user ? { ...row, user: db.users.find((u) => u.id === row.userId) } : { ...row };
    }),
    updateMany: vi.fn(async ({ where, data }) => {
      const rows = db.tokens.filter((t) => matches(t, where));
      rows.forEach((t) => Object.assign(t, data));
      return { count: rows.length };
    }),
  },
  job: { findMany: vi.fn(async () => []) },
  application: { groupBy: vi.fn(async () => []) },
};
vi.mock('../src/db.js', () => ({ prisma }));

const { createApp } = await import('../src/app.js');
const { refresh } = await import('../src/services/auth.service.js');

const SECRET = process.env.JWT_SECRET;
const api = () => request(createApp());
const cookieFrom = (res, name) => res.headers['set-cookie']?.find((c) => c.startsWith(`${name}=`));
const valueOf = (cookie) => cookie.split(';')[0].split('=').slice(1).join('=');

async function signIn() {
  const res = await api().post('/auth/login').send({ email: 'recruiter@example.com', password: 'password123' });
  return { res, access: valueOf(cookieFrom(res, 'access_token')), refreshToken: valueOf(cookieFrom(res, 'refresh_token')) };
}

beforeEach(() => {
  db.users = [{ id: 'u1', email: 'recruiter@example.com', name: 'Demo Recruiter', passwordHash: bcrypt.hashSync('password123', 4) }];
  db.tokens = [];
});

describe('login', () => {
  it('sets httpOnly cookies and never puts a token in the response body', async () => {
    const { res } = await signIn();
    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual(['accessTokenExpiresAt', 'user']);
    expect(res.body.user).toEqual({ id: 'u1', email: 'recruiter@example.com', name: 'Demo Recruiter' });

    const access = cookieFrom(res, 'access_token');
    const refreshCookie = cookieFrom(res, 'refresh_token');
    expect(access).toMatch(/HttpOnly/);
    expect(access).toMatch(/SameSite=Strict/);
    expect(access).toMatch(/Path=\//);
    // The refresh token cookie is only sent to /auth routes.
    expect(refreshCookie).toMatch(/HttpOnly/);
    expect(refreshCookie).toMatch(/SameSite=Strict/);
    expect(refreshCookie).toMatch(/Path=\/auth/);
    expect(JSON.stringify(res.body)).not.toContain(valueOf(refreshCookie));
  });

  it('signs a JWT that expires in 15 minutes', async () => {
    const { access, res } = await signIn();
    const payload = jwt.verify(access, SECRET);
    expect(payload.sub).toBe('u1');
    expect(payload.exp - payload.iat).toBe(15 * 60);
    expect(new Date(res.body.accessTokenExpiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('stores only a hash of the refresh token', async () => {
    const { refreshToken } = await signIn();
    expect(db.tokens).toHaveLength(1);
    expect(db.tokens[0].tokenHash).not.toBe(refreshToken);
    expect(db.tokens[0].tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('rejects a wrong password with a generic message and sets no cookies', async () => {
    const res = await api().post('/auth/login').send({ email: 'recruiter@example.com', password: 'nope' });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password.');
    expect(res.headers['set-cookie']).toBeUndefined();
  });
});

describe('signup', () => {
  it('creates the account, hashes the password, and signs straight in', async () => {
    const res = await api().post('/auth/signup').send({ name: 'Asha Verma', email: 'Asha@Example.com', password: 'longenough1' });
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ name: 'Asha Verma', email: 'asha@example.com' });
    expect(cookieFrom(res, 'access_token')).toMatch(/HttpOnly/);
    expect(cookieFrom(res, 'refresh_token')).toMatch(/Path=\/auth/);
    const stored = db.users.find((u) => u.email === 'asha@example.com');
    expect(stored.passwordHash).not.toBe('longenough1');
    expect(bcrypt.compareSync('longenough1', stored.passwordHash)).toBe(true);
  });

  it('refuses an email that already has an account (409)', async () => {
    const res = await api().post('/auth/signup').send({ name: 'X', email: 'recruiter@example.com', password: 'longenough1' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('requires a password of at least 8 characters', async () => {
    const res = await api().post('/auth/signup').send({ name: 'X', email: 'x@example.com', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.password).toMatch(/at least 8/);
  });
});

describe('protected API', () => {
  it('rejects requests without a valid access cookie', async () => {
    expect((await api().get('/jobs')).status).toBe(401);
    expect((await api().get('/jobs').set('Cookie', 'access_token=forged')).status).toBe(401);
  });

  it('accepts a valid access cookie', async () => {
    const { access } = await signIn();
    const res = await api().get('/jobs').set('Cookie', `access_token=${access}`);
    expect(res.status).toBe(200);
  });

  it('says TOKEN_EXPIRED for an expired access token, so the app knows to refresh', async () => {
    const expired = jwt.sign({}, SECRET, { subject: 'u1', expiresIn: -10 });
    const res = await api().get('/jobs').set('Cookie', `access_token=${expired}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('blocks data-changing requests from unknown origins', async () => {
    const res = await api().post('/auth/login').set('Origin', 'https://evil.example').send({ email: 'a@b.co', password: 'x' });
    expect(res.status).toBe(403);
  });
});

describe('refresh', () => {
  it('rotates: a new access + refresh token, and the old refresh token is used up', async () => {
    const { refreshToken } = await signIn();
    const res = await api().post('/auth/refresh').set('Cookie', `refresh_token=${refreshToken}`);
    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual(['accessTokenExpiresAt', 'user']);
    const next = valueOf(cookieFrom(res, 'refresh_token'));
    expect(next).not.toBe(refreshToken);
    expect(db.tokens[0].revokedAt).not.toBeNull(); // old one
    expect(db.tokens[1].revokedAt).toBeNull(); // new one
    expect(db.tokens[1].familyId).toBe(db.tokens[0].familyId);
  });

  it('treats reuse of an old refresh token as theft and ends the whole session', async () => {
    const { refreshToken: first } = await signIn();
    const second = (await refresh(first)).refresh.token; // legit rotation
    await expect(refresh(first)).rejects.toMatchObject({ status: 401, code: 'SESSION_REVOKED' }); // stolen copy
    // The legitimate newer token is revoked too.
    await expect(refresh(second)).rejects.toMatchObject({ status: 401, code: 'SESSION_REVOKED' });
  });

  it('rejects an expired refresh token', async () => {
    const { refreshToken } = await signIn();
    db.tokens[0].expiresAt = new Date(Date.now() - 1000);
    await expect(refresh(refreshToken)).rejects.toMatchObject({ code: 'SESSION_EXPIRED' });
  });

  it('rejects a missing or unknown refresh token and clears the cookies', async () => {
    const res = await api().post('/auth/refresh').set('Cookie', 'refresh_token=made-up');
    expect(res.status).toBe(401);
    expect(cookieFrom(res, 'refresh_token')).toMatch(/Expires=Thu, 01 Jan 1970/);
  });
});

describe('logout', () => {
  it('revokes the session and clears both cookies', async () => {
    const { refreshToken } = await signIn();
    const res = await api().post('/auth/logout').set('Cookie', `refresh_token=${refreshToken}`);
    expect(res.status).toBe(204);
    expect(cookieFrom(res, 'access_token')).toMatch(/Expires=Thu, 01 Jan 1970/);
    await expect(refresh(refreshToken)).rejects.toMatchObject({ status: 401 });
  });
});
