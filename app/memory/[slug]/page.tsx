import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MemoryUniverse } from "@/components/atmosphere/MemoryUniverse";
import { MemoryDetail } from "@/components/memory/MemoryDetail";
import { getAllMemorySlugs, getMemoryBySlug } from "@/lib/memories";

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getAllMemorySlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const memory = getMemoryBySlug(slug);
  if (!memory) return { title: "Memory" };
  return {
    title: `${memory.titleEn} · X-Y Memory Tide`,
    description: memory.excerpt,
  };
}

export default async function MemoryPage({ params }: Props) {
  const { slug } = await params;
  const memory = getMemoryBySlug(slug);
  if (!memory) notFound();

  return (
    <div className="relative min-h-dvh overflow-x-hidden text-violet-950">
      <MemoryUniverse variant="day" />
      <MemoryDetail memory={memory} />
    </div>
  );
}
