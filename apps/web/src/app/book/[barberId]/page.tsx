'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createBookingSchema,
  type AvailabilityResponse,
  type BarberPublic,
  type BookingConfirmation,
  type ServicePublic,
  type Slot,
} from '@trimly/shared';
import { api, ApiError } from '../../../lib/api';

type Step = 'service' | 'slot' | 'form' | 'done';

/**
 * Public client booking page, reached via a per-barber link (/book/[barberId]).
 * Wizard: service → date & slot → contact form → confirmation with the Telegram
 * button. No auth. Slots come from the API in UTC and are rendered in the
 * barber's timezone (see docs/business-logic.md).
 */
export default function BookingPage({ params }: { params: { barberId: string } }) {
  const { barberId } = params;

  const [barber, setBarber] = useState<BarberPublic | null>(null);
  const [services, setServices] = useState<ServicePublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [step, setStep] = useState<Step>('service');
  const [service, setService] = useState<ServicePublic | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    Promise.all([api.public.barber(barberId), api.public.services(barberId)])
      .then(([b, s]) => {
        if (cancelled) return;
        setBarber(b);
        setServices(s);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(
          err instanceof ApiError && err.status === 404
            ? 'This booking link is not valid.'
            : 'Could not load booking details. Please try again.',
        );
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [barberId]);

  if (loading) return <Centered>Loading…</Centered>;
  if (loadError) return <Centered>{loadError}</Centered>;
  if (!barber) return <Centered>Barber not found.</Centered>;

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <header className="mb-6 flex items-center gap-4">
        {barber.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={barber.photoUrl}
            alt={barber.displayName}
            className="h-14 w-14 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-200 text-lg font-semibold text-gray-500">
            {barber.displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-xl font-semibold">{barber.displayName}</h1>
          {barber.bio && <p className="text-sm text-gray-500">{barber.bio}</p>}
        </div>
      </header>

      {step !== 'done' && <Steps current={step} />}

      {step === 'service' && (
        <ServiceStep
          services={services}
          onPick={(s) => {
            setService(s);
            setStep('slot');
          }}
        />
      )}

      {step === 'slot' && service && (
        <SlotStep
          barberId={barberId}
          barberTimezone={barber.timezone}
          service={service}
          onBack={() => setStep('service')}
          onPick={(picked) => {
            setSlot(picked);
            setStep('form');
          }}
        />
      )}

      {step === 'form' && service && slot && (
        <FormStep
          barberId={barberId}
          service={service}
          slot={slot}
          barberTimezone={barber.timezone}
          onBack={() => setStep('slot')}
          onBooked={(c) => {
            setConfirmation(c);
            setStep('done');
          }}
          onSlotTaken={() => setStep('slot')}
        />
      )}

      {step === 'done' && confirmation && (
        <DoneStep confirmation={confirmation} barberTimezone={barber.timezone} />
      )}
    </main>
  );
}

function ServiceStep({
  services,
  onPick,
}: {
  services: ServicePublic[];
  onPick: (s: ServicePublic) => void;
}) {
  if (services.length === 0) {
    return <Empty>No services are available for booking right now.</Empty>;
  }
  return (
    <section className="space-y-2">
      <StepTitle>Choose a service</StepTitle>
      <ul className="space-y-2">
        {services.map((s) => (
          <li key={s.id}>
            <button
              onClick={() => onPick(s)}
              className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-left hover:border-gray-900"
            >
              <span className="font-medium">{s.name}</span>
              <span className="text-sm text-gray-500">
                {s.durationMinutes} min · €{s.price}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SlotStep({
  barberId,
  barberTimezone,
  service,
  onBack,
  onPick,
}: {
  barberId: string;
  barberTimezone: string;
  service: ServicePublic;
  onBack: () => void;
  onPick: (slot: Slot) => void;
}) {
  const today = useMemo(
    () => new Intl.DateTimeFormat('en-CA', { timeZone: barberTimezone }).format(new Date()),
    [barberTimezone],
  );
  const [date, setDate] = useState(today);
  const [data, setData] = useState<AvailabilityResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await api.public.availability(barberId, { date, serviceId: service.id });
      setData(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load available times.');
    } finally {
      setLoading(false);
    }
  }, [barberId, date, service.id]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <StepTitle>Pick a time</StepTitle>
        <BackButton onClick={onBack} />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Date</label>
        <input
          type="date"
          value={date}
          min={today}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
        />
      </div>

      {loading && <p className="text-sm text-gray-500">Loading times…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {data && !loading && (
        <div>
          {data.slots.length === 0 ? (
            <Empty>No free times on this day. Try another date.</Empty>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {data.slots.map((slot) => (
                <button
                  key={slot.startAt}
                  onClick={() => onPick(slot)}
                  className="rounded-md border border-gray-300 px-2 py-2 text-sm hover:border-gray-900 hover:bg-gray-50"
                >
                  {formatTime(slot.startAt, barberTimezone)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function FormStep({
  barberId,
  service,
  slot,
  barberTimezone,
  onBack,
  onBooked,
  onSlotTaken,
}: {
  barberId: string;
  service: ServicePublic;
  slot: Slot;
  barberTimezone: string;
  onBack: () => void;
  onBooked: (c: BookingConfirmation) => void;
  onSlotTaken: () => void;
}) {
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = createBookingSchema.safeParse({
      barberId,
      serviceId: service.id,
      clientName,
      clientPhone,
      startAt: slot.startAt,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please check the form.');
      return;
    }

    setSubmitting(true);
    try {
      const confirmation = await api.public.createBooking(parsed.data);
      onBooked(confirmation);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('Sorry, that time was just taken. Please pick another slot.');
        setTimeout(onSlotTaken, 1200);
        return;
      }
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <StepTitle>Your details</StepTitle>
        <BackButton onClick={onBack} />
      </div>

      <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
        <div className="font-medium text-gray-900">{service.name}</div>
        <div>
          {formatDateTime(slot.startAt, barberTimezone)} · {service.durationMinutes} min · €
          {service.price}
        </div>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Name</label>
          <input
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Phone</label>
          <input
            type="tel"
            inputMode="tel"
            placeholder="+32470123456"
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-gray-900 px-3 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {submitting ? 'Booking…' : 'Confirm booking'}
        </button>
      </form>
    </section>
  );
}

function DoneStep({
  confirmation,
  barberTimezone,
}: {
  confirmation: BookingConfirmation;
  barberTimezone: string;
}) {
  return (
    <section className="space-y-5 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl text-green-700">
        ✓
      </div>
      <div>
        <h2 className="text-lg font-semibold">You&apos;re booked!</h2>
        <p className="mt-1 text-sm text-gray-600">
          {formatDateTime(confirmation.startAt, barberTimezone)}
        </p>
      </div>
      <a
        href={confirmation.telegramDeepLink}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#229ED9] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1c8dc2]"
      >
        Get notifications on Telegram
      </a>
      <p className="text-xs text-gray-400">
        Connect Telegram to get a confirmation and reminders about your appointment.
      </p>
    </section>
  );
}

// --- UI helpers ---

function Steps({ current }: { current: Step }) {
  const order: Step[] = ['service', 'slot', 'form'];
  const labels: Record<string, string> = { service: 'Service', slot: 'Time', form: 'Details' };
  const idx = order.indexOf(current);
  return (
    <ol className="mb-6 flex items-center gap-2 text-xs text-gray-500">
      {order.map((s, i) => (
        <li key={s} className="flex items-center gap-2">
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-medium ${
              i <= idx ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-500'
            }`}
          >
            {i + 1}
          </span>
          <span className={i === idx ? 'font-medium text-gray-900' : ''}>{labels[s]}</span>
          {i < order.length - 1 && <span className="text-gray-300">—</span>}
        </li>
      ))}
    </ol>
  );
}

function StepTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-semibold">{children}</h2>;
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-sm text-gray-500 hover:text-gray-900">
      ← Back
    </button>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 text-center text-gray-500">
      {children}
    </main>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg bg-gray-50 px-4 py-6 text-center text-sm text-gray-400">{children}</p>;
}

function formatTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

function formatDateTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}
