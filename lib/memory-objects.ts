export type MemoryObjectBase = {
  id: string;
  createdAt: string;
};

export type PhotoMemoryObject = MemoryObjectBase & {
  type: "photo";
  url: string;
  caption?: string;
  shotAt?: string;
};

export type VideoMemoryObject = MemoryObjectBase & {
  type: "video";
  url: string;
  posterUrl?: string;
  caption?: string;
  shotAt?: string;
};

export type MusicMemoryObject = MemoryObjectBase & {
  type: "music";
  url: string;
  title?: string;
  artist?: string;
  recordedAt?: string;
};

export type LinkMemoryObject = MemoryObjectBase & {
  type: "link";
  url: string;
  title?: string;
  note?: string;
};

export type TextMemoryObject = MemoryObjectBase & {
  type: "text";
  content: string;
  noteStyle?: "handwritten" | "journal";
};

export type MemoryObject =
  | PhotoMemoryObject
  | VideoMemoryObject
  | MusicMemoryObject
  | LinkMemoryObject
  | TextMemoryObject;

function isoNow(): string {
  return new Date().toISOString();
}

function asIsoDate(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const v = value.trim();
  return v ? v : undefined;
}

function parseOne(raw: unknown, idx: number): MemoryObject | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const type = typeof r.type === "string" ? r.type : "";
  const id =
    typeof r.id === "string" && r.id.trim()
      ? r.id.trim()
      : `mem-${idx}-${Math.random().toString(36).slice(2, 9)}`;
  const createdAt = asIsoDate(r.createdAt) ?? isoNow();
  if (type === "photo") {
    const url = typeof r.url === "string" ? r.url.trim() : "";
    if (!url) return null;
    return { type, id, createdAt, url, caption: asIsoDate(r.caption), shotAt: asIsoDate(r.shotAt) };
  }
  if (type === "video") {
    const url = typeof r.url === "string" ? r.url.trim() : "";
    if (!url) return null;
    const posterUrl = typeof r.posterUrl === "string" ? r.posterUrl.trim() : "";
    return { type, id, createdAt, url, posterUrl: posterUrl || undefined, caption: asIsoDate(r.caption), shotAt: asIsoDate(r.shotAt) };
  }
  if (type === "music") {
    const url = typeof r.url === "string" ? r.url.trim() : "";
    if (!url) return null;
    return {
      type,
      id,
      createdAt,
      url,
      title: asIsoDate(r.title),
      artist: asIsoDate(r.artist),
      recordedAt: asIsoDate(r.recordedAt),
    };
  }
  if (type === "link") {
    const url = typeof r.url === "string" ? r.url.trim() : "";
    if (!url) return null;
    return { type, id, createdAt, url, title: asIsoDate(r.title), note: asIsoDate(r.note) };
  }
  if (type === "text") {
    const content = typeof r.content === "string" ? r.content.trim() : "";
    if (!content) return null;
    const noteStyle = r.noteStyle === "journal" ? "journal" : "handwritten";
    return { type, id, createdAt, content, noteStyle };
  }
  return null;
}

export function parseMemoryObjects(raw: unknown): MemoryObject[] {
  if (!Array.isArray(raw)) return [];
  const out: MemoryObject[] = [];
  raw.forEach((it, idx) => {
    const parsed = parseOne(it, idx);
    if (parsed) out.push(parsed);
  });
  return out;
}
