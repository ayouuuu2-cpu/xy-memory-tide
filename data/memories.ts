/**
 * Landmark memories — `position` is geographic (lat / lng degrees on the globe).
 *
 * System constraint: only Yunnan exists as a real-world memory anchor.
 */

export type MemoryImage = {
  id: string;
  url: string;
  caption: string;
};

export type LandmarkMemory = {
  id: string;
  name: string;
  position: { lat: number; lng: number };
  images: MemoryImage[];
  texts: string[];
  date?: string;
  tags?: string[];
};

/** Single allowed geographic memory location. */
export const YUNNAN_LANDMARK: LandmarkMemory = {
  id: "yunnan",
  name: "Yunnan",
  position: { lat: 25.04, lng: 102.72 },
  images: [],
  texts: [
    "A slow island of clouds — the wind turned pages we never wrote down.",
    "The trail curved like ribbon; my thoughts went quiet and round.",
  ],
  date: "Spring 2024",
  tags: ["cloud-island", "mist", "dawn"],
};

export const DEFAULT_LANDMARKS: LandmarkMemory[] = [YUNNAN_LANDMARK];
