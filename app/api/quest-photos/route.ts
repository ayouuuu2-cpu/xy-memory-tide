import { NextResponse } from "next/server";
import { isCloudGalleryServerEnabled } from "@/lib/gallery-cloud-config";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { QuestPhotoRecord, QuestVariant } from "@/lib/quest-photos";

export const runtime = "nodejs";

function rowToRecord(r: Record<string, unknown>): QuestPhotoRecord | null {
  const id = typeof r.id === "string" ? r.id : "";
  const publicUrl = typeof r.public_url === "string" ? r.public_url : "";
  if (!id || !publicUrl) return null;
  return {
    id,
    publicUrl,
    storagePath: typeof r.storage_path === "string" ? r.storage_path : "",
    mediaType: r.media_type === "video" ? "video" : "image",
    mimeType: typeof r.mime_type === "string" ? r.mime_type : "",
    caption: typeof r.caption === "string" ? r.caption : "",
    authorName: typeof r.author_name === "string" ? r.author_name : "",
    authorAvatar: typeof r.author_avatar === "string" ? r.author_avatar : null,
    createdAt: typeof r.created_at === "string" ? r.created_at : new Date().toISOString(),
  };
}

export async function GET(req: Request) {
  if (!isCloudGalleryServerEnabled()) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }
  const { searchParams } = new URL(req.url);
  const placeId = searchParams.get("placeId")?.trim();
  const variant = searchParams.get("variant")?.trim() as QuestVariant | undefined;
  if (!placeId || (variant !== "trace" && variant !== "wish")) {
    return NextResponse.json({ error: "placeId and variant (trace|wish) required." }, { status: 400 });
  }
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("photos")
    .select(
      "id,public_url,storage_path,media_type,mime_type,caption,author_name,author_avatar,created_at",
    )
    .eq("world_place_id", placeId)
    .eq("quest_variant", variant)
    .order("created_at", { ascending: false });
  if (error) {
    const msg = error.message;
    const hint =
      /column .* does not exist|Could not find|schema cache|PGRST204/i.test(msg)
        ? "photos 表缺少 quest_variant / world_place_id 等列：请在 SQL Editor 执行迁移（见仓库 supabase/schema.sql），保存后等待约 1 分钟或重启项目再试。"
        : undefined;
    if (process.env.NODE_ENV === "development") {
      console.error("[quest-photos GET]", msg);
    }
    return NextResponse.json({ error: msg, hint }, { status: 500 });
  }
  const photos = (data ?? [])
    .map((r) => rowToRecord(r as Record<string, unknown>))
    .filter((p): p is QuestPhotoRecord => p !== null);
  return NextResponse.json({ photos });
}

export async function POST(req: Request) {
  if (!isCloudGalleryServerEnabled()) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const o = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const questVariant = o.questVariant === "wish" ? "wish" : o.questVariant === "trace" ? "trace" : null;
  const worldPlaceId = typeof o.worldPlaceId === "string" ? o.worldPlaceId.trim() : "";
  const placeQuery = typeof o.placeQuery === "string" ? o.placeQuery.trim() : "";
  const publicUrl = typeof o.publicUrl === "string" ? o.publicUrl.trim() : "";
  const storagePathRaw = typeof o.storagePath === "string" ? o.storagePath.trim() : "";
  const storagePath =
    storagePathRaw || (publicUrl.startsWith("data:") ? `inline/${Date.now()}-${Math.random().toString(36).slice(2, 9)}` : "");
  const mimeType = typeof o.mimeType === "string" ? o.mimeType.trim() : "application/octet-stream";
  const mediaType = o.mediaType === "video" ? "video" : "image";
  const caption = typeof o.caption === "string" ? o.caption : "";
  const authorName = typeof o.authorName === "string" && o.authorName.trim() ? o.authorName.trim() : "访客";
  const authorAvatar = typeof o.authorAvatar === "string" && o.authorAvatar.trim() ? o.authorAvatar.trim() : null;
  const lat = typeof o.lat === "number" ? o.lat : Number(o.lat);
  const lng = typeof o.lng === "number" ? o.lng : Number(o.lng);
  const bytes = typeof o.bytes === "number" && Number.isFinite(o.bytes) ? Math.max(0, Math.floor(o.bytes)) : 0;
  const meta = o.meta && typeof o.meta === "object" ? o.meta : {};

  if (!questVariant || !worldPlaceId || !publicUrl || !storagePath) {
    return NextResponse.json({ error: "Missing questVariant, worldPlaceId, publicUrl, or storagePath." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("photos")
    .insert({
      storage_path: storagePath,
      public_url: publicUrl,
      media_type: mediaType,
      mime_type: mimeType,
      bytes,
      caption,
      author_name: authorName,
      author_avatar: authorAvatar,
      meta,
      quest_variant: questVariant,
      world_place_id: worldPlaceId,
      place_query: placeQuery || null,
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
    })
    .select(
      "id,public_url,storage_path,media_type,mime_type,caption,author_name,author_avatar,created_at",
    )
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Insert failed." }, { status: 500 });
  }
  const photo = rowToRecord(data as Record<string, unknown>);
  if (!photo) return NextResponse.json({ error: "Bad row." }, { status: 500 });
  return NextResponse.json({ photo });
}

/** 永久删除一条 quest 画廊记录（仅云端 gallery 启用时） */
export async function DELETE(req: Request) {
  if (!isCloudGalleryServerEnabled()) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "id required." }, { status: 400 });
  }
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("photos").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
