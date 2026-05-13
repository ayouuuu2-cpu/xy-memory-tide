import * as THREE from "three";

/**
 * Geographic lat/lng (degrees) → unit direction on sphere (Y up, equirectangular-friendly).
 * 全域星图 3D 锚点与 {@link latLngToPixel} 共用同一组经纬度。
 */
export function latLngToUnitVector(latDeg: number, lngDeg: number): THREE.Vector3 {
  const lat = (latDeg * Math.PI) / 180;
  const lng = (lngDeg * Math.PI) / 180;
  const cosLat = Math.cos(lat);
  return new THREE.Vector3(
    cosLat * Math.sin(lng),
    Math.sin(lat),
    cosLat * Math.cos(lng),
  );
}

/**
 * 等距柱状投影下的归一化平面坐标，x/y ∈ [0,1]（相对「展开地球图」的像素比例）。
 * 球面网格仍用 {@link latLngToUnitVector}；本函数供 2D 对照与文档中的「latLngToPixel」统一入口。
 */
export function latLngToPixel(latDeg: number, lngDeg: number): { x: number; y: number } {
  const x = (lngDeg + 180) / 360;
  const y = 0.5 - latDeg / 180;
  return { x, y };
}
