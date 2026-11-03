import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User } from '../models/user.model';
import { ApiError } from '../utils/api-error';
import {
  IAuthTokens,
  IAuthUser,
  IJwtAccessPayload,
  IJwtRefreshPayload,
} from '../types';

export class AuthService {
  private static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private static generateTokens(
    userId: string,
    email: string,
    role: string,
    permissions: string[]
  ): IAuthTokens {
    const accessPayload: IJwtAccessPayload = {
      userId,
      email,
      role: role as any,
      permissions,
    };

    const accessToken = jwt.sign(accessPayload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRY as any,
    });

    const refreshPayload: IJwtRefreshPayload = {
      userId,
    };

    const refreshToken = jwt.sign(refreshPayload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRY as any,
    });

    return { accessToken, refreshToken };
  }

  static async login(
    email: string,
    password: string,
    ipAddress: string,
    userAgent: string
  ): Promise<{ user: IAuthUser; tokens: IAuthTokens }> {
    const user = await User.findOne({ email }).select('+passwordHash +refreshTokens +loginHistory');

    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (!user.isActive) {
      user.loginHistory.unshift({
        timestamp: new Date(),
        ipAddress,
        userAgent,
        status: 'FAILED',
        reason: 'Account deactivated',
      });
      await user.save();
      throw ApiError.forbidden('Your account has been deactivated. Please contact your administrator.');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      user.loginHistory.unshift({
        timestamp: new Date(),
        ipAddress,
        userAgent,
        status: 'FAILED',
        reason: 'Invalid password',
      });
      // Keep only last 20 login attempts
      if (user.loginHistory.length > 20) {
        user.loginHistory = user.loginHistory.slice(0, 20);
      }
      await user.save();
      throw ApiError.unauthorized('Invalid email or password');
    }

    const tokens = this.generateTokens(
      user._id.toString(),
      user.email,
      user.role,
      user.permissions
    );

    // Save refresh token session
    const tokenHash = this.hashToken(tokens.refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Prune expired tokens and keep up to 5 concurrent sessions
    const now = new Date();
    user.refreshTokens = user.refreshTokens.filter((s) => s.expiresAt > now);
    if (user.refreshTokens.length >= 5) {
      user.refreshTokens.shift();
    }

    user.refreshTokens.push({
      tokenHash,
      createdAt: new Date(),
      expiresAt,
      userAgent,
      ipAddress,
    });

    user.loginHistory.unshift({
      timestamp: new Date(),
      ipAddress,
      userAgent,
      status: 'SUCCESS',
    });

    if (user.loginHistory.length > 20) {
      user.loginHistory = user.loginHistory.slice(0, 20);
    }

    user.lastLoginAt = new Date();
    await user.save();

    const authUser: IAuthUser = {
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      permissions: user.permissions,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
    };

    return { user: authUser, tokens };
  }

  static async refreshTokens(
    refreshToken: string,
    ipAddress: string,
    userAgent: string
  ): Promise<IAuthTokens> {
    if (!refreshToken) {
      throw ApiError.unauthorized('Refresh token is required');
    }

    let decoded: IJwtRefreshPayload;
    try {
      decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET, {
        algorithms: ['HS256'],
      }) as IJwtRefreshPayload;
    } catch {
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }

    const user = await User.findById(decoded.userId).select('+refreshTokens');
    if (!user || !user.isActive) {
      throw ApiError.unauthorized('User not found or account deactivated');
    }

    const incomingHash = this.hashToken(refreshToken);
    const sessionIndex = user.refreshTokens.findIndex(
      (s) => s.tokenHash === incomingHash && s.expiresAt > new Date()
    );

    if (sessionIndex === -1) {
      // Possible reuse attack: clear all sessions for security
      user.refreshTokens = [];
      await user.save();
      throw ApiError.unauthorized('Refresh token is revoked or session expired. Please log in again.');
    }

    // Remove old session and rotate
    user.refreshTokens.splice(sessionIndex, 1);

    const newTokens = this.generateTokens(
      user._id.toString(),
      user.email,
      user.role,
      user.permissions
    );

    const newHash = this.hashToken(newTokens.refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    user.refreshTokens.push({
      tokenHash: newHash,
      createdAt: new Date(),
      expiresAt,
      userAgent,
      ipAddress,
    });

    await user.save();
    return newTokens;
  }

  static async logout(userId: string, refreshToken?: string): Promise<void> {
    const user = await User.findById(userId).select('+refreshTokens');
    if (!user) return;

    if (refreshToken) {
      const incomingHash = this.hashToken(refreshToken);
      user.refreshTokens = user.refreshTokens.filter((s) => s.tokenHash !== incomingHash);
    } else {
      user.refreshTokens = [];
    }

    await user.save();
  }

  static async getProfile(userId: string): Promise<IAuthUser & { loginHistory: unknown[] }> {
    const user = await User.findById(userId).select('+loginHistory');
    if (!user) {
      throw ApiError.notFound('User profile not found');
    }

    return {
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      permissions: user.permissions,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      loginHistory: user.loginHistory.slice(0, 10),
    };
  }

  static async changePassword(
    userId: string,
    currentPass: string,
    newPass: string
  ): Promise<void> {
    const user = await User.findById(userId).select('+passwordHash +refreshTokens');
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const isMatch = await user.comparePassword(currentPass);
    if (!isMatch) {
      throw ApiError.badRequest('Current password is incorrect');
    }

    user.passwordHash = newPass;
    // Invalidate other active sessions
    user.refreshTokens = [];
    await user.save();
  }

  static async forgotPassword(email: string): Promise<string> {
    const user = await User.findOne({ email });
    if (!user) {
      // Don't leak user existence for security
      return 'If an account with that email exists, password reset instructions have been generated.';
    }

    const resetToken = user.generatePasswordResetToken();
    await user.save();

    return resetToken;
  }

  static async resetPassword(token: string, newPass: string): Promise<void> {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    }).select('+passwordResetToken +passwordResetExpires +refreshTokens');

    if (!user) {
      throw ApiError.badRequest('Password reset token is invalid or has expired');
    }

    user.passwordHash = newPass;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshTokens = [];
    await user.save();
  }
}

