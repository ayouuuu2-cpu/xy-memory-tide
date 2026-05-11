/** Stable layout for eternal cloud stars (top third of viewport). */
export function cloudStarPositionForId(id: string): { leftPct: number; topVh: number } {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const leftPct = 10 + (Math.abs(h) % 78);
  const topVh = 5 + (Math.abs(h >> 8) % 22);
  return { leftPct, topVh };
}

export type CloudAnchor = { x: number; y: number; index: number };

/** Nearest jelly cloud center in screen px (top-third anchors). */
export function nearestWishCloudAnchor(start: { x: number; y: number }, vw: number, vh: number): CloudAnchor {
  const defs = [
    { x: vw * 0.16, y: vh * 0.09 },
    { x: vw * 0.52, y: vh * 0.11 },
    { x: vw * 0.78, y: vh * 0.08 },
    { x: vw * 0.36, y: vh * 0.2 },
  ];
  let best = 0;
  let dmin = Infinity;
  defs.forEach((c, i) => {
    const d = (c.x - start.x) ** 2 + (c.y - start.y) ** 2;
    if (d < dmin) {
      dmin = d;
      best = i;
    }
  });
  return { ...defs[best], index: best };
}
