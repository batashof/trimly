import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { BarberScopeGuard } from '../auth/guards/barber-scope.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentBarberId } from '../auth/decorators/current-barber-id.decorator';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

/**
 * Every route is scoped to the caller's own barber (resolved from the JWT by
 * BarberScopeGuard) — the barber id never comes from the request body or query.
 */
@Controller('services')
@UseGuards(JwtAuthGuard, RolesGuard, BarberScopeGuard)
@Roles(Role.ADMIN)
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  create(@CurrentBarberId() barberId: string, @Body() dto: CreateServiceDto) {
    return this.servicesService.create(barberId, dto);
  }

  @Get()
  findAll(@CurrentBarberId() barberId: string) {
    return this.servicesService.findAll(barberId);
  }

  @Get(':id')
  findOne(@CurrentBarberId() barberId: string, @Param('id') id: string) {
    return this.servicesService.findOne(barberId, id);
  }

  @Patch(':id')
  update(
    @CurrentBarberId() barberId: string,
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.servicesService.update(barberId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentBarberId() barberId: string, @Param('id') id: string) {
    return this.servicesService.remove(barberId, id);
  }
}
