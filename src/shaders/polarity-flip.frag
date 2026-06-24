#version 300 es
precision highp float;

// ── polarity-flip.frag ───────────────────────────────────────────────
// Mode 3 — "Polarity Demo". The educational killer feature.
//
// Renders the SAME red/blue pattern twice, split down the middle:
//   left half  → BLACK background
//   right half → WHITE background
//
// On a dark field most viewers see red advance / blue recede. On a
// bright field the adaptation differs and the effect can INVERT
// (blue advances, red recedes). Watching the depth flip across the
// seam proves the effect lives in the eye, not the screen.
//
// Note: the polarity inversion is perceptual — this shader does not
// fake it by swapping colors. Both halves draw identical geometry and
// identical pure primaries. Your visual system does the rest, and it
// genuinely varies per person.
// ─────────────────────────────────────────────────────────────────────

in vec2 v_uv;
out vec4 fragColor;

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_depth;

vec3 enforceMaxSaturation(vec3 rgb) {
  float maxC = max(rgb.r, max(rgb.g, rgb.b));
  if (maxC > 0.0) rgb /= maxC;
  return rgb;
}

vec3 depthToChromostereopsis(float depth) {
  return mix(vec3(1.0, 0.0, 0.0), vec3(0.0, 0.0, 1.0), clamp(depth, 0.0, 1.0));
}

// Concentric ring target — alternating red/blue rings read very clearly
// as advancing/receding bands and make the polarity flip obvious.
vec3 pattern(vec2 uv, vec3 bg) {
  vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
  vec2 c = (uv - 0.5) * aspect;
  float r = length(c) * 10.0 - u_time * 0.5 - u_depth * 4.0;
  float band = step(0.5, fract(r));      // 0 or 1
  vec3 col = depthToChromostereopsis(band);
  // Leave thin gaps of background between rings so polarity reads.
  float gap = smoothstep(0.0, 0.08, abs(fract(r) - 0.5));
  return mix(bg, enforceMaxSaturation(col), gap);
}

void main() {
  bool rightHalf = v_uv.x > 0.5;
  vec3 bg = rightHalf ? vec3(1.0) : vec3(0.0);

  // Remap each half to a local 0..1 so the same pattern appears twice.
  vec2 uv = v_uv;
  uv.x = rightHalf ? (uv.x - 0.5) * 2.0 : uv.x * 2.0;

  vec3 color = pattern(uv, bg);

  // Hairline divider down the seam.
  float seam = smoothstep(0.002, 0.0, abs(v_uv.x - 0.5));
  color = mix(color, vec3(0.5), seam);

  fragColor = vec4(color, 1.0);
}
