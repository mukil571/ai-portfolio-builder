import type { Email } from "./send";

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** `heading` and `body` are HTML (escape untrusted parts); the CTA is escaped here. */
function layout(heading: string, body: string, cta: { label: string; url: string } | null) {
  const url = cta ? escapeHtml(cta.url) : "";
  const button = cta
    ? `<a href="${url}" style="display:inline-block;background:#8b7cf6;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600">${escapeHtml(cta.label)}</a>
          <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#80809a">Or paste this link into your browser:<br>${url}</p>`
    : "";
  return `<!doctype html>
<html><body style="margin:0;background:#0b0c14;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#e8e8f0">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:480px;background:#14151f;border:1px solid #2a2b3a;border-radius:16px;padding:32px">
        <tr><td>
          <p style="margin:0 0 24px;font-weight:600;letter-spacing:.04em">Loriyum</p>
          <h1 style="margin:0 0 12px;font-size:20px">${heading}</h1>
          <p style="margin:0 0 24px;line-height:1.6;color:#b4b4c8">${body}</p>
          ${button}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export function verifyEmailMessage(to: string, name: string, url: string): Email {
  const hi = name ? `Hi ${escapeHtml(name)}, confirm` : "Confirm";
  return {
    to,
    subject: "Confirm your email for Loriyum",
    html: layout(
      "Confirm your email",
      `${hi} this address to finish creating your Loriyum account. The link expires in 1 hour.`,
      { label: "Confirm email", url },
    ),
    text: `Confirm your email to finish creating your Loriyum account (link expires in 1 hour):\n${url}`,
  };
}

export function resetPasswordMessage(to: string, url: string): Email {
  return {
    to,
    subject: "Reset your Loriyum password",
    html: layout(
      "Reset your password",
      "Someone asked to reset the password for this account. If it was you, use the link below; it expires in 1 hour. If not, you can ignore this email.",
      { label: "Choose a new password", url },
    ),
    text: `Reset your Loriyum password (link expires in 1 hour; ignore this email if you didn't ask):\n${url}`,
  };
}

const quote = (text: string) =>
  `<span style="display:block;margin:12px 0;padding:12px 14px;border-left:3px solid #8b7cf6;background:#1b1c29;border-radius:8px;color:#e8e8f0">${escapeHtml(text)}</span>`;

/** Instant email to the owner: a visitor asked something the assistant couldn't answer. */
export function ownerNewQuestionMessage(input: {
  to: string;
  siteName: string;
  question: string;
  inboxUrl: string;
}): Email {
  return {
    to: input.to,
    subject: `New visitor question on ${input.siteName}`,
    html: layout(
      "A visitor asked something new",
      `Your assistant on <strong>${escapeHtml(input.siteName)}</strong> didn't have an answer yet:${quote(input.question)}Answer it once and the assistant will know it for every future visitor.`,
      { label: "Answer in your inbox", url: input.inboxUrl },
    ),
    text: `A visitor on ${input.siteName} asked something your assistant couldn't answer yet:\n\n"${input.question}"\n\nAnswer it once and the assistant will know it for every future visitor:\n${input.inboxUrl}`,
  };
}

/** Daily digest to the owner: new unanswered questions across their "daily" sites. */
export function ownerDigestMessage(input: {
  to: string;
  sites: {
    siteName: string;
    inboxUrl: string;
    questions: { question: string; askedCount: number }[];
  }[];
  dashboardUrl: string;
}): Email {
  const total = input.sites.reduce((n, s) => n + s.questions.length, 0);
  const asked = (n: number) => (n > 1 ? ` (asked ${n} times)` : "");
  const html = input.sites
    .map((s) => {
      const shown = s.questions.slice(0, 10);
      const more = s.questions.length - shown.length;
      return `<strong>${escapeHtml(s.siteName)}</strong><br>${shown
        .map((q) => `• ${escapeHtml(q.question)}${asked(q.askedCount)}`)
        .join("<br>")}${more > 0 ? `<br>…and ${more} more` : ""}`;
    })
    .join("<br><br>");
  const text = input.sites
    .map(
      (s) =>
        `${s.siteName} (${s.inboxUrl})\n${s.questions
          .map((q) => `- ${q.question}${asked(q.askedCount)}`)
          .join("\n")}`,
    )
    .join("\n\n");
  return {
    to: input.to,
    subject: `${total} new visitor question${total === 1 ? "" : "s"} to answer`,
    html: layout(
      "Your daily questions digest",
      `Visitors asked things your assistant doesn't know yet:<br><br>${html}`,
      { label: "Open your dashboard", url: input.dashboardUrl },
    ),
    text: `Visitors asked things your assistant doesn't know yet:\n\n${text}\n\nOpen your dashboard: ${input.dashboardUrl}`,
  };
}

/** To a visitor who asked to be emailed: the owner answered their question. */
export function visitorAnsweredMessage(input: {
  to: string;
  owner: string;
  question: string;
  answer: string;
  siteUrl: string | null;
}): Email {
  const link = input.siteUrl ?? "";
  return {
    to: input.to,
    subject: `${input.owner} answered your question`,
    html: layout(
      `${escapeHtml(input.owner)} answered your question`,
      `You asked:${quote(input.question)}Their answer:${quote(input.answer)}<span style="font-size:12px;color:#80809a">You're getting this one email because you asked to be told when this was answered. We won't email you again about it.</span>`,
      link ? { label: `Visit ${input.owner}'s site`, url: link } : null,
    ),
    text: `You asked ${input.owner}: "${input.question}"\n\nTheir answer:\n${input.answer}\n\n${link ? `Visit their site: ${link}\n\n` : ""}You're getting this one email because you asked to be told when this was answered.`,
  };
}
