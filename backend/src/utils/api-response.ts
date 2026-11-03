export interface IPaginationMeta {
  page: number;
  limit: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export class ApiResponse<T = unknown> {
  public readonly success: boolean = true;
  public readonly statusCode: number;
  public readonly message: string;
  public readonly data?: T;
  public readonly pagination?: IPaginationMeta;

  constructor(statusCode: number, message: string, data?: T, pagination?: IPaginationMeta) {
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.pagination = pagination;
  }

  static success<T>(message: string, data?: T, statusCode: number = 200): ApiResponse<T> {
    return new ApiResponse<T>(statusCode, message, data);
  }

  static created<T>(message: string, data?: T): ApiResponse<T> {
    return new ApiResponse<T>(201, message, data);
  }

  static paginated<T>(
    message: string,
    data: T,
    pagination: IPaginationMeta,
    statusCode: number = 200
  ): ApiResponse<T> {
    return new ApiResponse<T>(statusCode, message, data, pagination);
  }
}

