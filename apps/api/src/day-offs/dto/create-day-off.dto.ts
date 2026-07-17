import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDayOffDto {
  @IsString()
  barberId!: string;

  // Calendar date of the day off, "YYYY-MM-DD".
  @IsDateString()
  date!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
