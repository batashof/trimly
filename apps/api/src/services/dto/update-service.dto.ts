import { PartialType } from '@nestjs/mapped-types';
import { OmitType } from '@nestjs/mapped-types';
import { CreateServiceDto } from './create-service.dto';

// barberId is fixed at creation — a service cannot be reassigned to another barber.
export class UpdateServiceDto extends PartialType(OmitType(CreateServiceDto, ['barberId'] as const)) {}
