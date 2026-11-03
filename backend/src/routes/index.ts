import { Router } from 'express';
import mongoose from 'mongoose';
import { authRoutes } from './auth.routes';
import { userRoutes } from './user.routes';
import { leadRoutes } from './lead.routes';
import followupRoutes from './followup.routes';
import analyticsRoutes from './analytics.routes';
import whatsappRoutes from './whatsapp.routes';
import aiRoutes from './ai.routes';
import { ApiResponse } from '../utils/api-response';

const router = Router();

// Health Check Endpoint (Render monitoring ping)
router.get('/health', (_req, res) => {
  const dbStatus =
    mongoose.connection.readyState === 1
      ? 'connected'
      : mongoose.connection.readyState === 2
      ? 'connecting'
      : 'disconnected';

  const memory = process.memoryUsage();

  res.status(200).json(
    ApiResponse.success('UniverseByte CRM API is operational', {
      service: 'universebyte-crm-backend',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        status: dbStatus,
      },
      memory: {
        rssMB: Math.round(memory.rss / 1024 / 1024),
        heapUsedMB: Math.round(memory.heapUsed / 1024 / 1024),
      },
    })
  );
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/leads', leadRoutes);
router.use('/followups', followupRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/whatsapp', whatsappRoutes);
router.use('/ai', aiRoutes);

export const appRouter = router;

