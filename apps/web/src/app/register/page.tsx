'use client';

import { useState } from 'react';
import Link from 'next/link';
import { registerSchema } from '@trimly/shared';
import { api } from '../../lib/api';
import { errMessage, ErrorBanner, inputClass, PrimaryButton } from '../admin/_components/ui';

/**
 * Barber self-registration, step 1: enter an email, get a confirmation link.
 * The API responds generically (never reveals whether the email exists), so on
 * success we always show the same "check your email" screen.
 */
export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = registerSchema.safeParse({ email });
    if (!parsed.success) {
      setError('Enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await api.register(parsed.data.email);
      setSent(true);
    } catch (err) {
      setError(errMessage(err, 'Something went wrong'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Register as a barber</h1>

        {sent ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              If <span className="font-medium">{email}</span> can be registered, we&apos;ve sent a
              confirmation link. Open it to set your password and finish creating your account.
            </p>
            <p className="text-sm text-gray-500">
              Already confirmed?{' '}
              <Link href="/admin" className="font-medium text-gray-900 underline">
                Sign in
              </Link>
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
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
            <ErrorBanner message={error} />
            <PrimaryButton type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Sending…' : 'Register'}
            </PrimaryButton>
            <p className="text-center text-sm text-gray-500">
              Already have an account?{' '}
              <Link href="/admin" className="font-medium text-gray-900 underline">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
