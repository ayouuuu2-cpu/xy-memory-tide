import { NextResponse } from "next/server";
import type { GalleryMeta } from "@/lib/memory-dump-storage";
import { MEMORY_FRAGMENTS_BUCKET } from "@/lib/gallery-server-constants";
import { isCloudGalleryServerEnabled } from "@/lib/gallery-cloud-config";
import type { MemoryImageFragment } from "@/lib/memory-images-map";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { formatSupabaseAdminRouteError } from "@/lib/supabase/key-hints";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    if (!isCloudGalleryServerEnabled()) {
      return NextResponse.json({ error: "Cloud gallery is not enabled." }, { status: 503 });
    }
    const { id } = await ctx.params;
    if (!id) {
      return NextResponse.json({ error: "Missing id." }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    }
    const b = body as {
      caption?: string;
      meta?: Partial<GalleryMeta>;
      author?: { name?: string; avatar?: string };
    };

    const supabase = getSupabaseAdmin();
    const { data: existing, error: fetchErr } = await supabase
      .from("memory_images")
      .select("id, caption, fragment")
      .eq("id", id)
      .single();
    if (fetchErr || !existing) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const prevFrag = (existing.fragment ?? {}) as MemoryImageFragment;
    const prevMeta = (prevFrag.meta ?? {}) as GalleryMeta;
    const nextCaption = typeof b.caption === "string" ? b.caption.trim() : existing.caption;
    const nextMeta: GalleryMeta = {
      timestamp: typeof b.meta?.timestamp === "string" ? b.meta.timestamp : prevMeta.timestamp ?? "—",
      mood: typeof b.meta?.mood === "string" ? b.meta.mood : prevMeta.mood ?? "—",
      location: typeof b.meta?.location === "string" ? b.meta.location : prevMeta.location ?? "—",
    };
    const prevAuthor = prevFrag.author;
    const nextAuthorName =
      typeof b.author?.name === "string" && b.author.name.trim()
        ? b.author.name.trim()
        : typeof prevAuthor?.name === "string"
          ? prevAuthor.name
          : "";
    const nextAuthorAvatar =
      b.author && typeof b.author.avatar === "string" && b.author.avatar.trim()
        ? b.author.avatar.trim()
        : prevAuthor?.avatar?.trim() || null;

    const nextFragment: MemoryImageFragment = {
      ...prevFrag,
      meta: nextMeta,
      author: {
        name: nextAuthorName || (typeof prevFrag.author?.name === "string" ? prevFrag.author.name : "—"),
        avatar: nextAuthorAvatar ?? undefined,
      },
    };

    const { error: upErr } = await supabase
      .from("memory_images")
      .update({
        caption: (nextCaption || existing.caption).trim() || existing.caption,
        fragment: nextFragment,
      })
      .eq("id", id);

    if (upErr) {
      return NextResponse.json({ error: formatSupabaseAdminRouteError(upErr.message) }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ error: formatSupabaseAdminRouteError(msg) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    if (!isCloudGalleryServerEnabled()) {
      return NextResponse.json({ error: "Cloud gallery is not enabled." }, { status: 503 });
    }
    const { id } = await ctx.params;
    if (!id) {
      return NextResponse.json({ error: "Missing id." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: existing, error: fetchErr } = await supabase
      .from("memory_images")
      .select("storage_path")
      .eq("id", id)
      .single();
    if (fetchErr || !existing) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const { error: delRowErr } = await supabase.from("memory_images").delete().eq("id", id);
    if (delRowErr) {
      return NextResponse.json({ error: formatSupabaseAdminRouteError(delRowErr.message) }, { status: 500 });
    }

    const path = existing.storage_path as string | null | undefined;
    if (path) {
      const { error: rmErr } = await supabase.storage.from(MEMORY_FRAGMENTS_BUCKET).remove([path]);
      if (rmErr) {
        console.error("[memory-images DELETE] storage remove failed (row already deleted)", rmErr.message, {
          id,
          path,
        });
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Delete failed";
    return NextResponse.json({ error: formatSupabaseAdminRouteError(msg) }, { status: 500 });
  }
}
