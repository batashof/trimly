import { PartialType } from '@nestjs/mapped-types';
import { CreateDayOffDto } from './create-day-off.dto';

// CreateDayOffDto has no barberId (resolved from the JWT).
export class UpdateDayOffDto extends PartialType(CreateDayOffDto) {}
