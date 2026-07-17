import { Injectable, NotFoundException } from '@nestjs/common';
import { Barber } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBarberDto } from './dto/create-barber.dto';
import { UpdateBarberDto } from './dto/update-barber.dto';

@Injectable()
export class BarbersService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateBarberDto): Promise<Barber> {
    return this.prisma.barber.create({ data: dto });
  }

  findAll(): Promise<Barber[]> {
    return this.prisma.barber.findMany({ orderBy: { createdAt: 'asc' } });
  }

  async findOne(id: string): Promise<Barber> {
    const barber = await this.prisma.barber.findUnique({ where: { id } });
    if (!barber) {
      throw new NotFoundException(`Barber ${id} not found`);
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
