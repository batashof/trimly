import { Injectable, NotFoundException } from '@nestjs/common';
import { DayOff, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDayOffDto } from './dto/create-day-off.dto';
import { UpdateDayOffDto } from './dto/update-day-off.dto';

@Injectable()
export class DayOffsService {
  constructor(private readonly prisma: PrismaService) {}

  create(barberId: string, dto: CreateDayOffDto): Promise<DayOff> {
    return this.prisma.dayOff.create({
      data: { barberId, date: new Date(dto.date), reason: dto.reason },
    });
  }

  findAll(barberId: string): Promise<DayOff[]> {
    return this.prisma.dayOff.findMany({
      where: { barberId },
      orderBy: { date: 'asc' },
    });
  }

  findOne(barberId: string, id: string): Promise<DayOff> {
    return this.findOwned(barberId, id);
  }

  async update(barberId: string, id: string, dto: UpdateDayOffDto): Promise<DayOff> {
    await this.findOwned(barberId, id);
    const data: Prisma.DayOffUpdateInput = {};
    if (dto.date !== undefined) data.date = new Date(dto.date);
    if (dto.reason !== undefined) data.reason = dto.reason;
    return this.prisma.dayOff.update({ where: { id }, data });
  }

  async remove(barberId: string, id: string): Promise<void> {
    await this.findOwned(barberId, id);
    await this.prisma.dayOff.delete({ where: { id } });
  }

  /** Loads a row only if it belongs to the caller's barber; 404 otherwise. */
  private async findOwned(barberId: string, id: string): Promise<DayOff> {
    const dayOff = await this.prisma.dayOff.findUnique({ where: { id } });
    if (!dayOff || dayOff.barberId !== barberId) {
      throw new NotFoundException(`Day off ${id} not found`);
    }
    return dayOff;
  }
}
