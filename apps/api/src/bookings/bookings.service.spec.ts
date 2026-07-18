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
