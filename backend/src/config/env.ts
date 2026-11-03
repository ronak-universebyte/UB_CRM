import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  API_PREFIX: z.string().default('/api/v1'),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/universebyte_crm'),
  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 chars').default('dev_jwt_access_secret_super_secure_key_1234'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 chars').default('dev_jwt_refresh_secret_super_secure_key_5678'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  FRONTEND_URL: z.string().optional(),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000').transform((val) => parseInt(val, 10)),
  RATE_LIMIT_MAX: z.string().default('100').transform((val) => parseInt(val, 10)),

  // WhatsApp Meta Cloud API Configuration (supports both META_* and WHATSAPP_* aliases)
  WHATSAPP_TOKEN: z.string().optional(),
  META_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  META_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().optional(),
  META_WABA_ID: z.string().optional(),
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: z.string().default('universebyte_webhook_verify_token_2026'),
  META_WEBHOOK_VERIFY_TOKEN: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  WHATSAPP_API_VERSION: z.string().default('v21.0'),

  // Groq AI Assistant Configuration (Optional - falls back to local intelligent heuristic rules)
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default('llama-3.3-70b-versatile'),
  GROQ_TIMEOUT_MS: z.string().default('15000').transform((val) => parseInt(val, 10)),
}).transform((data) => {
  // Normalize CORS origins with FRONTEND_URL if provided
  const origins = new Set<string>(data.CORS_ORIGIN.split(',').map((o) => o.trim()));
  if (data.FRONTEND_URL) {
    origins.add(data.FRONTEND_URL.trim());
  }

  // Normalize Meta / WhatsApp aliases
  const whatsappToken = data.META_ACCESS_TOKEN || data.WHATSAPP_TOKEN;
  const phoneNumberId = data.META_PHONE_NUMBER_ID || data.WHATSAPP_PHONE_NUMBER_ID;
  const wabaId = data.META_WABA_ID || data.WHATSAPP_BUSINESS_ACCOUNT_ID;
  const verifyToken = data.META_WEBHOOK_VERIFY_TOKEN || data.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  return {
    ...data,
    CORS_ORIGIN: Array.from(origins).join(','),
    WHATSAPP_TOKEN: whatsappToken,
    META_ACCESS_TOKEN: whatsappToken,
    WHATSAPP_PHONE_NUMBER_ID: phoneNumberId,
    META_PHONE_NUMBER_ID: phoneNumberId,
    WHATSAPP_BUSINESS_ACCOUNT_ID: wabaId,
    META_WABA_ID: wabaId,
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: verifyToken,
    META_WEBHOOK_VERIFY_TOKEN: verifyToken,
  };
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid Environment Variables Configuration:');
  console.error(parsed.error.format());
  // In development, proceed with defaults if missing
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Fatal: Invalid production environment configuration.');
  }
}

export const env = parsed.success ? parsed.data : envSchema.parse({});

