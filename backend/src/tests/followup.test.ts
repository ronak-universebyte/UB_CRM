import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { app } from '../app';
import { User } from '../models/user.model';
import { Lead } from '../models/lead.model';
import { FollowUp } from '../models/followup.model';
import { env } from '../config/env';

describe('UniverseByte CRM - Phase 5 Follow-up Management Test Suite', () => {
  let server: http.Server;
  let baseUrl: string;

  // Mock Tokens
  let superAdminToken: string;
  let counsellor1Token: string;
  let counsellor2Token: string;

  const superAdminId = new mongoose.Types.ObjectId();
  const counsellor1Id = new mongoose.Types.ObjectId();
  const counsellor2Id = new mongoose.Types.ObjectId();

  const mockUsers: Record<string, any> = {
    [superAdminId.toString()]: {
      _id: superAdminId,
      id: superAdminId.toString(),
      fullName: 'Super Admin',
      email: 'superadmin@universebyte.com',
      role: 'SuperAdmin',
      permissions: ['*'],
      isActive: true,
    },
    [counsellor1Id.toString()]: {
      _id: counsellor1Id,
      id: counsellor1Id.toString(),
      fullName: 'Pooja Sharma',
      email: 'pooja.sharma@universebyte.com',
      role: 'AdmissionCounsellor',
      permissions: ['leads:read:assigned', 'leads:update:assigned', 'followups:manage'],
      isActive: true,
    },
    [counsellor2Id.toString()]: {
      _id: counsellor2Id,
      id: counsellor2Id.toString(),
      fullName: 'Vikram Patel',
      email: 'vikram.patel@universebyte.com',
      role: 'AdmissionCounsellor',
      permissions: ['leads:read:assigned', 'leads:update:assigned', 'followups:manage'],
      isActive: true,
    },
  };

  const inMemoryLeads = new Map<string, any>();
  const inMemoryFollowUps = new Map<string, any>();

  let testLead1Id: string;
  let testLead2Id: string;

  before(async () => {
    // Generate auth tokens
    superAdminToken = jwt.sign(
      {
        userId: superAdminId.toString(),
        email: mockUsers[superAdminId.toString()].email,
        role: 'SuperAdmin',
        permissions: ['*'],
      },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );

    counsellor1Token = jwt.sign(
      {
        userId: counsellor1Id.toString(),
        email: mockUsers[counsellor1Id.toString()].email,
        role: 'AdmissionCounsellor',
        permissions: ['leads:read:assigned', 'leads:update:assigned', 'followups:manage'],
      },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );

    counsellor2Token = jwt.sign(
      {
        userId: counsellor2Id.toString(),
        email: mockUsers[counsellor2Id.toString()].email,
        role: 'AdmissionCounsellor',
        permissions: ['leads:read:assigned', 'leads:update:assigned', 'followups:manage'],
      },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );

    // Mock User.findById
    User.findById = ((id: any) => {
      const idStr = id?.toString ? id.toString() : id;
      const user = mockUsers[idStr] || null;
      return {
        select: () => ({ exec: async () => user, then: (resolve: any) => Promise.resolve(user).then(resolve) }),
        exec: async () => user,
        then: (resolve: any) => Promise.resolve(user).then(resolve),
      };
    }) as any;

    // Mock User.find
    User.find = ((_query: any = {}) => {
      const users = Object.values(mockUsers);
      const chain: any = {
        select: () => chain,
        exec: async () => users,
        then: (resolve: any) => Promise.resolve(users).then(resolve),
      };
      return chain;
    }) as any;

    // Setup initial leads in memory
    const lead1 = {
      _id: new mongoose.Types.ObjectId(),
      leadId: 'UB-LD-2026-0001',
      studentName: 'Aarav Mehta',
      mobileNumber: '9888811111',
      interestedCourse: 'MERN Full Stack',
      leadSource: 'Website',
      status: 'Interested',
      priority: 'Hot',
      assignedCounsellor: counsellor1Id,
      isDeleted: false,
      activityHistory: [],
      save: async function () {
        inMemoryLeads.set(this._id.toString(), this);
        return this;
      },
    };
    testLead1Id = lead1._id.toString();
    inMemoryLeads.set(testLead1Id, lead1);

    const lead2 = {
      _id: new mongoose.Types.ObjectId(),
      leadId: 'UB-LD-2026-0002',
      studentName: 'Sneha Rao',
      mobileNumber: '9888822222',
      interestedCourse: 'Python with AI',
      leadSource: 'WhatsApp',
      status: 'Contacted',
      priority: 'Warm',
      assignedCounsellor: counsellor2Id,
      isDeleted: false,
      activityHistory: [],
      save: async function () {
        inMemoryLeads.set(this._id.toString(), this);
        return this;
      },
    };
    testLead2Id = lead2._id.toString();
    inMemoryLeads.set(testLead2Id, lead2);

    // Mock Lead.findById
    Lead.findById = ((id: any) => {
      const idStr = id?.toString ? id.toString() : id;
      const lead = inMemoryLeads.get(idStr) || null;
      return {
        populate: () => ({ exec: async () => lead, then: (resolve: any) => Promise.resolve(lead).then(resolve) }),
        exec: async () => lead,
        then: (resolve: any) => Promise.resolve(lead).then(resolve),
      };
    }) as any;

    // Mock Lead.find
    Lead.find = ((query: any = {}) => {
      let results: any[] = [];
      for (const lead of inMemoryLeads.values()) {
        let match = true;
        if (query.$or) {
          const search = query.$or[0]?.studentName?.$regex;
          if (search) {
            const re = new RegExp(search, 'i');
            const subMatch =
              re.test(lead.studentName) ||
              re.test(lead.mobileNumber) ||
              re.test(lead.leadId);
            if (!subMatch) match = false;
          }
        }
        if (match) results.push(lead);
      }
      return {
        select: () => results,
        exec: async () => results,
        then: (resolve: any) => Promise.resolve(results).then(resolve),
      } as any;
    }) as any;

    // Mock FollowUp methods
    FollowUp.create = (async (data: any) => {
      const followUpInstance = {
        ...data,
        _id: new mongoose.Types.ObjectId(),
        id: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        history: data.history || [],
        populate: async function () {
          return this;
        },
        save: async function () {
          inMemoryFollowUps.set(this._id.toString(), this);
          return this;
        },
      };
      followUpInstance.id = followUpInstance._id.toString();
      inMemoryFollowUps.set(followUpInstance.id, followUpInstance);
      return followUpInstance;
    }) as any;

    FollowUp.findById = ((id: any) => {
      const idStr = id?.toString ? id.toString() : id;
      const followUp = inMemoryFollowUps.get(idStr) || null;
      const chain: any = {
        populate: () => chain,
        exec: async () => followUp,
        then: (resolve: any) => Promise.resolve(followUp).then(resolve),
      };
      return chain;
    }) as any;

    FollowUp.findOne = ((query: any = {}) => {
      const exec = async () => {
        for (const f of inMemoryFollowUps.values()) {
          let match = true;
          if (query._id?.$ne && f._id.toString() === query._id.$ne.toString()) match = false;
          if (query.leadId && f.leadId.toString() !== query.leadId.toString()) match = false;
          if (query.status?.$in && !query.status.$in.includes(f.status)) match = false;
          if (query.scheduledAt?.$gte && query.scheduledAt?.$lte) {
            const time = new Date(f.scheduledAt).getTime();
            const gte = new Date(query.scheduledAt.$gte).getTime();
            const lte = new Date(query.scheduledAt.$lte).getTime();
            if (time < gte || time > lte) match = false;
          }
          if (match) return f;
        }
        return null;
      };
      const chain: any = {
        sort: () => chain,
        exec,
        then: (resolve: any) => exec().then(resolve),
      };
      return chain;
    }) as any;

    FollowUp.countDocuments = (async (query: any = {}) => {
      let count = 0;
      for (const f of inMemoryFollowUps.values()) {
        let match = true;
        if (query.counsellorId && f.counsellorId.toString() !== query.counsellorId.toString()) match = false;
        if (query.status?.$in && !query.status.$in.includes(f.status)) match = false;
        if (query.status && typeof query.status === 'string' && f.status !== query.status) match = false;
        if (query.scheduledAt?.$gte && new Date(f.scheduledAt) < new Date(query.scheduledAt.$gte)) match = false;
        if (query.scheduledAt?.$lte && new Date(f.scheduledAt) > new Date(query.scheduledAt.$lte)) match = false;
        if (query.scheduledAt?.$lt && new Date(f.scheduledAt) >= new Date(query.scheduledAt.$lt)) match = false;
        if (query.scheduledAt?.$gt && new Date(f.scheduledAt) <= new Date(query.scheduledAt.$gt)) match = false;
        if (match) count++;
      }
      return count;
    }) as any;

    FollowUp.find = ((query: any = {}) => {
      let results: any[] = [];
      for (const f of inMemoryFollowUps.values()) {
        let match = true;
        if (query.counsellorId && f.counsellorId.toString() !== query.counsellorId.toString()) match = false;
        if (query.leadId && f.leadId.toString() !== query.leadId.toString()) match = false;
        if (query.leadId?.$in) {
          const ids = query.leadId.$in.map((i: any) => i.toString());
          if (!ids.includes(f.leadId.toString())) match = false;
        }
        if (query.type && f.type !== query.type) match = false;
        if (query.status?.$in && !query.status.$in.includes(f.status)) match = false;
        if (query.status && typeof query.status === 'string' && f.status !== query.status) match = false;
        if (query.scheduledAt?.$gte && new Date(f.scheduledAt) < new Date(query.scheduledAt.$gte)) match = false;
        if (query.scheduledAt?.$lte && new Date(f.scheduledAt) > new Date(query.scheduledAt.$lte)) match = false;
        if (query.scheduledAt?.$lt && new Date(f.scheduledAt) >= new Date(query.scheduledAt.$lt)) match = false;
        if (query.scheduledAt?.$gt && new Date(f.scheduledAt) <= new Date(query.scheduledAt.$gt)) match = false;
        if (match) {
          const lead = inMemoryLeads.get(f.leadId.toString());
          const counsellor = mockUsers[f.counsellorId.toString()];
          results.push({
            ...f,
            leadId: lead || f.leadId,
            counsellorId: counsellor || f.counsellorId,
          });
        }
      }

      const chain: any = {
        sort: () => chain,
        skip: (skipCount: number) => {
          results = results.slice(skipCount);
          return chain;
        },
        limit: (limitCount: number) => {
          results = results.slice(0, limitCount);
          return chain;
        },
        populate: () => chain,
        exec: async () => results,
        then: (resolve: any) => Promise.resolve(results).then(resolve),
      };
      return chain;
    }) as any;

    // Start Express server
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

  let createdFollowUpId: string;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(15, 30, 0, 0);

  // --------------------------------------------------------------------------
  // 1. SCHEDULE FOLLOW-UP & DUPLICATE PREVENTION
  // --------------------------------------------------------------------------
  describe('POST /followups (Schedule Follow-Up)', () => {
    test('1.1 should schedule a follow-up for a lead with date, time, type, and counselling notes', async () => {
      const res = await fetch(`${baseUrl}/followups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${counsellor1Token}`,
        },
        body: JSON.stringify({
          leadId: testLead1Id,
          scheduledAt: tomorrow.toISOString(),
          type: 'Call',
          counsellingNotes: 'Call to discuss course curriculum and weekend batch timing',
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 201);
      assert.equal(body.success, true);
      assert.equal(body.data.type, 'Call');
      assert.equal(body.data.status, 'Scheduled');

      createdFollowUpId = body.data.id || body.data._id;
      assert.ok(createdFollowUpId);

      // Verify connected lead's nextFollowUpDate was updated
      const updatedLead = inMemoryLeads.get(testLead1Id);
      assert.ok(updatedLead.nextFollowUpDate);
      assert.equal(updatedLead.activityHistory[0].action, 'FOLLOWUP_SCHEDULED');
    });

    test('1.2 should prevent accidental duplicate follow-up within 15-minute slot window', async () => {
      const slightlyDifferentTime = new Date(tomorrow.getTime() + 5 * 60 * 1000); // 5 mins later
      const res = await fetch(`${baseUrl}/followups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${counsellor1Token}`,
        },
        body: JSON.stringify({
          leadId: testLead1Id,
          scheduledAt: slightlyDifferentTime.toISOString(),
          type: 'Call',
          counsellingNotes: 'Accidental duplicate attempt',
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 409); // Conflict
      assert.equal(body.success, false);
      assert.ok(body.message.includes('already scheduled'));
    });

    test('1.3 should reject scheduling with invalid follow-up type (400 Bad Request)', async () => {
      const res = await fetch(`${baseUrl}/followups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${counsellor1Token}`,
        },
        body: JSON.stringify({
          leadId: testLead1Id,
          scheduledAt: tomorrow.toISOString(),
          type: 'CarrierPigeon', // Invalid
          counsellingNotes: 'Testing invalid type',
        }),
      });

      assert.equal(res.status, 400);
    });

    test('1.4 should reject scheduling for non-existent lead (404 Not Found)', async () => {
      const nonExistentLeadId = new mongoose.Types.ObjectId().toString();
      const res = await fetch(`${baseUrl}/followups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${superAdminToken}`,
        },
        body: JSON.stringify({
          leadId: nonExistentLeadId,
          scheduledAt: tomorrow.toISOString(),
          type: 'Meeting',
          counsellingNotes: 'Meeting at campus',
        }),
      });

      assert.equal(res.status, 404);
    });
  });

  // --------------------------------------------------------------------------
  // 2. LISTING & SECTION FILTERING
  // --------------------------------------------------------------------------
  describe('GET /followups (Listing & Section Filters)', () => {
    test('2.1 should list follow-ups with database pagination', async () => {
      const res = await fetch(`${baseUrl}/followups?page=1&limit=10`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.ok(Array.isArray(body.data));
      assert.ok(body.pagination);
      assert.ok(body.pagination.totalRecords >= 1);
    });

    test('2.2 should filter follow-ups by upcoming section', async () => {
      const res = await fetch(`${baseUrl}/followups?section=upcoming`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.ok(body.data.length >= 1);
      assert.equal(body.data[0].status, 'Scheduled');
    });

    test('2.3 should filter follow-ups by type (Call)', async () => {
      const res = await fetch(`${baseUrl}/followups?type=Call`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.ok(body.data.every((f: any) => f.type === 'Call'));
    });
  });

  // --------------------------------------------------------------------------
  // 3. RESCHEDULE FOLLOW-UP
  // --------------------------------------------------------------------------
  describe('PATCH /followups/:id/reschedule', () => {
    test('3.1 should reschedule follow-up with new date and record reason in history', async () => {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      nextWeek.setHours(11, 0, 0, 0);

      const res = await fetch(`${baseUrl}/followups/${createdFollowUpId}/reschedule`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${counsellor1Token}`,
        },
        body: JSON.stringify({
          newScheduledAt: nextWeek.toISOString(),
          rescheduledReason: 'Student requested callback next week after college exams',
          type: 'WhatsApp',
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.status, 'Rescheduled');
      assert.equal(body.data.type, 'WhatsApp');
      assert.equal(body.data.rescheduledReason, 'Student requested callback next week after college exams');

      // Verify connected lead
      const updatedLead = inMemoryLeads.get(testLead1Id);
      assert.equal(updatedLead.activityHistory[0].action, 'FOLLOWUP_RESCHEDULED');
    });
  });

  // --------------------------------------------------------------------------
  // 4. COMPLETE FOLLOW-UP (REQUIRES USER ACTION)
  // --------------------------------------------------------------------------
  describe('PATCH /followups/:id/complete', () => {
    test('4.1 should mark follow-up completed with remarks and update lead activity history', async () => {
      const res = await fetch(`${baseUrl}/followups/${createdFollowUpId}/complete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${counsellor1Token}`,
        },
        body: JSON.stringify({
          completionRemarks: 'Spoke with student. Highly interested in MERN Full Stack. Scheduling demo next.',
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.status, 'Completed');
      assert.ok(body.data.completedAt);
      assert.equal(
        body.data.completionRemarks,
        'Spoke with student. Highly interested in MERN Full Stack. Scheduling demo next.'
      );

      // Verify lead activity history logged
      const updatedLead = inMemoryLeads.get(testLead1Id);
      assert.equal(updatedLead.activityHistory[0].action, 'FOLLOWUP_COMPLETED');
    });

    test('4.2 should reject completing an already completed follow-up (400 Bad Request)', async () => {
      const res = await fetch(`${baseUrl}/followups/${createdFollowUpId}/complete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${counsellor1Token}`,
        },
        body: JSON.stringify({
          completionRemarks: 'Attempting to complete again',
        }),
      });

      assert.equal(res.status, 400);
    });
  });

  // --------------------------------------------------------------------------
  // 5. DASHBOARD REMINDERS & COUNSELLOR METRICS
  // --------------------------------------------------------------------------
  describe('Reminders & Counsellor Metrics Aggregations', () => {
    test('5.1 should fetch dashboard reminders breakdown', async () => {
      const res = await fetch(`${baseUrl}/followups/reminders`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.ok(typeof body.data.overdueCount === 'number');
      assert.ok(typeof body.data.todayCount === 'number');
      assert.ok(typeof body.data.upcomingCount === 'number');
      assert.ok(typeof body.data.completedTodayCount === 'number');
      assert.ok(Array.isArray(body.data.overdueList));
      assert.ok(Array.isArray(body.data.todayList));
    });

    test('5.2 should fetch follow-up counts per counsellor breakdown', async () => {
      const res = await fetch(`${baseUrl}/followups/counsellor-metrics`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.ok(Array.isArray(body.data));
      assert.ok(body.data.length >= 2);
      assert.ok(body.data[0].counsellorName);
      assert.ok(typeof body.data[0].todayPending === 'number');
      assert.ok(typeof body.data[0].overdue === 'number');
      assert.ok(typeof body.data[0].totalCompleted === 'number');
    });
  });

  // --------------------------------------------------------------------------
  // 6. ROLE-BASED ACCESS CONTROL & DATA ISOLATION
  // --------------------------------------------------------------------------
  describe('RBAC & Counsellor Data Isolation', () => {
    let counsellor2FollowUpId: string;

    before(async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);

      const res = await fetch(`${baseUrl}/followups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${counsellor2Token}`,
        },
        body: JSON.stringify({
          leadId: testLead2Id,
          scheduledAt: futureDate.toISOString(),
          type: 'Demo',
          counsellingNotes: 'Live demo session with trainer',
        }),
      });
      const body = await res.json();
      counsellor2FollowUpId = body.data.id || body.data._id;
    });

    test('6.1 Counsellor 1 is FORBIDDEN from completing Counsellor 2 follow-up (403)', async () => {
      const res = await fetch(`${baseUrl}/followups/${counsellor2FollowUpId}/complete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${counsellor1Token}`,
        },
        body: JSON.stringify({
          completionRemarks: 'Unauthorized completion attempt',
        }),
      });

      assert.equal(res.status, 403);
    });

    test('6.2 Counsellor 1 is FORBIDDEN from viewing Counsellor 2 follow-up detail (403)', async () => {
      const res = await fetch(`${baseUrl}/followups/${counsellor2FollowUpId}`, {
        headers: {
          Authorization: `Bearer ${counsellor1Token}`,
        },
      });

      assert.equal(res.status, 403);
    });
  });
});
