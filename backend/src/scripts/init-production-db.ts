import mongoose from 'mongoose';
import { env } from '../config/env';
import { User } from '../models/user.model';
import { Lead } from '../models/lead.model';
import { FollowUp } from '../models/followup.model';
import { WhatsAppMessage } from '../models/whatsapp-message.model';
import { USER_ROLES, DEFAULT_PERMISSIONS } from '../config/constants';
import { logger } from '../utils/logger';

export const initProductionDatabase = async () => {
  try {
    logger.info('Connecting to MongoDB Atlas...');
    await mongoose.connect(env.MONGODB_URI);
    logger.info('Connected to MongoDB Atlas successfully.');

    // 1. Build and sync indexes across all collections
    logger.info('Building and verifying database indexes...');
    await Promise.all([
      User.createIndexes(),
      Lead.createIndexes(),
      FollowUp.createIndexes(),
      WhatsAppMessage.createIndexes(),
    ]);
    logger.info('All database indexes verified successfully.');

    // 2. Seed initial Super Admin if not exists (never overwrite)
    const email = (process.env.INITIAL_SUPER_ADMIN_EMAIL || 'admin@universebyte.com').toLowerCase().trim();
    const password = process.env.INITIAL_SUPER_ADMIN_PASSWORD || 'SuperAdmin@2026!';
    const fullName = process.env.INITIAL_SUPER_ADMIN_NAME || 'Super Administrator';
    const phone = process.env.INITIAL_SUPER_ADMIN_PHONE || '9999999999';

    const existingAdmin = await User.findOne({ email });

    if (existingAdmin) {
      logger.info(`Super Admin account (${email}) already exists. Preserving existing record.`);
    } else {
      const admin = new User({
        fullName,
        email,
        phone,
        passwordHash: password,
        role: USER_ROLES.SUPER_ADMIN,
        permissions: DEFAULT_PERMISSIONS.SuperAdmin,
        isActive: true,
      });

      await admin.save();
      logger.info(`Initial Super Admin provisioned successfully: ${email} (${USER_ROLES.SUPER_ADMIN})`);
    }

    logger.info('Production database initialization complete.');
    return { success: true };
  } catch (error: any) {
    logger.error('Failed to initialize production database:', error.message);
    throw error;
  }
};

// Run standalone if invoked directly from CLI
if (require.main === module || (typeof process !== 'undefined' && process.argv[1]?.includes('init-production-db'))) {
  initProductionDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

