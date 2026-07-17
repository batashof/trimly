import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateDayOffDto } from './create-day-off.dto';

// barberId is fixed at creation.
export class UpdateDayOffDto extends PartialType(OmitType(CreateDayOffDto, ['barberId'] as const)) {}
