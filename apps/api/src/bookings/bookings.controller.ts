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
import { Roles } from '../auth/decorators/roles.decorator';
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

  /** Admin: booking list with optional from/to/barber filters. */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  findAll(@Query(new ZodValidationPipe(bookingListQuerySchema)) query: BookingListQuery) {
    return this.bookingsService.findAll(query);
  }

  /** Admin: cancel or mark a booking completed. */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateBookingSchema)) body: UpdateBookingInput,
  ) {
    return this.bookingsService.update(id, body);
  }
}
