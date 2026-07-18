'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  api,
  ApiError,
  clearToken,
  getToken,
  setToken,
  type AuthUser,
  type Barber,
} from '../../lib/api';
import { BookingsTab } from './_components/BookingsTab';
import { ProfileTab } from './_components/ProfileTab';
import { ServicesTab } from './_components/ServicesTab';
import { ScheduleTab } from './_components/ScheduleTab';
import { ErrorBanner, inputClass, PrimaryButton } from './_components/ui';

/**
 * Trimly admin panel (roadmap step 6). Auth gate (JWT in localStorage) wraps a
 * tabbed dashboard. The owner logs in as ADMIN and *is* the single barber, so
 * the panel loads that one profile and manages its bookings / services /
 * schedule. All CRUD goes through the admin endpoints in lib/api.ts.
 */
export default function AdminPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setChecking(false);
      return;
    }
    api
      .me()
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return <Centered>Checking session…</Centered>;
  }

  if (!user) {
    return <LoginForm onSuccess={setUser} />;
  }

  return (
    <Dashboard
      user={user}
      onLogout={() => {
        clearToken();
        setUser(null);
      }}
    />
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-screen items-center justify-center text-gray-500">{children}</main>;
}

function LoginForm({ onSuccess }: { onSuccess: (user: AuthUser) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { accessToken, user } = await api.login(email, password);
      setToken(accessToken);
      onSuccess(user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <h1 className="text-xl font-semibold">Trimly admin</h1>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-gray-700">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-gray-700">Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </label>
        <ErrorBanner message={error} />
        <PrimaryButton type="submit" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Signing in…' : 'Sign in'}
        </PrimaryButton>
        <p className="text-center text-sm text-gray-500">
          New barber?{' '}
          <Link href="/register" className="font-medium text-gray-900 underline">
            Register
          </Link>
        </p>
      </form>
    </main>
  );
}

const TABS = ['Bookings', 'Services', 'Schedule', 'Profile'] as const;
type Tab = (typeof TABS)[number];

function Dashboard({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>('Bookings');
  const [barber, setBarber] = useState<Barber | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // The admin owns exactly one barber profile; every tab operates on it, so it
  // lives here and reloads when the Profile tab edits it.
  const reloadBarber = useCallback(async () => {
    try {
      setBarber(await api.barbers.me());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load your barber profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadBarber();
  }, [reloadBarber]);

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-xl font-semibold">Trimly admin</h1>
          <p className="text-sm text-gray-500">
            {barber ? `${barber.displayName} · ` : ''}
            {user.email}
          </p>
        </div>
        <button
          onClick={onLogout}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          Log out
        </button>
      </header>

      <nav className="flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              tab === t
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      <ErrorBanner message={error} />

      {loading ? (
        <p className="text-sm text-gray-500">Loading your profile…</p>
      ) : !barber ? (
        <p className="text-sm text-gray-500">
          No barber profile is linked to this account. Run the seed, or link one in Prisma Studio
          (see docs/dev-admin.md).
        </p>
      ) : (
        <>
          {tab === 'Bookings' && <BookingsTab barber={barber} />}
          {tab === 'Services' && <ServicesTab />}
          {tab === 'Schedule' && <ScheduleTab />}
          {tab === 'Profile' && <ProfileTab barber={barber} onChange={reloadBarber} />}
        </>
      )}
    </main>
  );
}
