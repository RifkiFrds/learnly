// Kode error mengikuti docs/06-api-spec.md §1.2.
export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'BUSINESS_RULE_VIOLATION'
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
