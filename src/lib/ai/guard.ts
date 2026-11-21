import { chatConfig } from "./chat-config";

/**
 * Visitor message hygiene. Messages are ALWAYS treated as data; injection patterns are
 * only flagged (for logging/monitoring), never obeyed. The gate and templates are what
 * actually make injection harmless.
 */
export function cleanMessage(raw: string): string {
  return raw
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, chatConfig.MAX_MESSAGE_CHARS);
}

const INJECTION_PATTERNS: RegExp[] = [
  /ignore (all |any |the )?(previous|prior|above|earlier) (instructions|rules|prompts?)/i,
  /(system|developer) (prompt|message|instructions)/i,
  /^\s*(system|assistant|developer)\s*:/im,
  /<\/?(facts?|system|document|instructions?)>/i,
  /repeat (everything|all|the text) (above|before)/i,
  /(translate|reveal|print|show|output) (your|the) (instructions|prompt|rules)/i,
  /pretend (you are|to be)|act as|you are now/i,
  /new fact\s*:/i,
];

/** True if the message looks like a prompt-injection attempt (for logging only). */
export function looksLikeInjection(message: string): boolean {
  return INJECTION_PATTERNS.some((p) => p.test(message));
}
