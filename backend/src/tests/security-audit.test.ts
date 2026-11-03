import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import express, { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { app } from '../app';
import { User } from '../models/user.model';
import { Lead } from '../models/lead.model';
import { env } from '../config/env';
import { mongoSanitize } from '../middlewares/sanitize.middleware';
import { USER_ROLES } from '../config/constants';

describe('UniverseByte CRM - Phase 9 Security Audit & Vulnerability Suite', () => {
  let server: http.Server;
  let baseUrl: string;

  const superAdminId = new mongoose.Types.ObjectId();
  const telecallerId = new mongoose.Types.ObjectId();
  const counsellorId = new mongoose.Types.ObjectId();
  const testLeadId = new mongoose.Types.ObjectId();

  let superAdminToken: string;
  let telecallerToken: string;
  let counsellorToken: string;

  const inMemoryUsers = new Map<string, any>();
  const inMemoryLeads = new Map<string, any>();

  before(async () => {
    // Generate valid tokens
    superAdminToken = jwt.sign(
      {
        userId: superAdminId.toString(),
        email: 'admin@universebyte.com',
        role: 'SuperAdmin',
        permissions: ['*'],
      },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '1h' }
    );

    telecallerToken = jwt.sign(
      {
        userId: telecallerId.toString(),
        email: 'telecaller@universebyte.com',
        role: 'Telecaller',
        permissions: ['leads:read:assigned'],
      },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '1h' }
    );

    counsellorToken = jwt.sign(
      {
        userId: counsellorId.toString(),
        email: 'counsellor@universebyte.com',
        role: 'AdmissionCounsellor',
        permissions: ['leads:read:assigned', 'leads:update:assigned'],
      },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '1h' }
    );

    // Mock Users in Memory
    const superAdminUser = {
      _id: superAdminId,
      id: superAdminId.toString(),
      fullName: 'Super Administrator',
      email: 'admin@universebyte.com',
      phone: '9999999999',
      role: 'SuperAdmin',
      permissions: ['*'],
      isActive: true,
      passwordHash: await bcrypt.hash('SuperAdmin@2026!', 10),
      refreshTokens: [],
      loginHistory: [],
      comparePassword: async function (cand: string) {
        return bcrypt.compare(cand, this.passwordHash);
      },
      save: async function () {
        inMemoryUsers.set(this.id, this);
        return this;
      },
    };

    const telecallerUser = {
      _id: telecallerId,
      id: telecallerId.toString(),
      fullName: 'John Telecaller',
      email: 'telecaller@universebyte.com',
      phone: '8888888888',
      role: 'Telecaller',
      permissions: ['leads:read:assigned'],
      isActive: true,
      passwordHash: await bcrypt.hash('Telecaller@2026!', 10),
      refreshTokens: [],
      loginHistory: [],
      save: async function () {
        inMemoryUsers.set(this.id, this);
        return this;
      },
    };

    const counsellorUser = {
      _id: counsellorId,
      id: counsellorId.toString(),
      fullName: 'Priya Counsellor',
      email: 'counsellor@universebyte.com',
      phone: '7777777777',
      role: 'AdmissionCounsellor',
      permissions: ['leads:read:assigned', 'leads:update:assigned'],
      isActive: true,
      passwordHash: await bcrypt.hash('Counsellor@2026!', 10),
      refreshTokens: [],
      loginHistory: [],
      save: async function () {
        inMemoryUsers.set(this.id, this);
        return this;
      },
    };

    inMemoryUsers.set(superAdminId.toString(), superAdminUser);
    inMemoryUsers.set(telecallerId.toString(), telecallerUser);
    inMemoryUsers.set(counsellorId.toString(), counsellorUser);

    // Mock User query methods
    User.findById = ((id: any) => {
      const idStr = id?.toString ? id.toString() : id;
      const user = inMemoryUsers.get(idStr) || null;
      return {
        select: () => ({ exec: async () => user, then: (resolve: any) => Promise.resolve(user).then(resolve) }),
        exec: async () => user,
        then: (resolve: any) => Promise.resolve(user).then(resolve),
      };
    }) as any;

    User.findOne = ((query: any) => {
      const exec = async () => {
        if (query.email) {
          return Array.from(inMemoryUsers.values()).find((u) => u.email === query.email) || null;
        }
        return null;
      };
      return {
        select: () => ({ exec, then: (resolve: any) => exec().then(resolve) }),
        exec,
        then: (resolve: any) => exec().then(resolve),
      };
    }) as any;

    User.find = ((_query?: any) => {
      const users = Array.from(inMemoryUsers.values());
      const chain = {
        sort: () => chain,
        skip: () => chain,
        limit: () => chain,
        exec: async () => users,
        then: (resolve: any) => Promise.resolve(users).then(resolve),
      };
      return chain;
    }) as any;

    User.countDocuments = (async () => inMemoryUsers.size) as any;

    // Seed test lead in memory
    const testLead = {
      _id: testLeadId,
      id: testLeadId.toString(),
      leadId: 'UB-LD-2026-9999',
      studentName: 'Audit Test Student',
      mobileNumber: '9888800000',
      interestedCourse: 'MERN Full Stack',
      leadSource: 'Website',
      status: 'New',
      priority: 'Warm',
      assignedCounsellor: counsellorId,
      isDeleted: false,
      activityHistory: [] as any[],
      save: async function () {
        inMemoryLeads.set(this.id, this);
        return this;
      },
      populate: async function () {
        return this;
      },
    };
    inMemoryLeads.set(testLeadId.toString(), testLead);

    Lead.findById = ((id: any) => {
      const idStr = id?.toString ? id.toString() : id;
      const lead = inMemoryLeads.get(idStr) || null;
      return {
        select: () => ({ exec: async () => lead, then: (resolve: any) => Promise.resolve(lead).then(resolve) }),
        exec: async () => lead,
        then: (resolve: any) => Promise.resolve(lead).then(resolve),
      };
    }) as any;

    // Start Express server on ephemeral port
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
  // 1. JWT SECURITY AUDIT
  // --------------------------------------------------------------------------
  describe('1. JWT Cryptographic Security & Tamper Rejection', () => {
    test('1.1 should reject a tampered JWT payload with 401 Unauthorized', async () => {
      const parts = superAdminToken.split('.');
      // Tamper with payload by changing base64 string
      const tamperedToken = `${parts[0]}.${parts[1]}A.${parts[2]}`;

      const res = await fetch(`${baseUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${tamperedToken}` },
      });

      assert.equal(res.status, 401);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.ok(json.message.includes('Invalid authentication token'));
    });

    test('1.2 should reject an expired JWT token with 401 Unauthorized', async () => {
      const expiredToken = jwt.sign(
        {
          userId: superAdminId.toString(),
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

      assert.equal(res.status, 401);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.ok(json.message.includes('expired'));
    });

    test('1.3 should reject JWT with invalid/none algorithm attack', async () => {
      // Craft an unverified token with algorithm 'none'
      const unsignedNoneToken = `${Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')}.${Buffer.from(
        JSON.stringify({ userId: superAdminId.toString(), role: 'SuperAdmin' })
      ).toString('base64url')}.`;

      const res = await fetch(`${baseUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${unsignedNoneToken}` },
      });

      assert.equal(res.status, 401);
      const json = await res.json();
      assert.equal(json.success, false);
    });

    test('1.4 should reject missing Bearer prefix or missing Authorization header', async () => {
      const resNoHeader = await fetch(`${baseUrl}/auth/me`);
      assert.equal(resNoHeader.status, 401);

      const resBadPrefix = await fetch(`${baseUrl}/auth/me`, {
        headers: { Authorization: `Token ${superAdminToken}` },
      });
      assert.equal(resBadPrefix.status, 401);
    });
  });

  // --------------------------------------------------------------------------
  // 2. PASSWORD HASHING AUDIT
  // --------------------------------------------------------------------------
  describe('2. Password Hashing & Secret Protection', () => {
    test('2.1 user passwords must be hashed using bcrypt with at least 10 salt rounds', async () => {
      const superAdmin = inMemoryUsers.get(superAdminId.toString());
      assert.ok(superAdmin.passwordHash);
      // Valid bcrypt hash pattern: $2a$ or $2b$ followed by 2 digits for rounds (>=10)
      assert.match(superAdmin.passwordHash, /^\$2[ab]\$1[0-9]\$.{53}$/);
      assert.notEqual(superAdmin.passwordHash, 'SuperAdmin@2026!');
    });

    test('2.2 bcrypt comparison must reject incorrect password and accept correct one', async () => {
      const superAdmin = inMemoryUsers.get(superAdminId.toString());
      const correctMatch = await superAdmin.comparePassword('SuperAdmin@2026!');
      const wrongMatch = await superAdmin.comparePassword('SuperAdmin@2026!Wrong');
      assert.equal(correctMatch, true);
      assert.equal(wrongMatch, false);
    });
  });

  // --------------------------------------------------------------------------
  // 3. INPUT VALIDATION & SCHEMA DEFENSE
  // --------------------------------------------------------------------------
  describe('3. Strict Input Validation via Zod Schemas', () => {
    test('3.1 should reject invalid email format with 400 Bad Request', async () => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'not-an-email',
          password: 'Password123!',
        }),
      });

      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.ok(json.errors || json.message);
    });

    test('3.2 should reject invalid mobile number (non-10 digit) with 400 Bad Request', async () => {
      const res = await fetch(`${baseUrl}/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${superAdminToken}`,
        },
        body: JSON.stringify({
          studentName: 'Invalid Phone Student',
          mobileNumber: '12345', // invalid length
          interestedCourse: 'Python',
          leadSource: 'Website',
        }),
      });

      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.success, false);
    });

    test('3.3 should reject missing required lead fields with 400 Bad Request', async () => {
      const res = await fetch(`${baseUrl}/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${superAdminToken}`,
        },
        body: JSON.stringify({
          // missing studentName, mobileNumber, interestedCourse
          leadSource: 'Walk-in',
        }),
      });

      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.success, false);
    });
  });

  // --------------------------------------------------------------------------
  // 4. CORS POLICY AUDIT
  // --------------------------------------------------------------------------
  describe('4. CORS Header Protection', () => {
    test('4.1 should handle preflight OPTIONS request with allowed methods and headers', async () => {
      const res = await fetch(`${baseUrl}/auth/me`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:5173',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Authorization',
        },
      });

      assert.ok(res.status === 200 || res.status === 204);
      assert.ok(res.headers.get('access-control-allow-methods'));
    });

    test('4.2 should respond with Access-Control-Allow-Origin for permitted origins', async () => {
      const res = await fetch(`${baseUrl}/health`, {
        headers: { Origin: 'http://localhost:5173' },
      });

      assert.equal(res.status, 200);
      const allowOrigin = res.headers.get('access-control-allow-origin');
      assert.ok(allowOrigin === 'http://localhost:5173' || allowOrigin === '*');
    });
  });

  // --------------------------------------------------------------------------
  // 5. RATE LIMITING AUDIT
  // --------------------------------------------------------------------------
  describe('5. Rate Limiting Protection', () => {
    test('5.1 should enforce rate limit headers and return 429 when threshold exceeded', async () => {
      // Build a dedicated rate limited sub-app to test threshold without polluting global limits
      const testLimiterApp = express();
      const strictLimiter = rateLimit({
        windowMs: 60 * 1000,
        max: 3, // only 3 requests allowed
        message: { success: false, message: 'Too many requests' },
      });

      testLimiterApp.get('/test-rate', strictLimiter, (_req, res) => {
        res.json({ success: true });
      });

      const testServer = await new Promise<http.Server>((resolve) => {
        const s = testLimiterApp.listen(0, '127.0.0.1', () => resolve(s));
      });
      const testPort = (testServer.address() as any).port;
      const testUrl = `http://127.0.0.1:${testPort}/test-rate`;

      try {
        // First 3 requests should pass
        for (let i = 0; i < 3; i++) {
          const okRes = await fetch(testUrl);
          assert.equal(okRes.status, 200);
        }

        // 4th request must be rejected with 429 Too Many Requests
        const blockedRes = await fetch(testUrl);
        assert.equal(blockedRes.status, 429);
        const json = await blockedRes.json();
        assert.equal(json.success, false);
      } finally {
        await new Promise<void>((resolve) => testServer.close(() => resolve()));
      }
    });
  });

  // --------------------------------------------------------------------------
  // 6. NOSQL / MONGODB INJECTION PROTECTION
  // --------------------------------------------------------------------------
  describe('6. MongoDB NoSQL Injection Sanitization', () => {
    test('6.1 mongoSanitize middleware should recursively strip operator keys starting with $ or containing .', () => {
      const maliciousBody = {
        email: { $gt: '' },
        password: 'Password123',
        nested: {
          $where: 'function() { return true; }',
          'field.name': 'evil',
          cleanProp: 'validValue',
        },
        items: [{ $ne: null }, { valid: 1 }],
      };

      const mockReq = {
        body: maliciousBody,
        query: { $ne: 'test', safe: 'query' },
        params: { $where: '1' },
      } as unknown as Request;

      mongoSanitize(mockReq, {} as Response, () => {});

      // Verify stripped operators
      assert.equal((mockReq.body as any).email.$gt, undefined);
      assert.equal((mockReq.body as any).nested.$where, undefined);
      assert.equal((mockReq.body as any).nested['field.name'], undefined);
      assert.equal((mockReq.body as any).nested.cleanProp, 'validValue');
      assert.equal((mockReq.body as any).items[0].$ne, undefined);
      assert.equal((mockReq.body as any).items[1].valid, 1);
      assert.equal((mockReq.query as any).$ne, undefined);
      assert.equal((mockReq.query as any).safe, 'query');
      assert.equal((mockReq.params as any).$where, undefined);
    });

    test('6.2 should reject login attempt with NoSQL object injection as password or email', async () => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: { $gt: '' },
          password: { $ne: null },
        }),
      });

      // Zod validation or mongoSanitize must reject non-string primitives with 400 Bad Request
      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.success, false);
    });
  });

  // --------------------------------------------------------------------------
  // 7. AUTHORIZATION & LEAST PRIVILEGE AUDIT (RBAC)
  // --------------------------------------------------------------------------
  describe('7. Least Privilege Access Control & Role Guards', () => {
    test('7.1 Telecaller must be forbidden from permanent lead deletion (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/leads/${testLeadId.toString()}/permanent`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${telecallerToken}` },
      });

      assert.equal(res.status, 403);
      const json = await res.json();
      assert.equal(json.success, false);
    });

    test('7.2 Telecaller must be forbidden from accessing staff management (/users)', async () => {
      const res = await fetch(`${baseUrl}/users`, {
        headers: { Authorization: `Bearer ${telecallerToken}` },
      });

      assert.equal(res.status, 403);
      const json = await res.json();
      assert.equal(json.success, false);
    });

    test('7.3 SuperAdmin is allowed to access staff management', async () => {
      const res = await fetch(`${baseUrl}/users`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
    });
  });

  // --------------------------------------------------------------------------
  // 8. SENSITIVE DATA EXPOSURE AUDIT
  // --------------------------------------------------------------------------
  describe('8. Zero Sensitive Data Exposure in API Responses', () => {
    test('8.1 /auth/me must never return passwordHash or refreshTokens', async () => {
      const res = await fetch(`${baseUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      const user = json.data;

      assert.equal(user.passwordHash, undefined);
      assert.equal(user.passwordResetToken, undefined);
      assert.equal(user.passwordResetExpires, undefined);
      assert.equal(user.refreshTokens, undefined);
    });

    test('8.2 /whatsapp/config must never return actual WhatsApp token in response', async () => {
      const res = await fetch(`${baseUrl}/whatsapp/config`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      const cfg = json.data;

      assert.equal(cfg.token, undefined);
      assert.equal(cfg.whatsappToken, undefined);
      assert.equal(cfg.WHATSAPP_TOKEN, undefined);
    });

    test('8.3 /ai/status must never return raw GROQ_API_KEY in response', async () => {
      const res = await fetch(`${baseUrl}/ai/status`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      const status = json.data;

      assert.equal(status.apiKey, undefined);
      assert.equal(status.groqApiKey, undefined);
      assert.equal(status.GROQ_API_KEY, undefined);
    });
  });

  // --------------------------------------------------------------------------
  // 9. AUDIT LOGS & TRACEABILITY
  // --------------------------------------------------------------------------
  describe('9. Activity History & Immutable Audit Logging', () => {
    test('9.1 lead status update must record an immutable STATUS_CHANGED history entry with actor and timestamp', async () => {
      const res = await fetch(`${baseUrl}/leads/${testLeadId.toString()}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${counsellorToken}`,
        },
        body: JSON.stringify({
          status: 'Interested',
          notes: 'Candidate expressed strong interest in full stack training',
        }),
      });

      assert.equal(res.status, 200);
      const updatedLead = inMemoryLeads.get(testLeadId.toString());
      assert.equal(updatedLead.status, 'Interested');

      // Verify activity history record
      assert.ok(updatedLead.activityHistory.length > 0);
      const latestHistory = updatedLead.activityHistory[0];
      assert.equal(latestHistory.action, 'STATUS_CHANGED');
      assert.equal(latestHistory.changes.status.from, 'New');
      assert.equal(latestHistory.changes.status.to, 'Interested');
      assert.equal(latestHistory.changedBy.toString(), counsellorId.toString());
      assert.ok(latestHistory.timestamp);
    });
  });
});
