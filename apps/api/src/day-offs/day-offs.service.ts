import { Injectable, NotFoundException } from '@nestjs/common';
import { DayOff, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDayOffDto } from './dto/create-day-off.dto';
import { UpdateDayOffDto } from './dto/update-day-off.dto';

@Injectable()
export class DayOffsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDayOffDto): Promise<DayOff> {
    await this.ensureBarberExists(dto.barberId);
    return this.prisma.dayOff.create({
      data: { barberId: dto.barberId, date: new Date(dto.date), reason: dto.reason },
    });
  }

  findAll(barberId?: string): Promise<DayOff[]> {
    return this.prisma.dayOff.findMany({
      where: barberId ? { barberId } : undefined,
      orderBy: { date: 'asc' },
    });
  }

  async findOne(id: string): Promise<DayOff> {
    const dayOff = await this.prisma.dayOff.findUnique({ where: { id } });
    if (!dayOff) {
      throw new NotFoundException(`Day off ${id} not found`);
    }
    return dayOff;
  }

  async update(id: string, dto: UpdateDayOffDto): Promise<DayOff> {
    await this.findOne(id);
    const data: Prisma.DayOffUpdateInput = {};
    if (dto.date !== undefined) data.date = new Date(dto.date);
    if (dto.reason !== undefined) data.reason = dto.reason;
    return this.prisma.dayOff.update({ where: { id }, data });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.dayOff.delete({ where: { id } });
  }

  private async ensureBarberExists(barberId: string): Promise<void> {
    const barber = await this.prisma.barber.findUnique({ where: { id: barberId } });
    if (!barber) {
      throw new NotFoundException(`Barber ${barberId} not found`);
    }
  }
}
