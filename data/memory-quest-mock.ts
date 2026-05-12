import type { EchoFootprint } from "@/lib/echo-footprints";
import type { VisionDream } from "@/lib/vision-dreams";

/** Example Trace row — for docs/tests; not loaded from the shared database. */
export const MOCK_ECHO_FOOTPRINT: EchoFootprint = {
  id: "mock-echo-1",
  query: "Lisbon",
  displayName: "Lisbon, Portugal",
  lat: 38.7223,
  lng: -9.1393,
  createdAt: 1_700_000_000_000,
  gallery: [],
  audioUrl: "",
  voiceNoteUrl: "",
  recordedDate: "2025-06-01",
  linkUrl: "https://maps.google.com/?q=Lisbon",
};

/** Example Wish row — diary + portal as primary story fields. */
export const MOCK_VISION_DREAM: VisionDream = {
  id: "mock-wish-1",
  query: "Reykjavik",
  displayName: "Reykjavik, Iceland",
  lat: 64.1466,
  lng: -21.9426,
  createdAt: 1_700_000_000_000,
  gallery: [],
  audioUrl: "",
  voiceNoteUrl: "",
  recordedDate: "2025-11-20",
  linkUrl: "https://www.instagram.com/explore/tags/reykjavik/",
  diary: "Northern lights over harbor — quiet, electric, worth the cold.",
  isRealized: false,
};
