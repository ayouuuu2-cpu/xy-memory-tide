import { NextResponse } from "next/server";
import type { GalleryAuthor, GalleryItem, GalleryMeta } from "@/lib/memory-dump-storage";
import {
  ALLOWED_UPLOAD_MIMES,
  extForMime,
  MAX_UPLOAD_BYTES,
  MEMORY_FRAGMENTS_BUCKET,
  mediaTypeForMime,
} from "@/lib/gallery-server-constants";
import { isCloudGalleryServerEnabled } from "@/lib/gallery-cloud-config";
import { maxGalleryItemsServer } from "@/lib/gallery-limits";
import { YUNNAN_MEMORY_ROW_UUID } from "@/lib/memory-core-constants";
import { galleryItemToFragment } from "@/lib/memory-images-map";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { formatSupabaseAdminRouteError } from "@/lib/supabase/key-hints";

export const runtime = "nodejs";
export const maxDuration = 120;

function defaultMeta(): GalleryMeta {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return { timestamp: `${y}.${m}.${day}`, mood: "—", location: "—" };
}

export async function POST(req: Request) {
  if (!isCloudGalleryServerEnabled()) {
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
      { error: `File exceeds ${Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024))}MB.` },
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

  const author: GalleryAuthor = { name: authorName, avatar: authorAvatar ?? undefined };
  const mediaType = mediaTypeForMime(mime);

  let supabase: ReturnType<typeof getSupabaseAdmin>;
  try {
    supabase = getSupabaseAdmin();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: formatSupabaseAdminRouteError(msg) }, { status: 500 });
  }

  const { count, error: countErr } = await supabase
    .from("memory_images")
    .select("id", { count: "exact", head: true })
    .eq("memory_id", YUNNAN_MEMORY_ROW_UUID);
  if (countErr) {
    return NextResponse.json({ error: formatSupabaseAdminRouteError(countErr.message) }, { status: 500 });
  }
  const cap = maxGalleryItemsServer();
  if (count != null && count >= cap) {
    return NextResponse.json({ error: `Gallery is full (${cap} items).` }, { status: 400 });
  }

  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  const ext = extForMime(mime);
  const storagePath = `fragments/${id}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await supabase.storage.from(MEMORY_FRAGMENTS_BUCKET).upload(storagePath, buffer, {
    contentType: mime,
    upsert: false,
  });
  if (upErr) {
    return NextResponse.json({ error: formatSupabaseAdminRouteError(upErr.message) }, { status: 500 });
  }

  const { data: pub } = supabase.storage.from(MEMORY_FRAGMENTS_BUCKET).getPublicUrl(storagePath);
  const publicUrl = pub.publicUrl;

  const fragment = galleryItemToFragment({
    meta,
    author,
    mediaType,
    mimeType: mime,
  } as Pick<GalleryItem, "meta" | "author" | "mediaType" | "mimeType">);

  const { data: row, error: insErr } = await supabase
    .from("memory_images")
    .insert({
      id,
      memory_id: YUNNAN_MEMORY_ROW_UUID,
      image_url: publicUrl,
      caption,
      storage_path: storagePath,
      fragment,
    })
    .select("id, memory_id, image_url, caption, created_at, storage_path, fragment")
    .single();

  if (insErr || !row) {
    await supabase.storage.from(MEMORY_FRAGMENTS_BUCKET).remove([storagePath]);
    return NextResponse.json(
      { error: formatSupabaseAdminRouteError(insErr?.message ?? "Insert failed") },
      { status: 500 },
    );
  }

  return NextResponse.json({ item: row });
}
