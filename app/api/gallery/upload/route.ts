import { NextResponse } from "next/server";
import type { GalleryMeta } from "@/lib/memory-dump-storage";
import { MAX_ITEMS } from "@/lib/memory-dump-storage";
import type { PhotoRow } from "@/lib/gallery-cloud";
import {
  ALLOWED_UPLOAD_MIMES,
  extForMime,
  MAX_UPLOAD_BYTES,
  MEMORY_FRAGMENTS_BUCKET,
  mediaTypeForMime,
} from "@/lib/gallery-server-constants";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 120;

function cloudEnabled(): boolean {
  return process.env.NEXT_PUBLIC_MEMORY_GALLERY_CLOUD === "1" && isSupabaseConfigured();
}

function defaultMeta(): GalleryMeta {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return { timestamp: `${y}.${m}.${day}`, mood: "—", location: "—" };
}

export async function POST(req: Request) {
  if (!cloudEnabled()) {
    return NextResponse.json({ error: "Cloud gallery is not enabled." }, { status: 503 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data (body too large or malformed)." }, { status: 413 });
  }

  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing file." }, { status: 400 });
  }

  const mime = (file as File).type || "application/octet-stream";
  if (!ALLOWED_UPLOAD_MIMES.has(mime)) {
    return NextResponse.json({ error: `Unsupported type: ${mime}` }, { status: 400 });
  }

  const size = typeof (file as File).size === "number" ? (file as File).size : 0;
  if (size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `File exceeds ${Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024))}MB. Use a smaller clip or add resumable uploads.` },
      { status: 413 },
    );
  }

  const caption = String(form.get("caption") ?? "").trim() || "Untitled";
  const authorName = String(form.get("authorName") ?? "").trim();
  if (!authorName) {
    return NextResponse.json({ error: "authorName is required." }, { status: 400 });
  }
  const authorAvatarRaw = form.get("authorAvatar");
  const authorAvatar =
    typeof authorAvatarRaw === "string" && authorAvatarRaw.trim() ? authorAvatarRaw.trim() : null;

  let meta: GalleryMeta = defaultMeta();
  const metaRaw = form.get("meta");
  if (typeof metaRaw === "string" && metaRaw.trim()) {
    try {
      const parsed = JSON.parse(metaRaw) as Partial<GalleryMeta>;
      meta = {
        ...defaultMeta(),
        timestamp: typeof parsed.timestamp === "string" ? parsed.timestamp : meta.timestamp,
        mood: typeof parsed.mood === "string" ? parsed.mood : meta.mood,
        location: typeof parsed.location === "string" ? parsed.location : meta.location,
      };
    } catch {
      /* keep default */
    }
  }

  const supabase = getSupabaseAdmin();

  const { count, error: countErr } = await supabase.from("photos").select("id", { count: "exact", head: true });
  if (countErr) {
    return NextResponse.json({ error: countErr.message }, { status: 500 });
  }
  if (count != null && count >= MAX_ITEMS) {
    return NextResponse.json({ error: `Gallery is full (${MAX_ITEMS} items).` }, { status: 400 });
  }

  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  const ext = extForMime(mime);
  const storagePath = `fragments/${id}.${ext}`;
  const mediaType = mediaTypeForMime(mime);

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await supabase.storage.from(MEMORY_FRAGMENTS_BUCKET).upload(storagePath, buffer, {
    contentType: mime,
    upsert: false,
  });
  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const { data: pub } = supabase.storage.from(MEMORY_FRAGMENTS_BUCKET).getPublicUrl(storagePath);
  const publicUrl = pub.publicUrl;

  const { data: row, error: insErr } = await supabase
    .from("photos")
    .insert({
      id,
      storage_path: storagePath,
      public_url: publicUrl,
      media_type: mediaType,
      mime_type: mime,
      bytes: size,
      caption,
      author_name: authorName,
      author_avatar: authorAvatar,
      meta,
    })
    .select(
      "id, storage_path, public_url, media_type, mime_type, bytes, caption, author_name, author_avatar, meta, created_at",
    )
    .single();

  if (insErr || !row) {
    await supabase.storage.from(MEMORY_FRAGMENTS_BUCKET).remove([storagePath]);
    return NextResponse.json({ error: insErr?.message ?? "Insert failed" }, { status: 500 });
  }

  return NextResponse.json({ item: row as PhotoRow });
}
