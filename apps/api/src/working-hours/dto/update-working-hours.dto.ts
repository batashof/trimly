import { PartialType } from '@nestjs/mapped-types';
import { CreateWorkingHoursDto } from './create-working-hours.dto';

// CreateWorkingHoursDto has no barberId (resolved from the JWT).
export class UpdateWorkingHoursDto extends PartialType(CreateWorkingHoursDto) {}
