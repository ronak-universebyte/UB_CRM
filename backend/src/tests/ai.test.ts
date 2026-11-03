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
import { AiCache } from '../utils/ai-cache';

describe('UniverseByte CRM - Phase 8 AI CRM Assistant Test Suite', () => {
  let server: http.Server;
  let baseUrl: string;

  let counsellorToken: string;
  const counsellorId = new mongoose.Types.ObjectId();
  const testLeadId = new mongoose.Types.ObjectId();

  const mockUsers: Record<string, any> = {
    [counsellorId.toString()]: {
      _id: counsellorId,
      id: counsellorId.toString(),
      fullName: 'Vikram Sharma',
      email: 'vikram.sharma@universebyte.com',
      role: 'AdmissionCounsellor',
      permissions: ['leads:read:assigned'],
      isActive: true,
    },
  };

  const inMemoryLeads = new Map<string, any>();
  const inMemoryFollowUps = new Map<string, any>();

  before(async () => {
    AiCache.clear();

    counsellorToken = jwt.sign(
      {
        userId: counsellorId.toString(),
        email: mockUsers[counsellorId.toString()].email,
        role: 'AdmissionCounsellor',
        permissions: ['leads:read:assigned'],
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

    // Seed test lead
    const lead = {
      _id: testLeadId,
      leadId: 'UB-LD-2026-0001',
      studentName: 'Aarav Mehta',
      mobileNumber: '9888811111',
      email: 'aarav.mehta@example.com',
      interestedCourse: 'MERN Full Stack',
      qualification: 'B.Tech CS',
      graduationYear: '2025',
      leadSource: 'Website',
      status: 'Interested',
      priority: 'Hot',
      budget: 45000,
      expectedAdmissionDate: new Date('2026-12-01'),
      isDeleted: false,
      updatedAt: new Date(),
    };
    inMemoryLeads.set(testLeadId.toString(), lead);

    // Seed lost leads for analysis test
    inMemoryLeads.set('lost-1', {
      _id: new mongoose.Types.ObjectId(),
      studentName: 'Rohan Verma',
      interestedCourse: 'Data Science',
      leadSource: 'Google Ads',
      status: 'Lost',
      remarks: 'Course fee is too high, budget mismatch',
      isDeleted: false,
    });
    inMemoryLeads.set('lost-2', {
      _id: new mongoose.Types.ObjectId(),
      studentName: 'Kunal Sen',
      interestedCourse: 'Data Science',
      leadSource: 'Google Ads',
      status: 'Lost',
      remarks: 'Timing issues with college semester exams',
      isDeleted: false,
    });

    // Seed follow-up
    inMemoryFollowUps.set('f-1', {
      _id: new mongoose.Types.ObjectId(),
      leadId: testLeadId,
      type: 'Call',
      status: 'Completed',
      scheduledAt: new Date(),
      counsellingNotes: 'Candidate asked about weekend batch timing and placement assistance.',
    });

    // Mock Lead.findById
    Lead.findById = ((id: any) => {
      const idStr = id?.toString ? id.toString() : id;
      const found = inMemoryLeads.get(idStr) || null;
      const chain: any = {
        select: () => chain,
        exec: async () => found,
        then: (resolve: any) => Promise.resolve(found).then(resolve),
      };
      return chain;
    }) as any;

    // Mock Lead.find
    Lead.find = ((query: any = {}) => {
      let results: any[] = [];
      for (const l of inMemoryLeads.values()) {
        let match = true;
        if (query.isDeleted !== undefined && l.isDeleted !== query.isDeleted) match = false;
        if (query.status?.$in && !query.status.$in.includes(l.status)) match = false;
        if (match) results.push(l);
      }
      const chain: any = {
        sort: () => chain,
        limit: () => chain,
        select: () => chain,
        exec: async () => results,
        then: (resolve: any) => Promise.resolve(results).then(resolve),
      };
      return chain;
    }) as any;

    // Mock FollowUp.find
    FollowUp.find = ((query: any = {}) => {
      let results: any[] = [];
      for (const f of inMemoryFollowUps.values()) {
        let match = true;
        if (query.leadId && f.leadId.toString() !== query.leadId.toString()) match = false;
        if (match) results.push(f);
      }
      const chain: any = {
        sort: () => chain,
        limit: () => chain,
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

  // --------------------------------------------------------------------------
  // 1. AI STATUS & CAPABILITIES
  // --------------------------------------------------------------------------
  describe('GET /ai/status', () => {
    test('1.1 should return AI Assistant configuration status', async () => {
      const res = await fetch(`${baseUrl}/ai/status`, {
        headers: { Authorization: `Bearer ${counsellorToken}` },
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok('isConfigured' in json.data);
      assert.ok(json.data.model);
      assert.ok(Array.isArray(json.data.features));
    });

    test('1.2 should reject unauthenticated request with 401', async () => {
      const res = await fetch(`${baseUrl}/ai/status`);
      assert.equal(res.status, 401);
    });
  });

  // --------------------------------------------------------------------------
  // 2. LEAD SCORING (0-100, Hot/Warm/Cold, Reasons)
  // --------------------------------------------------------------------------
  describe('GET /ai/score/:leadId', () => {
    test('2.1 should score lead between 0 and 100 with category and reasons', async () => {
      const res = await fetch(`${baseUrl}/ai/score/${testLeadId.toString()}`, {
        headers: { Authorization: `Bearer ${counsellorToken}` },
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);

      const scoreData = json.data;
      assert.ok(typeof scoreData.score === 'number');
      assert.ok(scoreData.score >= 0 && scoreData.score <= 100);
      assert.ok(['Hot', 'Warm', 'Cold'].includes(scoreData.category));
      assert.ok(Array.isArray(scoreData.reasons));
      assert.ok(scoreData.reasons.length > 0);
      assert.equal(scoreData.isSuggestion, true);
      assert.ok(scoreData.disclaimer);

      // Verify lead status in database was NOT automatically altered (Safety invariant)
      const lead = inMemoryLeads.get(testLeadId.toString());
      assert.equal(lead.status, 'Interested'); // Unchanged
    });

    test('2.2 should return cached lead score on immediate repeat request', async () => {
      const res1 = await fetch(`${baseUrl}/ai/score/${testLeadId.toString()}`, {
        headers: { Authorization: `Bearer ${counsellorToken}` },
      });
      const json1 = await res1.json();

      const res2 = await fetch(`${baseUrl}/ai/score/${testLeadId.toString()}`, {
        headers: { Authorization: `Bearer ${counsellorToken}` },
      });
      const json2 = await res2.json();

      assert.equal(json1.data.score, json2.data.score);
    });
  });

  // --------------------------------------------------------------------------
  // 3. AI FOLLOW-UP ASSISTANT
  // --------------------------------------------------------------------------
  describe('GET /ai/followup-advice/:leadId', () => {
    test('3.1 should recommend next best action, timing, and counselling points', async () => {
      const res = await fetch(`${baseUrl}/ai/followup-advice/${testLeadId.toString()}`, {
        headers: { Authorization: `Bearer ${counsellorToken}` },
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);

      const advice = json.data;
      assert.ok(advice.nextBestAction);
      assert.ok(advice.suggestedTiming);
      assert.ok(Array.isArray(advice.counsellingSuggestions));
      assert.ok(advice.counsellingSuggestions.length > 0);
      assert.ok(advice.callOpeningScript);
      assert.equal(advice.isSuggestion, true);
    });
  });

  // --------------------------------------------------------------------------
  // 4. MULTI-LINGUAL WHATSAPP MESSAGE GENERATOR
  // --------------------------------------------------------------------------
  describe('POST /ai/generate-message', () => {
    test('4.1 should generate English message with course and student name', async () => {
      const res = await fetch(`${baseUrl}/ai/generate-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${counsellorToken}`,
        },
        body: JSON.stringify({
          studentName: 'Aarav Mehta',
          course: 'MERN Full Stack',
          scenario: 'followup',
          language: 'en',
          tone: 'friendly',
        }),
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.data.messageBody.includes('Aarav Mehta'));
      assert.ok(json.data.messageBody.includes('MERN Full Stack'));
      assert.equal(json.data.language, 'en');
      assert.equal(json.data.isSuggestion, true);
    });

    test('4.2 should generate Hindi message in Devanagari script', async () => {
      const res = await fetch(`${baseUrl}/ai/generate-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${counsellorToken}`,
        },
        body: JSON.stringify({
          studentName: 'Rohan',
          course: 'Python with AI',
          scenario: 'demo',
          language: 'hi',
          tone: 'motivational',
        }),
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.data.messageBody.includes('Rohan'));
      assert.equal(json.data.language, 'hi');
    });

    test('4.3 should generate Hinglish conversational message', async () => {
      const res = await fetch(`${baseUrl}/ai/generate-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${counsellorToken}`,
        },
        body: JSON.stringify({
          studentName: 'Priya',
          course: 'Data Science',
          scenario: 'counselling',
          language: 'hinglish',
          tone: 'friendly',
        }),
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.data.messageBody.includes('Priya'));
      assert.equal(json.data.language, 'hinglish');
    });
  });

  // --------------------------------------------------------------------------
  // 5. LEAD SUMMARY & UNANSWERED QUESTIONS
  // --------------------------------------------------------------------------
  describe('GET /ai/summary/:leadId', () => {
    test('5.1 should summarize interaction history and highlight unanswered questions', async () => {
      const res = await fetch(`${baseUrl}/ai/summary/${testLeadId.toString()}`, {
        headers: { Authorization: `Bearer ${counsellorToken}` },
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);

      const summary = json.data;
      assert.ok(summary.summary);
      assert.ok(Array.isArray(summary.keyCounsellingPoints));
      assert.ok(Array.isArray(summary.unansweredQuestions));
      assert.ok(summary.recommendedNextStep);
      assert.equal(summary.isSuggestion, true);
    });
  });

  // --------------------------------------------------------------------------
  // 6. LOST LEAD ANALYSIS
  // --------------------------------------------------------------------------
  describe('GET /ai/lost-analysis', () => {
    test('6.1 should analyze recorded lost reasons and output primary objections and remediation', async () => {
      const res = await fetch(`${baseUrl}/ai/lost-analysis?limit=20`, {
        headers: { Authorization: `Bearer ${counsellorToken}` },
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);

      const analysis = json.data;
      assert.ok(analysis.totalAnalyzed >= 2);
      assert.ok(analysis.primaryObjectionCategory);
      assert.ok(Array.isArray(analysis.driverBreakdown));
      assert.ok(Array.isArray(analysis.remediationStrategies));
      assert.ok(analysis.remediationStrategies.length > 0);
      assert.ok(['High', 'Medium', 'Low'].includes(analysis.reEngagementPotential));
      assert.equal(analysis.isSuggestion, true);
    });
  });

  // --------------------------------------------------------------------------
  // 7. ERROR HANDLING, TIMEOUT & RATE LIMIT RESILIENCE
  // --------------------------------------------------------------------------
  describe('AI Reliability, Timeouts & Rate Limits', () => {
    test('7.1 should attach standard RateLimit headers on AI endpoints', async () => {
      const res = await fetch(`${baseUrl}/ai/status`, {
        headers: { Authorization: `Bearer ${counsellorToken}` },
      });

      assert.equal(res.status, 200);
      assert.ok(res.headers.get('ratelimit-limit') || res.headers.get('x-ratelimit-limit'));
    });

    test('7.2 should reject invalid message generation payloads with 400 Bad Request', async () => {
      const res = await fetch(`${baseUrl}/ai/generate-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${counsellorToken}`,
        },
        body: JSON.stringify({
          studentName: '', // empty name
          scenario: 'invalid_scenario',
        }),
      });

      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.success, false);
    });

    test('7.3 should safely handle non-existent lead ID with 404 Not Found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await fetch(`${baseUrl}/ai/score/${nonExistentId}`, {
        headers: { Authorization: `Bearer ${counsellorToken}` },
      });

      assert.equal(res.status, 404);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.ok(json.message.includes('Lead not found'));
    });
  });
});

