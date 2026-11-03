import { User } from '../models/user.model';
import { ApiError } from '../utils/api-error';
import { UserRole, IUser } from '../types';
import { USER_ROLES } from '../config/constants';

export interface IListUsersParams {
  search?: string;
  role?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface ICreateUserDto {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  permissions?: string[];
}

export interface IUpdateUserDto {
  fullName?: string;
  phone?: string;
  role?: UserRole;
  permissions?: string[];
  isActive?: boolean;
}

export class UserService {
  static async listUsers(params: IListUsersParams) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

    if (params.search) {
      query.$or = [
        { fullName: { $regex: params.search, $options: 'i' } },
        { email: { $regex: params.search, $options: 'i' } },
        { phone: { $regex: params.search, $options: 'i' } },
      ];
    }

    if (params.role) {
      query.role = params.role;
    }

    if (params.isActive !== undefined) {
      query.isActive = params.isActive;
    }

    const [users, totalRecords] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalRecords / limit) || 1;

    return {
      users,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  static async getUserById(id: string): Promise<IUser> {
    const user = await User.findById(id);
    if (!user) {
      throw ApiError.notFound('Staff member not found');
    }
    return user;
  }

  static async createUser(dto: ICreateUserDto, actorRole: UserRole): Promise<IUser> {
    // Role Hierarchy & Escalation Guard
    if (actorRole !== USER_ROLES.SUPER_ADMIN) {
      if (dto.role === USER_ROLES.SUPER_ADMIN || dto.role === USER_ROLES.ADMIN) {
        throw ApiError.forbidden(
          'Only a Super Admin can create Admin or Super Admin accounts'
        );
      }
    }

    const existingEmail = await User.findOne({ email: dto.email });
    if (existingEmail) {
      throw ApiError.conflict('A staff member with this email address already exists');
    }

    const existingPhone = await User.findOne({ phone: dto.phone });
    if (existingPhone) {
      throw ApiError.conflict('A staff member with this phone number already exists');
    }

    const user = new User({
      fullName: dto.fullName,
      email: dto.email,
      phone: dto.phone,
      passwordHash: dto.password,
      role: dto.role,
      ...(dto.permissions ? { permissions: dto.permissions } : {}),
      isActive: true,
    });

    await user.save();
    return user;
  }

  static async updateUser(
    id: string,
    dto: IUpdateUserDto,
    actorRole: UserRole
  ): Promise<IUser> {
    const user = await User.findById(id);
    if (!user) {
      throw ApiError.notFound('Staff member not found');
    }

    // Role Escalation Guard
    if (dto.role && dto.role !== user.role) {
      if (actorRole !== USER_ROLES.SUPER_ADMIN) {
        if (dto.role === USER_ROLES.SUPER_ADMIN || dto.role === USER_ROLES.ADMIN) {
          throw ApiError.forbidden(
            'Only a Super Admin can promote users to Admin or Super Admin'
          );
        }
        if (user.role === USER_ROLES.SUPER_ADMIN || user.role === USER_ROLES.ADMIN) {
          throw ApiError.forbidden(
            'Cannot modify roles of Super Admin or Admin members without Super Admin privilege'
          );
        }
      }
      user.role = dto.role;
    }

    if (dto.fullName) user.fullName = dto.fullName;
    if (dto.phone) {
      const existingPhone = await User.findOne({ phone: dto.phone, _id: { $ne: id } });
      if (existingPhone) {
        throw ApiError.conflict('Another staff member with this phone number already exists');
      }
      user.phone = dto.phone;
    }

    if (dto.permissions) {
      if (actorRole === USER_ROLES.SUPER_ADMIN) {
        user.permissions = dto.permissions;
      }
    }

    if (dto.isActive !== undefined) {
      user.isActive = dto.isActive;
      if (!dto.isActive) {
        user.refreshTokens = [];
      }
    }

    await user.save();
    return user;
  }

  static async toggleStatus(
    id: string,
    isActive: boolean,
    actorId: string,
    actorRole: UserRole
  ): Promise<IUser> {
    if (id === actorId) {
      throw ApiError.badRequest('You cannot deactivate your own account');
    }

    const user = await User.findById(id);
    if (!user) {
      throw ApiError.notFound('Staff member not found');
    }

    if (user.role === USER_ROLES.SUPER_ADMIN && actorRole !== USER_ROLES.SUPER_ADMIN) {
      throw ApiError.forbidden('Only a Super Admin can deactivate another Super Admin');
    }

    user.isActive = isActive;
    if (!isActive) {
      // Invalidate sessions immediately on deactivation
      user.refreshTokens = [];
    }

    await user.save();
    return user;
  }

  static async getCounsellors(): Promise<IUser[]> {
    return User.find({
      role: { $in: [USER_ROLES.ADMISSION_COUNSELLOR, USER_ROLES.TELECALLER] },
      isActive: true,
    }).select('fullName email phone role');
  }
}

