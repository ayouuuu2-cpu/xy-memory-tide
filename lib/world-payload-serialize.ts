import type { EchoFootprint } from "@/lib/echo-footprints";
import type { VisionDream } from "@/lib/vision-dreams";

export function echoPayloadForInsert(e: EchoFootprint): Record<string, unknown> {
  const { id: _id, ...rest } = e;
  return { ...rest } as Record<string, unknown>;
}

export function wishPayloadForInsert(e: VisionDream): Record<string, unknown> {
  const { id: _id, ...rest } = e;
  return { ...rest } as Record<string, unknown>;
}
