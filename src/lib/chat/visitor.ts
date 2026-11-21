import "server-only";

import { createHmac, randomUUID } from "node:crypto";

import { cookies, headers } from "next/headers";

import { getEnv } from "@/env";

export const VISITOR_COOKIE = "loriyum_vid";
const ONE_YEAR = 60 * 60 * 24 * 365;

/** Anonymous visitor id from a first-party httpOnly cookie (set if missing). */
export async function getVisitorId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(VISITOR_COOKIE)?.value;
  if (existing && /^[0-9a-f-]{36}$/i.test(existing)) return existing;
  const id = randomUUID();
  jar.set(VISITOR_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR,
  });
  return id;
}

/** Salted hash of the client IP (raw IPs are never stored). */
export async function getIpHash(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  return createHmac("sha256", getEnv().BETTER_AUTH_SECRET)
    .update(`ip:${ip}`)
    .digest("hex")
    .slice(0, 32);
}

export async function getUserAgent(): Promise<string | null> {
  return (await headers()).get("user-agent");
}
