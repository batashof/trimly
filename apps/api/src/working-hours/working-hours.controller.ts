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
import { WorkingHoursService } from './working-hours.service';
import { CreateWorkingHoursDto } from './dto/create-working-hours.dto';
import { UpdateWorkingHoursDto } from './dto/update-working-hours.dto';

/** Scoped to the caller's own barber (resolved from the JWT). */
@Controller('working-hours')
@UseGuards(JwtAuthGuard, RolesGuard, BarberScopeGuard)
@Roles(Role.ADMIN)
export class WorkingHoursController {
  constructor(private readonly workingHoursService: WorkingHoursService) {}

  @Post()
  create(@CurrentBarberId() barberId: string, @Body() dto: CreateWorkingHoursDto) {
    return this.workingHoursService.create(barberId, dto);
  }

  @Get()
  findAll(@CurrentBarberId() barberId: string) {
    return this.workingHoursService.findAll(barberId);
  }

  @Get(':id')
  findOne(@CurrentBarberId() barberId: string, @Param('id') id: string) {
    return this.workingHoursService.findOne(barberId, id);
  }

  @Patch(':id')
  update(
    @CurrentBarberId() barberId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWorkingHoursDto,
  ) {
    return this.workingHoursService.update(barberId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentBarberId() barberId: string, @Param('id') id: string) {
    return this.workingHoursService.remove(barberId, id);
  }
}
