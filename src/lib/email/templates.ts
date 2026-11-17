import type { Email } from "./send";

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function layout(heading: string, body: string, cta: { label: string; url: string }) {
  const url = escapeHtml(cta.url);
  return `<!doctype html>
<html><body style="margin:0;background:#0b0c14;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#e8e8f0">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:480px;background:#14151f;border:1px solid #2a2b3a;border-radius:16px;padding:32px">
        <tr><td>
          <p style="margin:0 0 24px;font-weight:600;letter-spacing:.04em">Loriyum</p>
          <h1 style="margin:0 0 12px;font-size:20px">${heading}</h1>
          <p style="margin:0 0 24px;line-height:1.6;color:#b4b4c8">${body}</p>
          <a href="${url}" style="display:inline-block;background:#8b7cf6;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600">${cta.label}</a>
          <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#80809a">Or paste this link into your browser:<br>${url}</p>
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
