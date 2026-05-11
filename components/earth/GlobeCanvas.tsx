"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

const YUNNAN_LON = (101.5 * Math.PI) / 180;
const YUNNAN_LAT = (25.7 * Math.PI) / 180;

/**
 * Pinhole camera along +Z looking at the origin (unit sphere).
 * Larger CAM_Z = farther camera; larger TAN_HALF = wider field = smaller planet + more empty space.
 */
const CAM_Z = 28;
const TAN_HALF = 0.52;

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function sampleBilinear(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  u: number,
  v: number,
): [number, number, number] {
  const x = clamp(u, 0, 1) * (w - 1);
  const y = clamp(v, 0, 1) * (h - 1);
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, w - 1);
  const y1 = Math.min(y0 + 1, h - 1);
  const tx = x - x0;
  const ty = y - y0;
  const idx = (yy: number, xx: number) => (yy * w + xx) * 4;
  const r00 = data[idx(y0, x0)];
  const g00 = data[idx(y0, x0) + 1];
  const b00 = data[idx(y0, x0) + 2];
  const r10 = data[idx(y0, x1)];
  const g10 = data[idx(y0, x1) + 1];
  const b10 = data[idx(y0, x1) + 2];
  const r01 = data[idx(y1, x0)];
  const g01 = data[idx(y1, x0) + 1];
  const b01 = data[idx(y1, x0) + 2];
  const r11 = data[idx(y1, x1)];
  const g11 = data[idx(y1, x1) + 1];
  const b11 = data[idx(y1, x1) + 2];
  const r0 = r00 * (1 - tx) + r10 * tx;
  const g0 = g00 * (1 - tx) + g10 * tx;
  const b0 = b00 * (1 - tx) + b10 * tx;
  const r1 = r01 * (1 - tx) + r11 * tx;
  const g1 = g01 * (1 - tx) + g11 * tx;
  const b1 = b01 * (1 - tx) + b11 * tx;
  return [r0 * (1 - ty) + r1 * ty, g0 * (1 - ty) + g1 * ty, b0 * (1 - ty) + b1 * ty];
}

function length(x: number, y: number, z: number) {
  return Math.sqrt(x * x + y * y + z * z);
}

function normalize(x: number, y: number, z: number) {
  const len = length(x, y, z) || 1;
  return [x / len, y / len, z / len] as const;
}

function hitUnitSphere(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
): number | null {
  const b = 2 * (ox * dx + oy * dy + oz * dz);
  const c = ox * ox + oy * oy + oz * oz - 1;
  const disc = b * b - 4 * c;
  if (disc < 0) return null;
  const s = Math.sqrt(disc);
  const t0 = (-b - s) / 2;
  const t1 = (-b + s) / 2;
  const t = t0 > 1e-4 ? t0 : t1 > 1e-4 ? t1 : null;
  return t !== null && t > 1e-4 ? t : null;
}

/** Projected radius in pixels of the unit sphere silhouette (camera on +Z). */
function projectedDiskRadiusPx(
  W: number,
  H: number,
  z0: number,
  tanHalf: number,
  aspect: number,
): number {
  const cx = W / 2;
  const cy = H / 2;
  let maxR = 0;
  for (let i = 0; i < 180; i++) {
    const th = (i * Math.PI) / 90;
    const Px = Math.cos(th);
    const Py = 0;
    const Pz = Math.sin(th);
    const dz = Pz - z0;
    if (Math.abs(dz) < 1e-5) continue;
    const u = z0 / (z0 - Pz);
    const planeX = u * Px;
    const planeY = u * Py;
    const ndcX = planeX / (tanHalf * aspect);
    const ndcY = planeY / tanHalf;
    const sx = (ndcX * 0.5 + 0.5) * W;
    const sy = (-ndcY * 0.5 + 0.5) * H;
    const r = Math.hypot(sx - cx, sy - cy);
    if (r > maxR) maxR = r;
  }
  for (let i = 0; i < 90; i++) {
    const ph = (i * Math.PI) / 90 - Math.PI / 2;
    const Px = 0;
    const Py = Math.sin(ph);
    const Pz = Math.cos(ph);
    const dz = Pz - z0;
    if (Math.abs(dz) < 1e-5) continue;
    const u = z0 / (z0 - Pz);
    const planeX = u * Px;
    const planeY = u * Py;
    const ndcX = planeX / (tanHalf * aspect);
    const ndcY = planeY / tanHalf;
    const sx = (ndcX * 0.5 + 0.5) * W;
    const sy = (-ndcY * 0.5 + 0.5) * H;
    const r = Math.hypot(sx - cx, sy - cy);
    if (r > maxR) maxR = r;
  }
  return Math.max(maxR, Math.min(W, H) * 0.08);
}

type Props = {
  memoryHref?: string;
  variant?: "fullscreen" | "inline";
  className?: string;
};

