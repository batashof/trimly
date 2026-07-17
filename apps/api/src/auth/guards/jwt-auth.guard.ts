import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Requires a valid Bearer JWT. Rejects the request otherwise. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
