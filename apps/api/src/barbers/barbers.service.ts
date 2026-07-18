import { Injectable, NotFoundException } from '@nestjs/common';
import { Barber } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateBarberDto } from './dto/update-barber.dto';

@Injectable()
export class BarbersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Public listing — only barbers that are currently taking bookings. */
  findAllActive(): Promise<Barber[]> {
    return this.prisma.barber.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string): Promise<Barber> {
    const barber = await this.prisma.barber.findUnique({ where: { id } });
    if (!barber) {
      throw new NotFoundException(`Barber ${id} not found`);
    }
    return barber;
  }

  /** The barber profile owned by the logged-in account (admin *is* the barber). */
  async findByUser(userId: string): Promise<Barber> {
    const barber = await this.prisma.barber.findUnique({ where: { userId } });
    if (!barber) {
      throw new NotFoundException('No barber profile is linked to this account');
    }
    return barber;
  }

  async update(id: string, dto: UpdateBarberDto): Promise<Barber> {
    await this.findOne(id);
    return this.prisma.barber.update({ where: { id }, data: dto });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.barber.delete({ where: { id } });
  }
}
