import type { ApiResponse } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export function getApiBase() {
  return API_BASE.replace(/\/$/, '');
}

class ApiError extends Error {
  code: string;
  details?: Record<string, unknown>;

  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

function getToken(): string | null {
  return localStorage.getItem('flowdesk_token');
}

export function setToken(token: string) {
  localStorage.setItem('flowdesk_token', token);
}

export function clearToken() {
  localStorage.removeItem('flowdesk_token');
  localStorage.removeItem('flowdesk_user');
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T; meta?: ApiResponse['meta'] }> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${getApiBase()}${endpoint}`, { ...options, headers });
  const json: ApiResponse<T> = await response.json();

  if (!json.success) {
    throw new ApiError(
      json.error?.message || 'Request failed',
      json.error?.code || 'UNKNOWN',
      json.error?.details
    );
  }

  return { data: json.data as T, meta: json.meta };
}

export async function downloadAuthenticatedFile(endpoint: string, filename: string) {
  const token = getToken();
  const response = await fetch(`${getApiBase()}${endpoint}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    let message = 'Download failed';
    try {
      const json = await response.json();
      message = json.error?.message || message;
      throw new ApiError(message, json.error?.code || 'DOWNLOAD_FAILED', json.error?.details);
    } catch (e) {
      if (e instanceof ApiError) throw e;
      throw new ApiError(message, 'DOWNLOAD_FAILED');
    }
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function formatApiError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.details && typeof err.details === 'object') {
      const detailMsg = Object.values(err.details)
        .filter((v) => typeof v === 'string')
        .join('. ');
      if (detailMsg) return detailMsg;
    }
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Something went wrong';
}

export { ApiError };
