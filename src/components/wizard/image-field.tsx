"use client";

import { upload } from "@vercel/blob/client";
import { ImagePlus, Loader2, X } from "lucide-react";
import { useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IMAGE_CONTENT_TYPES, MAX_IMAGE_BYTES, uploadPathname } from "@/lib/uploads/policy";

/** Image picker: upload to Vercel Blob (when configured) or paste an https:// link. */
export function ImageField({
  label,
  value,
  onChange,
  siteId,
  uploadsEnabled,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  siteId: string;
  uploadsEnabled: boolean;
}) {
  const id = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File) {
    setError(null);
    if (!(IMAGE_CONTENT_TYPES as readonly string[]).includes(file.type)) {
      return setError("Use a JPEG, PNG, WebP, AVIF or GIF image.");
    }
    if (file.size > MAX_IMAGE_BYTES) return setError("Images can be up to 5 MB.");
    setBusy(true);
    try {
      const blob = await upload(uploadPathname(siteId, file.name), file, {
        access: "public",
        handleUploadUrl: "/api/uploads",
        clientPayload: JSON.stringify({ siteId }),
        contentType: file.type,
      });
      onChange(blob.url);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Upload failed. Please try again.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <p id={`${id}-label`} className="text-sm font-medium">
        {label}
      </p>
      <div className="flex items-start gap-3">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white/5">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element -- preview of the owner's own image
            <img src={value} alt="" className="size-full object-cover" />
          ) : (
            <ImagePlus className="size-5 text-muted-foreground" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            {uploadsEnabled ? (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept={IMAGE_CONTENT_TYPES.join(",")}
                  className="sr-only"
                  aria-labelledby={`${id}-label`}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void onFile(file);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => fileRef.current?.click()}
                >
                  {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                  {busy ? "Uploading…" : value ? "Replace image" : "Upload image"}
                </Button>
              </>
            ) : null}
            {value ? (
              <Button type="button" variant="ghost" onClick={() => onChange("")}>
                <X aria-hidden="true" /> Remove
              </Button>
            ) : null}
          </div>
          <Input
            aria-label={`${label} link`}
            placeholder={
              uploadsEnabled
                ? "…or paste an image link (https://)"
                : "Paste an image link (https://)"
            }
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-9"
          />
          {error ? (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
