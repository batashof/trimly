import { Injectable, NotFoundException } from '@nestjs/common';
import { Service } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateServiceDto): Promise<Service> {
    await this.ensureBarberExists(dto.barberId);
    return this.prisma.service.create({ data: dto });
  }

  findAll(barberId?: string): Promise<Service[]> {
    return this.prisma.service.findMany({
      where: barberId ? { barberId } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  /** Public listing for the booking page — a barber's bookable services only. */
  findActiveForBarber(barberId: string): Promise<Service[]> {
    return this.prisma.service.findMany({
      where: { barberId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string): Promise<Service> {
    const service = await this.prisma.service.findUnique({ where: { id } });
    if (!service) {
      throw new NotFoundException(`Service ${id} not found`);
    }
    return service;
  }

  async update(id: string, dto: UpdateServiceDto): Promise<Service> {
    await this.findOne(id);
    return this.prisma.service.update({ where: { id }, data: dto });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.service.delete({ where: { id } });
  }

  private async ensureBarberExists(barberId: string): Promise<void> {
    const barber = await this.prisma.barber.findUnique({ where: { id: barberId } });
    if (!barber) {
      throw new NotFoundException(`Barber ${barberId} not found`);
    }
  }
}
