import { PartialType } from '@nestjs/mapped-types';
import { CreateServiceDto } from './create-service.dto';

// CreateServiceDto has no barberId (it is resolved from the JWT), so a partial
// of it is all an update needs.
export class UpdateServiceDto extends PartialType(CreateServiceDto) {}
