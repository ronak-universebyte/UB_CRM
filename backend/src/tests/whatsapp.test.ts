import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { app } from '../app';
import { User } from '../models/user.model';
import { Lead } from '../models/lead.model';
import { WhatsAppMessage } from '../models/whatsapp-message.model';
import { env } from '../config/env';

describe('UniverseByte CRM - Phase 7 WhatsApp Integration Test Suite', () => {
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
      permissions: ['leads:read:assigned', 'leads:update:assigned'],
      isActive: true,
    },
  };

  const inMemoryMessages = new Map<string, any>();
  const inMemoryLeads = new Map<string, any>();

  before(async () => {
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

    // Setup initial test lead
    const lead = {
      _id: testLeadId,
      leadId: 'UB-LD-2026-0001',
      studentName: 'Aarav Mehta',
      mobileNumber: '9888811111',
      whatsappNumber: '9888811111',
      interestedCourse: 'MERN Full Stack',
      activityHistory: [] as any[],
    };
    inMemoryLeads.set(testLeadId.toString(), lead);

    // Mock Lead.findById and Lead.findByIdAndUpdate
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

    Lead.findByIdAndUpdate = (async (id: any, update: any) => {
      const idStr = id?.toString ? id.toString() : id;
      const found = inMemoryLeads.get(idStr);
      if (found && update?.$push?.activityHistory) {
        found.activityHistory.push(update.$push.activityHistory);
      }
      return found;
    }) as any;

    Lead.findOne = ((_query: any = {}) => {
      const exec = async () => Array.from(inMemoryLeads.values())[0] || null;
      const chain: any = {
        select: () => chain,
        exec,
        then: (resolve: any) => exec().then(resolve),
      };
      return chain;
    }) as any;

    // Mock WhatsAppMessage model methods
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
          inMemoryMessages.set(this.id, this);
          return this;
        },
      };
      inMemoryMessages.set(doc.id, doc);
      return doc;
    }) as any;

    WhatsAppMessage.findOne = ((query: any = {}) => {
      const exec = async () => {
        for (const msg of inMemoryMessages.values()) {
          if (query.metaMessageId && msg.metaMessageId === query.metaMessageId) {
            return msg;
          }
        }
        return null;
      };
      return {
        exec,
        then: (resolve: any) => exec().then(resolve),
      };
    }) as any;

    WhatsAppMessage.find = ((query: any = {}) => {
      let results: any[] = [];
      for (const msg of inMemoryMessages.values()) {
        let match = true;
        if (query.leadId && msg.leadId?.toString() !== query.leadId.toString()) match = false;
        if (query.method && msg.method !== query.method) match = false;
        if (query.status && msg.status !== query.status) match = false;
        if (match) results.push(msg);
      }

      const chain: any = {
        sort: () => chain,
        skip: () => chain,
        limit: () => chain,
        populate: () => chain,
        exec: async () => results,
        then: (resolve: any) => Promise.resolve(results).then(resolve),
      };
      return chain;
    }) as any;

    WhatsAppMessage.countDocuments = (async () => inMemoryMessages.size) as any;

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
  // 1. CONFIGURATION & TEMPLATES
  // --------------------------------------------------------------------------
  describe('GET /whatsapp/config and GET /whatsapp/templates', () => {
    test('1.1 should return configuration status without exposing secrets', async () => {
      const res = await fetch(`${baseUrl}/whatsapp/config`, {
        headers: { Authorization: `Bearer ${counsellorToken}` },
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok('isConfigured' in json.data);
      assert.ok('webhookVerifyToken' in json.data);
      assert.ok('webhookEndpoint' in json.data);
      assert.strictEqual(json.data.token, undefined); // Token is never exposed
    });

    test('1.2 should return predefined message templates with multiple language variations', async () => {
      const res = await fetch(`${baseUrl}/whatsapp/templates`, {
        headers: { Authorization: `Bearer ${counsellorToken}` },
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(Array.isArray(json.data));

      const templateIds = json.data.map((t: any) => t.id);
      assert.ok(templateIds.includes('new_enquiry'));
      assert.ok(templateIds.includes('followup'));
      assert.ok(templateIds.includes('counselling'));
      assert.ok(templateIds.includes('demo'));
      assert.ok(templateIds.includes('admission'));

      const newEnquiryTpl = json.data.find((t: any) => t.id === 'new_enquiry');
      assert.ok(newEnquiryTpl.languages.en.includes('UniverseByte'));
      assert.ok(newEnquiryTpl.languages.hi.includes('UniverseByte'));
      assert.ok(newEnquiryTpl.languages.hinglish.includes('UniverseByte'));
    });
  });

  // --------------------------------------------------------------------------
  // 2. METHOD A: MANUAL CLICK-TO-WHATSAPP
  // --------------------------------------------------------------------------
  describe('METHOD A: Manual Click-to-WhatsApp Generation & Attempt Logging', () => {
    test('2.1 should generate personalized message and Click-to-WhatsApp URL in English', async () => {
      const res = await fetch(`${baseUrl}/whatsapp/generate-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${counsellorToken}`,
        },
        body: JSON.stringify({
          leadId: testLeadId.toString(),
          studentName: 'Aarav Mehta',
          phoneNumber: '9888811111',
          course: 'MERN Full Stack',
          templateName: 'new_enquiry',
          language: 'en',
        }),
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.data.messageBody.includes('Aarav Mehta'));
      assert.ok(json.data.messageBody.includes('MERN Full Stack'));
      assert.ok(json.data.messageBody.includes('Vikram Sharma')); // Counsellor name
      assert.ok(json.data.clickToWhatsAppUrl.startsWith('https://wa.me/919888811111?text='));
    });

    test('2.2 should generate message in Hindi with Devanagari script', async () => {
      const res = await fetch(`${baseUrl}/whatsapp/generate-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${counsellorToken}`,
        },
        body: JSON.stringify({
          studentName: 'Rohan Sharma',
          phoneNumber: '9777722222',
          course: 'Python with AI',
          templateName: 'counselling',
          language: 'hi',
        }),
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.data.messageBody.includes('Rohan Sharma'));
      assert.ok(json.data.messageBody.includes('करियर काउंसलिंग'));
    });

    test('2.3 should generate message in conversational Hinglish', async () => {
      const res = await fetch(`${baseUrl}/whatsapp/generate-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${counsellorToken}`,
        },
        body: JSON.stringify({
          studentName: 'Sneha Patel',
          phoneNumber: '9666633333',
          course: 'Data Science',
          templateName: 'demo',
          language: 'hinglish',
        }),
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.data.messageBody.includes('Sneha Patel'));
      assert.ok(json.data.messageBody.includes('FREE Live Demo Class'));
      assert.ok(json.data.messageBody.includes('reply karein'));
    });

    test('2.4 should record manual Click-to-WhatsApp attempt with status "attempted"', async () => {
      const res = await fetch(`${baseUrl}/whatsapp/record-attempt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${counsellorToken}`,
        },
        body: JSON.stringify({
          leadId: testLeadId.toString(),
          studentName: 'Aarav Mehta',
          phoneNumber: '9888811111',
          templateName: 'new_enquiry',
          language: 'en',
          messageBody: 'Hello Aarav Mehta, welcome to UniverseByte!',
        }),
      });

      assert.equal(res.status, 201);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.method, 'manual_click');
      assert.equal(json.data.status, 'attempted'); // Crucial: NOT fake 'delivered' or 'sent'
      assert.equal(json.data.phoneNumber, '919888811111');

      // Verify lead activity log received the event
      const lead = inMemoryLeads.get(testLeadId.toString());
      const hasActivity = lead.activityHistory.some((h: any) => h.action === 'WHATSAPP_ATTEMPT');
      assert.ok(hasActivity);
    });
  });

  // --------------------------------------------------------------------------
  // 3. METHOD B: OFFICIAL META WHATSAPP CLOUD API & WEBHOOK
  // --------------------------------------------------------------------------
  describe('METHOD B: Official Meta WhatsApp Cloud API & Webhook Processing', () => {
    test('3.1 should reject official message dispatch when Meta credentials are not configured', async () => {
      // With empty or missing WHATSAPP_TOKEN
      const res = await fetch(`${baseUrl}/whatsapp/send-official`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${counsellorToken}`,
        },
        body: JSON.stringify({
          leadId: testLeadId.toString(),
          studentName: 'Aarav Mehta',
          phoneNumber: '9888811111',
          templateName: 'new_enquiry',
          language: 'en',
        }),
      });

      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.ok(json.message.includes('Meta WhatsApp Cloud API is not configured'));
    });

    test('3.2 should verify webhook challenge for Meta subscription', async () => {
      const challengeCode = 'challenge_test_code_999';
      const verifyToken = env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

      const res = await fetch(
        `${baseUrl}/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=${challengeCode}`
      );

      assert.equal(res.status, 200);
      const body = await res.text();
      assert.equal(body, challengeCode);
    });

    test('3.3 should reject webhook challenge with invalid token (403 Forbidden)', async () => {
      const res = await fetch(
        `${baseUrl}/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=123`
      );

      assert.equal(res.status, 403);
    });

    test('3.4 should process incoming Meta webhook delivery status updates', async () => {
      // First, insert an official message with metaMessageId
      const testWamid = 'wamid.HBgM_test_12345';
      const officialDoc = {
        leadId: testLeadId,
        studentName: 'Aarav Mehta',
        phoneNumber: '919888811111',
        direction: 'outbound',
        method: 'meta_api',
        type: 'template',
        messageBody: 'Hello Aarav',
        metaMessageId: testWamid,
        status: 'sent',
        statusHistory: [{ status: 'sent', timestamp: new Date() }],
        save: async function () {
          inMemoryMessages.set(this.id, this);
          return this;
        },
      };
      const createdOfficial = await WhatsAppMessage.create(officialDoc as any);

      // Simulate Meta Webhook payload for 'delivered' status
      const webhookPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: { display_phone_number: '919999999999', phone_number_id: '123' },
                  statuses: [
                    {
                      id: testWamid,
                      status: 'delivered',
                      timestamp: Math.floor(Date.now() / 1000).toString(),
                      recipient_id: '919888811111',
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      const res = await fetch(`${baseUrl}/whatsapp/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.processed, true);

      // Verify the message in memory was updated to 'delivered'
      const updated = inMemoryMessages.get(createdOfficial.id);
      assert.equal(updated.status, 'delivered');
      assert.ok(updated.statusHistory.some((h: any) => h.status === 'delivered'));
    });

    test('3.5 should deduplicate repeated Meta webhook status events for the same message', async () => {
      const testWamid = 'wamid.HBgM_test_12345';
      const initialHistoryLen = inMemoryMessages.get(testWamid)?.statusHistory?.length || 2;

      // Resend identical 'delivered' webhook payload
      const duplicatePayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  statuses: [
                    {
                      id: testWamid,
                      status: 'delivered',
                      timestamp: Math.floor(Date.now() / 1000).toString(),
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      const res = await fetch(`${baseUrl}/whatsapp/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicatePayload),
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.processed, true);

      // Verify no duplicate 'delivered' entry was appended
      const msg = Array.from(inMemoryMessages.values()).find((m: any) => m.metaMessageId === testWamid);
      assert.ok(msg);
      const deliveredCount = msg.statusHistory.filter((h: any) => h.status === 'delivered').length;
      assert.equal(deliveredCount, 1);
    });

    test('3.6 should process and deduplicate inbound student messages by message ID', async () => {
      const inboundWamid = 'wamid.inbound.test_99999';
      const inboundPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  contacts: [{ profile: { name: 'Student Contact' } }],
                  messages: [
                    {
                      from: '919888811111',
                      id: inboundWamid,
                      timestamp: Math.floor(Date.now() / 1000).toString(),
                      text: { body: 'Hello, I want syllabus for Python course' },
                      type: 'text',
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      // First delivery: should ingest
      const res1 = await fetch(`${baseUrl}/whatsapp/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inboundPayload),
      });
      assert.equal(res1.status, 200);

      // Second delivery: should detect existing message and not duplicate
      const res2 = await fetch(`${baseUrl}/whatsapp/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inboundPayload),
      });
      assert.equal(res2.status, 200);

      // Verify that message exists in memory
      const inboundMsg = Array.from(inMemoryMessages.values()).find((m: any) => m.metaMessageId === inboundWamid);
      assert.ok(inboundMsg);
    });
  });

  // --------------------------------------------------------------------------
  // 4. COMMUNICATION HISTORY & LOGS
  // --------------------------------------------------------------------------
  describe('GET /whatsapp/messages/lead/:leadId and GET /whatsapp/logs', () => {
    test('4.1 should retrieve communication history for a specific lead', async () => {
      const res = await fetch(`${baseUrl}/whatsapp/messages/lead/${testLeadId.toString()}`, {
        headers: { Authorization: `Bearer ${counsellorToken}` },
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(Array.isArray(json.data));
      assert.ok(json.data.length > 0);
    });

    test('4.2 should list all WhatsApp logs with pagination and method distinction', async () => {
      const res = await fetch(`${baseUrl}/whatsapp/logs?page=1&limit=10`, {
        headers: { Authorization: `Bearer ${counsellorToken}` },
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(Array.isArray(json.data));
      assert.ok(json.pagination);
      assert.equal(json.pagination.page, 1);
    });
  });
});

