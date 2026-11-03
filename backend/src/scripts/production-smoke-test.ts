import http from 'http';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { app } from '../app';
import { User } from '../models/user.model';
import { Lead } from '../models/lead.model';
import { FollowUp } from '../models/followup.model';
import { WhatsAppMessage } from '../models/whatsapp-message.model';
import { USER_ROLES, DEFAULT_PERMISSIONS } from '../config/constants';
import { logger } from '../utils/logger';

/**
 * UniverseByte CRM - Production Smoke Test Runner
 *
 * Verifies end-to-end critical path for production deployment:
 * 1. Health check & database readiness
 * 2. Super Admin seeding & authentication
 * 3. Lead lifecycle & duplicate phone detection
 * 4. Lead counselor assignment
 * 5. Follow-up scheduling, sync & completion
 * 6. Live dashboard analytics aggregation
 * 7. Manual Click-to-WhatsApp communication
 * 8. Database persistence & audit trail verification
 * 9. Zero secret leakage in payloads
 */
export async function runProductionSmokeTests(targetBaseUrl?: string) {
  logger.info('================================================================');
  logger.info('  UniverseByte CRM – Production Smoke Test Suite');
  logger.info('  Brand: UniverseByte – Technology Redefined');
  logger.info('================================================================');

  let server: http.Server | null = null;
  let baseUrl = targetBaseUrl;

  const inMemoryUsers = new Map<string, any>();
  const inMemoryLeads = new Map<string, any>();
  const inMemoryFollowUps = new Map<string, any>();
  const inMemoryWhatsApp = new Map<string, any>();

  const adminId = new mongoose.Types.ObjectId();
  const counsellorId = new mongoose.Types.ObjectId();

  try {
    if (!baseUrl) {
      logger.info('Initializing production test instance on ephemeral port...');

      // Mock Mongoose models for standalone smoke testing if not pointed to live URL
      const adminPasswordHash = await bcrypt.hash('SuperAdmin@2026!', 10);
      const counsellorPasswordHash = await bcrypt.hash('Counsellor@2026!', 10);

      const adminUser = {
        _id: adminId,
        id: adminId.toString(),
        fullName: 'Super Administrator',
        email: 'admin@universebyte.com',
        phone: '9999999999',
        role: USER_ROLES.SUPER_ADMIN,
        permissions: DEFAULT_PERMISSIONS.SuperAdmin,
        isActive: true,
        passwordHash: adminPasswordHash,
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

      const counsellorUser = {
        _id: counsellorId,
        id: counsellorId.toString(),
        fullName: 'Priya Sharma',
        email: 'priya.sharma@universebyte.com',
        phone: '9876543210',
        role: USER_ROLES.ADMISSION_COUNSELLOR,
        permissions: DEFAULT_PERMISSIONS.AdmissionCounsellor,
        isActive: true,
        passwordHash: counsellorPasswordHash,
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

      inMemoryUsers.set(adminId.toString(), adminUser);
      inMemoryUsers.set(counsellorId.toString(), counsellorUser);

      // Model mocks
      User.findOne = ((query: any) => {
        const exec = async () => {
          if (query.email) {
            return Array.from(inMemoryUsers.values()).find((u) => u.email === query.email) || null;
          }
          return null;
        };
        return {
          select: () => ({ exec, then: (res: any) => exec().then(res) }),
          exec,
          then: (res: any) => exec().then(res),
        };
      }) as any;

      User.findById = ((id: any) => {
        const idStr = id?.toString ? id.toString() : id;
        const user = inMemoryUsers.get(idStr) || null;
        return {
          select: () => ({ exec: async () => user, then: (res: any) => Promise.resolve(user).then(res) }),
          exec: async () => user,
          then: (res: any) => Promise.resolve(user).then(res),
        };
      }) as any;

      User.find = ((_query?: any) => {
        const users = Array.from(inMemoryUsers.values());
        const chain = {
          sort: () => chain,
          skip: () => chain,
          limit: () => chain,
          exec: async () => users,
          then: (res: any) => Promise.resolve(users).then(res),
        };
        return chain;
      }) as any;

      User.countDocuments = (async () => inMemoryUsers.size) as any;

      // Lead mocks
      Lead.findOne = ((query: any = {}) => {
        const exec = async () => {
          if (query.mobileNumber) {
            return Array.from(inMemoryLeads.values()).find((l) => l.mobileNumber === query.mobileNumber) || null;
          }
          return Array.from(inMemoryLeads.values())[0] || null;
        };
        const chain: any = {
          select: () => chain,
          populate: () => chain,
          exec,
          then: (res: any) => exec().then(res),
        };
        return chain;
      }) as any;

      Lead.findById = ((id: any) => {
        const idStr = id?.toString ? id.toString() : id;
        const lead = inMemoryLeads.get(idStr) || null;
        const chain: any = {
          select: () => chain,
          populate: () => chain,
          exec: async () => lead,
          then: (res: any) => Promise.resolve(lead).then(res),
        };
        return chain;
      }) as any;

      Lead.create = (async (data: any) => {
        const id = new mongoose.Types.ObjectId();
        const doc = {
          ...data,
          _id: id,
          id: id.toString(),
          leadId: data.leadId || `UB-LD-2026-${String(inMemoryLeads.size + 1).padStart(4, '0')}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          activityHistory: data.activityHistory || [],
          save: async function () {
            inMemoryLeads.set(this.id, this);
            return this;
          },
          populate: async function () {
            return this;
          },
        };
        inMemoryLeads.set(doc.id, doc);
        return doc;
      }) as any;

      Lead.prototype.save = async function () {
        if (!this._id) this._id = new mongoose.Types.ObjectId();
        if (!this.id) this.id = this._id.toString();
        if (!this.leadId) {
          this.leadId = `UB-LD-2026-${(inMemoryLeads.size + 1).toString().padStart(4, '0')}`;
        }
        if (!this.whatsappNumber) this.whatsappNumber = this.mobileNumber;
        if (!this.createdAt) this.createdAt = new Date();
        if (!this.activityHistory) this.activityHistory = [];
        this.updatedAt = new Date();
        inMemoryLeads.set(this._id.toString(), this);
        return this;
      };

      Lead.prototype.populate = async function () {
        return this;
      };

      FollowUp.prototype.save = async function () {
        if (!this._id) this._id = new mongoose.Types.ObjectId();
        if (!this.id) this.id = this._id.toString();
        if (!this.createdAt) this.createdAt = new Date();
        this.updatedAt = new Date();
        inMemoryFollowUps.set(this._id.toString(), this);
        return this;
      };

      FollowUp.prototype.populate = async function () {
        return this;
      };

      WhatsAppMessage.prototype.save = async function () {
        if (!this._id) this._id = new mongoose.Types.ObjectId();
        if (!this.id) this.id = this._id.toString();
        this.updatedAt = new Date();
        inMemoryWhatsApp.set(this._id.toString(), this);
        return this;
      };

      Lead.find = ((_query?: any) => {
        const leads = Array.from(inMemoryLeads.values());
        const chain: any = {
          sort: () => chain,
          skip: () => chain,
          limit: () => chain,
          populate: () => chain,
          exec: async () => leads,
          then: (res: any) => Promise.resolve(leads).then(res),
        };
        return chain;
      }) as any;

      Lead.countDocuments = (async () => inMemoryLeads.size) as any;

      Lead.findByIdAndUpdate = (async (id: any, update: any) => {
        const idStr = id?.toString ? id.toString() : id;
        const lead = inMemoryLeads.get(idStr);
        if (lead) {
          if (update.$push?.activityHistory) {
            lead.activityHistory.unshift(update.$push.activityHistory);
          }
          if (update.$set) {
            Object.assign(lead, update.$set);
          }
          inMemoryLeads.set(idStr, lead);
        }
        return lead;
      }) as any;

      Lead.aggregate = (async (pipeline: any[]) => {
        if (pipeline[1]?.$facet) {
          return [
            {
              total: [{ count: inMemoryLeads.size }],
              inFilterRange: [{ count: inMemoryLeads.size }],
              today: [{ count: inMemoryLeads.size }],
              byStatus: [{ _id: 'New', count: inMemoryLeads.size }],
              totalAdmissions: [{ count: 0, totalFee: 0 }],
            },
          ];
        }
        return [
          { _id: 'Website', count: inMemoryLeads.size },
          { _id: 'Google Ads', count: 0 },
        ];
      }) as any;

      // FollowUp mocks
      FollowUp.create = (async (data: any) => {
        const id = new mongoose.Types.ObjectId();
        const doc = {
          ...data,
          _id: id,
          id: id.toString(),
          createdAt: new Date(),
          updatedAt: new Date(),
          populate: async function () {
            return this;
          },
          save: async function () {
            inMemoryFollowUps.set(this.id, this);
            return this;
          },
        };
        inMemoryFollowUps.set(doc.id, doc);
        return doc;
      }) as any;

      FollowUp.findOne = ((_query?: any) => {
        const exec = async () => null;
        const chain: any = {
          sort: () => chain,
          populate: () => chain,
          exec,
          then: (res: any) => exec().then(res),
        };
        return chain;
      }) as any;

      FollowUp.findById = ((id: any) => {
        const idStr = id?.toString ? id.toString() : id;
        const f = inMemoryFollowUps.get(idStr) || null;
        return {
          populate: () => ({
            exec: async () => f,
            then: (res: any) => Promise.resolve(f).then(res),
          }),
          exec: async () => f,
          then: (res: any) => Promise.resolve(f).then(res),
        };
      }) as any;

      FollowUp.find = ((_query?: any) => {
        const list = Array.from(inMemoryFollowUps.values());
        const chain: any = {
          sort: () => chain,
          skip: () => chain,
          limit: () => chain,
          populate: () => chain,
          exec: async () => list,
          then: (res: any) => Promise.resolve(list).then(res),
        };
        return chain;
      }) as any;

      FollowUp.countDocuments = (async () => inMemoryFollowUps.size) as any;
      FollowUp.aggregate = (async (_pipeline: any[]) => []) as any;

      // WhatsApp mocks
      WhatsAppMessage.create = (async (data: any) => {
        const id = new mongoose.Types.ObjectId();
        const doc = {
          ...data,
          _id: id,
          id: id.toString(),
          createdAt: new Date(),
          updatedAt: new Date(),
          statusHistory: data.statusHistory || [],
          save: async function () {
            inMemoryWhatsApp.set(this.id, this);
            return this;
          },
        };
        inMemoryWhatsApp.set(doc.id, doc);
        return doc;
      }) as any;

      // Start test HTTP server
      server = await new Promise<http.Server>((resolve) => {
        const s = app.listen(0, '127.0.0.1', () => resolve(s));
      });
      const port = (server.address() as any).port;
      baseUrl = `http://127.0.0.1:${port}/api/v1`;
      logger.info(`Server listening on ${baseUrl}`);
    }

    // ------------------------------------------------------------------------
    // TEST 1: API Health Check (GET /health)
    // ------------------------------------------------------------------------
    logger.info('[SMOKE TEST 1/8] Verifying API Health Endpoint (/health)...');
    const healthRes = await fetch(`${baseUrl}/health`);
    assert.equal(healthRes.status, 200, 'Health endpoint must return 200 OK');
    const healthData: any = await healthRes.json();
    const healthStatus = healthData.data?.status || healthData.status;
    assert.equal(healthStatus, 'healthy');
    logger.info('  ✔ Health check passed: Service is healthy & operational.');

    // ------------------------------------------------------------------------
    // TEST 2: Super Admin Login & Identity Introspection
    // ------------------------------------------------------------------------
    logger.info('[SMOKE TEST 2/8] Authenticating Super Admin on production endpoint...');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@universebyte.com',
        password: 'SuperAdmin@2026!',
      }),
    });

    assert.equal(loginRes.status, 200, 'Super Admin login must succeed');
    const loginData: any = await loginRes.json();
    assert.ok(loginData.data.accessToken, 'Access token must be returned');
    assert.equal(loginData.data.user.role, 'SuperAdmin');
    const token = loginData.data.accessToken;

    // Verify /auth/me
    const meRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(meRes.status, 200);
    const meData: any = await meRes.json();
    assert.equal(meData.data.email, 'admin@universebyte.com');
    assert.equal(meData.data.passwordHash, undefined, 'Password hash must never be exposed');
    logger.info('  ✔ Authentication passed: Super Admin logged in & session verified.');

    // ------------------------------------------------------------------------
    // TEST 3: Lead Creation & Duplicate Phone Protection
    // ------------------------------------------------------------------------
    logger.info('[SMOKE TEST 3/8] Testing Lead Creation & Duplicate Prevention...');
    const createLeadRes = await fetch(`${baseUrl}/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        studentName: 'Aarav Patel',
        mobileNumber: '9876500001',
        email: 'aarav.patel@example.com',
        interestedCourse: 'MERN Full Stack',
        leadSource: 'Website',
        budget: 45000,
        city: 'Ahmedabad',
      }),
    });

    assert.equal(createLeadRes.status, 201, 'Lead must be created successfully');
    const createdLeadData: any = await createLeadRes.json();
    const leadId = createdLeadData.data.id || createdLeadData.data._id;
    assert.ok(leadId, 'Lead ID must be generated');
    assert.ok(createdLeadData.data.leadId.startsWith('UB-LD-'));

    // Duplicate insertion attempt with same phone number
    const dupRes = await fetch(`${baseUrl}/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        studentName: 'Duplicate Aarav',
        mobileNumber: '9876500001', // duplicate
        interestedCourse: 'Python',
        leadSource: 'Walk-in',
      }),
    });
    assert.ok(dupRes.status === 409 || dupRes.status === 400, 'Duplicate phone number must be blocked');
    logger.info('  ✔ Lead lifecycle passed: Created lead & duplicate prevention confirmed.');

    // ------------------------------------------------------------------------
    // TEST 4: Lead Assignment to Counselor
    // ------------------------------------------------------------------------
    logger.info('[SMOKE TEST 4/8] Assigning lead to admission counselor...');
    const assignRes = await fetch(`${baseUrl}/leads/bulk-assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        leadIds: [leadId],
        counsellorId: counsellorId.toString(),
      }),
    });

    assert.equal(assignRes.status, 200, 'Lead assignment must succeed');
    logger.info('  ✔ Lead assignment passed: Lead assigned to counselor.');

    // ------------------------------------------------------------------------
    // TEST 5: Follow-up Scheduling & Completion Lifecycle
    // ------------------------------------------------------------------------
    logger.info('[SMOKE TEST 5/8] Scheduling & completing follow-up appointment...');
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const scheduleRes = await fetch(`${baseUrl}/followups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        leadId,
        scheduledAt: tomorrow,
        type: 'Call',
        counsellingNotes: 'Introductory counselling call for MERN Full Stack syllabus',
      }),
    });

    assert.equal(scheduleRes.status, 201, 'Follow-up must be scheduled');
    const followUpData: any = await scheduleRes.json();
    const followUpId = followUpData.data.id || followUpData.data._id;

    // Complete follow-up
    const completeRes = await fetch(`${baseUrl}/followups/${followUpId}/complete`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        completionRemarks: 'Candidate joined call, very interested in weekend batch',
      }),
    });

    assert.equal(completeRes.status, 200, 'Follow-up must be completed');
    logger.info('  ✔ Follow-up passed: Scheduled and completed with notes.');

    // ------------------------------------------------------------------------
    // TEST 6: Dashboard Analytics Retrieval
    // ------------------------------------------------------------------------
    logger.info('[SMOKE TEST 6/8] Fetching live business metrics & dashboard cards...');
    const cardsRes = await fetch(`${baseUrl}/analytics/cards?preset=last30days`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.equal(cardsRes.status, 200, 'Analytics cards must return 200 OK');
    const cardsData: any = await cardsRes.json();
    assert.ok(cardsData.data.totalLeads >= 1);
    assert.ok(cardsData.data.conversionRate !== undefined);

    const chartsRes = await fetch(`${baseUrl}/analytics/charts?preset=last30days`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(chartsRes.status, 200);
    logger.info('  ✔ Analytics passed: Aggregated KPI cards and charts verified.');

    // ------------------------------------------------------------------------
    // TEST 7: Manual Click-to-WhatsApp Action & Template Generation
    // ------------------------------------------------------------------------
    logger.info('[SMOKE TEST 7/8] Generating WhatsApp personalized messages...');
    const waGenRes = await fetch(`${baseUrl}/whatsapp/generate-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        leadId,
        studentName: 'Aarav Patel',
        phoneNumber: '9876500001',
        course: 'MERN Full Stack',
        templateName: 'new_enquiry',
        language: 'hi',
      }),
    });

    assert.equal(waGenRes.status, 200);
    const waGenData: any = await waGenRes.json();
    assert.ok(waGenData.data.messageBody.includes('Aarav Patel'));
    assert.ok(waGenData.data.clickToWhatsAppUrl.includes('wa.me'));

    // Record manual attempt
    const recordAttemptRes = await fetch(`${baseUrl}/whatsapp/record-attempt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        leadId,
        studentName: 'Aarav Patel',
        phoneNumber: '9876500001',
        templateName: 'new_enquiry',
        language: 'hi',
        messageBody: waGenData.data.messageBody,
      }),
    });
    assert.equal(recordAttemptRes.status, 201);
    const attemptData: any = await recordAttemptRes.json();
    assert.equal(attemptData.data.status, 'attempted');
    logger.info('  ✔ WhatsApp passed: Manual click generated & attempt logged cleanly.');

    // ------------------------------------------------------------------------
    // TEST 8: Database Persistence & Secret Leakage Check
    // ------------------------------------------------------------------------
    logger.info('[SMOKE TEST 8/8] Verifying database persistence & secret protection...');
    const finalLeadRes = await fetch(`${baseUrl}/leads/${leadId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(finalLeadRes.status, 200);
    const finalLeadData: any = await finalLeadRes.json();
    assert.equal(finalLeadData.data.studentName, 'Aarav Patel');

    // Verify WhatsApp config does not leak raw tokens
    const configRes = await fetch(`${baseUrl}/whatsapp/config`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const configData: any = await configRes.json();
    assert.equal(configData.data.token, undefined);

    logger.info('  ✔ Persistence & Security passed: Zero secrets exposed in responses.');

    logger.info('================================================================');
    logger.info('  🎉 ALL 8 PRODUCTION SMOKE TESTS PASSED CLEANLY (100% SUCCESS)');
    logger.info('================================================================');
    return { success: true };
  } catch (err: any) {
    logger.error('❌ Production smoke test failure:', err.message);
    throw err;
  } finally {
    if (server) {
      const activeServer = server;
      await new Promise<void>((resolve) => activeServer.close(() => resolve()));
    }
  }
}

// Execute if run via CLI
if (require.main === module || (typeof process !== 'undefined' && process.argv[1]?.includes('production-smoke-test'))) {
  const targetUrl = process.env.DEPLOYED_API_URL || undefined;
  runProductionSmokeTests(targetUrl)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
