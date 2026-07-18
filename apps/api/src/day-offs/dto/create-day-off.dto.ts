import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

// `barberId` is resolved from the JWT server-side (BarberScopeGuard), not sent
// by the client.
export class CreateDayOffDto {
  // Calendar date of the day off, "YYYY-MM-DD".
  @IsDateString()
  date!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
