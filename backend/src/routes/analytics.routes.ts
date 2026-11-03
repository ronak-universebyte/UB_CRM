import { Router } from 'express';
import {
  getDashboardCards,
  getDashboardCharts,
  getReportData,
  exportReportCsv,
} from '../controllers/analytics.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validateQuery } from '../middlewares/validate.middleware';
import {
  dashboardFilterSchema,
  reportQuerySchema,
} from '../validators/analytics.validator';

const router = Router();

// All analytics endpoints require valid JWT authentication
router.use(requireAuth);

// Dashboard Overview
router.get('/cards', validateQuery(dashboardFilterSchema), getDashboardCards);
router.get('/charts', validateQuery(dashboardFilterSchema), getDashboardCharts);

// Comprehensive Reports
router.get('/reports', validateQuery(reportQuerySchema), getReportData);
router.get('/reports/export', validateQuery(reportQuerySchema), exportReportCsv);

export default router;

