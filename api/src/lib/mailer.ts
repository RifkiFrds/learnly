import nodemailer from 'nodemailer';
import { env } from '../config/env';

// Email dikirim langsung (synchronous, tanpa queue — docs/03-tech-stack.md §2.3).
// MAIL_DRIVER=log hanya mencetak email ke console, cocok untuk dev tanpa akun Gmail.
const transporter =
  env.MAIL_DRIVER === 'smtp'
    ? nodemailer.createTransport({
        service: 'gmail',
        auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD },
      })
    : null;

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendMail(message: MailMessage): Promise<void> {
  if (!transporter) {
    console.log(
      `[mail:log] To: ${message.to}\n[mail:log] Subject: ${message.subject}\n[mail:log] ${message.text}`,
    );
    return;
  }
  await transporter.sendMail({ from: `Learnly <${env.GMAIL_USER}>`, ...message });
}

export const isMailLogDriver = () => env.MAIL_DRIVER === 'log';
