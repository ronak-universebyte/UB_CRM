import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types';
import { ApiError } from '../utils/api-error';

export const requireRoles = (...allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Access forbidden: Role '${req.user.role}' is not authorized to access this resource`
        )
      );
    }

    next();
  };
};

export const requirePermissions = (...requiredPermissions: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    // SuperAdmin with '*' has all permissions
    if (req.user.permissions.includes('*')) {
      return next();
    }

    const hasAllPermissions = requiredPermissions.every((perm) =>
      req.user?.permissions.includes(perm)
    );

    if (!hasAllPermissions) {
      return next(
        ApiError.forbidden(
          `Access forbidden: Missing required permissions: ${requiredPermissions.join(', ')}`
        )
      );
    }

    next();
  };
};

