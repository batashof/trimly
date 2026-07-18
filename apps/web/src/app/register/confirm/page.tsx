'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { passwordSchema } from '@trimly/shared';
import { api, setToken } from '../../../lib/api';
import { errMessage, ErrorBanner, inputClass, PrimaryButton } from '../../admin/_components/ui';

/**
 * Barber self-registration, step 2: the emailed link lands here with a `token`
 * query param. Set + confirm a password, then we auto-login (store the JWT) and
 * send the new barber to their admin panel.
 */
export default function ConfirmRegistrationPage() {
  return (
    <Suspense fallback={<Centered>Loading…</Centered>}>
      <ConfirmForm />
    </Suspense>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center text-gray-500">{children}</main>
  );
}

function ConfirmForm() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Password is too short');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const { accessToken } = await api.confirmRegistration(token, password);
      setToken(accessToken);
      router.push('/admin');
    } catch (err) {
      setError(errMessage(err, 'Could not confirm your account'));
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Set your password</h1>

        {!token ? (
          <div className="space-y-3">
            <ErrorBanner message="This confirmation link is missing its token. Open the link from your email again." />
            <p className="text-sm text-gray-500">
              <Link href="/register" className="font-medium text-gray-900 underline">
                Back to registration
              </Link>
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
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
            <label className="block space-y-1">
              <span className="text-sm font-medium text-gray-700">Confirm password</span>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={inputClass}
              />
            </label>
            <ErrorBanner message={error} />
            <PrimaryButton type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Setting up…' : 'Create account'}
            </PrimaryButton>
          </form>
        )}
      </div>
    </main>
  );
}
