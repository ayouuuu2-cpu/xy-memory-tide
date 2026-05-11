/** Vertex displacement ocean — used by loading scene plane. */

export const oceanVertexShader = /* glsl */ `
uniform float uTime;
varying vec2 vUv;
varying float vWave;

void main() {
  vUv = uv;
  vec3 pos = position;
  float w =
    sin(pos.x * 0.22 + uTime * 0.85) * 0.42 +
    sin(pos.z * 0.18 + uTime * 0.62) * 0.33 +
    sin((pos.x + pos.z) * 0.12 + uTime * 0.4) * 0.18;
  pos.y += w;
  vWave = w;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

export const oceanFragmentShader = /* glsl */ `
precision highp float;
uniform float uTime;
varying vec2 vUv;
varying float vWave;

void main() {
  vec3 deep = vec3(0.02, 0.05, 0.12);
  vec3 mid = vec3(0.06, 0.14, 0.32);
  vec3 crest = vec3(0.18, 0.38, 0.58);
  float t = clamp(vUv.y * 0.45 + vWave * 0.12 + sin(uTime * 0.25) * 0.04, 0.0, 1.0);
  vec3 col = mix(deep, mid, t);
  col = mix(col, crest, smoothstep(0.35, 0.95, t));
  float foam = smoothstep(0.25, 0.55, vWave);
  col += vec3(foam * 0.08);
  gl_FragColor = vec4(col, 1.0);
}
`;
