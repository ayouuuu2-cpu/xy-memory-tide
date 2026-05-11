import * as THREE from "three";

/**
 * Procedural equirectangular “hand-drawn indie map” albedo for the Echoes globe
 * (not satellite imagery — soft ink continents on twilight ocean).
 */
export function createStylizedEarthMapTexture(): THREE.CanvasTexture {
  const w = 2048;
  const h = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2D context unavailable");
  }

  // Twilight ocean wash
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#1c1838");
  sky.addColorStop(0.45, "#252456");
  sky.addColorStop(1, "#14102c");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Soft vignette on texture (depth when projected)
  const v = ctx.createRadialGradient(w * 0.5, h * 0.48, h * 0.08, w * 0.5, h * 0.5, h * 0.72);
  v.addColorStop(0, "rgba(180, 170, 255, 0.07)");
  v.addColorStop(1, "rgba(10, 8, 28, 0)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);

  // Faint meridian sketch lines
  ctx.strokeStyle = "rgba(220, 210, 255, 0.045)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 24; i++) {
    const x = (i / 24) * w;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let j = 0; j <= 12; j++) {
    const y = (j / 12) * h;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  ctx.globalCompositeOperation = "lighter";

  type Blob = { cx: number; cy: number; rx: number; ry: number; rot: number; alpha: number };

  const ink = "rgba(235, 228, 255, #)";
  const drawBlob = ({ cx, cy, rx, ry, rot, alpha }: Blob) => {
    ctx.save();
    ctx.translate(cx * w, cy * h);
    ctx.rotate(rot);
    ctx.fillStyle = ink.replace("#", String(alpha));
    ctx.beginPath();
    ctx.ellipse(0, 0, rx * w, ry * h, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // Stylized continent clusters (normalized 0–1 over equirectangular space)
  const blobs: Blob[] = [
    { cx: 0.22, cy: 0.42, rx: 0.055, ry: 0.2, rot: -0.35, alpha: 0.11 },
    { cx: 0.27, cy: 0.52, rx: 0.045, ry: 0.14, rot: 0.2, alpha: 0.09 },
    { cx: 0.48, cy: 0.38, rx: 0.11, ry: 0.16, rot: 0.15, alpha: 0.1 },
    { cx: 0.52, cy: 0.62, rx: 0.075, ry: 0.12, rot: -0.1, alpha: 0.085 },
    { cx: 0.72, cy: 0.35, rx: 0.09, ry: 0.14, rot: 0.45, alpha: 0.095 },
    { cx: 0.78, cy: 0.48, rx: 0.06, ry: 0.1, rot: -0.25, alpha: 0.08 },
    { cx: 0.85, cy: 0.68, rx: 0.065, ry: 0.11, rot: 0.35, alpha: 0.075 },
    { cx: 0.58, cy: 0.48, rx: 0.04, ry: 0.09, rot: 0.9, alpha: 0.055 },
    { cx: 0.12, cy: 0.72, rx: 0.06, ry: 0.08, rot: 0.5, alpha: 0.065 },
  ];

  for (const b of blobs) drawBlob(b);

  ctx.globalCompositeOperation = "source-over";

  // Chalk coast outlines
  ctx.strokeStyle = "rgba(255, 248, 240, 0.06)";
  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";
  for (const b of blobs) {
    ctx.save();
    ctx.translate(b.cx * w, b.cy * h);
    ctx.rotate(b.rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, b.rx * w * 1.02, b.ry * h * 1.02, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Tiny gold “chart stars”
  ctx.fillStyle = "rgba(255, 230, 190, 0.07)";
  for (let i = 0; i < 140; i++) {
    const x = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    const y = (Math.cos(i * 78.233) * 12345.6789) % 1;
    const px = ((x + 1) / 2) * w;
    const py = ((y + 1) / 2) * h;
    ctx.fillRect(px, py, 1.2, 1.2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

/** Alias for Echoes globe imports */
export const createStylizedEarthTexture = createStylizedEarthMapTexture;
