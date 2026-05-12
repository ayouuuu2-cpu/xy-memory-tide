import { NextResponse } from "next/server";
import { isCloudGalleryServerEnabled } from "@/lib/gallery-cloud-config";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  extForWorldMime,
  MAX_UPLOAD_BYTES,
  MEMORY_FRAGMENTS_BUCKET,
  WORLD_UPLOAD_MIMES,
} from "@/lib/world-upload-constants";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  if (!isCloudGalleryServerEnabled()) {
    return NextResponse.json({ error: "World upload is not configured." }, { status: 503 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 413 });
  }

  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing file." }, { status: 400 });
  }

  const mime = (file as File).type || "application/octet-stream";
  if (!WORLD_UPLOAD_MIMES.has(mime)) {
    return NextResponse.json({ error: `Unsupported type: ${mime}` }, { status: 400 });
  }

  const size = typeof (file as File).size === "number" ? (file as File).size : 0;
  if (size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File too large." }, { status: 413 });
  }

  const supabase = getSupabaseAdmin();
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  const ext = extForWorldMime(mime);
  const storagePath = `world/${id}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await supabase.storage.from(MEMORY_FRAGMENTS_BUCKET).upload(storagePath, buffer, {
    contentType: mime,
    upsert: false,
  });
  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const { data: pub } = supabase.storage.from(MEMORY_FRAGMENTS_BUCKET).getPublicUrl(storagePath);
  return NextResponse.json({
    url: pub.publicUrl,
    storagePath,
    mimeType: mime,
  });
}
