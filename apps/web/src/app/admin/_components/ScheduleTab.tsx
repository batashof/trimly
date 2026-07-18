'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, type Barber, type DayOff, type WorkingHour } from '../../../lib/api';
import {
  DeleteButton,
  Empty,
  ErrorBanner,
  errMessage,
  Field,
  inputClass,
  PrimaryButton,
  Section,
  WEEKDAYS,
} from './ui';

export function ScheduleTab({ barbers }: { barbers: Barber[] }) {
  const [barberId, setBarberId] = useState(barbers[0]?.id ?? '');
  const [hours, setHours] = useState<WorkingHour[]>([]);
  const [dayOffs, setDayOffs] = useState<DayOff[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!barberId) {
      setHours([]);
      setDayOffs([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [h, d] = await Promise.all([
        api.workingHours.list(barberId),
        api.dayOffs.list(barberId),
      ]);
      setHours(h);
      setDayOffs(d);
    } catch (err) {
      setError(errMessage(err, 'Failed to load schedule'));
    } finally {
      setLoading(false);
    }
  }, [barberId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const hoursByDay = useMemo(() => {
    const map = new Map<number, WorkingHour[]>();
    for (const h of hours) {
      const list = map.get(h.weekday) ?? [];
      list.push(h);
      map.set(h.weekday, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return map;
  }, [hours]);

  if (barbers.length === 0) {
    return <Empty>Create a barber first, then set up their schedule.</Empty>;
  }

  return (
    <div className="space-y-6">
      <label className="space-y-1">
        <span className="block text-xs font-medium text-gray-600">Barber</span>
        <select value={barberId} onChange={(e) => setBarberId(e.target.value)} className={inputClass}>
          {barbers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.displayName}
            </option>
          ))}
        </select>
      </label>

      <ErrorBanner message={error} />

      <Section title="Working hours">
        <div className="space-y-2">
          {WEEKDAYS.map((label, weekday) => (
            <div
              key={weekday}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2"
            >
              <span className="w-24 text-sm font-medium text-gray-700">{label}</span>
              <div className="flex flex-1 flex-wrap items-center gap-2">
                {(hoursByDay.get(weekday) ?? []).length === 0 ? (
                  <span className="text-sm text-gray-400">Closed</span>
                ) : (
                  (hoursByDay.get(weekday) ?? []).map((h) => (
                    <span
                      key={h.id}
                      className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-sm"
                    >
                      {h.startTime}–{h.endTime}
                      <DeleteButton
                        label="×"
                        onDelete={() => api.workingHours.remove(h.id)}
                        onDone={reload}
                        onError={setError}
                      />
                    </span>
                  ))
                )}
              </div>
              <AddInterval barberId={barberId} weekday={weekday} onAdded={reload} onError={setError} />
            </div>
          ))}
        </div>
      </Section>

      <Section title={`Days off (${dayOffs.length})`}>
        <AddDayOff barberId={barberId} onAdded={reload} onError={setError} />
        {loading && dayOffs.length === 0 ? (
          <Empty>Loading…</Empty>
        ) : dayOffs.length === 0 ? (
          <Empty>None.</Empty>
        ) : (
          <ul className="mt-2 divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
            {[...dayOffs]
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((d) => (
                <li key={d.id} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span>
                    <span className="font-medium">{d.date.slice(0, 10)}</span>
                    {d.reason && <span className="text-gray-500"> — {d.reason}</span>}
                  </span>
                  <DeleteButton
                    onDelete={() => api.dayOffs.remove(d.id)}
                    onDone={reload}
                    onError={setError}
                  />
                </li>
              ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function AddInterval({
  barberId,
  weekday,
  onAdded,
  onError,
}: {
  barberId: string;
  weekday: number;
  onAdded: () => void;
  onError: (msg: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('18:00');
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
      >
        + Add
      </button>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    onError('');
    try {
      await api.workingHours.create({ barberId, weekday, startTime: start, endTime: end });
      setOpen(false);
      onAdded();
    } catch (err) {
      onError(errMessage(err, 'Failed to add interval'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-1">
      <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="rounded-md border border-gray-300 px-1 py-1 text-sm" />
      <span className="text-gray-400">–</span>
      <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="rounded-md border border-gray-300 px-1 py-1 text-sm" />
      <button type="submit" disabled={busy} className="rounded-md bg-gray-900 px-2 py-1 text-sm text-white hover:bg-gray-700 disabled:opacity-50">
        Save
      </button>
      <button type="button" onClick={() => setOpen(false)} className="rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100">
        ×
      </button>
    </form>
  );
}

function AddDayOff({
  barberId,
  onAdded,
  onError,
}: {
  barberId: string;
  onAdded: () => void;
  onError: (msg: string) => void;
}) {
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!date) return;
    setBusy(true);
    onError('');
    try {
      await api.dayOffs.create({ barberId, date, reason: reason.trim() || undefined });
      setDate('');
      setReason('');
      onAdded();
    } catch (err) {
      onError(errMessage(err, 'Failed to add day off'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
      <Field label="Date">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
      </Field>
      <Field label="Reason (optional)">
        <input
          placeholder="Holiday"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className={inputClass}
        />
      </Field>
      <PrimaryButton type="submit" disabled={busy}>
        Add day off
      </PrimaryButton>
    </form>
  );
}
