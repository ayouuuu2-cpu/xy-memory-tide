import { NextResponse } from "next/server";
import type { GalleryMeta } from "@/lib/memory-dump-storage";
import { MEMORY_FRAGMENTS_BUCKET } from "@/lib/gallery-server-constants";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function cloudEnabled(): boolean {
  return process.env.NEXT_PUBLIC_MEMORY_GALLERY_CLOUD === "1" && isSupabaseConfigured();
}

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  if (!cloudEnabled()) {
    return NextResponse.json({ error: "Cloud gallery is not enabled." }, { status: 503 });
  }
  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const b = body as {
    caption?: string;
    meta?: Partial<GalleryMeta>;
    author?: { name?: string; avatar?: string };
  };

  const supabase = getSupabaseAdmin();
  const { data: existing, error: fetchErr } = await supabase.from("photos").select("*").eq("id", id).single();
  if (fetchErr || !existing) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const nextCaption = typeof b.caption === "string" ? b.caption.trim() : existing.caption;
  const prevMeta = (existing.meta ?? {}) as GalleryMeta;
  const nextMeta: GalleryMeta = {
    timestamp: typeof b.meta?.timestamp === "string" ? b.meta.timestamp : prevMeta.timestamp,
    mood: typeof b.meta?.mood === "string" ? b.meta.mood : prevMeta.mood,
    location: typeof b.meta?.location === "string" ? b.meta.location : prevMeta.location,
  };
  const nextAuthorName =
    typeof b.author?.name === "string" && b.author.name.trim() ? b.author.name.trim() : existing.author_name;
  const nextAuthorAvatar =
    b.author && typeof b.author.avatar === "string" && b.author.avatar.trim()
      ? b.author.avatar.trim()
      : existing.author_avatar;

  const { error: upErr } = await supabase
    .from("photos")
    .update({
      caption: nextCaption || existing.caption,
      meta: nextMeta,
      author_name: nextAuthorName,
      author_avatar: nextAuthorAvatar,
    })
    .eq("id", id);

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  if (!cloudEnabled()) {
    return NextResponse.json({ error: "Cloud gallery is not enabled." }, { status: 503 });
  }
  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: existing, error: fetchErr } = await supabase.from("photos").select("storage_path").eq("id", id).single();
  if (fetchErr || !existing?.storage_path) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { error: delRowErr } = await supabase.from("photos").delete().eq("id", id);
  if (delRowErr) {
    return NextResponse.json({ error: delRowErr.message }, { status: 500 });
  }

  await supabase.storage.from(MEMORY_FRAGMENTS_BUCKET).remove([existing.storage_path as string]);
  return NextResponse.json({ ok: true });
}
