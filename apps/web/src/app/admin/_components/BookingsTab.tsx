'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  api,
  type AdminBooking,
  type Barber,
  type BookingStatus,
} from '../../../lib/api';
import { Empty, ErrorBanner, errMessage, GhostButton, inputClass, StatusBadge } from './ui';

type StatusFilter = 'ALL' | BookingStatus;

/** Today's date as YYYY-MM-DD in the browser's local zone (for the filter default). */
function todayLocal(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Format an ISO-UTC instant in the barber's timezone. */
function inZone(iso: string, timezone: string) {
  const dt = new Date(iso);
  const date = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(dt);
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(dt);
  const dayKey = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(dt); // YYYY-MM-DD, sortable
  return { date, time, dayKey };
}

export function BookingsTab({ barbers }: { barbers: Barber[] }) {
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [barberId, setBarberId] = useState('');
  const [from, setFrom] = useState(todayLocal());
  const [to, setTo] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');

  const tzByBarber = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of barbers) map.set(b.id, b.timezone);
    return map;
  }, [barbers]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await api.bookings.list({
        barberId: barberId || undefined,
        from: from ? `${from}T00:00:00.000Z` : undefined,
        to: to ? `${to}T23:59:59.999Z` : undefined,
      });
      setBookings(rows);
    } catch (err) {
      setError(errMessage(err, 'Failed to load bookings'));
    } finally {
      setLoading(false);
    }
  }, [barberId, from, to]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const visible = useMemo(
    () => (status === 'ALL' ? bookings : bookings.filter((b) => b.status === status)),
    [bookings, status],
  );

  // Group by calendar day (in each booking's barber timezone) for a readable list.
  const groups = useMemo(() => {
    const byDay = new Map<string, { label: string; items: AdminBooking[] }>();
    for (const b of visible) {
      const tz = tzByBarber.get(b.barberId) ?? 'UTC';
      const { date, dayKey } = inZone(b.startAt, tz);
      const group = byDay.get(dayKey) ?? { label: date, items: [] };
      group.items.push(b);
      byDay.set(dayKey, group);
    }
    return [...byDay.entries()].sort(([a], [c]) => a.localeCompare(c)).map(([, g]) => g);
  }, [visible, tzByBarber]);

  async function changeStatus(id: string, next: 'CANCELLED' | 'COMPLETED') {
    setError(null);
    try {
      await api.bookings.update(id, next);
      await reload();
    } catch (err) {
      setError(errMessage(err, 'Failed to update booking'));
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        {barbers.length > 1 && (
          <label className="space-y-1">
            <span className="block text-xs font-medium text-gray-600">Barber</span>
            <select
              value={barberId}
              onChange={(e) => setBarberId(e.target.value)}
              className={inputClass}
            >
              <option value="">All barbers</option>
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.displayName}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="space-y-1">
          <span className="block text-xs font-medium text-gray-600">From</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
        </label>
        <label className="space-y-1">
          <span className="block text-xs font-medium text-gray-600">To</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} />
        </label>
        <label className="space-y-1">
          <span className="block text-xs font-medium text-gray-600">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className={inputClass}
          >
            <option value="ALL">All</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </label>
        <GhostButton onClick={() => void reload()} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </GhostButton>
      </div>

      <ErrorBanner message={error} />

      {loading && bookings.length === 0 ? (
        <Empty>Loading bookings…</Empty>
      ) : visible.length === 0 ? (
        <Empty>No bookings for these filters.</Empty>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.label} className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-700">{group.label}</h3>
              <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
                {group.items.map((b) => {
                  const tz = tzByBarber.get(b.barberId) ?? 'UTC';
                  const { time } = inZone(b.startAt, tz);
                  const end = inZone(b.endAt, tz);
                  return (
                    <li key={b.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
                      <span className="w-24 font-mono text-sm text-gray-900">
                        {time}–{end.time}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="font-medium">{b.clientName}</span>{' '}
                        <a href={`tel:${b.clientPhone}`} className="text-sm text-gray-500 hover:underline">
                          {b.clientPhone}
                        </a>
                        <span className="block text-sm text-gray-500">
                          {b.service.name} · {b.barber.displayName}
                        </span>
                      </span>
                      <StatusBadge status={b.status} />
                      {b.status === 'CONFIRMED' && (
                        <span className="flex items-center gap-1">
                          <button
                            onClick={() => void changeStatus(b.id, 'COMPLETED')}
                            className="rounded-md px-2 py-1 text-sm text-blue-700 hover:bg-blue-50"
                          >
                            Complete
                          </button>
                          <button
                            onClick={() => void changeStatus(b.id, 'CANCELLED')}
                            className="rounded-md px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                          >
                            Cancel
                          </button>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
