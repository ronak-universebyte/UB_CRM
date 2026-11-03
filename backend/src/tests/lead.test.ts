import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { app } from '../app';
import { User } from '../models/user.model';
import { Lead } from '../models/lead.model';
import { env } from '../config/env';

describe('UniverseByte CRM - Phase 3 Lead Management Test Suite', () => {
  let server: http.Server;
  let baseUrl: string;

  // Staff User Identifiers
  const adminId = new mongoose.Types.ObjectId();
  const counsellor1Id = new mongoose.Types.ObjectId();
  const counsellor2Id = new mongoose.Types.ObjectId();

  const adminToken = jwt.sign(
    {
      userId: adminId.toString(),
      email: 'admin@universebyte.com',
      role: 'SuperAdmin',
      permissions: ['*'],
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: '1h' }
  );

  const counsellor1Token = jwt.sign(
    {
      userId: counsellor1Id.toString(),
      email: 'counsellor1@universebyte.com',
      role: 'AdmissionCounsellor',
      permissions: ['leads:read:assigned', 'leads:update:assigned'],
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: '1h' }
  );

  const counsellor2Token = jwt.sign(
    {
      userId: counsellor2Id.toString(),
      email: 'counsellor2@universebyte.com',
      role: 'AdmissionCounsellor',
      permissions: ['leads:read:assigned', 'leads:update:assigned'],
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: '1h' }
  );

  const mockUsers: Record<string, any> = {
    [adminId.toString()]: {
      _id: adminId,
      fullName: 'Admin User',
      email: 'admin@universebyte.com',
      role: 'SuperAdmin',
      isActive: true,
    },
    [counsellor1Id.toString()]: {
      _id: counsellor1Id,
      fullName: 'Priya Sharma',
      email: 'counsellor1@universebyte.com',
      role: 'AdmissionCounsellor',
      isActive: true,
    },
    [counsellor2Id.toString()]: {
      _id: counsellor2Id,
      fullName: 'Rahul Verma',
      email: 'counsellor2@universebyte.com',
      role: 'AdmissionCounsellor',
      isActive: true,
    },
  };

  // In-memory Leads Database for Testing
  const inMemoryLeads: Map<string, any> = new Map();

  before(async () => {
    // Intercept User queries
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

    User.find = ((query: any = {}) => {
      let users = Object.values(mockUsers);
      if (query._id?.$in) {
        const ids = query._id.$in.map((i: any) => i.toString());
        users = users.filter((u) => ids.includes(u._id.toString()));
      }
      const chain: any = {
        select: () => chain,
        exec: async () => users,
        then: (resolve: any) => Promise.resolve(users).then(resolve),
      };
      return chain;
    }) as any;

    // Intercept Lead.countDocuments
    Lead.countDocuments = (async (query: any = {}) => {
      let count = 0;
      for (const lead of inMemoryLeads.values()) {
        if (query.isDeleted !== undefined && lead.isDeleted !== query.isDeleted) continue;
        if (query.assignedCounsellor && lead.assignedCounsellor?.toString() !== query.assignedCounsellor.toString()) continue;
        count++;
      }
      return count;
    }) as any;

    // Intercept Lead.findOne
    Lead.findOne = ((query: any) => {
      const exec = async () => {
        for (const lead of inMemoryLeads.values()) {
          let match = true;
          if (query.mobileNumber && lead.mobileNumber !== query.mobileNumber) match = false;
          if (query.leadId && lead.leadId !== query.leadId) match = false;
          if (query.isDeleted !== undefined && lead.isDeleted !== query.isDeleted) match = false;
          if (query._id?.$ne && lead._id.toString() === query._id.$ne.toString()) match = false;
          if (match) return lead;
        }
        return null;
      };
      return {
        populate: () => ({ exec, then: (resolve: any) => exec().then(resolve) }),
        exec,
        then: (resolve: any) => exec().then(resolve),
      } as any;
    }) as any;

    // Intercept Lead.findById
    Lead.findById = ((id: any) => {
      const idStr = id?.toString ? id.toString() : id;
      const lead = inMemoryLeads.get(idStr) || null;
      const chain: any = {
        populate: () => chain,
        exec: async () => lead,
        then: (resolve: any) => Promise.resolve(lead).then(resolve),
      };
      return chain;
    }) as any;

    // Intercept Lead.find
    Lead.find = ((query: any = {}) => {
      let results: any[] = [];
      for (const lead of inMemoryLeads.values()) {
        let match = true;
        if (query.isDeleted !== undefined && lead.isDeleted !== query.isDeleted) match = false;
        if (query.assignedCounsellor && lead.assignedCounsellor?.toString() !== query.assignedCounsellor.toString()) match = false;
        if (query.status && lead.status !== query.status) match = false;
        if (query.priority && lead.priority !== query.priority) match = false;
        if (query.interestedCourse && lead.interestedCourse !== query.interestedCourse) match = false;
        if (query.leadSource && lead.leadSource !== query.leadSource) match = false;
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
        if (query._id?.$in) {
          const ids = query._id.$in.map((i: any) => i.toString());
          if (!ids.includes(lead._id.toString())) match = false;
        }
        if (match) results.push(lead);
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
        lean: () => results,
        exec: async () => results,
        then: (resolve: any) => Promise.resolve(results).then(resolve),
      };
      return chain;
    }) as any;

    // Intercept Lead.findByIdAndDelete
    Lead.findByIdAndDelete = (async (id: any) => {
      const idStr = id?.toString ? id.toString() : id;
      const existed = inMemoryLeads.has(idStr);
      inMemoryLeads.delete(idStr);
      return existed ? { _id: id } : null;
    }) as any;

    // Intercept Lead.prototype.save
    Lead.prototype.save = async function () {
      if (!this._id) {
        this._id = new mongoose.Types.ObjectId();
      }
      if (!this.leadId) {
        this.leadId = `UB-LD-2026-${(inMemoryLeads.size + 1).toString().padStart(4, '0')}`;
      }
      if (!this.whatsappNumber) {
        this.whatsappNumber = this.mobileNumber;
      }
      if (!this.createdAt) {
        this.createdAt = new Date();
      }
      this.updatedAt = new Date();
      inMemoryLeads.set(this._id.toString(), this);
      return this;
    };

    // Intercept Lead.prototype.populate
    Lead.prototype.populate = async function (path: any) {
      if (typeof path === 'string' && path.includes('assignedCounsellor') && this.assignedCounsellor) {
        const user = mockUsers[this.assignedCounsellor.toString()];
        if (user) {
          this.assignedCounsellor = user;
        }
      }
      return this;
    } as any;

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

  let createdLeadId: string;
  let createdLeadObjectId: string;
  let bulkLead1Id: string;
  let bulkLead2Id: string;

  // --------------------------------------------------------------------------
  // 1. CREATE LEAD & AUTO-ID GENERATION
  // --------------------------------------------------------------------------
  describe('POST /leads (Create Lead)', () => {
    test('1.1 should create a new lead with auto-generated leadId and activity log', async () => {
      const newLeadPayload = {
        studentName: 'Amit Verma',
        mobileNumber: '9876543210',
        email: 'amit.verma@example.com',
        city: 'Bengaluru',
        college: 'RV College of Engineering',
        qualification: 'B.Tech CS',
        graduationYear: 2025,
        interestedCourse: 'MERN Full Stack',
        leadSource: 'Website',
        priority: 'Hot',
        budget: 45000,
        remarks: 'Enquired about weekend live batches',
      };

      const res = await fetch(`${baseUrl}/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(newLeadPayload),
      });

      const body = await res.json();
      assert.equal(res.status, 201);
      assert.equal(body.success, true);
      assert.ok(body.data.leadId, 'Lead ID must be generated');
      assert.ok(body.data.leadId.startsWith('UB-LD-2026-'), 'Must follow UB-LD-2026-XXXX format');
      assert.equal(body.data.studentName, 'Amit Verma');
      assert.equal(body.data.whatsappNumber, '9876543210', 'WhatsApp number should default to mobile number');
      assert.equal(body.data.activityHistory.length, 1);
      assert.equal(body.data.activityHistory[0].action, 'LEAD_CREATED');

      createdLeadId = body.data.leadId;
      createdLeadObjectId = body.data.id || body.data._id;
    });

    test('1.2 should reject duplicate mobile numbers (409 Conflict)', async () => {
      const duplicatePayload = {
        studentName: 'Amit Verma (Duplicate)',
        mobileNumber: '9876543210', // Same mobile number!
        interestedCourse: 'Python with AI',
        leadSource: 'Google Ads',
      };

      const res = await fetch(`${baseUrl}/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(duplicatePayload),
      });

      const body = await res.json();
      assert.equal(res.status, 409);
      assert.equal(body.success, false);
      assert.ok(body.message.includes('already exists'), 'Must specify duplicate mobile conflict');
    });

    test('1.3 should reject invalid mobile number format (400 Bad Request)', async () => {
      const invalidMobilePayload = {
        studentName: 'Test Student',
        mobileNumber: '12345', // Invalid: not 10 digits
        interestedCourse: 'Java',
        leadSource: 'Phone Call',
      };

      const res = await fetch(`${baseUrl}/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(invalidMobilePayload),
      });

      const body = await res.json();
      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.ok(body.message.includes('Validation failed'));
    });
  });

  // --------------------------------------------------------------------------
  // 2. DUPLICATE CHECK ENDPOINT
  // --------------------------------------------------------------------------
  describe('GET /leads/check-duplicate', () => {
    test('2.1 should detect existing mobile number as duplicate', async () => {
      const res = await fetch(`${baseUrl}/leads/check-duplicate?mobileNumber=9876543210`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.data.isDuplicate, true);
      assert.equal(body.data.existingLead.leadId, createdLeadId);
    });

    test('2.2 should report unique mobile number as not duplicate', async () => {
      const res = await fetch(`${baseUrl}/leads/check-duplicate?mobileNumber=9111122222`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.data.isDuplicate, false);
      assert.equal(body.data.existingLead, null);
    });
  });

  // --------------------------------------------------------------------------
  // 3. READ, SEARCH & ADVANCED FILTERS
  // --------------------------------------------------------------------------
  describe('GET /leads (List & Search Leads)', () => {
    test('3.1 should list leads with database-backed pagination metadata', async () => {
      const res = await fetch(`${baseUrl}/leads?page=1&limit=10`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.ok(Array.isArray(body.data));
      assert.equal(body.pagination.page, 1);
      assert.ok(body.pagination.totalRecords >= 1);
    });

    test('3.2 should search leads by student name', async () => {
      const res = await fetch(`${baseUrl}/leads?search=Amit`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.ok(body.data.length >= 1);
      assert.equal(body.data[0].studentName, 'Amit Verma');
    });

    test('3.3 should filter leads by course and priority', async () => {
      const res = await fetch(
        `${baseUrl}/leads?interestedCourse=MERN%20Full%20Stack&priority=Hot`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.ok(body.data.length >= 1);
      assert.equal(body.data[0].interestedCourse, 'MERN Full Stack');
      assert.equal(body.data[0].priority, 'Hot');
    });
  });

  // --------------------------------------------------------------------------
  // 4. DATA ISOLATION & ACCESS CONTROL
  // --------------------------------------------------------------------------
  describe('Data Isolation for Counsellors', () => {
    let counsellor1LeadId: string;

    before(async () => {
      // Create a lead explicitly assigned to Counsellor 1
      const res = await fetch(`${baseUrl}/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          studentName: 'Counsellor 1 Student',
          mobileNumber: '9888877777',
          interestedCourse: 'Python',
          leadSource: 'WhatsApp',
          assignedCounsellor: counsellor1Id.toString(),
        }),
      });
      const body = await res.json();
      counsellor1LeadId = body.data.id || body.data._id;
    });

    test('4.1 Counsellor 1 can access their assigned lead', async () => {
      const res = await fetch(`${baseUrl}/leads/${counsellor1LeadId}`, {
        headers: { Authorization: `Bearer ${counsellor1Token}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.data.studentName, 'Counsellor 1 Student');
    });

    test('4.2 Counsellor 2 is FORBIDDEN from viewing Counsellor 1 lead (403)', async () => {
      const res = await fetch(`${baseUrl}/leads/${counsellor1LeadId}`, {
        headers: { Authorization: `Bearer ${counsellor2Token}` },
      });

      const body = await res.json();
      assert.equal(res.status, 403);
      assert.equal(body.success, false);
      assert.ok(body.message.includes('not authorized'));
    });
  });

  // --------------------------------------------------------------------------
  // 5. UPDATE LEAD & ACTIVITY HISTORY AUDIT
  // --------------------------------------------------------------------------
  describe('PUT /leads/:id (Update & Audit Trail)', () => {
    test('5.1 should update lead fields and log exact changes in activity history', async () => {
      const updatePayload = {
        status: 'Contacted',
        priority: 'Warm',
        city: 'Mysuru',
        activityNotes: 'Discussed scholarship details over phone',
      };

      const res = await fetch(`${baseUrl}/leads/${createdLeadObjectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(updatePayload),
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.data.status, 'Contacted');
      assert.equal(body.data.priority, 'Warm');
      assert.equal(body.data.city, 'Mysuru');

      // Verify activity history audit entry
      assert.ok(body.data.activityHistory.length >= 2);
      const latestActivity = body.data.activityHistory[0];
      assert.equal(latestActivity.action, 'LEAD_UPDATED');
      assert.equal(latestActivity.notes, 'Discussed scholarship details over phone');
      assert.equal(latestActivity.changes.status.from, 'New');
      assert.equal(latestActivity.changes.status.to, 'Contacted');
    });
  });

  // --------------------------------------------------------------------------
  // 6. SOFT DELETE & RESTORE
  // --------------------------------------------------------------------------
  describe('Soft Delete & Restore Workflow', () => {
    test('6.1 should soft delete lead and move it to trash', async () => {
      const res = await fetch(`${baseUrl}/leads/${createdLeadObjectId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.data.isDeleted, true);
    });

    test('6.2 soft deleted lead should not appear in default listing', async () => {
      const res = await fetch(`${baseUrl}/leads`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      const body = await res.json();
      const existsInActive = body.data.some((l: any) => l.leadId === createdLeadId);
      assert.equal(existsInActive, false, 'Soft deleted lead must not be in active list');
    });

    test('6.3 soft deleted lead should appear in trash view (isDeleted=true)', async () => {
      const res = await fetch(`${baseUrl}/leads?isDeleted=true`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      const body = await res.json();
      const existsInTrash = body.data.some((l: any) => l.leadId === createdLeadId);
      assert.equal(existsInTrash, true, 'Soft deleted lead must be present in trash view');
    });

    test('6.4 should restore lead from trash', async () => {
      const res = await fetch(`${baseUrl}/leads/${createdLeadObjectId}/restore`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.data.isDeleted, false);
    });
  });

  // --------------------------------------------------------------------------
  // 7. PERMANENT DELETE (SUPER ADMIN ONLY)
  // --------------------------------------------------------------------------
  describe('DELETE /leads/:id/permanent', () => {
    test('7.1 should reject permanent deletion for Admission Counsellor (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/leads/${createdLeadObjectId}/permanent`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${counsellor1Token}` },
      });

      const body = await res.json();
      assert.equal(res.status, 403);
      assert.equal(body.success, false);
    });

    test('7.2 should allow permanent deletion for Super Admin', async () => {
      const res = await fetch(`${baseUrl}/leads/${createdLeadObjectId}/permanent`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
    });
  });

  // --------------------------------------------------------------------------
  // 8. BULK LEAD ASSIGNMENT
  // --------------------------------------------------------------------------
  describe('POST /leads/bulk-assign', () => {
    before(async () => {
      const res1 = await fetch(`${baseUrl}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          studentName: 'Bulk Student 1',
          mobileNumber: '9666611111',
          interestedCourse: 'React JS',
          leadSource: 'Referral',
        }),
      });
      const b1 = await res1.json();
      bulkLead1Id = b1.data.id || b1.data._id;

      const res2 = await fetch(`${baseUrl}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          studentName: 'Bulk Student 2',
          mobileNumber: '9666622222',
          interestedCourse: 'Node JS',
          leadSource: 'Walk-in',
        }),
      });
      const b2 = await res2.json();
      bulkLead2Id = b2.data.id || b2.data._id;
    });

    test('8.1 should bulk assign multiple leads to a target counsellor', async () => {
      const res = await fetch(`${baseUrl}/leads/bulk-assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          leadIds: [bulkLead1Id, bulkLead2Id],
          counsellorId: counsellor2Id.toString(),
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.updatedCount, 2);
    });
  });

  // --------------------------------------------------------------------------
  // 9. EXCEL / CSV EXPORT
  // --------------------------------------------------------------------------
  describe('GET /leads/export/csv', () => {
    test('9.1 should export leads to properly formatted CSV stream', async () => {
      const res = await fetch(`${baseUrl}/leads/export/csv`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.equal(res.status, 200);
      const contentType = res.headers.get('content-type');
      assert.ok(contentType?.includes('text/csv'));

      const csvText = await res.text();
      assert.ok(csvText.includes('Lead ID,Student Name,Mobile Number'));
      assert.ok(csvText.includes('Bulk Student 1'));
    });
  });

  // --------------------------------------------------------------------------
  // 10. KANBAN PIPELINE STATUS TRANSITIONS & PERSISTENCE
  // --------------------------------------------------------------------------
  describe('PATCH /leads/:id/status (Kanban Status Transition & Persistence)', () => {
    test('10.1 should update lead status and record STATUS_CHANGED in activity history', async () => {
      const res = await fetch(`${baseUrl}/leads/${bulkLead1Id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          status: 'Counselling Scheduled',
          notes: 'Candidate confirmed counseling session for tomorrow 4 PM',
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.status, 'Counselling Scheduled');

      // Verify activity history
      const latestActivity = body.data.activityHistory[0];
      assert.equal(latestActivity.action, 'STATUS_CHANGED');
      assert.equal(latestActivity.changes.status.to, 'Counselling Scheduled');
      assert.ok(latestActivity.notes.includes('confirmed counseling session'));
    });

    test('10.2 should persist status change after fetching lead by ID', async () => {
      const res = await fetch(`${baseUrl}/leads/${bulkLead1Id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.data.status, 'Counselling Scheduled');
    });

    test('10.3 should transition lead to Admission Confirmed and persist', async () => {
      const res = await fetch(`${baseUrl}/leads/${bulkLead1Id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          status: 'Admission Confirmed',
          notes: 'Student registered and confirmed enrollment.',
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.data.status, 'Admission Confirmed');
    });

    test('10.4 should reject invalid pipeline status (400 Bad Request)', async () => {
      const res = await fetch(`${baseUrl}/leads/${bulkLead1Id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          status: 'RandomUnknownStatus',
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.ok(body.message.includes('Validation failed'));
    });

    test('10.5 should prevent unauthorized counsellor from changing other staff lead status', async () => {
      // Counsellor 2 attempting to change status of Counsellor 1's lead
      // counsellor1LeadId from earlier
      const res = await fetch(`${baseUrl}/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          studentName: 'Private Staff Lead',
          mobileNumber: '9555544444',
          interestedCourse: 'Java',
          leadSource: 'Walk-in',
          assignedCounsellor: counsellor1Id.toString(),
        }),
      });
      const b = await res.json();
      const privateLeadId = b.data.id || b.data._id;

      // Counsellor 2 attempts status update
      const updateRes = await fetch(`${baseUrl}/leads/${privateLeadId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${counsellor2Token}`,
        },
        body: JSON.stringify({
          status: 'Contacted',
        }),
      });

      const updateBody = await updateRes.json();
      assert.equal(updateRes.status, 403);
      assert.equal(updateBody.success, false);
      assert.ok(updateBody.message.includes('not authorized'));
    });
  });

  // --------------------------------------------------------------------------
  // 11. GET /leads/kanban (Kanban Pipeline Endpoint)
  // --------------------------------------------------------------------------
  describe('GET /leads/kanban', () => {
    test('11.1 should fetch all active leads for the Kanban pipeline', async () => {
      const res = await fetch(`${baseUrl}/leads/kanban`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.ok(Array.isArray(body.data));
      assert.ok(body.data.length >= 1);
    });
  });

  // --------------------------------------------------------------------------
  // 12. POST /leads/import (Lead Bulk Import Engine)
  // --------------------------------------------------------------------------
  describe('POST /leads/import', () => {
    test('12.1 should import valid lead records successfully', async () => {
      const res = await fetch(`${baseUrl}/leads/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          leads: [
            {
              studentName: 'Import Candidate 1',
              mobileNumber: '9111122222',
              interestedCourse: 'Data Science',
              leadSource: 'Google Ads',
              qualification: 'B.Sc Statistics',
            },
            {
              studentName: 'Import Candidate 2',
              mobileNumber: '9222233333',
              interestedCourse: 'AI/ML',
              leadSource: 'Website',
            },
          ],
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.successCount, 2);
      assert.equal(body.data.failedRows.length, 0);
    });

    test('12.2 should reject duplicate mobile numbers within the import batch', async () => {
      const res = await fetch(`${baseUrl}/leads/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          leads: [
            {
              studentName: 'Batch Lead A',
              mobileNumber: '9333344444',
              interestedCourse: 'Python',
              leadSource: 'Walk-in',
            },
            {
              studentName: 'Batch Lead B (Duplicate phone)',
              mobileNumber: '9333344444',
              interestedCourse: 'Java',
              leadSource: 'Walk-in',
            },
          ],
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.data.successCount, 1);
      assert.equal(body.data.failedRows.length, 1);
      assert.ok(body.data.failedRows[0].reason.includes('Duplicate mobile number in uploaded file batch'));
    });

    test('12.3 should reject import rows with invalid phone or missing fields', async () => {
      const res = await fetch(`${baseUrl}/leads/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          leads: [
            {
              studentName: '',
              mobileNumber: '123', // invalid
              interestedCourse: 'Python',
              leadSource: 'Website',
            },
          ],
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.data.successCount, 0);
      assert.equal(body.data.failedRows.length, 1);
      assert.ok(body.data.failedRows[0].reason.includes('Missing required fields'));
    });
  });
});
