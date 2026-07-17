import { Controller, Get } from '@nestjs/common';

/**
 * GET /health — used by the external pinger (cron-job.org) to keep the Render
 * free web service awake before demos. See docs/architecture.md.
 */
@Controller('health')
export class HealthController {
  @Get()
  check(): { status: 'ok'; timestamp: string } {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
