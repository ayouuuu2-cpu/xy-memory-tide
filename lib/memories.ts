/**
 * Static memory pages for `/memory/[slug]` — slugs + lookup used by generateStaticParams.
 */

export type PageMemory = {
  slug: string;
  titleEn: string;
  excerpt: string;
  bodyHtml?: string;
};

const MEMORIES: PageMemory[] = [
  {
    slug: "yunnan",
    titleEn: "Yunnan",
    excerpt: "A slow island of clouds — the wind turned pages we never wrote down.",
    bodyHtml:
      "<p>The trail curved like ribbon; thoughts went quiet and round.</p><p>Spring light on the plateau, mist in the valleys.</p>",
  },
];

export function getAllMemorySlugs(): string[] {
  return MEMORIES.map((m) => m.slug);
}

export function getMemoryBySlug(slug: string): PageMemory | null {
  return MEMORIES.find((m) => m.slug === slug) ?? null;
}
