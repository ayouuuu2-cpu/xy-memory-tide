import { NextResponse } from "next/server";
import type { PhotoRow } from "@/lib/gallery-cloud";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function cloudEnabled(): boolean {
  return process.env.NEXT_PUBLIC_MEMORY_GALLERY_CLOUD === "1" && isSupabaseConfigured();
}

export async function GET() {
  if (!cloudEnabled()) {
    return NextResponse.json({ error: "Cloud gallery is not enabled on the server." }, { status: 503 });
  }
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("photos")
      .select(
        "id, storage_path, public_url, media_type, mime_type, bytes, caption, author_name, author_avatar, meta, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ items: (data ?? []) as PhotoRow[] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gallery load failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
