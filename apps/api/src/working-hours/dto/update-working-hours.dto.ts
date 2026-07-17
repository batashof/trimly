import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateWorkingHoursDto } from './create-working-hours.dto';

// barberId is fixed at creation.
export class UpdateWorkingHoursDto extends PartialType(
  OmitType(CreateWorkingHoursDto, ['barberId'] as const),
) {}
