import type { Metadata } from "next";
import { notFound } from "next/navigation";
// 注意：下面这两行是核心，我根据你的目录树精准匹配了
import { MemoryDetail } from "../../../components/memory/MemoryDetail";
import { getAllMemorySlugs, getMemoryBySlug } from "../../../lib/memories";




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
    <div className="relative min-h-dvh bg-[#fbfaf8] text-slate-900">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_70%_at_50%_-20%,#ffffff_0%,#f3f0ea_45%,#ebe6f2_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.7)_0%,transparent_35%)]" />
      <MemoryDetail memory={memory} />
    </div>
  );
}
