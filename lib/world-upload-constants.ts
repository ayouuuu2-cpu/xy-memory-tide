import { MAX_UPLOAD_BYTES, MEMORY_FRAGMENTS_BUCKET } from "@/lib/gallery-server-constants";

/** Quest / eternal attachments: images + short audio (no DB row; URL returned to client). */
export const WORLD_UPLOAD_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
]);

export { MAX_UPLOAD_BYTES, MEMORY_FRAGMENTS_BUCKET };

export function extForWorldMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "audio/webm":
      return "webm";
    case "audio/mp4":
      return "m4a";
    case "audio/mpeg":
      return "mp3";
    case "audio/wav":
      return "wav";
    case "audio/ogg":
      return "ogg";
    default:
      return "bin";
  }
}
