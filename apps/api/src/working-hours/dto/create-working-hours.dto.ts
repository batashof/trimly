import { Type } from 'class-transformer';
import { IsInt, Matches, Max, Min } from 'class-validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

// `barberId` is resolved from the JWT server-side (BarberScopeGuard), not sent
// by the client.
export class CreateWorkingHoursDto {
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
