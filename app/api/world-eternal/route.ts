import { NextResponse } from "next/server";
import { isCloudGalleryServerEnabled } from "@/lib/gallery-cloud-config";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { eternalFromWorldRow, type EternalWorldState } from "@/lib/world-memory-types";

export const runtime = "nodejs";

export async function GET() {
  if (!isCloudGalleryServerEnabled()) {
    return NextResponse.json({ error: "World memory is not configured." }, { status: 503 });
  }
  const admin = getSupabaseAdmin();
  const { data: row, error } = await admin.from("world_eternal").select("*").eq("id", 1).maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!row) {
    await admin.from("world_eternal").insert({ id: 1 });
    const { data: again } = await admin.from("world_eternal").select("*").eq("id", 1).single();
    const eternal = eternalFromWorldRow(
      again as { anchor_iso: string | null; milestones: unknown; birthday_whispers: unknown },
    );
    return NextResponse.json({ eternal });
  }
  const eternal = eternalFromWorldRow(
    row as { anchor_iso: string | null; milestones: unknown; birthday_whispers: unknown },
  );
  return NextResponse.json({ eternal });
}

export async function PATCH(req: Request) {
  if (!isCloudGalleryServerEnabled()) {
    return NextResponse.json({ error: "World memory is not configured." }, { status: 503 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const b = (body && typeof body === "object" ? body : {}) as Partial<EternalWorldState> & {
    birthdayWhispers?: EternalWorldState["birthdayWhispers"];
  };

  const admin = getSupabaseAdmin();
  const { data: row, error: fErr } = await admin.from("world_eternal").select("*").eq("id", 1).single();
  if (fErr || !row) {
    return NextResponse.json({ error: "world_eternal row missing." }, { status: 500 });
  }
  const cur = eternalFromWorldRow(
    row as { anchor_iso: string | null; milestones: unknown; birthday_whispers: unknown },
  );

  const nextAnchor = b.anchorIso !== undefined ? b.anchorIso : cur.anchorIso;
  const nextMilestones = b.milestones !== undefined ? b.milestones : cur.milestones;
  const nextBw = b.birthdayWhispers !== undefined ? { ...cur.birthdayWhispers, ...b.birthdayWhispers } : cur.birthdayWhispers;

  const { error: uErr } = await admin
    .from("world_eternal")
    .update({
      anchor_iso: nextAnchor,
      milestones: nextMilestones,
      birthday_whispers: nextBw,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (uErr) {
    return NextResponse.json({ error: uErr.message }, { status: 500 });
  }
  const eternal: EternalWorldState = {
    anchorIso: nextAnchor,
    milestones: nextMilestones,
    birthdayWhispers: nextBw,
  };
  return NextResponse.json({ eternal });
}
