import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DateTime } from 'luxon';
import { AvailabilityResponse } from '@trimly/shared';
import { PrismaService } from '../prisma/prisma.service';
import { computeAvailableSlots, ComputedSlot } from './slots';

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Free slots for a barber + service on a given calendar day (in the barber's
   * timezone). Shared by the public availability endpoint and the booking
   * creation path, so both agree on what "available" means.
   */
  async getAvailability(
    barberId: string,
    serviceId: string,
    date: string,
  ): Promise<AvailabilityResponse> {
    const barber = await this.prisma.barber.findUnique({ where: { id: barberId } });
    if (!barber || !barber.isActive) {
      throw new NotFoundException(`Barber ${barberId} not found`);
    }

    const service = await this.prisma.service.findUnique({ where: { id: serviceId } });
    if (!service || !service.isActive || service.barberId !== barberId) {
      throw new NotFoundException(`Service ${serviceId} not found for this barber`);
    }

    const timezone = barber.timezone;
    const day = DateTime.fromISO(date, { zone: timezone });
    if (!day.isValid) {
      throw new BadRequestException('Invalid date');
    }

    const [workingHours, dayOff, busy] = await Promise.all([
      this.prisma.workingHours.findMany({ where: { barberId } }),
      this.findDayOff(barberId, date),
      this.findBusyBookings(barberId, day),
    ]);

    const slots = computeAvailableSlots({
      date,
      timezone,
      workingHours,
      durationMinutes: service.durationMinutes,
      busy,
      isDayOff: dayOff !== null,
      now: new Date(),
    });

    return {
      barberId,
      serviceId,
      date,
      timezone,
      slots: slots.map((s) => this.toSlotDto(s)),
    };
  }

  private toSlotDto(slot: ComputedSlot) {
    return {
      startAt: slot.startAt.toISOString(),
      endAt: slot.endAt.toISOString(),
    };
  }

  /** DayOff.date is a `@db.Date` stored at UTC midnight; match on the calendar day. */
  private findDayOff(barberId: string, date: string) {
    return this.prisma.dayOff.findFirst({
      where: { barberId, date: new Date(`${date}T00:00:00.000Z`) },
    });
  }

  /**
   * Non-cancelled bookings that could touch this calendar day. We widen the
   * window by a day on each side so a booking that starts late in the barber's
   * local evening (already the next UTC day) is still considered.
   */
  private findBusyBookings(barberId: string, day: DateTime) {
    const from = day.startOf('day').minus({ days: 1 }).toUTC().toJSDate();
    const to = day.endOf('day').plus({ days: 1 }).toUTC().toJSDate();
    return this.prisma.booking.findMany({
      where: {
        barberId,
        status: { not: 'CANCELLED' },
        startAt: { lt: to },
        endAt: { gt: from },
      },
      select: { startAt: true, endAt: true },
    });
  }
}
