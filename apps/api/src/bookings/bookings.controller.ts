import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import {
  bookingListQuerySchema,
  BookingListQuery,
  createBookingSchema,
  CreateBookingInput,
  updateBookingSchema,
  UpdateBookingInput,
} from '@trimly/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { BarberScopeGuard } from '../auth/guards/barber-scope.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentBarberId } from '../auth/decorators/current-barber-id.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { BookingsService } from './bookings.service';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  /** Public: the booking page submits here. */
  @Post()
  create(@Body(new ZodValidationPipe(createBookingSchema)) body: CreateBookingInput) {
    return this.bookingsService.create(body);
  }

  /** Admin: own bookings, with optional from/to filters. Scope is the caller's barber. */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard, BarberScopeGuard)
  @Roles(Role.ADMIN)
  findAll(
    @CurrentBarberId() barberId: string,
    @Query(new ZodValidationPipe(bookingListQuerySchema)) query: BookingListQuery,
  ) {
    return this.bookingsService.findAll(barberId, query);
  }

  /** Admin: cancel or mark one of the caller's own bookings completed. */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, BarberScopeGuard)
  @Roles(Role.ADMIN)
  update(
    @CurrentBarberId() barberId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateBookingSchema)) body: UpdateBookingInput,
  ) {
    return this.bookingsService.update(barberId, id, body);
  }
}
