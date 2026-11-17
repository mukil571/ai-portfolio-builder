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

/** Local (non-Vercel) runs without Resend write emails here; e2e tests read them. */
export const LOCAL_OUTBOX_DIR = ".local-outbox";

/**
 * Sends a transactional email via Resend.
 * Without RESEND_API_KEY: on a local machine the email is printed to the server log and
 * saved to .local-outbox/ (so flows and e2e tests work); on Vercel it throws, never
 * silently drops.
 */
export async function sendEmail(email: Email): Promise<void> {
  const env = getEnv();

  if (!env.RESEND_API_KEY) {
    if (env.VERCEL) throw new EmailNotConfiguredError();
    console.info(
      `[email:local] RESEND_API_KEY not set; not sent.\n  to: ${email.to}\n  subject: ${email.subject}\n${email.text}`,
    );
    const { mkdir, writeFile } = await import("node:fs/promises");
    const path = await import("node:path");
    const dir = path.join(process.cwd(), LOCAL_OUTBOX_DIR);
    await mkdir(dir, { recursive: true });
    const file = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
    await writeFile(path.join(dir, file), JSON.stringify(email, null, 2));
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
    // Resend's message explains the rejection (e.g. test-sender recipient limits,
    // unverified domain); it contains no secrets. The recipient is not logged.
    console.error("[email] Resend rejected the email", {
      name: error.name,
      message: error.message,
      subject: email.subject,
    });
    throw new Error("Failed to send email.");
  }
}
