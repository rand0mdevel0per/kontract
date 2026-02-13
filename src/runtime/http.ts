export class HttpResp<T = any> {
  constructor(
    public data: T,
    public status: number = 200,
    public headers: Record<string, string> = {}
  ) {}

  static ok<T>(data: T, headers?: Record<string, string>) {
    return new HttpResp(data, 200, headers ?? {});
  }

  static created<T>(data: T, headers?: Record<string, string>) {
    return new HttpResp(data, 201, headers ?? {});
  }

  static noContent(headers?: Record<string, string>) {
    return new HttpResp(null, 204, headers ?? {});
  }

  static redirect(url: string) {
    return new HttpResp(null, 302, { Location: url });
  }
}

export class HttpError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Not Found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class PermissionError extends HttpError {
  constructor(field: string) {
    super(`Field '${field}' is read-only`, 403, 'PERMISSION_DENIED');
  }
}
