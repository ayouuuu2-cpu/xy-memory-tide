import { NextResponse } from "next/server";
import { isCloudGalleryServerEnabled } from "@/lib/gallery-cloud-config";
import { YUNNAN_MEMORY_ROW_UUID } from "@/lib/memory-core-constants";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { timelineFromRow } from "@/lib/world-memory-types";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  const b = body as { content?: string; date?: string; memoryId?: string | null };

  const admin = getSupabaseAdmin();
  const { data: existing, error: fErr } = await admin
    .from("timeline_entries")
    .select("id,content,date,memory_id")
    .eq("id", id)
    .single();
  if (fErr || !existing) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const nextContent = typeof b.content === "string" ? b.content.trim() : existing.content;
  const nextDate =
    typeof b.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.date.trim()) ? b.date.trim() : String(existing.date).slice(0, 10);

  let nextMemoryId = (existing.memory_id as string | null) ?? null;
  if (b.memoryId !== undefined) {
    if (b.memoryId === null || b.memoryId === "") {
      nextMemoryId = null;
    } else {
      const m = String(b.memoryId).trim();
      if (m === YUNNAN_MEMORY_ROW_UUID || UUID_RE.test(m)) {
        nextMemoryId = m === YUNNAN_MEMORY_ROW_UUID ? YUNNAN_MEMORY_ROW_UUID : m;
      } else {
        return NextResponse.json({ error: "memoryId must be UUID or null." }, { status: 400 });
      }
    }
  }

  const { error: uErr } = await admin
    .from("timeline_entries")
    .update({
      content: nextContent || existing.content,
      date: nextDate,
      memory_id: nextMemoryId,
    })
    .eq("id", id);
  if (uErr) {
    return NextResponse.json({ error: uErr.message }, { status: 500 });
  }
  const { data: row } = await admin.from("timeline_entries").select("id,content,date,memory_id").eq("id", id).single();
  if (!row) {
    return NextResponse.json({ error: "Readback failed." }, { status: 500 });
  }
  return NextResponse.json({
    item: timelineFromRow({
      id: row.id as string,
      content: row.content as string,
      date: String(row.date),
      memory_id: (row.memory_id as string | null) ?? null,
    }),
  });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  if (!isCloudGalleryServerEnabled()) {
    return NextResponse.json({ error: "World memory is not configured." }, { status: 503 });
  }
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("timeline_entries").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
