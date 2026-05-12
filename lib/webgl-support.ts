/** Attributes aligned with `MemoryTideGlobe` Canvas — relaxed for software / sandboxed GL. */
const PROBE_ATTRS: WebGLContextAttributes = {
  alpha: true,
  antialias: false,
  depth: true,
  stencil: false,
  premultipliedAlpha: false,
  failIfMajorPerformanceCaveat: false,
  powerPreference: "default",
};

/**
 * Returns true if the browser can create and use a WebGL(2) context with the
 * same relaxed flags we pass to Three. Releases the probe context afterward.
 */
export function probeWebGL(): boolean {
  if (typeof document === "undefined") return true;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const gl2 = canvas.getContext("webgl2", PROBE_ATTRS);
    const gl1 = canvas.getContext("webgl", PROBE_ATTRS);
    const gl = gl2 ?? gl1;
    if (!gl) return false;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const lose = gl.getExtension("WEBGL_lose_context");
    lose?.loseContext?.();
    return true;
  } catch {
    return false;
  }
}
