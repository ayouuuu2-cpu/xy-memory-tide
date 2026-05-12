"use client";

import { MemoryDumpAlbum } from "@/components/home/MemoryDumpAlbum";

/** Memory dump gallery — cloud-backed fragments; linked from the spatial home gate. */
export default function AlbumPage() {
  return (
    <div className="fixed inset-0 overflow-hidden bg-[#080c14] text-[#f4f0ff] supports-[min-height:100dvh]:min-h-[100dvh] min-h-screen">
      <MemoryDumpAlbum />
    </div>
  );
}
