import type { SupabaseClient } from "@supabase/supabase-js";
import { YUNNAN_LANDMARK, type LandmarkMemory, type MemoryImage } from "@/data/memories";
import { YUNNAN_MEMORY_ROW_UUID } from "@/lib/memory-core-constants";
import { CANONICAL_YUNNAN_NAME, canonicalYunnanPosition } from "@/lib/yunnan-anchor";

type MemoryRow = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  tags: string[] | null;
  landmark_date: string | null;
  created_at: string;
};

type TextRow = { id: string; content: string; created_at: string };
type ImageRow = { id: string; image_url: string; caption: string | null; created_at: string };

function rowToLandmark(row: MemoryRow, texts: string[], images: MemoryImage[]): LandmarkMemory {
  const lat = typeof row.lat === "number" && Number.isFinite(row.lat) ? row.lat : YUNNAN_LANDMARK.position.lat;
  const lng = typeof row.lng === "number" && Number.isFinite(row.lng) ? row.lng : YUNNAN_LANDMARK.position.lng;
  const position = canonicalYunnanPosition(lat, lng);
  return {
    id: "yunnan",
    name: CANONICAL_YUNNAN_NAME,
    position,
    images,
    texts,
    date: row.landmark_date ?? undefined,
    tags: row.tags && row.tags.length ? row.tags : undefined,
  };
}

/** Shared read for `/api/memory-hub` and `/api/world-memory`. */
export async function readYunnanLandmark(admin: SupabaseClient): Promise<LandmarkMemory> {
  const { data: mem, error: memErr } = await admin
    .from("memories")
    .select("id,name,lat,lng,tags,landmark_date,created_at")
    .eq("id", YUNNAN_MEMORY_ROW_UUID)
    .maybeSingle();

  if (memErr) throw new Error(memErr.message);
  if (!mem) return YUNNAN_LANDMARK;

  const row = mem as MemoryRow;

  const { data: textRows, error: tErr } = await admin
    .from("memory_texts")
    .select("id,content,created_at")
    .eq("memory_id", YUNNAN_MEMORY_ROW_UUID)
    .order("created_at", { ascending: true });

  if (tErr) throw new Error(tErr.message);

  const { data: imgRows, error: iErr } = await admin
    .from("memory_images")
    .select("id,image_url,caption,created_at")
    .eq("memory_id", YUNNAN_MEMORY_ROW_UUID)
    .order("created_at", { ascending: true });

  if (iErr) throw new Error(iErr.message);

  const texts = (textRows as TextRow[] | null)?.map((r) => r.content) ?? [];
  const images: MemoryImage[] =
    (imgRows as ImageRow[] | null)?.map((r) => ({
      id: r.id,
      url: r.image_url,
      caption: typeof r.caption === "string" ? r.caption : "",
    })) ?? [];

  return rowToLandmark(row, texts, images);
}
