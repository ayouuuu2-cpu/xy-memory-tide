import { NextResponse } from "next/server";
import { isCloudGalleryServerEnabled } from "@/lib/gallery-cloud-config";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { migrateLegacyEcho, normalizeEcho, type EchoFootprint } from "@/lib/echo-footprints";
import { echoFromWorldRow } from "@/lib/world-memory-types";
import { echoPayloadForInsert } from "@/lib/world-payload-serialize";

export const runtime = "nodejs";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
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
  const raw =
    body && typeof body === "object" && "echo" in body
      ? (body as { echo?: Record<string, unknown> }).echo
      : (body as Record<string, unknown> | undefined);
  if (!raw || typeof raw !== "object") {
    return NextResponse.json({ error: "Expected echo object." }, { status: 400 });
  }
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  const merged = normalizeEcho(
    migrateLegacyEcho({
      ...raw,
      id,
      createdAt: typeof raw.createdAt === "number" ? raw.createdAt : Date.now(),
      gallery: Array.isArray(raw.gallery) ? raw.gallery : [],
      audioUrl: typeof raw.audioUrl === "string" ? raw.audioUrl : "",
      voiceNoteUrl: typeof raw.voiceNoteUrl === "string" ? raw.voiceNoteUrl : "",
      recordedDate:
        typeof raw.recordedDate === "string" && /^\d{4}-\d{2}-\d{2}/.test(String(raw.recordedDate))
          ? String(raw.recordedDate).slice(0, 10)
          : todayIsoDate(),
      linkUrl: typeof raw.linkUrl === "string" ? raw.linkUrl : "",
    }),
  ) as EchoFootprint;

  const payload = echoPayloadForInsert(merged);
  const admin = getSupabaseAdmin();
  const { data: row, error } = await admin
    .from("world_echoes")
    .insert({ payload })
    .select("id,payload,created_at")
    .single();
  if (error || !row) {
    return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 });
  }
  return NextResponse.json({ echo: echoFromWorldRow({ id: row.id as string, payload: row.payload }) });
}
