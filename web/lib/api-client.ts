// Klien HTTP terpusat untuk Learnly API (docs/06-api-spec.md §1.1).
// - Memasang header Authorization dari access token di memori
// - Refresh otomatis SEKALI saat 401 (request paralel berbagi satu refresh, tanpa loop)
// - Mengubah envelope { success, data, meta } / { error } menjadi data atau ApiError yang manusiawi

import type { AuthResult, PageMeta } from './types';

// Default relatif: lewat proxy same-origin (rewrite di next.config.ts). Bisa diisi URL absolut untuk mode langsung.
export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1').replace(/\/+$/, '');

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 0,
    public readonly details: ApiErrorDetail[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** { namaField: pesan } — dipetakan ke field form (react-hook-form setError) */
  get fieldErrors(): Record<string, string> {
    const map: Record<string, string> = {};
    for (const detail of this.details) {
      if (detail.field && !map[detail.field]) map[detail.field] = detail.message;
    }
    return map;
  }
}

type Envelope<T> =
  | { success: true; data: T; meta?: PageMeta }
  | { success: false; error: { code: string; message: string; details?: ApiErrorDetail[] } };

// ---------- penyimpanan token (memori saja; refresh token ada di cookie httpOnly) ----------

let accessToken: string | null = null;

// Penanda non-sensitif "pernah login di browser ini" agar tamu tidak memicu /auth/refresh (401) setiap buka halaman.
const SESSION_HINT = 'learnly_has_session';
export const sessionHint = {
  has: () => {
    try {
      return window.localStorage.getItem(SESSION_HINT) === '1';
    } catch {
      return true;
    }
  },
  set: (value: boolean) => {
    try {
      if (value) window.localStorage.setItem(SESSION_HINT, '1');
      else window.localStorage.removeItem(SESSION_HINT);
    } catch {
      /* storage diblokir — abaikan */
    }
  },
};
const listeners = new Set<(token: string | null) => void>();

export const tokenStore = {
  get: () => accessToken,
  set(token: string | null) {
    accessToken = token;
    listeners.forEach((listener) => listener(token));
  },
  subscribe(listener: (token: string | null) => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

/** Dipanggil saat sesi benar-benar berakhir (refresh gagal) → AuthProvider mengarahkan ke login */
let onSessionExpired: (() => void) | null = null;
export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler;
}

// ---------- request dasar ----------

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
  /** false untuk endpoint publik (tidak memasang token & tidak refresh) */
  auth?: boolean;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: RequestOptions['query']) {
  const url = `${API_BASE_URL}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

async function rawRequest<T>(path: string, options: RequestOptions): Promise<{ data: T; meta?: PageMeta }> {
  if (!API_BASE_URL) {
    throw new ApiError('CONFIG_ERROR', 'Alamat API belum diatur (NEXT_PUBLIC_API_BASE_URL).');
  }
  const headers: Record<string, string> = {};
  const isForm = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (options.body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
  if (options.auth !== false && accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : isForm ? (options.body as FormData) : JSON.stringify(options.body),
      credentials: 'include', // cookie refresh token (lintas origin)
      signal: options.signal,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new ApiError('NETWORK_ERROR', 'Tidak bisa terhubung ke server. Periksa koneksi internetmu lalu coba lagi.');
  }

  const body = (await response.json().catch(() => null)) as Envelope<T> | null;
  if (!body) {
    throw new ApiError('INVALID_RESPONSE', 'Server memberi respons yang tidak dikenali. Coba lagi sebentar lagi.', response.status);
  }
  if (!body.success) {
    throw new ApiError(body.error.code, body.error.message, response.status, body.error.details ?? []);
  }
  return { data: body.data, meta: body.meta };
}

// ---------- refresh token ----------

let refreshing: Promise<AuthResult | null> | null = null;

/** Tukar refresh cookie → access token baru. Request paralel berbagi satu promise. */
export function refreshSession(): Promise<AuthResult | null> {
  refreshing ??= rawRequest<AuthResult>('/auth/refresh', { method: 'POST', body: {}, auth: false })
    .then(({ data }) => {
      tokenStore.set(data.accessToken);
      sessionHint.set(true);
      return data;
    })
    .catch(() => {
      tokenStore.set(null);
      sessionHint.set(false);
      return null;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export async function request<T>(path: string, options: RequestOptions = {}) {
  try {
    return await rawRequest<T>(path, options);
  } catch (err) {
    const retryable =
      err instanceof ApiError && err.status === 401 && options.auth !== false && path !== '/auth/refresh';
    if (!retryable) throw err;
    const refreshed = await refreshSession();
    if (!refreshed) {
      onSessionExpired?.();
      throw err;
    }
    return rawRequest<T>(path, options); // retry sekali saja
  }
}

/** Helper ringkas: kembalikan `data` saja */
export const api = {
  get: <T>(path: string, query?: RequestOptions['query'], auth = true) =>
    request<T>(path, { query, auth }).then((result) => result.data),
  list: <T>(path: string, query?: RequestOptions['query'], auth = true) =>
    request<T[]>(path, { query, auth }).then((result) => ({ items: result.data, meta: result.meta! })),
  post: <T>(path: string, body?: unknown, auth = true) =>
    request<T>(path, { method: 'POST', body: body ?? {}, auth }).then((result) => result.data),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body }).then((result) => result.data),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ?? {} }).then((result) => result.data),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }).then((result) => result.data),
  upload: <T>(path: string, form: FormData) =>
    request<T>(path, { method: 'POST', body: form }).then((result) => result.data),
};

/** Pesan manusiawi untuk ditampilkan (toast/alert) dari error apa pun */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return 'Terjadi kesalahan tak terduga. Coba lagi sebentar lagi.';
}
