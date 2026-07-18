import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WorkingHoursService } from './working-hours.service';
import { PrismaService } from '../prisma/prisma.service';

describe('WorkingHoursService', () => {
  let service: WorkingHoursService;
  let prisma: {
    workingHours: {
      create: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    prisma = {
      workingHours: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    };
    service = new WorkingHoursService(prisma as unknown as PrismaService);
  });

  it('rejects a non-positive interval (start >= end)', async () => {
    await expect(
      service.create('b1', { weekday: 1, startTime: '18:00', endTime: '09:00' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.workingHours.create).not.toHaveBeenCalled();
  });

  it('creates a valid interval, stamping the caller barber id', async () => {
    const created = { id: 'wh1', barberId: 'b1', weekday: 1, startTime: '09:00', endTime: '18:00' };
    prisma.workingHours.create.mockResolvedValue(created);

    const dto = { weekday: 1, startTime: '09:00', endTime: '18:00' };
    expect(await service.create('b1', dto)).toBe(created);
    expect(prisma.workingHours.create).toHaveBeenCalledWith({ data: { ...dto, barberId: 'b1' } });
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
    await expect(service.update('b1', 'wh1', { startTime: '19:00' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.workingHours.update).not.toHaveBeenCalled();
  });

  it('hides a row owned by another barber (404, not 403)', async () => {
    prisma.workingHours.findUnique.mockResolvedValue({
      id: 'wh1',
      barberId: 'other-barber',
      weekday: 1,
      startTime: '09:00',
      endTime: '18:00',
    });
    // Caller b1 must not be able to touch other-barber's row.
    await expect(service.update('b1', 'wh1', { startTime: '10:00' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.remove('b1', 'wh1')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.workingHours.update).not.toHaveBeenCalled();
  });
});
