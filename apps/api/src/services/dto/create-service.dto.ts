import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

// `barberId` is intentionally absent — it is resolved from the JWT server-side
// (BarberScopeGuard), never accepted from the client.
export class CreateServiceDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(600)
  durationMinutes!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
