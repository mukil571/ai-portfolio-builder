import "server-only";

import { Resend } from "resend";

import { getEnv } from "@/env";

export type Email = { to: string; subject: string; html: string; text: string };

export class EmailNotConfiguredError extends Error {
  constructor() {
    super("Email sending is not configured (RESEND_API_KEY is missing).");
    this.name = "EmailNotConfiguredError";
  }
}

let resend: Resend | undefined;

/**
 * Sends a transactional email via Resend.
 * Without RESEND_API_KEY: in development the email (including links) is printed to the
 * server log so flows can be tested; in production it throws, never silently drops.
 */
export async function sendEmail(email: Email): Promise<void> {
  const env = getEnv();

  if (!env.RESEND_API_KEY) {
    if (env.NODE_ENV === "production") throw new EmailNotConfiguredError();
    console.info(
      `[email:dev] RESEND_API_KEY not set; not sent.\n  to: ${email.to}\n  subject: ${email.subject}\n${email.text}`,
    );
    return;
  }

  resend ??= new Resend(env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: email.to,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
  if (error) {
    // Details stay in server logs; callers surface a generic message.
    console.error("[email] Resend rejected the email", {
      name: error.name,
      subject: email.subject,
    });
    throw new Error("Failed to send email.");
  }
}
