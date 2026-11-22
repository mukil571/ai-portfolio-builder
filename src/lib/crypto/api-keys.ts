import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/*
 * Owner API keys at rest: AES-256-GCM with a random 12-byte IV per key and the site id
 * as additional authenticated data, so a ciphertext copied to another site's row fails to
 * decrypt. Stored as "iv.tag.ciphertext" (base64url) plus a key version for rotation.
 * Plaintext keys are never logged or returned to the client; callers show only last 4.
 */

export const CURRENT_KEY_VERSION = 1;

export class KeyEncryptionUnavailableError extends Error {
  constructor() {
    super("API key encryption is not configured.");
    this.name = "KeyEncryptionUnavailableError";
  }
}

/** Parses the base64 secret; must decode to exactly 32 bytes. */
export function parseEncryptionSecret(secret: string | undefined): Buffer {
  if (!secret) throw new KeyEncryptionUnavailableError();
  const key = Buffer.from(secret, "base64");
  if (key.length !== 32) throw new KeyEncryptionUnavailableError();
  return key;
}

export function encryptApiKey(
  plaintext: string,
  siteId: string,
  secret: Buffer,
): { ciphertext: string; keyVersion: number; last4: string } {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secret, iv);
  cipher.setAAD(Buffer.from(siteId));
  const data = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: [iv, tag, data].map((b) => b.toString("base64url")).join("."),
    keyVersion: CURRENT_KEY_VERSION,
    last4: plaintext.slice(-4),
  };
}

/** Throws if the ciphertext was tampered with, belongs to another site, or the secret differs. */
export function decryptApiKey(
  ciphertext: string,
  keyVersion: number,
  siteId: string,
  secret: Buffer,
): string {
  if (keyVersion !== CURRENT_KEY_VERSION) throw new Error("Unknown key version");
  const [iv, tag, data] = ciphertext.split(".").map((p) => Buffer.from(p, "base64url"));
  if (!iv || !tag || !data) throw new Error("Malformed ciphertext");
  const decipher = createDecipheriv("aes-256-gcm", secret, iv);
  decipher.setAAD(Buffer.from(siteId));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
