export type Memory = {
  slug: string;
  title: string;
  titleEn: string;
  date: string;
  location: string;
  excerpt: string;
  body: string[];
};

export const MEMORIES: Memory[] = [
  {
    slug: "yunnan-dawn",
    title: "Yunnan Dawn",
    titleEn: "Light between the mountains and the cloud",
    date: "Spring 2024",
    location: "Yunnan, China",
    excerpt: "A soft glow threading through ridges and mist—enough to hold a morning still.",
    body: [
      "Time felt unhurried here. The sky sat low and patient, and the wind carried something like an old story, half-remembered.",
      "Our footprints disappeared quickly, but the warmth of that day stayed—quiet, precise, and true.",
    ],
  },
];

export function getMemoryBySlug(slug: string): Memory | undefined {
  return MEMORIES.find((m) => m.slug === slug);
}

export function getAllMemorySlugs(): string[] {
  return MEMORIES.map((m) => m.slug);
}
