import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { WorkingHours } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkingHoursDto } from './dto/create-working-hours.dto';
import { UpdateWorkingHoursDto } from './dto/update-working-hours.dto';

@Injectable()
export class WorkingHoursService {
  constructor(private readonly prisma: PrismaService) {}

  async create(barberId: string, dto: CreateWorkingHoursDto): Promise<WorkingHours> {
    this.assertStartBeforeEnd(dto.startTime, dto.endTime);
    return this.prisma.workingHours.create({ data: { ...dto, barberId } });
  }

  findAll(barberId: string): Promise<WorkingHours[]> {
    return this.prisma.workingHours.findMany({
      where: { barberId },
      orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }],
    });
  }

  findOne(barberId: string, id: string): Promise<WorkingHours> {
    return this.findOwned(barberId, id);
  }

  async update(barberId: string, id: string, dto: UpdateWorkingHoursDto): Promise<WorkingHours> {
    const existing = await this.findOwned(barberId, id);
    const startTime = dto.startTime ?? existing.startTime;
    const endTime = dto.endTime ?? existing.endTime;
    this.assertStartBeforeEnd(startTime, endTime);
    return this.prisma.workingHours.update({ where: { id }, data: dto });
  }

  async remove(barberId: string, id: string): Promise<void> {
    await this.findOwned(barberId, id);
    await this.prisma.workingHours.delete({ where: { id } });
  }

  private assertStartBeforeEnd(startTime: string, endTime: string): void {
    if (startTime >= endTime) {
      throw new BadRequestException('startTime must be earlier than endTime');
    }
  }

  /** Loads a row only if it belongs to the caller's barber; 404 otherwise. */
  private async findOwned(barberId: string, id: string): Promise<WorkingHours> {
    const entry = await this.prisma.workingHours.findUnique({ where: { id } });
    if (!entry || entry.barberId !== barberId) {
      throw new NotFoundException(`Working hours ${id} not found`);
    }
    return entry;
  }
}
