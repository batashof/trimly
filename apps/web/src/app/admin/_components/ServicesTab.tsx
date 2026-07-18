'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, type Barber, type Service } from '../../../lib/api';
import {
  Card,
  DeleteButton,
  Empty,
  ErrorBanner,
  errMessage,
  Field,
  GhostButton,
  inputClass,
  PrimaryButton,
  Section,
} from './ui';

export function ServicesTab({ barbers }: { barbers: Barber[] }) {
  const [barberId, setBarberId] = useState(barbers[0]?.id ?? '');
  const [services, setServices] = useState<Service[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!barberId) {
      setServices([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setServices(await api.services.list(barberId));
    } catch (err) {
      setError(errMessage(err, 'Failed to load services'));
    } finally {
      setLoading(false);
    }
  }, [barberId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (barbers.length === 0) {
    return <Empty>Create a barber first, then add services.</Empty>;
  }

  return (
    <div className="space-y-6">
      {barbers.length > 1 && (
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
      )}

      <ErrorBanner message={error} />
      <CreateService barberId={barberId} onCreated={reload} onError={setError} />

      <Section title={`Services (${services.length})`}>
        {loading && services.length === 0 ? (
          <Empty>Loading…</Empty>
        ) : services.length === 0 ? (
          <Empty>No services for this barber yet.</Empty>
        ) : (
          <ul className="space-y-2">
            {services.map((s) => (
              <ServiceRow key={s.id} service={s} onChange={reload} onError={setError} />
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function CreateService({
  barberId,
  onCreated,
  onError,
}: {
  barberId: string;
  onCreated: () => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState('');
  const [duration, setDuration] = useState('30');
  const [price, setPrice] = useState('20');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    onError('');
    try {
      await api.services.create({
        barberId,
        name: name.trim(),
        durationMinutes: Number(duration),
        price: Number(price),
      });
      setName('');
      onCreated();
    } catch (err) {
      onError(errMessage(err, 'Failed to create service'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
      <Field label="Service name">
        <input
          placeholder="Haircut"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="Minutes">
        <input
          type="number"
          min={5}
          step={5}
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="w-24 rounded-md border border-gray-300 px-2 py-2 text-sm"
        />
      </Field>
      <Field label="Price (€)">
        <input
          type="number"
          min={0}
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-28 rounded-md border border-gray-300 px-2 py-2 text-sm"
        />
      </Field>
      <PrimaryButton type="submit" disabled={busy}>
        Add service
      </PrimaryButton>
    </form>
  );
}

function ServiceRow({
  service,
  onChange,
  onError,
}: {
  service: Service;
  onChange: () => void;
  onError: (msg: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(service.name);
  const [duration, setDuration] = useState(String(service.durationMinutes));
  const [price, setPrice] = useState(String(service.price));
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    onError('');
    try {
      await api.services.update(service.id, {
        name: name.trim(),
        durationMinutes: Number(duration),
        price: Number(price),
      });
      setEditing(false);
      onChange();
    } catch (err) {
      onError(errMessage(err, 'Failed to update service'));
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive() {
    onError('');
    try {
      await api.services.update(service.id, { isActive: !service.isActive });
      onChange();
    } catch (err) {
      onError(errMessage(err, 'Failed to update service'));
    }
  }

  if (editing) {
    return (
      <li>
        <Card>
          <form onSubmit={save} className="flex flex-wrap items-end gap-2">
            <Field label="Name">
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Minutes">
              <input
                type="number"
                min={5}
                step={5}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-24 rounded-md border border-gray-300 px-2 py-2 text-sm"
              />
            </Field>
            <Field label="Price (€)">
              <input
                type="number"
                min={0}
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-28 rounded-md border border-gray-300 px-2 py-2 text-sm"
              />
            </Field>
            <PrimaryButton type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </PrimaryButton>
            <GhostButton type="button" onClick={() => setEditing(false)} disabled={busy}>
              Cancel
            </GhostButton>
          </form>
        </Card>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
      <span>
        <span className="font-medium">{service.name}</span>
        {!service.isActive && (
          <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">hidden</span>
        )}
        <span className="block text-sm text-gray-500">
          {service.durationMinutes} min · €{service.price}
        </span>
      </span>
      <div className="flex shrink-0 items-center gap-1">
        <button
          onClick={() => void toggleActive()}
          className="rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
        >
          {service.isActive ? 'Hide' : 'Show'}
        </button>
        <GhostButton onClick={() => setEditing(true)}>Edit</GhostButton>
        <DeleteButton
          onDelete={() => api.services.remove(service.id)}
          onDone={onChange}
          onError={onError}
        />
      </div>
    </li>
  );
}
