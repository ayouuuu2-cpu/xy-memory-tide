import type { PageMemory } from "../../lib/memories";

type Props = {
  memory: PageMemory;
};

/** Landmark memory article — server component for `/memory/[slug]`. */
export function MemoryDetail({ memory }: Props) {
  return (
    <article className="relative z-[1] mx-auto max-w-2xl px-6 py-16">
      <p className="font-display text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-500">Memory</p>
      <h1 className="mt-2 font-display text-3xl font-medium tracking-tight text-slate-900">{memory.titleEn}</h1>
      <p className="mt-4 text-base leading-relaxed text-slate-600">{memory.excerpt}</p>
      {memory.bodyHtml ? (
        <div
          className="mt-8 space-y-4 text-base leading-relaxed text-slate-700 [&_p]:leading-relaxed"
          dangerouslySetInnerHTML={{ __html: memory.bodyHtml }}
        />
      ) : null}
    </article>
  );
}
