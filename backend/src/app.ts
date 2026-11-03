import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { env } from './config/env';
import { appRouter } from './routes';
import { errorHandler } from './middlewares/error.middleware';
import { apiLimiter, authLimiter } from './middlewares/rate-limiter.middleware';
import { mongoSanitize } from './middlewares/sanitize.middleware';
import { ApiError } from './utils/api-error';

export const createApp = (): Application => {
  const app = express();

  // Security Headers
  app.use(helmet());

  // CORS Configuration
  const allowedOrigins = env.CORS_ORIGIN.split(',').map((origin) => origin.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or server-to-server)
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          callback(null, true);
        } else {
          callback(new Error(`Origin '${origin}' is not permitted by CORS policy.`));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Parsing Middlewares
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());
  app.use(mongoSanitize);

  // Logging in development/production
  if (env.NODE_ENV !== 'test') {
    app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  }

  // Rate Limiting (apply authLimiter specifically to /auth/login and /auth/refresh-token in production)
  if (env.NODE_ENV === 'production') {
    app.use(`${env.API_PREFIX}/auth/login`, authLimiter);
    app.use(`${env.API_PREFIX}/auth/refresh-token`, authLimiter);
    app.use(`${env.API_PREFIX}`, apiLimiter);
  }

  // Mount API routes
  app.use(env.API_PREFIX, appRouter);

  // 404 Not Found Catch-all
  app.use('*', (req: Request, _res: Response, next) => {
    next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
  });

  // Central Error Handler
  app.use(errorHandler);

  return app;
};

export const app = createApp();

