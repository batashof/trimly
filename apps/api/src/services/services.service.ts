import { Injectable, NotFoundException } from '@nestjs/common';
import { Service } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  create(barberId: string, dto: CreateServiceDto): Promise<Service> {
    return this.prisma.service.create({ data: { ...dto, barberId } });
  }

  findAll(barberId: string): Promise<Service[]> {
    return this.prisma.service.findMany({
      where: { barberId },
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

  findOne(barberId: string, id: string): Promise<Service> {
    return this.findOwned(barberId, id);
  }

  async update(barberId: string, id: string, dto: UpdateServiceDto): Promise<Service> {
    await this.findOwned(barberId, id);
    return this.prisma.service.update({ where: { id }, data: dto });
  }

  async remove(barberId: string, id: string): Promise<void> {
    await this.findOwned(barberId, id);
    await this.prisma.service.delete({ where: { id } });
  }

  /**
   * Loads a service only if it belongs to the caller's barber. A row owned by
   * another barber is reported as 404 (not 403) so ids can't be probed for
   * existence across tenants.
   */
  private async findOwned(barberId: string, id: string): Promise<Service> {
    const service = await this.prisma.service.findUnique({ where: { id } });
    if (!service || service.barberId !== barberId) {
      throw new NotFoundException(`Service ${id} not found`);
    }
    return service;
  }
}
