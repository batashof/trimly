import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WorkingHoursService } from './working-hours.service';
import { PrismaService } from '../prisma/prisma.service';

describe('WorkingHoursService', () => {
  let service: WorkingHoursService;
  let prisma: {
    barber: { findUnique: ReturnType<typeof vi.fn> };
    workingHours: {
      create: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    prisma = {
      barber: { findUnique: vi.fn() },
      workingHours: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    };
    service = new WorkingHoursService(prisma as unknown as PrismaService);
  });

  it('rejects creation for an unknown barber', async () => {
    prisma.barber.findUnique.mockResolvedValue(null);
    await expect(
      service.create({ barberId: 'nope', weekday: 1, startTime: '09:00', endTime: '18:00' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.workingHours.create).not.toHaveBeenCalled();
  });

  it('rejects a non-positive interval (start >= end)', async () => {
    prisma.barber.findUnique.mockResolvedValue({ id: 'b1' });
    await expect(
      service.create({ barberId: 'b1', weekday: 1, startTime: '18:00', endTime: '09:00' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.workingHours.create).not.toHaveBeenCalled();
  });

  it('creates a valid interval', async () => {
    prisma.barber.findUnique.mockResolvedValue({ id: 'b1' });
    const created = { id: 'wh1', barberId: 'b1', weekday: 1, startTime: '09:00', endTime: '18:00' };
    prisma.workingHours.create.mockResolvedValue(created);

    const dto = { barberId: 'b1', weekday: 1, startTime: '09:00', endTime: '18:00' };
    expect(await service.create(dto)).toBe(created);
    expect(prisma.workingHours.create).toHaveBeenCalledWith({ data: dto });
  });

  it('validates the merged interval on update', async () => {
    prisma.workingHours.findUnique.mockResolvedValue({
      id: 'wh1',
      barberId: 'b1',
      weekday: 1,
      startTime: '09:00',
      endTime: '18:00',
    });
    // New startTime 19:00 vs existing endTime 18:00 → invalid.
    await expect(service.update('wh1', { startTime: '19:00' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.workingHours.update).not.toHaveBeenCalled();
  });
});
