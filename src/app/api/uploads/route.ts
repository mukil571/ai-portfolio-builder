import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { z } from "zod";

import { getEnv } from "@/env";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { ownsSite } from "@/lib/db/queries/site-builder";
import { IMAGE_CONTENT_TYPES, MAX_IMAGE_BYTES, siteUploadPrefix } from "@/lib/uploads/policy";

const clientPayloadSchema = z.object({ siteId: z.uuid() });

class UploadDenied extends Error {}

/**
 * Issues short-lived Vercel Blob client-upload tokens. The browser uploads directly to
 * Blob; this route only authorizes: signed-in owner of the site, images only (no SVG),
 * max 5 MB, under sites/<siteId>/, random suffix so names never collide or get guessed.
 */
export async function POST(request: Request): Promise<Response> {
  const token = getEnv().BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return Response.json(
      { error: "Image upload isn't set up yet. Paste an image link instead." },
      { status: 503 },
    );
  }

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return Response.json({ error: "Invalid upload request." }, { status: 400 });
  }

  try {
    const result = await handleUpload({
      token,
      request,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const user = await getCurrentUser();
        if (!user) throw new UploadDenied("Please log in again.");
        const payload = clientPayloadSchema.safeParse(JSON.parse(clientPayload ?? "null"));
        if (!payload.success) throw new UploadDenied("Invalid upload request.");
        const { siteId } = payload.data;
        if (!pathname.startsWith(siteUploadPrefix(siteId)) || pathname.includes("..")) {
          throw new UploadDenied("Invalid upload request.");
        }
        if (!(await ownsSite(getDb(), user.id, siteId))) {
          throw new UploadDenied("You can only upload to your own sites.");
        }
        return {
          allowedContentTypes: [...IMAGE_CONTENT_TYPES],
          maximumSizeInBytes: MAX_IMAGE_BYTES,
          addRandomSuffix: true,
        };
      },
    });
    return Response.json(result);
  } catch (error) {
    if (error instanceof UploadDenied) {
      return Response.json({ error: error.message }, { status: 403 });
    }
    console.error("[uploads] token generation failed", error);
    return Response.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
