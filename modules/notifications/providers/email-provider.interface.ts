/**
 * VÉRONA — Email Provider Abstraction (Phase 25)
 *
 * Decouples notification delivery from specific 3rd-party email delivery services (Resend, SendGrid, etc.).
 */

import { SendEmailOptions, SendEmailResult } from "../types/notification.types";

export interface IEmailProvider {
  readonly providerName: string;
  sendEmail(options: SendEmailOptions): Promise<SendEmailResult>;
  verifyWebhookSignature(rawBody: string, headers: Headers): boolean;
}
