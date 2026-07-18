import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Trimly</h1>
      <p className="max-w-md text-gray-600">
        Booking happens through each barber&apos;s personal link
        (<code className="rounded bg-gray-100 px-1 py-0.5">/book/&lt;barberId&gt;</code>). A barber
        finds and shares their link from the admin console.
      </p>
      <div className="flex items-center gap-3">
        <Link
          href="/admin"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Admin console
        </Link>
        <Link
          href="/register"
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
        >
          Register as a barber
        </Link>
      </div>
    </main>
  );
}
