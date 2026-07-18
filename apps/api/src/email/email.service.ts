import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Transactional email for barber self-registration. Sends through the Resend
 * REST API over `fetch` (no SDK dependency). When RESEND_API_KEY is unset it
 * logs the link instead of sending, so local dev needs no account. See
 * docs/architecture.md and docs/decisions-log.md (2026-07-18 — self-registration).
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {}

  async sendRegistrationConfirmation(to: string, confirmUrl: string): Promise<void> {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    const from = this.config.get<string>('EMAIL_FROM') ?? 'Trimly <onboarding@resend.dev>';

    if (!apiKey) {
      this.logger.warn(`RESEND_API_KEY not set — registration link for ${to}: ${confirmUrl}`);
      return;
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        subject: 'Confirm your Trimly barber account',
        html: registrationHtml(confirmUrl),
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      this.logger.error(`Resend send failed (${res.status}): ${detail}`);
      throw new Error('Failed to send confirmation email');
    }
  }
}

function registrationHtml(confirmUrl: string): string {
  return `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; line-height: 1.5; color: #111;">
      <h2 style="margin: 0 0 12px;">Welcome to Trimly</h2>
      <p>Confirm your email to finish creating your barber account and set a password.</p>
      <p style="margin: 24px 0;">
        <a href="${confirmUrl}"
           style="display: inline-block; background: #111; color: #fff; text-decoration: none; padding: 10px 18px; border-radius: 8px;">
          Confirm and set password
        </a>
      </p>
      <p style="color: #666; font-size: 13px;">This link expires in 24 hours. If you didn't request it, you can ignore this email.</p>
    </div>
  `;
}
