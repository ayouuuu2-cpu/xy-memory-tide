/** Storage bucket (server + build). Prefer server-only `SUPABASE_STORAGE_BUCKET`; browser uploads use `NEXT_PUBLIC_STORAGE_BUCKET` in client code. */
export const MEMORY_FRAGMENTS_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET?.trim() ||
  process.env.MEMORY_FRAGMENTS_BUCKET_NAME?.trim() ||
  process.env.NEXT_PUBLIC_STORAGE_BUCKET?.trim() ||
  "memory-fragments";

/** Single-request upload cap (raise + add resumable/TUS for very large files). */
export const MAX_UPLOAD_BYTES = 95 * 1024 * 1024;

export const ALLOWED_UPLOAD_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "image/avif",
  "image/bmp",
  "image/tiff",
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
    case "image/heic":
      return "heic";
    case "image/heif":
      return "heif";
    case "image/avif":
      return "avif";
    case "image/bmp":
      return "bmp";
    case "image/tiff":
      return "tiff";
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
