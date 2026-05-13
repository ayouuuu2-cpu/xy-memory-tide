/** Storage bucket for uploads (world-upload, gallery, memory-images). Override if your project uses another name (e.g. `photos`). */
export const MEMORY_FRAGMENTS_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET?.trim() ||
  process.env.MEMORY_FRAGMENTS_BUCKET_NAME?.trim() ||
  "memory-fragments";

/** Single-request upload cap (raise + add resumable/TUS for very large files). */
export const MAX_UPLOAD_BYTES = 95 * 1024 * 1024;

export const ALLOWED_UPLOAD_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

export function extForMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "video/mp4":
      return "mp4";
    case "video/webm":
      return "webm";
    case "video/quicktime":
      return "mov";
    default:
      return "bin";
  }
}

export function mediaTypeForMime(mime: string): "image" | "video" {
  return mime.startsWith("video/") ? "video" : "image";
}
