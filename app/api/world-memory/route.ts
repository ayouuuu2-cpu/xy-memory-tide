import { NextResponse } from "next/server";
import { getSupabaseAdmin, getSupabaseAnonServerClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import {
  looksLikePublishableSupabaseAnonKey,
  supabaseAuthishErrorMessage,
  supabaseMissingRelationHint,
  supabaseRlsDeniedHint,
  USE_LEGACY_JWT_ANON_HINT,
  USE_LEGACY_JWT_SERVICE_ROLE_HINT,
} from "@/lib/supabase/key-hints";
import { readYunnanLandmark } from "@/lib/server/read-yunnan-landmark";
import {
  echoFromWorldRow,
  eternalFromWorldRow,
  timelineFromRow,
  wishFromWorldRow,
  type WorldMemorySnapshot,
} from "@/lib/world-memory-types";

export const runtime = "nodejs";

function safeEchoFromRow(r: { id: unknown; payload: unknown }) {
  if (typeof r.id !== "string") return null;
  try {
    return echoFromWorldRow({ id: r.id, payload: r.payload });
  } catch (e) {
    console.error("[api/world-memory] skip bad world_echoes row", r.id, e);
    return null;
  }
}

function safeWishFromRow(r: { id: unknown; payload: unknown }) {
  if (typeof r.id !== "string") return null;
  try {
    return wishFromWorldRow({ id: r.id, payload: r.payload });
  } catch (e) {
    console.error("[api/world-memory] skip bad world_wishes row", r.id, e);
    return null;
  }
}

export async function GET() {
  try {
    const useServiceRole = isSupabaseConfigured();
    const anon =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || process.env.SUPABASE_ANON_KEY?.trim();
    if (!useServiceRole && looksLikePublishableSupabaseAnonKey(anon)) {
      return NextResponse.json({ error: USE_LEGACY_JWT_ANON_HINT }, { status: 503 });
    }
    const client = useServiceRole ? getSupabaseAdmin() : getSupabaseAnonServerClient();
    if (!client) {
      return NextResponse.json({ error: "World memory is not configured." }, { status: 503 });
    }
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
      if (insE && !insE.message.toLowerCase().includes("duplicate")) throw new Error(insE.message);
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

    const echoes = (echoRows ?? []).flatMap((r) => {
      const row = safeEchoFromRow({ id: r.id, payload: r.payload });
      return row ? [row] : [];
    });
    const wishes = (wishRows ?? []).flatMap((r) => {
      const row = safeWishFromRow({ id: r.id, payload: r.payload });
      return row ? [row] : [];
    });
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
    return NextResponse.json({ ...snapshot, serverWrites: useServiceRole });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Read failed";
    const hint = supabaseAuthishErrorMessage(msg)
      ? ` ${isSupabaseConfigured() ? USE_LEGACY_JWT_SERVICE_ROLE_HINT : USE_LEGACY_JWT_ANON_HINT}`
      : "";
    const schema = supabaseMissingRelationHint(msg);
    const rls = supabaseRlsDeniedHint(msg);
    return NextResponse.json(
      { error: msg + hint + (schema ? ` ${schema}` : "") + (rls ? ` ${rls}` : "") },
      { status: 500 },
    );
  }
}
