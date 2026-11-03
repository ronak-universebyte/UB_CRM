import mongoose from 'mongoose';
import { env } from '../config/env';
import { User } from '../models/user.model';
import { USER_ROLES, DEFAULT_PERMISSIONS } from '../config/constants';
import { logger } from '../utils/logger';

const seedAdmin = async () => {
  try {
    logger.info('Connecting to MongoDB...');
    await mongoose.connect(env.MONGODB_URI);

    const email = process.env.INITIAL_SUPER_ADMIN_EMAIL || 'admin@universebyte.com';
    const password = process.env.INITIAL_SUPER_ADMIN_PASSWORD || 'SuperAdmin@2026!';
    const fullName = process.env.INITIAL_SUPER_ADMIN_NAME || 'Super Administrator';
    const phone = '9999999999';

    const existingAdmin = await User.findOne({ email });

    if (existingAdmin) {
      logger.warn(`Admin with email ${email} already exists.`);
      process.exit(0);
    }

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
    logger.info('Initial Super Admin created successfully!');
    logger.info(`Email: ${email}`);
    logger.info('Role: SuperAdmin');
    process.exit(0);
  } catch (error) {
    logger.error('Failed to seed admin:', error);
    process.exit(1);
  }
};

seedAdmin();

