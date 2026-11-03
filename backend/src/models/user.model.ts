import crypto from 'crypto';
import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUserDocument } from '../types';
import { USER_ROLES, DEFAULT_PERMISSIONS } from '../config/constants';

const LoginActivitySchema = new Schema(
  {
    timestamp: { type: Date, default: Date.now },
    ipAddress: { type: String, required: true },
    userAgent: { type: String, required: true },
    status: { type: String, enum: ['SUCCESS', 'FAILED'], required: true },
    reason: { type: String },
  },
  { _id: false }
);

const RefreshTokenSessionSchema = new Schema(
  {
    tokenHash: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    userAgent: { type: String },
    ipAddress: { type: String },
  },
  { _id: false }
);

const UserSchema = new Schema<IUserDocument>(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters'],
      maxlength: [100, 'Full name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
      index: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      required: [true, 'User role is required'],
      index: true,
    },
    permissions: {
      type: [String],
      default: function (this: IUserDocument) {
        return DEFAULT_PERMISSIONS[this.role] || [];
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    loginHistory: {
      type: [LoginActivitySchema],
      default: [],
    },
    refreshTokens: {
      type: [RefreshTokenSessionSchema],
      default: [],
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id?.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        delete ret.refreshTokens;
        return ret;
      },
    },
  }
);

// Compound index for role-based queries
UserSchema.index({ role: 1, isActive: 1 });

// Pre-save password hashing hook
UserSchema.pre<IUserDocument>('save', async function (next) {
  if (!this.isModified('passwordHash')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error: unknown) {
    next(error as Error);
  }
});

// Compare candidate password
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Generate and hash password reset token
UserSchema.methods.generatePasswordResetToken = function (): string {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Token valid for 1 hour
  this.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);

  return resetToken;
};

export const User = mongoose.model<IUserDocument>('User', UserSchema);
