import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { app } from '../app';
import { User } from '../models/user.model';
import { env } from '../config/env';
import { REFRESH_TOKEN_COOKIE_NAME } from '../config/constants';

describe('UniverseByte CRM - Phase 2 Authentication & RBAC Test Suite', () => {
  let server: http.Server;
  let baseUrl: string;

  // Mock User Database in Memory
  const adminId = new mongoose.Types.ObjectId();
  const telecallerId = new mongoose.Types.ObjectId();
  const inactiveUserId = new mongoose.Types.ObjectId();

  const mockUsers: Record<string, any> = {
    [adminId.toString()]: {
      _id: adminId,
      fullName: 'Super Administrator',
      email: 'admin@universebyte.com',
      phone: '9999999999',
      role: 'SuperAdmin',
      permissions: ['*'],
      isActive: true,
      loginHistory: [],
      refreshTokens: [],
      async comparePassword(candidate: string) {
        return candidate === 'SuperAdmin@2026!';
      },
      async save() {
        return this;
      },
    },
    [telecallerId.toString()]: {
      _id: telecallerId,
      fullName: 'John Telecaller',
      email: 'telecaller@universebyte.com',
      phone: '8888888888',
      role: 'Telecaller',
      permissions: ['leads:read:assigned'],
      isActive: true,
      loginHistory: [],
      refreshTokens: [],
      async comparePassword(candidate: string) {
        return candidate === 'Telecaller@2026!';
      },
      async save() {
        return this;
      },
    },
    [inactiveUserId.toString()]: {
      _id: inactiveUserId,
      fullName: 'Deactivated Counsellor',
      email: 'inactive@universebyte.com',
      phone: '7777777777',
      role: 'AdmissionCounsellor',
      permissions: ['leads:read:assigned'],
      isActive: false,
      loginHistory: [],
      refreshTokens: [],
      async comparePassword(candidate: string) {
        return candidate === 'Password@2026!';
      },
      async save() {
        return this;
      },
    },
  };

  before(async () => {
    // Intercept Mongoose queries with in-memory test mocks
    User.findOne = ((query: any) => {
      const exec = async () => {
        if (query.email) {
          const user = Object.values(mockUsers).find((u) => u.email === query.email);
          return user || null;
        }
        return null;
      };
      return {
        select: () => ({ exec, then: (resolve: any) => exec().then(resolve) }),
        exec,
        then: (resolve: any) => exec().then(resolve),
      } as any;
    }) as any;

    User.findById = ((id: any) => {
      const idStr = id?.toString ? id.toString() : id;
      const user = mockUsers[idStr] || null;
      const exec = async () => user;
      return {
        select: () => ({ exec, then: (resolve: any) => exec().then(resolve) }),
        exec,
        then: (resolve: any) => exec().then(resolve),
      } as any;
    }) as any;

    // Start Express on ephemeral port
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const address = server.address() as any;
        baseUrl = `http://127.0.0.1:${address.port}/api/v1`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  // --------------------------------------------------------------------------
  // 1. LOGIN TESTS
  // --------------------------------------------------------------------------
  describe('POST /auth/login', () => {
    test('1.1 should login successfully with valid credentials and return JWT & user profile', async () => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@universebyte.com',
          password: 'SuperAdmin@2026!',
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.user.email, 'admin@universebyte.com');
      assert.equal(body.data.user.role, 'SuperAdmin');
      assert.ok(body.data.accessToken, 'Access token must be present');
      assert.ok(body.data.refreshToken, 'Refresh token must be present');

      // Check cookie header
      const setCookie = res.headers.get('set-cookie');
      assert.ok(setCookie?.includes(REFRESH_TOKEN_COOKIE_NAME), 'Refresh token cookie must be set');
      assert.ok(setCookie?.includes('HttpOnly'), 'Cookie must have HttpOnly flag');
    });

    test('1.2 should reject login with invalid password (401 Unauthorized)', async () => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@universebyte.com',
          password: 'WrongPassword999!',
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 401);
      assert.equal(body.success, false);
      assert.equal(body.message, 'Invalid email or password');
    });

    test('1.3 should reject login for non-existent email (401 Unauthorized)', async () => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent@universebyte.com',
          password: 'SomePassword123!',
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 401);
      assert.equal(body.success, false);
      assert.equal(body.message, 'Invalid email or password');
    });

    test('1.4 should reject login for deactivated account (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'inactive@universebyte.com',
          password: 'Password@2026!',
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 403);
      assert.equal(body.success, false);
      assert.ok(body.message.includes('deactivated'));
    });
  });

  // --------------------------------------------------------------------------
  // 2. PROTECTED ROUTES & TOKEN VALIDATION
  // --------------------------------------------------------------------------
  describe('GET /auth/me - Protected Route Authentication', () => {
    test('2.1 should allow access with valid access token', async () => {
      // Generate valid token
      const validToken = jwt.sign(
        {
          userId: adminId.toString(),
          email: 'admin@universebyte.com',
          role: 'SuperAdmin',
          permissions: ['*'],
        },
        env.JWT_ACCESS_SECRET,
        { expiresIn: '15m' }
      );

      const res = await fetch(`${baseUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${validToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.email, 'admin@universebyte.com');
      assert.equal(body.data.role, 'SuperAdmin');
    });

    test('2.2 should deny access when Authorization header is missing (401 Unauthorized)', async () => {
      const res = await fetch(`${baseUrl}/auth/me`);
      const body = await res.json();
      assert.equal(res.status, 401);
      assert.equal(body.success, false);
      assert.equal(body.message, 'Authentication token is required');
    });

    test('2.3 should deny access with an invalid/tampered token (401 Unauthorized)', async () => {
      const res = await fetch(`${baseUrl}/auth/me`, {
        headers: { Authorization: 'Bearer this.is.an.invalid.token' },
      });

      const body = await res.json();
      assert.equal(res.status, 401);
      assert.equal(body.success, false);
      assert.equal(body.message, 'Invalid authentication token');
    });

    test('2.4 should deny access with an expired token (401 Unauthorized)', async () => {
      const expiredToken = jwt.sign(
        {
          userId: adminId.toString(),
          email: 'admin@universebyte.com',
          role: 'SuperAdmin',
          permissions: ['*'],
        },
        env.JWT_ACCESS_SECRET,
        { expiresIn: '-1s' } // Expired 1 second ago
      );

      const res = await fetch(`${baseUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${expiredToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 401);
      assert.equal(body.success, false);
      assert.equal(body.message, 'Authentication token has expired');
    });
  });

  // --------------------------------------------------------------------------
  // 3. ROLE-BASED ACCESS CONTROL (RBAC) TESTS
  // --------------------------------------------------------------------------
  describe('RBAC Middleware Enforcement', () => {
    test('3.1 should deny access to SuperAdmin/Admin routes for Telecaller (403 Forbidden)', async () => {
      // Telecaller token
      const telecallerToken = jwt.sign(
        {
          userId: telecallerId.toString(),
          email: 'telecaller@universebyte.com',
          role: 'Telecaller',
          permissions: ['leads:read:assigned'],
        },
        env.JWT_ACCESS_SECRET,
        { expiresIn: '15m' }
      );

      // Attempt to access staff management endpoint (/users)
      const res = await fetch(`${baseUrl}/users`, {
        headers: { Authorization: `Bearer ${telecallerToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 403);
      assert.equal(body.success, false);
      assert.ok(
        body.message.includes("Role 'Telecaller' is not authorized"),
        'Must specify role authorization error'
      );
    });

    test('3.2 should allow access to counselor list for Telecaller when explicitly permitted', async () => {
      // Telecaller accessing /users/counsellors is NOT permitted (only SuperAdmin, Admin, MarketingManager)
      const telecallerToken = jwt.sign(
        {
          userId: telecallerId.toString(),
          email: 'telecaller@universebyte.com',
          role: 'Telecaller',
          permissions: ['leads:read:assigned'],
        },
        env.JWT_ACCESS_SECRET,
        { expiresIn: '15m' }
      );

      const res = await fetch(`${baseUrl}/users/counsellors`, {
        headers: { Authorization: `Bearer ${telecallerToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 403);
      assert.equal(body.success, false);
    });
  });

  // --------------------------------------------------------------------------
  // 4. LOGOUT & SESSION MANAGEMENT TESTS
  // --------------------------------------------------------------------------
  describe('POST /auth/logout', () => {
    test('4.1 should clear cookie and return 200 on logout', async () => {
      const validToken = jwt.sign(
        {
          userId: adminId.toString(),
          email: 'admin@universebyte.com',
          role: 'SuperAdmin',
          permissions: ['*'],
        },
        env.JWT_ACCESS_SECRET,
        { expiresIn: '15m' }
      );

      const res = await fetch(`${baseUrl}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${validToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.message, 'Logged out successfully');

      // Cookie should be cleared
      const setCookie = res.headers.get('set-cookie');
      assert.ok(
        setCookie?.includes(`${REFRESH_TOKEN_COOKIE_NAME}=;`) ||
          setCookie?.includes('Expires=Thu, 01 Jan 1970'),
        'Cookie must be cleared'
      );
    });
  });

  // --------------------------------------------------------------------------
  // 5. TOKEN REFRESH TESTS
  // --------------------------------------------------------------------------
  describe('POST /auth/refresh-token', () => {
    test('5.1 should reject refresh request when no refresh token is provided (401 Unauthorized)', async () => {
      const res = await fetch(`${baseUrl}/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const body = await res.json();
      assert.equal(res.status, 401);
      assert.equal(body.success, false);
      assert.equal(body.message, 'No refresh token provided');
    });

    test('5.2 should reject refresh request with invalid refresh token (401 Unauthorized)', async () => {
      const res = await fetch(`${baseUrl}/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: 'invalid.refresh.token' }),
      });

      const body = await res.json();
      assert.equal(res.status, 401);
      assert.equal(body.success, false);
      assert.equal(body.message, 'Invalid or expired refresh token');
    });
  });
});

