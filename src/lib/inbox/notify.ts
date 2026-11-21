import "server-only";

import { getEnv } from "@/env";
import {
  claimInstantAlert,
  markLeadNotified,
  markOwnerNotified,
  pendingDigests,
  siteEmailInfo,
  type AnsweredQuestion,
} from "@/lib/db/queries/inbox";
import type { AppDb } from "@/lib/db/types";
import { sendEmail } from "@/lib/email/send";
import {
  ownerDigestMessage,
  ownerNewQuestionMessage,
  visitorAnsweredMessage,
} from "@/lib/email/templates";
import { appBaseUrl } from "@/lib/env/schema";

const baseUrl = () => appBaseUrl(getEnv());
const inboxUrl = (siteId: string) => `${baseUrl()}/dashboard/sites/${siteId}/questions`;

/**
 * Instant owner email for a NEW unanswered question (sites set to "instant"). Runs after
 * the visitor's reply is sent; failures are logged and never affect the visitor.
 */
export async function alertOwnerOfNewQuestion(db: AppDb, questionId: string): Promise<void> {
  try {
    const alert = await claimInstantAlert(db, questionId);
    if (!alert) return;
    await sendEmail(
      ownerNewQuestionMessage({
        to: alert.ownerEmail,
        siteName: alert.siteName,
        question: alert.question,
        inboxUrl: inboxUrl(alert.siteId),
      }),
    );
  } catch (error) {
    console.error("[inbox] owner alert failed", { questionId, error: (error as Error)?.message });
  }
}

/**
 * Emails every waiting visitor the owner's answer, once each. Returns how many were sent.
 * A failed send leaves that lead un-notified; details go to the server log.
 */
export async function emailAnswerToVisitors(
  db: AppDb,
  answered: AnsweredQuestion,
  answer: string,
): Promise<{ sent: number; failed: number }> {
  if (!answered.recipients.length) return { sent: 0, failed: 0 };
  const site = await siteEmailInfo(db, answered.siteId);
  if (!site) return { sent: 0, failed: answered.recipients.length };
  const siteUrl = site.published ? `${baseUrl()}/site/${site.slug}` : null;
  let sent = 0;
  let failed = 0;
  for (const r of answered.recipients) {
    try {
      await sendEmail(
        visitorAnsweredMessage({
          to: r.email,
          owner: site.owner,
          question: r.question,
          answer,
          siteUrl,
        }),
      );
      await markLeadNotified(db, r.leadId);
      sent++;
    } catch (error) {
      failed++;
      console.error("[inbox] visitor email failed", {
        leadId: r.leadId,
        error: (error as Error)?.message,
      });
    }
  }
  return { sent, failed };
}

/** Daily digest (Vercel Cron): one email per owner with sites set to "daily". */
export async function sendDailyDigests(db: AppDb): Promise<{ owners: number; failed: number }> {
  const batches = await pendingDigests(db);
  let owners = 0;
  let failed = 0;
  for (const batch of batches) {
    try {
      await sendEmail(
        ownerDigestMessage({
          to: batch.ownerEmail,
          dashboardUrl: `${baseUrl()}/dashboard`,
          sites: batch.sites.map((s) => ({
            siteName: s.siteName,
            inboxUrl: inboxUrl(s.siteId),
            questions: s.questions,
          })),
        }),
      );
      await markOwnerNotified(db, batch.questionIds);
      owners++;
    } catch (error) {
      failed++;
      console.error("[inbox] digest failed", { error: (error as Error)?.message });
    }
  }
  return { owners, failed };
}
