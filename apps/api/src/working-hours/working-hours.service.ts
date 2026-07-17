import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { WorkingHours } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkingHoursDto } from './dto/create-working-hours.dto';
import { UpdateWorkingHoursDto } from './dto/update-working-hours.dto';

@Injectable()
export class WorkingHoursService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateWorkingHoursDto): Promise<WorkingHours> {
    await this.ensureBarberExists(dto.barberId);
    this.assertStartBeforeEnd(dto.startTime, dto.endTime);
    return this.prisma.workingHours.create({ data: dto });
  }

  findAll(barberId?: string): Promise<WorkingHours[]> {
    return this.prisma.workingHours.findMany({
      where: barberId ? { barberId } : undefined,
      orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }],
    });
  }

  async findOne(id: string): Promise<WorkingHours> {
    const entry = await this.prisma.workingHours.findUnique({ where: { id } });
    if (!entry) {
      throw new NotFoundException(`Working hours ${id} not found`);
    }
    return entry;
  }

  async update(id: string, dto: UpdateWorkingHoursDto): Promise<WorkingHours> {
    const existing = await this.findOne(id);
    const startTime = dto.startTime ?? existing.startTime;
    const endTime = dto.endTime ?? existing.endTime;
    this.assertStartBeforeEnd(startTime, endTime);
    return this.prisma.workingHours.update({ where: { id }, data: dto });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.workingHours.delete({ where: { id } });
  }

  private assertStartBeforeEnd(startTime: string, endTime: string): void {
    if (startTime >= endTime) {
      throw new BadRequestException('startTime must be earlier than endTime');
    }
  }

  private async ensureBarberExists(barberId: string): Promise<void> {
    const barber = await this.prisma.barber.findUnique({ where: { id: barberId } });
    if (!barber) {
      throw new NotFoundException(`Barber ${barberId} not found`);
    }
  }
}
