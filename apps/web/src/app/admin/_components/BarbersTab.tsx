'use client';

import { useState } from 'react';
import { api, type Barber } from '../../../lib/api';
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

export function BarbersTab({
  barbers,
  onChange,
}: {
  barbers: Barber[];
  onChange: () => void;
}) {
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <ErrorBanner message={error} />
      <CreateBarber onCreated={onChange} onError={setError} />

      <Section title={`Barbers (${barbers.length})`}>
        {barbers.length === 0 ? (
          <Empty>No barbers yet — create one above.</Empty>
        ) : (
          <ul className="space-y-2">
            {barbers.map((b) => (
              <BarberRow key={b.id} barber={b} onChange={onChange} onError={setError} />
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function CreateBarber({
  onCreated,
  onError,
}: {
  onCreated: () => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    onError('');
    try {
      await api.barbers.create({ displayName: name.trim() });
      setName('');
      onCreated();
    } catch (err) {
      onError(errMessage(err, 'Failed to create barber'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        placeholder="New barber name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className={inputClass}
      />
      <PrimaryButton type="submit" disabled={busy}>
        Add barber
      </PrimaryButton>
    </form>
  );
}

function BarberRow({
  barber,
  onChange,
  onError,
}: {
  barber: Barber;
  onChange: () => void;
  onError: (msg: string) => void;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li>
        <EditBarber
          barber={barber}
          onDone={() => {
            setEditing(false);
            onChange();
          }}
          onCancel={() => setEditing(false)}
          onError={onError}
        />
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
      <span className="min-w-0">
        <span className="font-medium">{barber.displayName}</span>
        {!barber.isActive && (
          <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
            inactive
          </span>
        )}
        <span className="block text-sm text-gray-500">{barber.timezone}</span>
      </span>
      <div className="flex shrink-0 items-center gap-1">
        <CopyBookingLink barberId={barber.id} />
        <GhostButton onClick={() => setEditing(true)}>Edit</GhostButton>
        <DeleteButton
          onDelete={() => api.barbers.remove(barber.id)}
          onDone={onChange}
          onError={onError}
        />
      </div>
    </li>
  );
}

function EditBarber({
  barber,
  onDone,
  onCancel,
  onError,
}: {
  barber: Barber;
  onDone: () => void;
  onCancel: () => void;
  onError: (msg: string) => void;
}) {
  const [displayName, setDisplayName] = useState(barber.displayName);
  const [bio, setBio] = useState(barber.bio ?? '');
  const [timezone, setTimezone] = useState(barber.timezone);
  const [isActive, setIsActive] = useState(barber.isActive);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    onError('');
    try {
      await api.barbers.update(barber.id, {
        displayName: displayName.trim(),
        bio: bio.trim() || null,
        timezone: timezone.trim(),
        isActive,
      });
      onDone();
    } catch (err) {
      onError(errMessage(err, 'Failed to update barber'));
      setBusy(false);
    }
  }

  return (
    <Card>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Display name">
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Timezone (IANA, e.g. Europe/Berlin)">
            <input value={timezone} onChange={(e) => setTimezone(e.target.value)} className={inputClass} />
          </Field>
        </div>
        <Field label="Bio">
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={2} className={inputClass} />
        </Field>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active (visible on booking page)
        </label>
        <div className="flex gap-2">
          <PrimaryButton type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </PrimaryButton>
          <GhostButton type="button" onClick={onCancel} disabled={busy}>
            Cancel
          </GhostButton>
        </div>
      </form>
    </Card>
  );
}

/** The barber's personal booking link — this is what they share with clients. */
function CopyBookingLink({ barberId }: { barberId: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        const url = `${window.location.origin}/book/${barberId}`;
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          window.prompt('Copy your booking link:', url);
        }
      }}
      className="rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
    >
      {copied ? 'Copied!' : 'Copy link'}
    </button>
  );
}
