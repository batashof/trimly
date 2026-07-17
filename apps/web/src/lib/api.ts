/**
 * Tiny fetch wrapper for the admin console. Not the final data layer — this is
 * the minimal client used to smoke-test the web ↔ api connection (CORS, JWT,
 * the admin CRUD endpoints) end to end. The token lives in localStorage; the
 * real admin panel (roadmap step 6) can replace this with httpOnly cookies.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TOKEN_KEY = 'trimly_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (init.body) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });

  if (res.status === 204) return undefined as T;

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const message =
      isJson && body && typeof body === 'object' && 'message' in body
        ? Array.isArray(body.message)
          ? body.message.join(', ')
          : String(body.message)
        : `Request failed (${res.status})`;
    throw new ApiError(res.status, message);
  }

  return body as T;
}

// --- Domain types (mirror the Prisma models the API returns) ---

export type Role = 'ADMIN' | 'BARBER';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

export interface LoginResult {
  accessToken: string;
  user: AuthUser;
}

export interface Barber {
  id: string;
  displayName: string;
  bio: string | null;
  photoUrl: string | null;
  timezone: string;
  isActive: boolean;
}

export interface Service {
  id: string;
  barberId: string;
  name: string;
  durationMinutes: number;
  price: string | number;
  isActive: boolean;
}

export interface WorkingHour {
  id: string;
  barberId: string;
  weekday: number;
  startTime: string;
  endTime: string;
}

export interface DayOff {
  id: string;
  barberId: string;
  date: string;
  reason: string | null;
}

// --- Endpoints ---

export const api = {
  login: (email: string, password: string) =>
    request<LoginResult>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<AuthUser>('/auth/me'),

  barbers: {
    list: () => request<Barber[]>('/barbers'),
    create: (dto: { displayName: string; bio?: string; timezone?: string }) =>
      request<Barber>('/barbers', { method: 'POST', body: JSON.stringify(dto) }),
    remove: (id: string) => request<void>(`/barbers/${id}`, { method: 'DELETE' }),
  },
  services: {
    list: (barberId?: string) =>
      request<Service[]>(`/services${barberId ? `?barberId=${barberId}` : ''}`),
    create: (dto: { barberId: string; name: string; durationMinutes: number; price: number }) =>
      request<Service>('/services', { method: 'POST', body: JSON.stringify(dto) }),
    remove: (id: string) => request<void>(`/services/${id}`, { method: 'DELETE' }),
  },
  workingHours: {
    list: (barberId?: string) =>
      request<WorkingHour[]>(`/working-hours${barberId ? `?barberId=${barberId}` : ''}`),
  },
  dayOffs: {
    list: (barberId?: string) =>
      request<DayOff[]>(`/day-offs${barberId ? `?barberId=${barberId}` : ''}`),
  },
};

export { API_URL };
