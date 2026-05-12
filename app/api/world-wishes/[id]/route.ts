import { NextResponse } from "next/server";
import { isCloudGalleryServerEnabled } from "@/lib/gallery-cloud-config";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { normalize, type VisionDream } from "@/lib/vision-dreams";
import { wishFromWorldRow } from "@/lib/world-memory-types";
import { wishPayloadForInsert } from "@/lib/world-payload-serialize";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  if (!isCloudGalleryServerEnabled()) {
    return NextResponse.json({ error: "World memory is not configured." }, { status: 503 });
  }
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const patch = (body && typeof body === "object" ? body : {}) as Partial<VisionDream>;

  const admin = getSupabaseAdmin();
  const { data: existing, error: fErr } = await admin.from("world_wishes").select("id,payload").eq("id", id).single();
  if (fErr || !existing) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const prev = wishFromWorldRow({ id: existing.id as string, payload: existing.payload });
  const merged = normalize({
    ...prev,
    ...patch,
    id: prev.id,
  });
  if (patch.voiceNoteUrl !== undefined && patch.audioUrl === undefined) merged.audioUrl = patch.voiceNoteUrl;
  if (patch.audioUrl !== undefined && patch.voiceNoteUrl === undefined) merged.voiceNoteUrl = patch.audioUrl;

  const payload = wishPayloadForInsert(merged);
  const { error: uErr } = await admin
    .from("world_wishes")
    .update({ payload, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (uErr) {
    return NextResponse.json({ error: uErr.message }, { status: 500 });
  }
  return NextResponse.json({ wish: wishFromWorldRow({ id, payload }) });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  if (!isCloudGalleryServerEnabled()) {
    return NextResponse.json({ error: "World memory is not configured." }, { status: 503 });
  }
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("world_wishes").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
