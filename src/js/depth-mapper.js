// depth-mapper.js
// ─────────────────────────────────────────────────────────────────────
// Pure, dependency-free helpers for mapping scene depth to the
// chromostereoptic red↔blue axis. Mirrors the GLSL in
// `src/shaders/*.frag` so JS-side scene assembly and the shaders agree.
//
// Conventions everywhere in this repo:
//   depth = 0.0  → NEAR  → pure red   (#FF0000) → advances in the eye
//   depth = 1.0  → FAR   → pure blue  (#0000FF) → recedes in the eye
//
// These are intentionally allocation-light and side-effect free so they
// can be unit tested and reused across the ecosystem.
// ─────────────────────────────────────────────────────────────────────

/** Clamp a number to [lo, hi]. */
export function clamp(x, lo = 0, hi = 1) {
  return Math.min(hi, Math.max(lo, x));
}

/** Linear interpolation. */
export function mix(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Map a normalised depth to an [r, g, b] triple on the red↔blue axis.
 * @param {number} depth 0 = near (red), 1 = far (blue).
 * @returns {[number, number, number]} components in 0..1.
 */
export function depthToChromostereopsis(depth) {
  const d = clamp(depth);
  return [mix(1, 0, d), 0, mix(0, 1, d)];
}

/**
 * Push an RGB triple to maximum brightness by normalising to its
 * brightest channel (the brightest channel becomes 1.0). This maximises
 * saturation for hues that already lie on the red↔blue axis; it does NOT
 * quantize to pure red/blue, so a mid-depth mix like [0.5,0,0.5] becomes
 * full magenta [1,0,1] rather than snapping to a primary. The effect is
 * strongest at the pure-primary extremes; intermediate depths read as
 * saturated purples. Mirrors `enforceMaxSaturation` in the shaders /
 * `color_systems`.
 * @param {[number, number, number]} rgb components in 0..1.
 * @returns {[number, number, number]} max-brightness copy.
 */
export function enforceMaxSaturation([r, g, b]) {
  const maxC = Math.max(r, g, b);
  if (maxC > 0) return [r / maxC, g / maxC, b / maxC];
  return [r, g, b];
}

/**
 * Convenience: depth → max-saturated RGB. The combination you almost
 * always want when assigning a color to a scene element.
 * @param {number} depth 0 = near (red), 1 = far (blue).
 * @returns {[number, number, number]}
 */
export function depthToColor(depth) {
  return enforceMaxSaturation(depthToChromostereopsis(depth));
}

/**
 * Convert a 0..1 RGB triple to a "#rrggbb" hex string.
 * @param {[number, number, number]} rgb
 * @returns {string}
 */
export function rgbToHex([r, g, b]) {
  const h = (v) => clamp(Math.round(v * 255), 0, 255).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

/**
 * Assign chromostereoptic colors to a list of scene elements.
 * Each element must expose a numeric `depth` (0..1). Returns a new array
 * of { ...el, color: [r,g,b], hex } without mutating the input.
 * @template {{depth: number}} T
 * @param {T[]} elements
 * @returns {(T & {color: [number,number,number], hex: string})[]}
 */
export function assignDepthColors(elements) {
  return elements.map((el) => {
    const color = depthToColor(el.depth);
    return { ...el, color, hex: rgbToHex(color) };
  });
}

/**
 * Normalise an arbitrary numeric depth range into 0..1.
 * Handy when a scene uses world-space z values rather than 0..1.
 * @param {number} z
 * @param {number} near smallest z (maps to 0 → red)
 * @param {number} far  largest z (maps to 1 → blue)
 * @returns {number}
 */
export function normalizeDepth(z, near, far) {
  if (far === near) return 0;
  return clamp((z - near) / (far - near));
}
