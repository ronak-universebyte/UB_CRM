import { Request, Response } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { ApiResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { ApiError } from '../utils/api-error';

export const getDashboardCards = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const filter = {
    preset: req.query.preset as any,
    startDate: req.query.startDate as string | undefined,
    endDate: req.query.endDate as string | undefined,
    counsellorId: req.query.counsellorId as string | undefined,
  };

  const cards = await AnalyticsService.getDashboardCards(filter, req.user);
  res.json(ApiResponse.success('Dashboard metrics retrieved successfully', cards));
});

export const getDashboardCharts = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const filter = {
    preset: req.query.preset as any,
    startDate: req.query.startDate as string | undefined,
    endDate: req.query.endDate as string | undefined,
    counsellorId: req.query.counsellorId as string | undefined,
  };

  const charts = await AnalyticsService.getDashboardCharts(filter, req.user);
  res.json(ApiResponse.success('Dashboard charts retrieved successfully', charts));
});

export const getReportData = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const reportType = req.query.reportType as string;
  if (!reportType) {
    throw ApiError.badRequest('reportType query parameter is required');
  }

  const filter = {
    preset: req.query.preset as any,
    startDate: req.query.startDate as string | undefined,
    endDate: req.query.endDate as string | undefined,
    counsellorId: req.query.counsellorId as string | undefined,
  };

  const report = await AnalyticsService.getReportData(reportType, filter, req.user);
  res.json(ApiResponse.success(`Report '${reportType}' retrieved successfully`, report));
});

export const exportReportCsv = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const reportType = req.query.reportType as string;
  if (!reportType) {
    throw ApiError.badRequest('reportType query parameter is required');
  }

  const filter = {
    preset: req.query.preset as any,
    startDate: req.query.startDate as string | undefined,
    endDate: req.query.endDate as string | undefined,
    counsellorId: req.query.counsellorId as string | undefined,
  };

  const csv = await AnalyticsService.exportReportCsv(reportType, filter, req.user);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="universebyte-${reportType}-report-${Date.now()}.csv"`
  );
  res.status(200).send(csv);
});

