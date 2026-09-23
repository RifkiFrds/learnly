// Klien HTTP tipis untuk Learnly API. Mengikuti response envelope docs/06-api-spec.md §1.1.

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: { field?: string; message: string }[];
}

type ApiEnvelope<T> = { success: true; data: T } | { success: false; error: ApiErrorBody };

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, '');

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError('CONFIG_ERROR', 'NEXT_PUBLIC_API_BASE_URL belum di-set');
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new ApiError('NETWORK_ERROR', 'Server API tidak dapat dihubungi');
  }

  const body = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!body) {
    throw new ApiError('INVALID_RESPONSE', 'Respons API tidak valid', res.status);
  }
  if (!body.success) {
    throw new ApiError(body.error.code, body.error.message, res.status);
  }
  return body.data;
}
