import confetti from "canvas-confetti";

/** 全屏散落星屑感（偏紫粉金） */
export function burstMemoryTideStars(): void {
  if (typeof window === "undefined") return;
  const end = Date.now() + 900;
  const colors = ["#c4b5fd", "#e9d5ff", "#fde68a", "#fbcfe8", "#a5b4fc"];

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.65 },
      colors,
      ticks: 120,
      gravity: 0.9,
      scalar: 0.9,
      drift: 0.12,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.65 },
      colors,
      ticks: 120,
      gravity: 0.9,
      scalar: 0.9,
      drift: -0.12,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}

/** 封存 / 长文庆祝：金色星屑为主，全屏散落 */
export function burstMemoryTideGoldenSealConfetti(): void {
  if (typeof window === "undefined") return;
  const colors = ["#fde68a", "#fcd34d", "#fef9c7", "#fbbf24", "#e9d5ff", "#f5d0fe"];
  const w = window.innerWidth;
  const count = Math.min(140, Math.floor(w / 14));
  confetti({
    particleCount: count,
    spread: 100,
    startVelocity: 38,
    ticks: 220,
    gravity: 0.82,
    scalar: 1.05,
    origin: { x: 0.5, y: 0.35 },
    colors,
    zIndex: 900,
  });
  confetti({
    particleCount: Math.floor(count * 0.55),
    angle: 60,
    spread: 65,
    startVelocity: 32,
    ticks: 200,
    gravity: 0.88,
    origin: { x: 0.12, y: 0.62 },
    colors,
    zIndex: 900,
  });
  confetti({
    particleCount: Math.floor(count * 0.55),
    angle: 120,
    spread: 65,
    startVelocity: 32,
    ticks: 200,
    gravity: 0.88,
    origin: { x: 0.88, y: 0.62 },
    colors,
    zIndex: 900,
  });
}

/** Wish→Trace 星火抵达：在屏幕像素坐标处炸开烟花感 */
export function burstIgniteCeremonyAt(clientX: number, clientY: number): void {
  if (typeof window === "undefined") return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const ox = Math.max(0.04, Math.min(0.96, clientX / w));
  const oy = Math.max(0.04, Math.min(0.96, clientY / h));
  const colors = ["#fde68a", "#fb7185", "#c4b5fd", "#fbbf24", "#fef08a", "#fda4af"];
  confetti({
    particleCount: 96,
    spread: 88,
    startVelocity: 42,
    ticks: 240,
    gravity: 0.78,
    scalar: 1.05,
    origin: { x: ox, y: oy },
    colors,
    zIndex: 920,
  });
  confetti({
    particleCount: 64,
    angle: 55,
    spread: 70,
    origin: { x: ox, y: oy },
    colors,
    ticks: 200,
    gravity: 0.72,
    zIndex: 920,
  });
  confetti({
    particleCount: 64,
    angle: 125,
    spread: 70,
    origin: { x: ox, y: oy },
    colors,
    ticks: 200,
    gravity: 0.72,
    zIndex: 920,
  });
}

/** 成真解锁：偏纸屑、碎纸片，低饱和 */
export function burstPaperUnlockAt(clientX: number, clientY: number): void {
  if (typeof window === "undefined") return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const ox = Math.max(0.12, Math.min(0.88, clientX / w));
  const oy = Math.max(0.12, Math.min(0.88, clientY / h));
  const colors = ["#faf6ec", "#f3e8dc", "#ead8cc", "#e2cfc4", "#ddd2ea", "#d2c8e0"];
  confetti({
    particleCount: 38,
    spread: 64,
    startVelocity: 16,
    ticks: 300,
    gravity: 0.58,
    scalar: 0.78,
    origin: { x: ox, y: oy },
    colors,
    zIndex: 920,
  });
  confetti({
    particleCount: 22,
    angle: 125,
    spread: 48,
    startVelocity: 14,
    ticks: 260,
    gravity: 0.52,
    scalar: 0.72,
    origin: { x: ox - 0.04, y: oy + 0.02 },
    colors,
    zIndex: 920,
  });
  confetti({
    particleCount: 22,
    angle: 55,
    spread: 48,
    startVelocity: 14,
    ticks: 260,
    gravity: 0.52,
    scalar: 0.72,
    origin: { x: ox + 0.04, y: oy + 0.02 },
    colors,
    zIndex: 920,
  });
}
