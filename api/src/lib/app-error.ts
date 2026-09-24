// Kode error mengikuti docs/06-api-spec.md §1.2.
export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'BUSINESS_RULE_VIOLATION'
  | 'TOO_MANY_REQUESTS'
  | 'SERVICE_UNAVAILABLE'
  | 'INTERNAL_ERROR';

export interface ErrorDetail {
  field?: string;
  message: string;
}

/**
 * Error terduga (validasi, business rule, dsb). Dilempar dari service/controller,
 * lalu diformat ke response envelope oleh middleware error-handler.
 */
export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly httpStatus: number,
    public readonly details?: ErrorDetail[],
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Shortcut agar pemanggilan di service ringkas & konsisten.
export const Errors = {
  validation: (message: string, details?: ErrorDetail[]) =>
    new AppError('VALIDATION_ERROR', message, 400, details),
  unauthenticated: (message = 'Silakan login terlebih dahulu') =>
    new AppError('UNAUTHENTICATED', message, 401),
  forbidden: (message = 'Kamu tidak punya akses ke resource ini') =>
    new AppError('FORBIDDEN', message, 403),
  notFound: (message = 'Data tidak ditemukan') => new AppError('NOT_FOUND', message, 404),
  conflict: (message: string) => new AppError('CONFLICT', message, 409),
  businessRule: (message: string) => new AppError('BUSINESS_RULE_VIOLATION', message, 422),
};
