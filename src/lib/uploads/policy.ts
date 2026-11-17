/** Image upload rules shared by the upload route and the editor. */
export const IMAGE_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
] as const;

/** 5 MB. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Uploads for a site must live under this prefix. */
export function siteUploadPrefix(siteId: string): string {
  return `sites/${siteId}/`;
}

/** Safe blob pathname for a file name the user picked. */
export function uploadPathname(siteId: string, fileName: string): string {
  const ext = fileName.toLowerCase().match(/\.(jpe?g|png|webp|avif|gif)$/)?.[1] ?? "img";
  return `${siteUploadPrefix(siteId)}image.${ext}`;
}
