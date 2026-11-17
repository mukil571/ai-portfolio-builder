import { toNextJsHandler } from "better-auth/next-js";

import { getAuth } from "@/lib/auth";

// Built per request (memoized) so `next build` doesn't need auth secrets.
// Better Auth validates inputs, rate-limits and checks origins for these endpoints.
export async function GET(request: Request): Promise<Response> {
  return toNextJsHandler(getAuth()).GET(request);
}

export async function POST(request: Request): Promise<Response> {
  return toNextJsHandler(getAuth()).POST(request);
}
