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

describe('UniverseByte CRM - Phase 6 Analytics & Dashboard Test Suite', () => {
  let server: http.Server;
  let baseUrl: string;

  // Mock Tokens
  let superAdminToken: string;
  let counsellorToken: string;

  const superAdminId = new mongoose.Types.ObjectId();
  const counsellorId = new mongoose.Types.ObjectId();

  const mockUsers: Record<string, any> = {
    [superAdminId.toString()]: {
      _id: superAdminId,
      id: superAdminId.toString(),
      fullName: 'Super Admin',
      email: 'admin@universebyte.com',
      role: 'SuperAdmin',
      permissions: ['*'],
      isActive: true,
    },
    [counsellorId.toString()]: {
      _id: counsellorId,
      id: counsellorId.toString(),
      fullName: 'Ravi Kumar',
      email: 'ravi.kumar@universebyte.com',
      role: 'AdmissionCounsellor',
      permissions: ['leads:read:assigned'],
      isActive: true,
    },
  };

  before(async () => {
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

    // Mock Lead.find
    Lead.find = ((query: any = {}) => {
      let results: any[] = [];
      if (query.status === 'Admission Confirmed') {
        results = [
          {
            leadId: 'UB-LD-2026-0001',
            studentName: 'Aarav Mehta',
            mobileNumber: '9888811111',
            interestedCourse: 'MERN Full Stack',
            leadSource: 'Website',
            budget: 45000,
            assignedCounsellor: { fullName: 'Ravi Kumar', email: 'ravi.kumar@universebyte.com' },
            updatedAt: new Date(),
          },
        ];
      } else if (query.status?.$in) {
        results = [
          {
            leadId: 'UB-LD-2026-0005',
            studentName: 'Sameer Khan',
            mobileNumber: '9888877777',
            interestedCourse: 'Java',
            leadSource: 'Website',
            status: 'Lost',
            remarks: 'Fees too high',
            assignedCounsellor: { fullName: 'Ravi Kumar', email: 'ravi.kumar@universebyte.com' },
            updatedAt: new Date(),
            activityHistory: [{ action: 'STATUS_CHANGED', note: 'Marked as Lost' }],
          },
        ];
      }

      const chain: any = {
        sort: () => chain,
        populate: () => chain,
        select: () => chain,
        exec: async () => results,
        then: (resolve: any) => Promise.resolve(results).then(resolve),
      };
      return chain;
    }) as any;

    // Mock Lead.aggregate to handle dashboard cards, charts, and reports
    Lead.aggregate = (async (pipeline: any[]) => {
      // Check if this is the dashboard cards facet
      const facetStage = pipeline.find((p) => p.$facet);
      if (facetStage) {
        return [
          {
            total: [{ count: 120 }],
            inFilterRange: [{ count: 85 }],
            today: [{ count: 12 }],
            byStatus: [
              { _id: 'New', count: 25 },
              { _id: 'Contacted', count: 20 },
              { _id: 'Not Contacted', count: 10 },
              { _id: 'Interested', count: 15 },
              { _id: 'Admission Confirmed', count: 12 },
              { _id: 'Lost', count: 3 },
            ],
            totalAdmissions: [{ _id: null, count: 12, totalFee: 540000 }],
          },
        ];
      }

      // Check if daily generation group stage
      const hasDateFormatDay = pipeline.some(
        (p) => p.$group?._id?.$dateToString?.format === '%Y-%m-%d'
      );
      if (hasDateFormatDay) {
        return [
          { date: '2026-11-01', leads: 5, admissions: 1 },
          { date: '2026-11-02', leads: 8, admissions: 2 },
          { date: '2026-11-03', leads: 12, admissions: 3 },
        ];
      }

      // Check if monthly generation group stage
      const hasDateFormatMonth = pipeline.some(
        (p) => p.$group?._id?.$dateToString?.format === '%Y-%m'
      );
      if (hasDateFormatMonth) {
        return [
          { month: '2026-09', leads: 40, admissions: 6, conversionRate: 15.0 },
          { month: '2026-10', leads: 65, admissions: 10, conversionRate: 15.4 },
          { month: '2026-11', leads: 25, admissions: 4, conversionRate: 16.0 },
        ];
      }

      // Check if source-wise group stage
      const hasSourceGroup = pipeline.some((p) => p.$group?._id === '$leadSource');
      if (hasSourceGroup) {
        return [
          {
            source: 'Website',
            totalLeads: 30,
            admissions: 5,
            lost: 2,
            inProgress: 23,
            totalBudget: 250000,
            conversionRate: 16.7,
          },
          {
            source: 'Google Ads',
            totalLeads: 25,
            admissions: 4,
            lost: 3,
            inProgress: 18,
            totalBudget: 190000,
            conversionRate: 16.0,
          },
        ];
      }

      // Check if course-wise group stage
      const hasCourseGroup = pipeline.some((p) => p.$group?._id === '$interestedCourse');
      if (hasCourseGroup) {
        return [
          { course: 'MERN Full Stack', enquiries: 45, admissions: 8, totalRevenue: 360000 },
          { course: 'Python with AI', enquiries: 30, admissions: 5, totalRevenue: 225000 },
          { course: 'Data Science', enquiries: 20, admissions: 3, totalRevenue: 150000 },
        ];
      }

      // Check if counsellor performance stage (has $lookup on users)
      const hasLookupUsers = pipeline.some((p) => p.$lookup?.from === 'users');
      if (hasLookupUsers) {
        return [
          {
            counsellorId: counsellorId.toString(),
            counsellorName: 'Ravi Kumar',
            totalAssigned: 50,
            admissions: 8,
            lost: 4,
            inProgress: 38,
            totalRevenue: 360000,
            conversionRate: 16.0,
          },
        ];
      }

      // Check if campaign group stage
      const hasCampaignGroup = pipeline.some((p) => p.$group?._id === '$campaign');
      if (hasCampaignGroup) {
        return [
          { campaign: 'Diwali 2026', totalLeads: 25, admissions: 4, lost: 2, totalBudget: 180000, conversionRate: 16.0 },
          { campaign: 'Google Search Q4', totalLeads: 40, admissions: 6, lost: 5, totalBudget: 270000, conversionRate: 15.0 },
        ];
      }

      return [];
    }) as any;

    // Mock FollowUp.aggregate
    FollowUp.aggregate = (async (pipeline: any[]) => {
      const facetStage = pipeline.find((p) => p.$facet);
      if (facetStage) {
        return [
          {
            todayDue: [{ count: 8 }],
            overdue: [{ count: 3 }],
          },
        ];
      }

      // Follow-up report group stage
      const hasFollowupTypeGroup = pipeline.some((p) => p.$group?._id === '$type');
      if (hasFollowupTypeGroup) {
        return [
          {
            channel: 'Call',
            total: 35,
            completed: 25,
            rescheduled: 5,
            pending: 5,
            completionRate: 71.4,
          },
        ];
      }

      return [];
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
  // 1. DASHBOARD KPI CARDS (10 Core Metrics via MongoDB Aggregation)
  // --------------------------------------------------------------------------
  describe('GET /analytics/cards', () => {
    test('1.1 should return all 10 core KPI cards with valid calculations', async () => {
      const res = await fetch(`${baseUrl}/analytics/cards?preset=last30days`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.data);

      const cards = json.data;
      assert.equal(cards.totalLeads, 85);
      assert.equal(cards.todayLeads, 12);
      assert.equal(cards.newLeads, 25);
      assert.equal(cards.contacted, 30); // 20 contacted + 10 not contacted
      assert.equal(cards.interested, 15);
      assert.equal(cards.followUpDue, 8);
      assert.equal(cards.overdue, 3);
      assert.equal(cards.admissionConfirmed, 12);
      assert.equal(cards.lostLeads, 3);
      assert.equal(cards.conversionRate, '14.1%'); // 12 / 85 * 100 = 14.1%
      assert.equal(cards.conversionRateNumber, 14.1);
      assert.equal(cards.totalRevenuePotential, 540000);
      assert.ok(cards.dateRange);
      assert.equal(cards.dateRange.preset, 'last30days');
    });

    test('1.2 should accept custom date range filters', async () => {
      const res = await fetch(
        `${baseUrl}/analytics/cards?preset=custom&startDate=2026-11-01&endDate=2026-11-03`,
        {
          headers: { Authorization: `Bearer ${superAdminToken}` },
        }
      );

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.dateRange.preset, 'custom');
    });

    test('1.3 should scope metrics to counsellor when called by counsellor role', async () => {
      const res = await fetch(`${baseUrl}/analytics/cards?preset=thismonth`, {
        headers: { Authorization: `Bearer ${counsellorToken}` },
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.data.totalLeads >= 0);
    });

    test('1.4 should reject unauthenticated requests with 401', async () => {
      const res = await fetch(`${baseUrl}/analytics/cards`);
      assert.equal(res.status, 401);
    });
  });

  // --------------------------------------------------------------------------
  // 2. DASHBOARD CHARTS (6 Visualizations)
  // --------------------------------------------------------------------------
  describe('GET /analytics/charts', () => {
    test('2.1 should return all 6 chart datasets successfully', async () => {
      const res = await fetch(`${baseUrl}/analytics/charts?preset=last30days`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      const charts = json.data;

      // 1. Daily lead generation
      assert.ok(Array.isArray(charts.dailyGeneration));
      assert.ok(charts.dailyGeneration.length > 0);
      assert.ok(charts.dailyGeneration[0].date);
      assert.ok(typeof charts.dailyGeneration[0].leads === 'number');

      // 2. Monthly lead generation
      assert.ok(Array.isArray(charts.monthlyGeneration));
      assert.ok(charts.monthlyGeneration.length > 0);
      assert.ok(charts.monthlyGeneration[0].month);

      // 3. Source-wise lead distribution
      assert.ok(Array.isArray(charts.sourceDistribution));
      assert.ok(charts.sourceDistribution.length > 0);
      assert.equal(charts.sourceDistribution[0].source, 'Website');

      // 4. Course-wise enquiries
      assert.ok(Array.isArray(charts.courseDistribution));
      assert.ok(charts.courseDistribution.length > 0);
      assert.equal(charts.courseDistribution[0].course, 'MERN Full Stack');

      // 5. Counsellor performance
      assert.ok(Array.isArray(charts.counsellorPerformance));
      assert.ok(charts.counsellorPerformance.length > 0);
      assert.equal(charts.counsellorPerformance[0].counsellorName, 'Ravi Kumar');

      // 6. Admission conversion trends
      assert.ok(Array.isArray(charts.admissionConversionTrends));
      assert.ok(charts.admissionConversionTrends.length > 0);
    });
  });

  // --------------------------------------------------------------------------
  // 3. REPORTS (7 Domain Reports)
  // --------------------------------------------------------------------------
  describe('GET /analytics/reports', () => {
    test('3.1 should return Lead Source report', async () => {
      const res = await fetch(`${baseUrl}/analytics/reports?reportType=source&preset=last30days`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.reportType, 'source');
      assert.ok(Array.isArray(json.data.rows));
      assert.equal(json.data.rows[0].source, 'Website');
    });

    test('3.2 should return Course Enquiry report', async () => {
      const res = await fetch(`${baseUrl}/analytics/reports?reportType=course&preset=last30days`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.reportType, 'course');
      assert.ok(Array.isArray(json.data.rows));
      assert.equal(json.data.rows[0].course, 'MERN Full Stack');
    });

    test('3.3 should return Counsellor Performance report', async () => {
      const res = await fetch(`${baseUrl}/analytics/reports?reportType=counsellor&preset=last30days`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.reportType, 'counsellor');
      assert.equal(json.data.rows[0].counsellorName, 'Ravi Kumar');
    });

    test('3.4 should return Admission report', async () => {
      const res = await fetch(`${baseUrl}/analytics/reports?reportType=admission&preset=last30days`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.reportType, 'admission');
      assert.equal(json.data.rows[0].studentName, 'Aarav Mehta');
    });

    test('3.5 should return Lost Lead report', async () => {
      const res = await fetch(`${baseUrl}/analytics/reports?reportType=lost&preset=last30days`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.reportType, 'lost');
      assert.equal(json.data.rows[0].studentName, 'Sameer Khan');
    });

    test('3.6 should return Follow-up report', async () => {
      const res = await fetch(`${baseUrl}/analytics/reports?reportType=followup&preset=last30days`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.reportType, 'followup');
      assert.equal(json.data.rows[0].channel, 'Call');
    });

    test('3.7 should return Campaign report', async () => {
      const res = await fetch(`${baseUrl}/analytics/reports?reportType=campaign&preset=last30days`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.reportType, 'campaign');
      assert.equal(json.data.rows[0].campaign, 'Diwali 2026');
    });

    test('3.8 should reject invalid reportType with 400', async () => {
      const res = await fetch(`${baseUrl}/analytics/reports?reportType=invalid_type`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });

      assert.equal(res.status, 400);
    });
  });

  // --------------------------------------------------------------------------
  // 4. REPORT CSV EXPORT
  // --------------------------------------------------------------------------
  describe('GET /analytics/reports/export', () => {
    test('4.1 should stream RFC-compliant CSV with headers and escaped values', async () => {
      const res = await fetch(
        `${baseUrl}/analytics/reports/export?reportType=source&preset=last30days`,
        {
          headers: { Authorization: `Bearer ${superAdminToken}` },
        }
      );

      assert.equal(res.status, 200);
      const contentType = res.headers.get('content-type');
      assert.ok(contentType?.includes('text/csv'));
      const disposition = res.headers.get('content-disposition');
      assert.ok(disposition?.includes('universebyte-source-report'));

      const csvText = await res.text();
      assert.ok(csvText.includes('source,totalLeads,admissions'));
      assert.ok(csvText.includes('"Website"'));
      assert.ok(csvText.includes('"16.7%"'));
    });
  });
});
