import * as THREE from "three";

/**
 * Geographic lat/lng (degrees) → unit direction on sphere (Y up, equirectangular-friendly).
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
