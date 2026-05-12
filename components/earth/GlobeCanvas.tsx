"use client";

import type { RefObject } from "react";
import { useEffect, useRef } from "react";

const YUNNAN_LON = (101.5 * Math.PI) / 180;
const YUNNAN_LAT = (25.7 * Math.PI) / 180;

/** Sphere radius as a fraction of the smaller canvas side — lower = further “camera”. */
const SPHERE_RADIUS_SCALE = 0.34;

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

type Props = {
  className?: string;
  markerRef: RefObject<HTMLAnchorElement | null>;
};

export function GlobeCanvas({ className, markerRef }: Props) {
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
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const resize = () => {
      const el = wrapRef.current;
      if (!el) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = el.getBoundingClientRect();
      const cssSide = Math.max(160, Math.floor(Math.min(rect.width, rect.height)));
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.display = "block";
      canvas.width = Math.max(1, Math.floor(cssSide * dpr));
      canvas.height = Math.max(1, Math.floor(cssSide * dpr));
      bufRef.current = null;
    };

    resize();

    const ro = new ResizeObserver(() => {
      resize();
    });
    ro.observe(wrap);
    window.addEventListener("resize", resize);

    const drawFrame = (t: number) => {
      const prev = lastRef.current || t;
      const dt = Math.min(48, t - prev);
      lastRef.current = t;
      rotRef.current += dt * 0.000018;

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
      const R = Math.min(W, H) * SPHERE_RADIUS_SCALE;
      const rot = rotRef.current;
      const cos = Math.cos(rot);
      const sin = Math.sin(rot);

      if (!tex) {
        ctx.fillStyle = "#0b1020";
        ctx.fillRect(0, 0, W, H);
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

      for (let py = -R; py <= R; py += step) {
        for (let px = -R; px <= R; px += step) {
          if (px * px + py * py > R * R) continue;
          const z = Math.sqrt(R * R - px * px - py * py);
          const nx = px / R;
          const ny = -py / R;
          const nz = z / R;

          const ex = nx * cos - nz * sin;
          const ey = ny;
          const ez = nx * sin + nz * cos;

          if (ez <= 0.02) continue;

          const lat = Math.asin(clamp(ey, -1, 1));
          const lon = Math.atan2(ex, ez);
          const u = (lon + Math.PI) / (Math.PI * 2);
          const v = 0.5 - lat / Math.PI;

          const [r, g, b] = sampleBilinear(data, iw, ih, u, v);

          const edge = Math.sqrt(px * px + py * py) / R;
          const limb = clamp((edge - 0.82) / 0.18, 0, 1);
          const shade = 0.72 + 0.28 * (nz * 0.55 + 0.45) - limb * 0.32;
          const rr = clamp(r * shade, 0, 255);
          const gg = clamp(g * shade, 0, 255);
          const bb = clamp(b * shade, 0, 255);

          for (let iy = 0; iy < step; iy++) {
            for (let ix = 0; ix < step; ix++) {
              const apx = px + ix;
              const apy = py + iy;
              if (apx * apx + apy * apy > R * R) continue;
              const sx = Math.round(cx + apx);
              const sy = Math.round(cy + apy);
              if (sx < 0 || sx >= W || sy < 0 || sy >= H) continue;
              const si = (sy * W + sx) * 4;
              out[si] = rr;
              out[si + 1] = gg;
              out[si + 2] = bb;
              out[si + 3] = 255;
            }
          }
        }
      }

      ctx.putImageData(imageData, 0, 0);

      const grd = ctx.createRadialGradient(cx - R * 0.32, cy - R * 0.32, R * 0.08, cx, cy, R * 1.22);
      grd.addColorStop(0, "rgba(255,255,255,0.12)");
      grd.addColorStop(0.5, "rgba(255,255,255,0)");
      grd.addColorStop(1, "rgba(10,18,40,0.28)");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);

      const Ex = Math.cos(YUNNAN_LAT) * Math.sin(YUNNAN_LON);
      const Ey = Math.sin(YUNNAN_LAT);
      const Ez = Math.cos(YUNNAN_LAT) * Math.cos(YUNNAN_LON);
      const Px = Ex * cos + Ez * sin;
      const Pz = -Ex * sin + Ez * cos;
      const Py = Ey;
      const el = markerRef.current;
      if (el) {
        if (Pz > 0.04) {
          const screenX = cx + Px * R;
          const screenY = cy - Py * R;
          el.style.opacity = "1";
          el.style.pointerEvents = "auto";
          el.style.left = `${(screenX / W) * 100}%`;
          el.style.top = `${(screenY / H) * 100}%`;
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
  }, [markerRef]);

  return (
    <div ref={wrapRef} className="relative size-full min-h-0 min-w-0">
      <canvas ref={canvasRef} className={className} aria-hidden role="presentation" />
    </div>
  );
}
