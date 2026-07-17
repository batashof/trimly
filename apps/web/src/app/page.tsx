import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Trimly</h1>
      <p className="max-w-md text-gray-600">
        The public booking page will live here. Scaffolding is in place — see the roadmap in{' '}
        <code className="rounded bg-gray-100 px-1 py-0.5">docs/roadmap.md</code>.
      </p>
      <Link
        href="/admin"
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
      >
        Admin console
      </Link>
    </main>
  );
}
