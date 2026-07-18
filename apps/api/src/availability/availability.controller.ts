import { Controller, Get, Param, Query } from '@nestjs/common';
import { availabilityQuerySchema, AvailabilityQuery } from '@trimly/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AvailabilityService } from './availability.service';

/**
 * Public (no auth): the booking page reads free slots from here.
 * Route lives under `barbers/:id` but is intentionally unguarded — separate
 * from the admin-only BarbersController.
 */
@Controller('barbers')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get(':id/availability')
  getAvailability(
    @Param('id') barberId: string,
    @Query(new ZodValidationPipe(availabilityQuerySchema)) query: AvailabilityQuery,
  ) {
    return this.availabilityService.getAvailability(barberId, query.serviceId, query.date);
  }
}
