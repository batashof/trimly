import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Booking, Prisma } from '@prisma/client';
import { DateTime } from 'luxon';
import {
  BookingConfirmation,
  BookingListQuery,
  CreateBookingInput,
  UpdateBookingInput,
} from '@trimly/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilityService } from '../availability/availability.service';

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Create a booking (public). Availability is validated server-side, then the
   * INSERT is guarded against the double-booking race inside a Serializable
   * transaction — see docs/business-logic.md.
   */
  async create(input: CreateBookingInput): Promise<BookingConfirmation> {
    const startAt = new Date(input.startAt);
    if (Number.isNaN(startAt.getTime())) {
      throw new BadRequestException('Invalid startAt');
    }
    if (startAt.getTime() <= Date.now()) {
      throw new BadRequestException('startAt must be in the future');
    }

    const service = await this.prisma.service.findUnique({ where: { id: input.serviceId } });
    if (!service || !service.isActive || service.barberId !== input.barberId) {
      throw new NotFoundException('Service not found for this barber');
    }

    const barber = await this.prisma.barber.findUnique({ where: { id: input.barberId } });
    if (!barber || !barber.isActive) {
      throw new NotFoundException(`Barber ${input.barberId} not found`);
    }

    const endAt = new Date(startAt.getTime() + service.durationMinutes * 60_000);

    // Validate the requested slot against real availability (working hours,
    // day off, past-slot, alignment). This is UX-quality validation; the
    // transaction below is what actually protects against the race.
    const date = DateTime.fromJSDate(startAt).setZone(barber.timezone).toISODate();
    if (!date) {
      throw new BadRequestException('Invalid startAt');
    }
    const availability = await this.availability.getAvailability(
      input.barberId,
      input.serviceId,
      date,
    );
    const startIso = startAt.toISOString();
    const isOffered = availability.slots.some((slot) => slot.startAt === startIso);
    if (!isOffered) {
      throw new ConflictException('Selected slot is not available');
    }

    const booking = await this.insertGuarded({
      barberId: input.barberId,
      serviceId: input.serviceId,
      clientName: input.clientName,
      clientPhone: input.clientPhone,
      startAt,
      endAt,
    });

    return {
      id: booking.id,
      status: booking.status,
      startAt: booking.startAt.toISOString(),
      endAt: booking.endAt.toISOString(),
      telegramDeepLink: this.buildDeepLink(booking.notifyToken),
    };
  }

  private async insertGuarded(data: {
    barberId: string;
    serviceId: string;
    clientName: string;
    clientPhone: string;
    startAt: Date;
    endAt: Date;
  }): Promise<Booking> {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const clash = await tx.booking.findFirst({
            where: {
              barberId: data.barberId,
              status: { not: 'CANCELLED' },
              startAt: { lt: data.endAt },
              endAt: { gt: data.startAt },
            },
            select: { id: true },
          });
          if (clash) {
            throw new ConflictException('Selected slot is not available');
          }
          return tx.booking.create({ data });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      // Two concurrent Serializable transactions that both passed the overlap
      // check will collide at commit time (Postgres serialization failure).
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new ConflictException('Selected slot is not available');
      }
      throw error;
    }
  }

  private buildDeepLink(notifyToken: string): string {
    const username = this.config.get<string>('TELEGRAM_BOT_USERNAME') ?? 'TrimlyBot';
    return `https://t.me/${username}?start=${notifyToken}`;
  }

  findAll(query: BookingListQuery): Promise<Booking[]> {
    const where: Prisma.BookingWhereInput = {};
    if (query.barberId) where.barberId = query.barberId;
    if (query.from || query.to) {
      where.startAt = {};
      if (query.from) where.startAt.gte = new Date(query.from);
      if (query.to) where.startAt.lte = new Date(query.to);
    }
    return this.prisma.booking.findMany({
      where,
      orderBy: { startAt: 'asc' },
      include: {
        barber: { select: { id: true, displayName: true } },
        service: { select: { id: true, name: true, durationMinutes: true } },
      },
    });
  }

  async update(id: string, dto: UpdateBookingInput): Promise<Booking> {
    const existing = await this.prisma.booking.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Booking ${id} not found`);
    }
    return this.prisma.booking.update({ where: { id }, data: { status: dto.status } });
  }
}
