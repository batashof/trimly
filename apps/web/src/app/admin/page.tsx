'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  api,
  ApiError,
  clearToken,
  getToken,
  setToken,
  type AuthUser,
  type Barber,
  type DayOff,
  type Service,
  type WorkingHour,
} from '../../lib/api';

/**
 * Minimal admin console used to smoke-test the web ↔ api stack: login (JWT),
 * then read/write the admin CRUD endpoints. Not the polished admin panel from
 * roadmap step 6 — just enough to confirm the two apps talk to each other.
 */
export default function AdminPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(true);

  // On mount, if a token is present, verify it via GET /auth/me.
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
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}

function Dashboard({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);
  const [dayOffs, setDayOffs] = useState<DayOff[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const [b, s, w, d] = await Promise.all([
        api.barbers.list(),
        api.services.list(),
        api.workingHours.list(),
        api.dayOffs.list(),
      ]);
      setBarbers(b);
      setServices(s);
      setWorkingHours(w);
      setDayOffs(d);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load data');
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-6">
      <header className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-xl font-semibold">Trimly admin</h1>
          <p className="text-sm text-gray-500">
            {user.email} · {user.role}
          </p>
        </div>
        <button
          onClick={onLogout}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          Log out
        </button>
      </header>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <CreateBarber onCreated={reload} onError={setError} />

      <Section title={`Barbers (${barbers.length})`}>
        {barbers.length === 0 ? (
          <Empty>No barbers yet — create one above.</Empty>
        ) : (
          <ul className="divide-y divide-gray-100">
            {barbers.map((b) => (
              <li key={b.id} className="flex items-center justify-between py-2">
                <span>
                  <span className="font-medium">{b.displayName}</span>{' '}
                  <span className="text-sm text-gray-500">
                    · {b.timezone} · {b.isActive ? 'active' : 'inactive'}
                  </span>
                </span>
                <DeleteButton
                  onDelete={() => api.barbers.remove(b.id)}
                  onDone={reload}
                  onError={setError}
                />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <CreateService barbers={barbers} onCreated={reload} onError={setError} />

      <Section title={`Services (${services.length})`}>
        {services.length === 0 ? (
          <Empty>No services yet.</Empty>
        ) : (
          <ul className="divide-y divide-gray-100">
            {services.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2">
                <span>
                  <span className="font-medium">{s.name}</span>{' '}
                  <span className="text-sm text-gray-500">
                    · {s.durationMinutes} min · €{s.price}
                  </span>
                </span>
                <DeleteButton
                  onDelete={() => api.services.remove(s.id)}
                  onDone={reload}
                  onError={setError}
                />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Working hours (${workingHours.length})`}>
        {workingHours.length === 0 ? (
          <Empty>None configured.</Empty>
        ) : (
          <ul className="divide-y divide-gray-100 text-sm">
            {workingHours.map((w) => (
              <li key={w.id} className="py-2">
                {WEEKDAYS[w.weekday] ?? `day ${w.weekday}`}: {w.startTime}–{w.endTime}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Days off (${dayOffs.length})`}>
        {dayOffs.length === 0 ? (
          <Empty>None.</Empty>
        ) : (
          <ul className="divide-y divide-gray-100 text-sm">
            {dayOffs.map((d) => (
              <li key={d.id} className="py-2">
                {d.date?.slice(0, 10)}
                {d.reason ? ` — ${d.reason}` : ''}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </main>
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
    try {
      await api.barbers.create({ displayName: name.trim() });
      setName('');
      onCreated();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Failed to create barber');
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
        className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
      />
      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
      >
        Add barber
      </button>
    </form>
  );
}

function CreateService({
  barbers,
  onCreated,
  onError,
}: {
  barbers: Barber[];
  onCreated: () => void;
  onError: (msg: string) => void;
}) {
  const [barberId, setBarberId] = useState('');
  const [name, setName] = useState('');
  const [duration, setDuration] = useState('30');
  const [price, setPrice] = useState('20');
  const [busy, setBusy] = useState(false);

  if (barbers.length === 0) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const id = barberId || barbers[0].id;
    if (!name.trim()) return;
    setBusy(true);
    try {
      await api.services.create({
        barberId: id,
        name: name.trim(),
        durationMinutes: Number(duration),
        price: Number(price),
      });
      setName('');
      onCreated();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Failed to create service');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <select
        value={barberId || barbers[0].id}
        onChange={(e) => setBarberId(e.target.value)}
        className="rounded-md border border-gray-300 px-2 py-2 text-sm"
      >
        {barbers.map((b) => (
          <option key={b.id} value={b.id}>
            {b.displayName}
          </option>
        ))}
      </select>
      <input
        placeholder="Service name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
      />
      <input
        type="number"
        value={duration}
        onChange={(e) => setDuration(e.target.value)}
        className="w-20 rounded-md border border-gray-300 px-2 py-2 text-sm"
        title="Duration (minutes)"
      />
      <input
        type="number"
        step="0.01"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        className="w-24 rounded-md border border-gray-300 px-2 py-2 text-sm"
        title="Price (€)"
      />
      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
      >
        Add service
      </button>
    </form>
  );
}

function DeleteButton({
  onDelete,
  onDone,
  onError,
}: {
  onDelete: () => Promise<void>;
  onDone: () => void;
  onError: (msg: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      onClick={async () => {
        setBusy(true);
        try {
          await onDelete();
          onDone();
        } catch (err) {
          onError(err instanceof ApiError ? err.message : 'Delete failed');
        } finally {
          setBusy(false);
        }
      }}
      disabled={busy}
      className="rounded-md px-2 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      Delete
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{title}</h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-400">{children}</p>;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
