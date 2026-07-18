import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Transactional email for barber self-registration. Sends through the SendGrid
 * v3 REST API over `fetch` (no SDK dependency). When SENDGRID_API_KEY is unset
 * it logs the link instead of sending, so local dev needs no account.
 *
 * SendGrid is used with Single Sender Verification (no owned domain required):
 * EMAIL_FROM must be a sender address verified in the SendGrid dashboard. See
 * docs/architecture.md and docs/decisions-log.md (2026-07-18 — email provider).
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {}

  async sendRegistrationConfirmation(to: string, confirmUrl: string): Promise<void> {
    const apiKey = this.config.get<string>('SENDGRID_API_KEY');
    const from = parseFrom(this.config.get<string>('EMAIL_FROM'));

    if (!apiKey) {
      this.logger.warn(`SENDGRID_API_KEY not set — registration link for ${to}: ${confirmUrl}`);
      return;
    }

    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from,
        subject: 'Confirm your Trimly barber account',
        content: [{ type: 'text/html', value: registrationHtml(confirmUrl) }],
      }),
    });

    // SendGrid returns 202 Accepted on success.
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      this.logger.error(`SendGrid send failed (${res.status}): ${detail}`);
      throw new Error('Failed to send confirmation email');
    }
  }
}

/**
 * Parse an EMAIL_FROM value into SendGrid's `{ email, name }` shape. Accepts
 * both `Name <email@host>` and a bare `email@host`. Falls back to a placeholder
 * so a missing/malformed value fails loudly at SendGrid rather than silently.
 */
function parseFrom(value: string | undefined): { email: string; name?: string } {
  const raw = (value ?? '').trim();
  const match = raw.match(/^\s*(.*?)\s*<\s*([^>]+?)\s*>\s*$/);
  if (match) {
    const name = match[1].trim();
    return name ? { email: match[2], name } : { email: match[2] };
  }
  return { email: raw || 'no-reply@example.com' };
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
