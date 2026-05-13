import { NextResponse } from "next/server";
import { isCloudGalleryServerEnabled } from "@/lib/gallery-cloud-config";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { formatSupabaseAdminRouteError } from "@/lib/supabase/key-hints";
import { eternalFromWorldRow, type EternalWorldState } from "@/lib/world-memory-types";

export const runtime = "nodejs";

export async function GET() {
  try {
    if (!isCloudGalleryServerEnabled()) {
      return NextResponse.json({ error: "World memory is not configured." }, { status: 503 });
    }
    const admin = getSupabaseAdmin();
    const { data: row, error } = await admin.from("world_eternal").select("*").eq("id", 1).maybeSingle();
    if (error) {
      return NextResponse.json({ error: formatSupabaseAdminRouteError(error.message) }, { status: 500 });
    }
    if (!row) {
      const { error: insErr } = await admin.from("world_eternal").insert({ id: 1 });
      if (insErr && !insErr.message.toLowerCase().includes("duplicate")) {
        return NextResponse.json({ error: formatSupabaseAdminRouteError(insErr.message) }, { status: 500 });
      }
      const { data: again, error: againErr } = await admin.from("world_eternal").select("*").eq("id", 1).single();
      if (againErr || !again) {
        const msg = againErr?.message ?? "world_eternal row missing after insert.";
        return NextResponse.json({ error: formatSupabaseAdminRouteError(msg) }, { status: 500 });
      }
      const eternal = eternalFromWorldRow(
        again as { anchor_iso: string | null; milestones: unknown; birthday_whispers: unknown },
      );
      return NextResponse.json({ eternal });
    }
    const eternal = eternalFromWorldRow(
      row as { anchor_iso: string | null; milestones: unknown; birthday_whispers: unknown },
    );
    return NextResponse.json({ eternal });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Request failed";
    return NextResponse.json({ error: formatSupabaseAdminRouteError(msg) }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
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
      const msg = fErr?.message ?? "world_eternal row missing.";
      return NextResponse.json({ error: formatSupabaseAdminRouteError(msg) }, { status: 500 });
    }
    const cur = eternalFromWorldRow(
      row as { anchor_iso: string | null; milestones: unknown; birthday_whispers: unknown },
    );

    const nextAnchor = b.anchorIso !== undefined ? b.anchorIso : cur.anchorIso;
    const nextMilestones = b.milestones !== undefined ? b.milestones : cur.milestones;
    const nextBw =
      b.birthdayWhispers !== undefined ? { ...cur.birthdayWhispers, ...b.birthdayWhispers } : cur.birthdayWhispers;

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
      return NextResponse.json({ error: formatSupabaseAdminRouteError(uErr.message) }, { status: 500 });
    }
    const eternal: EternalWorldState = {
      anchorIso: nextAnchor,
      milestones: nextMilestones,
      birthdayWhispers: nextBw,
    };
    return NextResponse.json({ eternal });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Request failed";
    return NextResponse.json({ error: formatSupabaseAdminRouteError(msg) }, { status: 500 });
  }
}
