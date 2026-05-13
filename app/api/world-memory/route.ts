import { NextResponse } from "next/server";
import { getSupabaseAdmin, getSupabaseAnonServerClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { readYunnanLandmark } from "@/lib/server/read-yunnan-landmark";
import {
  echoFromWorldRow,
  eternalFromWorldRow,
  timelineFromRow,
  wishFromWorldRow,
  type WorldMemorySnapshot,
} from "@/lib/world-memory-types";

export const runtime = "nodejs";

export async function GET() {
  const useServiceRole = isSupabaseConfigured();
  const client = useServiceRole ? getSupabaseAdmin() : getSupabaseAnonServerClient();
  if (!client) {
    return NextResponse.json({ error: "World memory is not configured." }, { status: 503 });
  }
  try {
    const landmark = await readYunnanLandmark(client);

    const { data: echoRows, error: eErr } = await client
      .from("world_echoes")
      .select("id,payload,created_at")
      .order("created_at", { ascending: false });
    if (eErr) throw new Error(eErr.message);

    const { data: wishRows, error: wErr } = await client
      .from("world_wishes")
      .select("id,payload,created_at")
      .order("created_at", { ascending: false });
    if (wErr) throw new Error(wErr.message);

    const { data: eternalRow, error: etErr } = await client.from("world_eternal").select("*").eq("id", 1).maybeSingle();
    if (etErr) throw new Error(etErr.message);

    let eternalDb = eternalRow;
    if (!eternalDb && useServiceRole) {
      const { error: insE } = await client.from("world_eternal").insert({ id: 1 });
      if (insE && !insE.message.includes("duplicate")) throw new Error(insE.message);
      const { data: again, error: againErr } = await client.from("world_eternal").select("*").eq("id", 1).single();
      if (againErr || !again) throw new Error(againErr?.message ?? "world_eternal missing");
      eternalDb = again;
    }

    const { data: timelineRows, error: tErr } = await client
      .from("timeline_entries")
      .select("id,content,date,memory_id")
      .order("date", { ascending: false })
      .limit(500);
    if (tErr) throw new Error(tErr.message);

    const echoes = (echoRows ?? []).map((r) => echoFromWorldRow({ id: r.id as string, payload: r.payload }));
    const wishes = (wishRows ?? []).map((r) => wishFromWorldRow({ id: r.id as string, payload: r.payload }));
    const eternal = eternalDb
      ? eternalFromWorldRow(
          eternalDb as {
            anchor_iso: string | null;
            milestones: unknown;
            birthday_whispers: unknown;
          },
        )
      : eternalFromWorldRow({ anchor_iso: null, milestones: [], birthday_whispers: {} });
    const timeline = (timelineRows ?? []).map((r) =>
      timelineFromRow({
        id: r.id as string,
        content: r.content as string,
        date: String(r.date),
        memory_id: (r.memory_id as string | null) ?? null,
      }),
    );

    const snapshot: WorldMemorySnapshot = {
      landmark,
      timeline,
      echoes,
      wishes,
      eternal,
    };
    return NextResponse.json(snapshot);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Read failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
