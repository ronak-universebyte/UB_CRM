import { Request, Response, NextFunction } from 'express';

/**
 * Recursively removes any object keys that start with '$'
 * (and dotted keys in request bodies) to prevent NoSQL / MongoDB Operator Injection attacks.
 */
function cleanObject(obj: any, isBody: boolean = false): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => cleanObject(item, isBody));
  }

  const cleaned: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Prohibit keys starting with '$' (NoSQL operators e.g. $gt, $ne, $where, $or)
    if (key.startsWith('$')) {
      continue;
    }
    // In request body, also disallow dotted keys like 'user.role' to prevent path traversal
    if (isBody && key.includes('.')) {
      continue;
    }
    cleaned[key] = cleanObject(value, isBody);
  }

  return cleaned;
}

/**
 * Middleware to sanitize incoming request bodies, queries, and route parameters
 * against NoSQL / MongoDB Operator injection.
 */
export const mongoSanitize = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body && typeof req.body === 'object') {
    req.body = cleanObject(req.body, true);
  }

  if (req.query && typeof req.query === 'object') {
    req.query = cleanObject(req.query, false);
  }

  if (req.params && typeof req.params === 'object') {
    req.params = cleanObject(req.params, false);
  }

  next();
};
