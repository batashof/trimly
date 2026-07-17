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
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { DayOffsService } from './day-offs.service';
import { CreateDayOffDto } from './dto/create-day-off.dto';
import { UpdateDayOffDto } from './dto/update-day-off.dto';

@Controller('day-offs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class DayOffsController {
  constructor(private readonly dayOffsService: DayOffsService) {}

  @Post()
  create(@Body() dto: CreateDayOffDto) {
    return this.dayOffsService.create(dto);
  }

  @Get()
  findAll(@Query('barberId') barberId?: string) {
    return this.dayOffsService.findAll(barberId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dayOffsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDayOffDto) {
    return this.dayOffsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.dayOffsService.remove(id);
  }
}
