import { NextResponse } from "next/server";
import { isCloudGalleryServerEnabled } from "@/lib/gallery-cloud-config";
import { maxGalleryItemsServer } from "@/lib/gallery-limits";
import { YUNNAN_MEMORY_ROW_UUID } from "@/lib/memory-core-constants";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const COLS = "id, memory_id, image_url, caption, created_at, storage_path, fragment";

export async function GET() {
  if (!isCloudGalleryServerEnabled()) {
    return NextResponse.json({ error: "Cloud gallery is not enabled." }, { status: 503 });
  }
  const supabase = getSupabaseAdmin();
  const cap = maxGalleryItemsServer();
  const { data, error } = await supabase
    .from("memory_images")
    .select(COLS)
    .eq("memory_id", YUNNAN_MEMORY_ROW_UUID)
    .order("created_at", { ascending: false })
    .limit(cap);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ items: data ?? [] });
}
