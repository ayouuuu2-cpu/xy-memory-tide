import { NextResponse } from "next/server";
import { YUNNAN_LANDMARK, type LandmarkMemory } from "@/data/memories";
import { isCloudGalleryServerEnabled } from "@/lib/gallery-cloud-config";
import { YUNNAN_MEMORY_ROW_UUID } from "@/lib/memory-core-constants";
import { readYunnanLandmark } from "@/lib/server/read-yunnan-landmark";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { CANONICAL_YUNNAN_NAME, canonicalYunnanPosition } from "@/lib/yunnan-anchor";

export async function GET() {
  if (!isCloudGalleryServerEnabled()) {
    return NextResponse.json({ error: "Memory hub cloud is not configured." }, { status: 503 });
  }
  const admin = getSupabaseAdmin();
  try {
    const landmark = await readYunnanLandmark(admin);
    return NextResponse.json({ landmark });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Read failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  if (!isCloudGalleryServerEnabled()) {
    return NextResponse.json({ error: "Memory hub cloud is not configured." }, { status: 503 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const landmark =
    body && typeof body === "object" && "landmark" in body
      ? (body as { landmark?: LandmarkMemory }).landmark
      : undefined;
  if (!landmark || landmark.id !== "yunnan") {
    return NextResponse.json({ error: "Body must include landmark with id yunnan." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const tags = Array.isArray(landmark.tags) ? landmark.tags.filter((t): t is string => typeof t === "string") : [];
  const landmarkDate =
    typeof landmark.date === "string" && landmark.date.trim() ? landmark.date.trim() : null;

  const rawLat = typeof landmark.position?.lat === "number" ? landmark.position.lat : YUNNAN_LANDMARK.position.lat;
  const rawLng = typeof landmark.position?.lng === "number" ? landmark.position.lng : YUNNAN_LANDMARK.position.lng;
  const { lat, lng } = canonicalYunnanPosition(rawLat, rawLng);

  const { error: upErr } = await admin.from("memories").upsert(
    {
      id: YUNNAN_MEMORY_ROW_UUID,
      name: CANONICAL_YUNNAN_NAME,
      lat,
      lng,
      tags,
      landmark_date: landmarkDate,
    },
    { onConflict: "id" },
  );

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const { error: delT } = await admin.from("memory_texts").delete().eq("memory_id", YUNNAN_MEMORY_ROW_UUID);
  if (delT) {
    return NextResponse.json({ error: delT.message }, { status: 500 });
  }

  const textPayload = (landmark.texts ?? []).map((content) => ({
    memory_id: YUNNAN_MEMORY_ROW_UUID,
    content,
  }));
  if (textPayload.length) {
    const { error: insT } = await admin.from("memory_texts").insert(textPayload);
    if (insT) {
      return NextResponse.json({ error: insT.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
