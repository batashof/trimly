/**
 * Tiny fetch wrapper for the admin console. Not the final data layer — this is
 * the minimal client used to smoke-test the web ↔ api connection (CORS, JWT,
 * the admin CRUD endpoints) end to end. The token lives in localStorage; the
 * real admin panel (roadmap step 6) can replace this with httpOnly cookies.
 */

import type {
  AvailabilityResponse,
  BarberPublic,
  BookingConfirmation,
  CreateBookingInput,
  ServicePublic,
} from '@trimly/shared';

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

export type BookingStatus = 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

/** A booking as returned by GET /bookings (admin), with barber/service joined. */
export interface AdminBooking {
  id: string;
  barberId: string;
  serviceId: string;
  clientName: string;
  clientPhone: string;
  startAt: string;
  endAt: string;
  status: BookingStatus;
  barber: { id: string; displayName: string };
  service: { id: string; name: string; durationMinutes: number };
}

export interface BarberInput {
  displayName?: string;
  bio?: string | null;
  photoUrl?: string | null;
  timezone?: string;
  isActive?: boolean;
}

export interface ServiceInput {
  name?: string;
  durationMinutes?: number;
  price?: number;
  isActive?: boolean;
}

export interface BookingFilters {
  from?: string;
  to?: string;
}

// --- Endpoints ---

export const api = {
  login: (email: string, password: string) =>
    request<LoginResult>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<AuthUser>('/auth/me'),

  /** Barber self-registration, step 1 — always resolves (generic response). */
  register: (email: string) =>
    request<{ ok: true }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  /** Step 2 — set the password from the emailed token; returns a JWT (auto-login). */
  confirmRegistration: (token: string, password: string) =>
    request<LoginResult>('/auth/register/confirm', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    }),

  barbers: {
    /** The barber profile owned by the logged-in admin (admin *is* the barber). */
    me: () => request<Barber>('/barbers/me'),
    update: (id: string, dto: BarberInput) =>
      request<Barber>(`/barbers/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
  },
  // These endpoints are scoped to the logged-in barber server-side (resolved
  // from the JWT), so the client never sends a barberId.
  services: {
    list: () => request<Service[]>('/services'),
    create: (dto: { name: string; durationMinutes: number; price: number }) =>
      request<Service>('/services', { method: 'POST', body: JSON.stringify(dto) }),
    update: (id: string, dto: ServiceInput) =>
      request<Service>(`/services/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
    remove: (id: string) => request<void>(`/services/${id}`, { method: 'DELETE' }),
  },
  workingHours: {
    list: () => request<WorkingHour[]>('/working-hours'),
    create: (dto: { weekday: number; startTime: string; endTime: string }) =>
      request<WorkingHour>('/working-hours', { method: 'POST', body: JSON.stringify(dto) }),
    update: (id: string, dto: { weekday?: number; startTime?: string; endTime?: string }) =>
      request<WorkingHour>(`/working-hours/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
    remove: (id: string) => request<void>(`/working-hours/${id}`, { method: 'DELETE' }),
  },
  dayOffs: {
    list: () => request<DayOff[]>('/day-offs'),
    create: (dto: { date: string; reason?: string }) =>
      request<DayOff>('/day-offs', { method: 'POST', body: JSON.stringify(dto) }),
    remove: (id: string) => request<void>(`/day-offs/${id}`, { method: 'DELETE' }),
  },
  bookings: {
    list: (filters: BookingFilters = {}) => {
      const params = new URLSearchParams();
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      const qs = params.toString();
      return request<AdminBooking[]>(`/bookings${qs ? `?${qs}` : ''}`);
    },
    update: (id: string, status: 'CANCELLED' | 'COMPLETED') =>
      request<AdminBooking>(`/bookings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
  },

  // Public booking flow (no auth) — used by /book/[barberId].
  public: {
    barber: (id: string) => request<BarberPublic>(`/barbers/${id}`),
    services: (id: string) => request<ServicePublic[]>(`/barbers/${id}/services`),
    availability: (id: string, params: { date: string; serviceId: string }) =>
      request<AvailabilityResponse>(
        `/barbers/${id}/availability?date=${encodeURIComponent(params.date)}&serviceId=${encodeURIComponent(params.serviceId)}`,
      ),
    createBooking: (input: CreateBookingInput) =>
      request<BookingConfirmation>('/bookings', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
  },
};

export { API_URL };
