import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import {
  registerSchema,
  RegisterInput,
  registerConfirmSchema,
  RegisterConfirmInput,
} from '@trimly/shared';
import { AuthService, LoginResult } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { AuthUser } from './types';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<LoginResult> {
    return this.authService.login(dto.email, dto.password);
  }

  /** Public: barber self-registration — sends a confirmation email. */
  @Post('register')
  @HttpCode(HttpStatus.OK)
  async register(
    @Body(new ZodValidationPipe(registerSchema)) body: RegisterInput,
  ): Promise<{ ok: true }> {
    await this.authService.register(body.email);
    return { ok: true };
  }

  /** Public: finish registration — set the password from the emailed token. */
  @Post('register/confirm')
  @HttpCode(HttpStatus.OK)
  registerConfirm(
    @Body(new ZodValidationPipe(registerConfirmSchema)) body: RegisterConfirmInput,
  ): Promise<LoginResult> {
    return this.authService.confirmRegistration(body.token, body.password);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }
}
