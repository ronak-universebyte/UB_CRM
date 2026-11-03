import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { ApiResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { env } from '../config/env';
import { REFRESH_TOKEN_COOKIE_NAME } from '../config/constants';
import { ApiError } from '../utils/api-error';

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Unknown';

  const { user, tokens } = await AuthService.login(
    email,
    password,
    ipAddress,
    userAgent
  );

  // Set secure HTTP-only cookie for refresh token
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, tokens.refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/v1/auth',
  });

  res.status(200).json(
    ApiResponse.success('Login successful', {
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    })
  );
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const cookieToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];
  const bodyToken = req.body?.refreshToken;
  const tokenToUse = cookieToken || bodyToken;

  if (!tokenToUse) {
    throw ApiError.unauthorized('No refresh token provided');
  }

  const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Unknown';

  const tokens = await AuthService.refreshTokens(tokenToUse, ipAddress, userAgent);

  res.cookie(REFRESH_TOKEN_COOKIE_NAME, tokens.refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/v1/auth',
  });

  res.status(200).json(
    ApiResponse.success('Tokens refreshed successfully', {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    })
  );
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const cookieToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];
  const bodyToken = req.body?.refreshToken;
  const tokenToUse = cookieToken || bodyToken;

  if (userId) {
    await AuthService.logout(userId, tokenToUse);
  }

  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/api/v1/auth',
  });

  res.status(200).json(ApiResponse.success('Logged out successfully'));
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw ApiError.unauthorized();
  }

  const profile = await AuthService.getProfile(req.user.id);
  res.status(200).json(ApiResponse.success('Profile retrieved', profile));
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw ApiError.unauthorized();
  }

  const { currentPassword, newPassword } = req.body;
  await AuthService.changePassword(req.user.id, currentPassword, newPassword);

  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/api/v1/auth',
  });

  res.status(200).json(
    ApiResponse.success('Password changed successfully. Please log in with your new password.')
  );
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  const resetToken = await AuthService.forgotPassword(email);

  const responseData =
    env.NODE_ENV !== 'production'
      ? { resetToken, message: 'In production, reset token is sent via email/SMS.' }
      : undefined;

  res.status(200).json(
    ApiResponse.success(
      'If an account with this email exists, password reset instructions have been dispatched.',
      responseData
    )
  );
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;
  await AuthService.resetPassword(token, newPassword);

  res.status(200).json(
    ApiResponse.success('Password reset successfully. You can now log in with your new password.')
  );
});

