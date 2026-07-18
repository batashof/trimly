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
import { DayOffsService } from './day-offs.service';
import { CreateDayOffDto } from './dto/create-day-off.dto';
import { UpdateDayOffDto } from './dto/update-day-off.dto';

/** Scoped to the caller's own barber (resolved from the JWT). */
@Controller('day-offs')
@UseGuards(JwtAuthGuard, RolesGuard, BarberScopeGuard)
@Roles(Role.ADMIN)
export class DayOffsController {
  constructor(private readonly dayOffsService: DayOffsService) {}

  @Post()
  create(@CurrentBarberId() barberId: string, @Body() dto: CreateDayOffDto) {
    return this.dayOffsService.create(barberId, dto);
  }

  @Get()
  findAll(@CurrentBarberId() barberId: string) {
    return this.dayOffsService.findAll(barberId);
  }

  @Get(':id')
  findOne(@CurrentBarberId() barberId: string, @Param('id') id: string) {
    return this.dayOffsService.findOne(barberId, id);
  }

  @Patch(':id')
  update(
    @CurrentBarberId() barberId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDayOffDto,
  ) {
    return this.dayOffsService.update(barberId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentBarberId() barberId: string, @Param('id') id: string) {
    return this.dayOffsService.remove(barberId, id);
  }
}
