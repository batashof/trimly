import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { BarberScopeGuard } from '../auth/guards/barber-scope.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentBarberId } from '../auth/decorators/current-barber-id.decorator';
import type { AuthUser } from '../auth/types';
import { BarbersService } from './barbers.service';
import { UpdateBarberDto } from './dto/update-barber.dto';

/**
 * Barber reads are public — the client booking page (reached via a per-barber
 * link) fetches the barber's profile from GET /barbers/:id. Writes stay
 * ADMIN-only and are scoped to the caller's own profile. There is no create
 * endpoint: a Barber only ever comes into existence through self-registration
 * (linked 1:1 to its User). See docs/decisions-log.md.
 */
@Controller('barbers')
export class BarbersController {
  constructor(private readonly barbersService: BarbersService) {}

  /** Public: active barbers only. */
  @Get()
  findAll() {
    return this.barbersService.findAllActive();
  }

  /**
   * The barber profile owned by the logged-in admin. Declared before `:id` so
   * the literal "me" isn't swallowed by the param route.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  findMine(@CurrentUser() user: AuthUser) {
    return this.barbersService.findByUser(user.id);
  }

  /** Public: single barber profile for the booking page header. */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.barbersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, BarberScopeGuard)
  @Roles(Role.ADMIN)
  update(
    @CurrentBarberId() ownBarberId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBarberDto,
  ) {
    this.assertOwnProfile(ownBarberId, id);
    return this.barbersService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, BarberScopeGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentBarberId() ownBarberId: string, @Param('id') id: string) {
    this.assertOwnProfile(ownBarberId, id);
    return this.barbersService.remove(id);
  }

  /** A barber may only write its own profile row. */
  private assertOwnProfile(ownBarberId: string, targetId: string): void {
    if (ownBarberId !== targetId) {
      throw new ForbiddenException('You can only modify your own barber profile');
    }
  }
}
