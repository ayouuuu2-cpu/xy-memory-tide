import { access, readFile, readdir } from "fs/promises";
import { constants } from "fs";
import { NextResponse } from "next/server";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AUDIO_EXT = /\.(mp3|m4a|aac|ogg|wav|flac|opus|webm)$/i;

type ManifestTrack = { file?: string; title?: string };

function nfc(s: string): string {
  return s.normalize("NFC");
}

/** Match manifest `file` to actual name on disk (NFC/NFD safe). */
function resolveOnDiskName(wanted: string, diskNames: string[]): string | null {
  const key = nfc(wanted.trim());
  for (const n of diskNames) {
    if (nfc(n) === key) return n;
  }
  return null;
}

async function existsReadable(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function humanTitle(filename: string): string {
  let base = filename.replace(AUDIO_EXT, "");
  base = base.replace(/_副本\s*$/u, "").trim();
  const spaced = base.replace(/[-_]+/g, " ").trim();
  return spaced || filename;
}

function audioSrc(diskName: string): string {
  return `/audio/${encodeURIComponent(diskName)}`;
}

/**
 * Lists playable files from `public/audio/` plus optional `music-manifest.json`
 * (declares titles / ensures Korean filenames resolve consistently).
 */
export async function GET() {
  const dir = path.join(process.cwd(), "public", "audio");
  let diskNames: string[] = [];
  try {
    diskNames = await readdir(dir);
  } catch {
    return NextResponse.json({ tracks: [] as { src: string; title: string }[] });
  }

  const audioOnDisk = diskNames.filter((name) => !name.startsWith(".") && AUDIO_EXT.test(name));

  const bySrc = new Map<string, { src: string; title: string }>();

  for (const file of audioOnDisk.sort((a, b) => a.localeCompare(b, "ko-KR"))) {
    const fp = path.join(dir, file);
    if (!(await existsReadable(fp))) continue;
    const src = audioSrc(file);
    bySrc.set(src, { src, title: humanTitle(file) });
  }

  try {
    const raw = await readFile(path.join(dir, "music-manifest.json"), "utf8");
    const parsed = JSON.parse(raw) as { tracks?: ManifestTrack[] };
    const list = Array.isArray(parsed.tracks) ? parsed.tracks : [];
    for (const row of list) {
      if (typeof row.file !== "string" || !row.file.trim()) continue;
      const onDisk = resolveOnDiskName(row.file, [...diskNames]);
      if (!onDisk || !AUDIO_EXT.test(onDisk)) continue;
      const fp = path.join(dir, onDisk);
      if (!(await existsReadable(fp))) continue;
      const src = audioSrc(onDisk);
      const title =
        typeof row.title === "string" && row.title.trim().length > 0 ? row.title.trim() : humanTitle(onDisk);
      bySrc.set(src, { src, title });
    }
  } catch {
    /* no manifest */
  }

  const tracks = [...bySrc.values()].sort((a, b) => a.title.localeCompare(b.title, "ko-KR"));

  return NextResponse.json({ tracks });
}
