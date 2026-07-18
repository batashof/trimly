import { Controller, Get, Param } from '@nestjs/common';
import { ServicesService } from './services.service';

/**
 * Public (no auth): the client booking page reads a barber's bookable services
 * from here. Route lives under `barbers/:id` — same pattern as the public
 * AvailabilityController — and is intentionally unguarded, separate from the
 * admin-only ServicesController at `/services`.
 */
@Controller('barbers')
export class PublicServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get(':id/services')
  findForBarber(@Param('id') barberId: string) {
    return this.servicesService.findActiveForBarber(barberId);
  }
}
