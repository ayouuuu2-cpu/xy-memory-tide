import { NextResponse } from "next/server";
import { isCloudGalleryServerEnabled } from "@/lib/gallery-cloud-config";
import { YUNNAN_MEMORY_ROW_UUID } from "@/lib/memory-core-constants";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { timelineFromRow } from "@/lib/world-memory-types";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET() {
  if (!isCloudGalleryServerEnabled()) {
    return NextResponse.json({ error: "World memory is not configured." }, { status: 503 });
  }
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("timeline_entries")
    .select("id,content,date,memory_id")
    .order("date", { ascending: false })
    .limit(500);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const items = (data ?? []).map((r) =>
    timelineFromRow({
      id: r.id as string,
      content: r.content as string,
      date: String(r.date),
      memory_id: (r.memory_id as string | null) ?? null,
    }),
  );
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  if (!isCloudGalleryServerEnabled()) {
    return NextResponse.json({ error: "World memory is not configured." }, { status: 503 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const b = body as { content?: string; date?: string; memoryId?: string | null };
  const content = typeof b.content === "string" ? b.content.trim() : "";
  if (!content) {
    return NextResponse.json({ error: "content is required." }, { status: 400 });
  }
  const dateStr = typeof b.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.date.trim()) ? b.date.trim() : null;
  if (!dateStr) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD." }, { status: 400 });
  }
  let memoryId: string | null = null;
  if (b.memoryId != null && b.memoryId !== "") {
    const m = String(b.memoryId).trim();
    if (m === YUNNAN_MEMORY_ROW_UUID || UUID_RE.test(m)) {
      memoryId = m === YUNNAN_MEMORY_ROW_UUID ? YUNNAN_MEMORY_ROW_UUID : m;
    } else {
      return NextResponse.json({ error: "memoryId must be a UUID or null." }, { status: 400 });
    }
  }

  const admin = getSupabaseAdmin();
  const { data: row, error } = await admin
    .from("timeline_entries")
    .insert({ content, date: dateStr, memory_id: memoryId })
    .select("id,content,date,memory_id")
    .single();
  if (error || !row) {
    return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 });
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
