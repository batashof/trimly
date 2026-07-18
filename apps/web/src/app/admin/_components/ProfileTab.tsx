'use client';

import { useState } from 'react';
import { api, type Barber } from '../../../lib/api';
import {
  Card,
  ErrorBanner,
  errMessage,
  Field,
  inputClass,
  PrimaryButton,
  Section,
} from './ui';

/**
 * The admin's own barber profile — there is exactly one, tied to the logged-in
 * account. No create/delete here: the account *is* the barber. Editing goes
 * through PATCH /barbers/:id like before.
 */
export function ProfileTab({ barber, onChange }: { barber: Barber; onChange: () => void }) {
  const [displayName, setDisplayName] = useState(barber.displayName);
  const [bio, setBio] = useState(barber.bio ?? '');
  const [timezone, setTimezone] = useState(barber.timezone);
  const [isActive, setIsActive] = useState(barber.isActive);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await api.barbers.update(barber.id, {
        displayName: displayName.trim(),
        bio: bio.trim() || null,
        timezone: timezone.trim(),
        isActive,
      });
      setSaved(true);
      onChange();
    } catch (err) {
      setError(errMessage(err, 'Failed to save profile'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Section title="Your booking link">
        <p className="mb-2 text-sm text-gray-500">
          Share this link with clients — it opens your public booking page.
        </p>
        <CopyBookingLink barberId={barber.id} />
      </Section>

      <Section title="Profile">
        <Card>
          <form onSubmit={submit} className="space-y-3">
            <ErrorBanner message={error} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Display name">
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Timezone (IANA, e.g. Europe/Berlin)">
                <input
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
            <Field label="Bio">
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={2}
                className={inputClass}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Active (visible on booking page)
            </label>
            <div className="flex items-center gap-3">
              <PrimaryButton type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Save'}
              </PrimaryButton>
              {saved && <span className="text-sm text-green-600">Saved</span>}
            </div>
          </form>
        </Card>
      </Section>
    </div>
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
      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
    >
      {copied ? 'Copied!' : 'Copy booking link'}
    </button>
  );
}
