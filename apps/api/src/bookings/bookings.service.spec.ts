import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilityService } from '../availability/availability.service';
import { ConfigService } from '@nestjs/config';

// A slot one hour in the future so the "must be in the future" guard passes.
const START = new Date(Date.now() + 60 * 60_000);
const startIso = START.toISOString();

const baseInput = {
  barberId: 'b1',
  serviceId: 's1',
  clientName: 'Sam',
  clientPhone: '+3212345678',
  startAt: startIso,
};

describe('BookingsService.create', () => {
  let service: BookingsService;
  let prisma: {
    service: { findUnique: ReturnType<typeof vi.fn> };
    barber: { findUnique: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let availability: { getAvailability: ReturnType<typeof vi.fn> };
  let tx: {
    booking: {
      findFirst: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    tx = { booking: { findFirst: vi.fn(), create: vi.fn() } };
    prisma = {
      service: { findUnique: vi.fn() },
      barber: { findUnique: vi.fn() },
      $transaction: vi.fn((cb) => cb(tx)),
    };
    availability = { getAvailability: vi.fn() };

    prisma.service.findUnique.mockResolvedValue({
      id: 's1',
      barberId: 'b1',
      isActive: true,
      durationMinutes: 30,
    });
    prisma.barber.findUnique.mockResolvedValue({
      id: 'b1',
      isActive: true,
      timezone: 'Europe/Brussels',
    });
    // By default the requested slot is offered.
    availability.getAvailability.mockResolvedValue({
      slots: [{ startAt: startIso, endAt: new Date(START.getTime() + 30 * 60_000).toISOString() }],
    });

    const config = { get: vi.fn().mockReturnValue('TrimlyBot') };
    service = new BookingsService(
      prisma as unknown as PrismaService,
      availability as unknown as AvailabilityService,
      config as unknown as ConfigService,
    );
  });

  it('creates a booking and returns a telegram deep link', async () => {
    tx.booking.findFirst.mockResolvedValue(null);
    tx.booking.create.mockResolvedValue({
      id: 'bk1',
      status: 'CONFIRMED',
      startAt: START,
      endAt: new Date(START.getTime() + 30 * 60_000),
      notifyToken: 'tok123',
    });

    const result = await service.create(baseInput);

    expect(result.id).toBe('bk1');
    expect(result.status).toBe('CONFIRMED');
    expect(result.telegramDeepLink).toBe('https://t.me/TrimlyBot?start=tok123');
    expect(tx.booking.create).toHaveBeenCalled();
  });

  it('rejects a slot that availability does not offer', async () => {
    availability.getAvailability.mockResolvedValue({ slots: [] });
    await expect(service.create(baseInput)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects when an overlapping booking is found inside the transaction', async () => {
    tx.booking.findFirst.mockResolvedValue({ id: 'existing' });
    await expect(service.create(baseInput)).rejects.toBeInstanceOf(ConflictException);
    expect(tx.booking.create).not.toHaveBeenCalled();
  });

  it('maps a Postgres serialization failure (P2034) to a conflict', async () => {
    tx.booking.findFirst.mockResolvedValue(null);
    prisma.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('write conflict', {
        code: 'P2034',
        clientVersion: '5.22.0',
      }),
    );
    await expect(service.create(baseInput)).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects an unknown or inactive service', async () => {
    prisma.service.findUnique.mockResolvedValue(null);
    await expect(service.create(baseInput)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('BookingsService admin scoping', () => {
  let service: BookingsService;
  let prisma: {
    booking: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    prisma = {
      booking: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn(), update: vi.fn() },
    };
    const availability = { getAvailability: vi.fn() };
    const config = { get: vi.fn() };
    service = new BookingsService(
      prisma as unknown as PrismaService,
      availability as unknown as AvailabilityService,
      config as unknown as ConfigService,
    );
  });

  it('always scopes findAll to the caller barber', async () => {
    await service.findAll('b1', { from: '2026-01-01T00:00:00.000Z' } as never);
    const arg = prisma.booking.findMany.mock.calls[0][0];
    expect(arg.where.barberId).toBe('b1');
    expect(arg.where.startAt.gte).toBeInstanceOf(Date);
  });

  it('hides another barber booking on update (404, not 403)', async () => {
    prisma.booking.findUnique.mockResolvedValue({ id: 'bk1', barberId: 'other-barber' });
    await expect(
      service.update('b1', 'bk1', { status: 'CANCELLED' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.booking.update).not.toHaveBeenCalled();
  });

  it('updates the caller own booking', async () => {
    prisma.booking.findUnique.mockResolvedValue({ id: 'bk1', barberId: 'b1' });
    prisma.booking.update.mockResolvedValue({ id: 'bk1', status: 'COMPLETED' });
    const result = await service.update('b1', 'bk1', { status: 'COMPLETED' });
    expect(result.status).toBe('COMPLETED');
    expect(prisma.booking.update).toHaveBeenCalledWith({
      where: { id: 'bk1' },
      data: { status: 'COMPLETED' },
    });
  });
});