export function GlobeCanvas({
  memoryHref = "/memory/yunnan-dawn",
  variant = "fullscreen",
  className,
}: Props) {
  const markerRef = useRef<HTMLAnchorElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotRef = useRef(0);
  const dataRef = useRef<{ data: Uint8ClampedArray; w: number; h: number } | null>(null);
  const bufRef = useRef<ImageData | null>(null);
  const rafRef = useRef(0);
  const lastRef = useRef(0);

  useEffect(() => {
    const img = new Image();
    img.decoding = "async";
    img.src = "/earth.jpg";
    img.onload = () => {
      const oc = document.createElement("canvas");
      oc.width = img.width;
      oc.height = img.height;
      const octx = oc.getContext("2d");
      if (!octx) return;
      octx.drawImage(img, 0, 0);
      const imageData = octx.getImageData(0, 0, img.width, img.height);
      dataRef.current = { data: imageData.data, w: img.width, h: img.height };
    };

    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const resize = () => {
      const el = wrapRef.current;
      if (!el) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = el.getBoundingClientRect();
      const cssW = Math.max(1, Math.floor(rect.width));
      const cssH = Math.max(1, Math.floor(rect.height));
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      canvas.style.display = "block";
      canvas.width = Math.max(1, Math.floor(cssW * dpr));
      canvas.height = Math.max(1, Math.floor(cssH * dpr));
      bufRef.current = null;
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    window.addEventListener("resize", resize);

    const drawFrame = (t: number) => {
      const prev = lastRef.current || t;
      const dt = Math.min(48, t - prev);
      lastRef.current = t;
      rotRef.current += dt * 0.0000042;

      const tex = dataRef.current;
      const c = canvasRef.current;
      if (!c || !ctx) {
        rafRef.current = requestAnimationFrame(drawFrame);
        return;
      }

      const W = c.width;
      const H = c.height;
      const cx = W / 2;
      const cy = H / 2;
      const aspect = W / H;
      const rot = rotRef.current;
      const cos = Math.cos(rot);
      const sin = Math.sin(rot);

      const z0 = CAM_Z;
      const tanHalf = TAN_HALF;

      if (!tex) {
        ctx.clearRect(0, 0, W, H);
        rafRef.current = requestAnimationFrame(drawFrame);
        return;
      }

      let imageData = bufRef.current;
      if (!imageData || imageData.width !== W || imageData.height !== H) {
        imageData = ctx.createImageData(W, H);
        bufRef.current = imageData;
      }
      const out = imageData.data;
      out.fill(0);

      const step = 2;
      const { data, w: iw, h: ih } = tex;

      for (let iy = 0; iy < H; iy += step) {
        for (let ix = 0; ix < W; ix += step) {
          const ndcX = ((ix + 0.5) / W - 0.5) * 2;
          const ndcY = -((iy + 0.5) / H - 0.5) * 2;
          const sx = ndcX * tanHalf * aspect;
          const sy = ndcY * tanHalf;
          const [dx, dy, dz] = normalize(sx, sy, -z0);
          const ox = 0;
          const oy = 0;
          const oz = z0;

          const tr = hitUnitSphere(ox, oy, oz, dx, dy, dz);
          if (tr === null) continue;

          const hx = ox + tr * dx;
          const hy = oy + tr * dy;
          const hz = oz + tr * dz;
          const nx = hx;
          const ny = hy;
          const nz = hz;

          const ex = nx * cos - nz * sin;
          const ey = ny;
          const ez = nx * sin + nz * cos;

          const lat = Math.asin(clamp(ey, -1, 1));
          const lon = Math.atan2(ex, ez);
          const u = (lon + Math.PI) / (Math.PI * 2);
          const v = 0.5 - lat / Math.PI;

          const [r, g, b] = sampleBilinear(data, iw, ih, u, v);

          const lit = nz * 0.5 + 0.5;
          const limb = Math.pow(clamp(1 - nz, 0, 1), 1.25) * 0.42;
          let shade = 0.86 + 0.14 * lit - limb * 0.12;
          shade = clamp(shade, 0.55, 1.05);
          let rr = r * shade;
          let gg = g * shade;
          let bb = b * shade;
          const night = limb * 0.35;
          rr = clamp(rr * (1 - night * 0.15) - night * 12, 0, 255);
          gg = clamp(gg * (1 - night * 0.08) - night * 6, 0, 255);
          bb = clamp(bb * (1 + night * 0.06), 0, 255);

          for (let oy2 = 0; oy2 < step && iy + oy2 < H; oy2++) {
            for (let ox2 = 0; ox2 < step && ix + ox2 < W; ox2++) {
              const sx2 = ix + ox2;
              const sy2 = iy + oy2;
              const si = (sy2 * W + sx2) * 4;
              out[si] = rr;
              out[si + 1] = gg;
              out[si + 2] = bb;
              out[si + 3] = 255;
            }
          }
        }
      }

      ctx.putImageData(imageData, 0, 0);

      const diskR = projectedDiskRadiusPx(W, H, z0, tanHalf, aspect);

      ctx.save();
      ctx.globalCompositeOperation = "screen";

      const haloWide = ctx.createRadialGradient(cx, cy, diskR * 0.75, cx, cy, diskR * 3.2);
      haloWide.addColorStop(0, "rgba(200, 210, 255, 0)");
      haloWide.addColorStop(0.35, "rgba(165, 185, 255, 0.055)");
      haloWide.addColorStop(0.65, "rgba(120, 140, 220, 0.035)");
      haloWide.addColorStop(1, "rgba(80, 90, 160, 0)");
      ctx.fillStyle = haloWide;
      ctx.fillRect(0, 0, W, H);

      const haloMid = ctx.createRadialGradient(cx, cy, diskR * 0.55, cx, cy, diskR * 1.85);
      haloMid.addColorStop(0, "rgba(255, 255, 255, 0.06)");
      haloMid.addColorStop(0.45, "rgba(190, 205, 255, 0.1)");
      haloMid.addColorStop(0.85, "rgba(140, 160, 230, 0.04)");
      haloMid.addColorStop(1, "rgba(100, 110, 200, 0)");
      ctx.fillStyle = haloMid;
      ctx.fillRect(0, 0, W, H);

      const haloTight = ctx.createRadialGradient(cx, cy, diskR * 0.42, cx, cy, diskR * 1.12);
      haloTight.addColorStop(0, "rgba(255, 250, 255, 0.04)");
      haloTight.addColorStop(0.55, "rgba(220, 230, 255, 0.09)");
      haloTight.addColorStop(1, "rgba(180, 195, 255, 0)");
      ctx.fillStyle = haloTight;
      ctx.fillRect(0, 0, W, H);

      ctx.restore();

      const vignette = ctx.createRadialGradient(
        cx,
        cy,
        diskR * 0.95,
        cx,
        cy,
        Math.max(W, H) * 0.82,
      );
      vignette.addColorStop(0, "rgba(40, 30, 80, 0)");
      vignette.addColorStop(0.5, "rgba(35, 28, 70, 0)");
      vignette.addColorStop(1, "rgba(18, 14, 45, 0.28)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, W, H);

      const Ex = Math.cos(YUNNAN_LAT) * Math.sin(YUNNAN_LON);
      const Ey = Math.sin(YUNNAN_LAT);
      const Ez = Math.cos(YUNNAN_LAT) * Math.cos(YUNNAN_LON);
      const Px = Ex * cos + Ez * sin;
      const Pz = -Ex * sin + Ez * cos;
      const Py = Ey;
      const el = markerRef.current;
      if (el) {
        if (Pz > 0.06) {
          const dz = Pz - z0;
          if (Math.abs(dz) > 1e-4) {
            const uu = z0 / (z0 - Pz);
            const planeX = uu * Px;
            const planeY = uu * Py;
            const ndcXm = planeX / (tanHalf * aspect);
            const ndcYm = planeY / tanHalf;
            const screenX = (ndcXm * 0.5 + 0.5) * W;
            const screenY = (-ndcYm * 0.5 + 0.5) * H;
            el.style.opacity = "1";
            el.style.pointerEvents = "auto";
            el.style.left = `${(screenX / W) * 100}%`;
            el.style.top = `${(screenY / H) * 100}%`;
          }
        } else {
          el.style.opacity = "0";
          el.style.pointerEvents = "none";
        }
      }

      rafRef.current = requestAnimationFrame(drawFrame);
    };

    rafRef.current = requestAnimationFrame(drawFrame);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const shell =
    variant === "fullscreen"
      ? "pointer-events-none fixed inset-0 z-[1] min-h-0 min-w-0 h-dvh w-full"
      : "pointer-events-none relative size-full min-h-0 min-w-0";

  return (
    <div ref={wrapRef} className={shell}>
      <canvas
        ref={canvasRef}
        className={`pointer-events-none absolute inset-0 size-full touch-none select-none bg-transparent ${className ?? ""}`}
        aria-hidden
        role="presentation"
      />
      <Link
        ref={markerRef}
        href={memoryHref}
        className="pointer-events-auto absolute z-10 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[2rem] border-2 border-white/50 bg-gradient-to-b from-white/45 to-indigo-100/30 opacity-0 shadow-[0_6px_28px_rgba(180,170,255,0.45)] outline-none backdrop-blur-sm transition-[transform,box-shadow] duration-500 hover:scale-[1.08] hover:shadow-[0_8px_32px_rgba(200,190,255,0.55)] focus-visible:ring-2 focus-visible:ring-pink-200/90"
        style={{ left: "50%", top: "50%" }}
        aria-label="Open Yunnan memory"
      >
        <span className="relative flex size-4 rounded-full bg-gradient-to-br from-amber-100 via-pink-100 to-indigo-200 shadow-[0_0_18px_rgba(255,220,240,0.9),0_0_36px_rgba(180,190,255,0.5)]" />
      </Link>
    </div>
  );
}
