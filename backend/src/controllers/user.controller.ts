import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { ApiResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { ApiError } from '../utils/api-error';

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const { search, role, isActive, page, limit } = req.query;

  const result = await UserService.listUsers({
    search: search as string | undefined,
    role: role as string | undefined,
    isActive: isActive !== undefined ? isActive === 'true' : undefined,
    page: page ? parseInt(page as string, 10) : undefined,
    limit: limit ? parseInt(limit as string, 10) : undefined,
  });

  res.status(200).json(
    ApiResponse.paginated('Staff list retrieved', result.users, result.pagination)
  );
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = await UserService.getUserById(id);
  res.status(200).json(ApiResponse.success('Staff member details retrieved', user));
});

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw ApiError.unauthorized();
  }

  const user = await UserService.createUser(req.body, req.user.role);
  res.status(201).json(ApiResponse.created('Staff account created successfully', user));
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw ApiError.unauthorized();
  }

  const { id } = req.params;
  const user = await UserService.updateUser(id, req.body, req.user.role);
  res.status(200).json(ApiResponse.success('Staff details updated successfully', user));
});

export const toggleStatus = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw ApiError.unauthorized();
  }

  const { id } = req.params;
  const { isActive } = req.body;

  if (typeof isActive !== 'boolean') {
    throw ApiError.badRequest('isActive field must be a boolean');
  }

  const user = await UserService.toggleStatus(id, isActive, req.user.id, req.user.role);
  const statusMsg = isActive ? 'activated' : 'deactivated';
  res.status(200).json(ApiResponse.success(`Staff account ${statusMsg} successfully`, user));
});

export const listCounsellors = asyncHandler(async (_req: Request, res: Response) => {
  const counsellors = await UserService.getCounsellors();
  res.status(200).json(ApiResponse.success('Counsellors retrieved', counsellors));
});

