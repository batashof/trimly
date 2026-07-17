import { Type } from 'class-transformer';
import { IsInt, IsString, Matches, Max, Min } from 'class-validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateWorkingHoursDto {
  @IsString()
  barberId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  weekday!: number; // 0 = Sunday .. 6 = Saturday

  @Matches(TIME_PATTERN, { message: 'startTime must be in HH:MM 24-hour format' })
  startTime!: string;

  @Matches(TIME_PATTERN, { message: 'endTime must be in HH:MM 24-hour format' })
  endTime!: string;
}
