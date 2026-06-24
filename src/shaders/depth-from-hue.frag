#version 300 es
precision highp float;

// ── depth-from-hue.frag ──────────────────────────────────────────────
// Mode 2 base — "Floating Glyphs".
//
// Maps a procedural scene's depth to the red↔blue axis. Red sigils
// hover off a blue plane: because red advances and blue recedes in the
// eye, the glyphs feel like they float in front of the screen with no
// shadow, bevel, or parallax.
// ─────────────────────────────────────────────────────────────────────

in vec2 v_uv;
out vec4 fragColor;

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_depth;   // global depth push (scroll)
uniform vec3  u_bg;

// from color_systems
vec3 enforceMaxSaturation(vec3 rgb) {
  float maxC = max(rgb.r, max(rgb.g, rgb.b));
  if (maxC > 0.0) rgb /= maxC;
  return rgb;
}

vec3 depthToChromostereopsis(float depth) {
  return mix(vec3(1.0, 0.0, 0.0), vec3(0.0, 0.0, 1.0), clamp(depth, 0.0, 1.0));
}

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}

// A crude "glyph": a few strokes inside a cell, deterministic per-cell.
// Returns coverage 0..1.
float glyph(vec2 f, float seed) {
  float g = 0.0;
  // three random line segments
  for (int k = 0; k < 3; k++) {
    float s = hash21(vec2(seed, float(k) * 1.7));
    vec2 a = vec2(hash21(vec2(s, 1.0)), hash21(vec2(s, 2.0)));
    vec2 b = vec2(hash21(vec2(s, 3.0)), hash21(vec2(s, 4.0)));
    vec2 pa = f - a, ba = b - a;
    // Guard against a degenerate segment (a == b) which would make
    // dot(ba, ba) zero and produce NaN that propagates to the output.
    float lenSq = dot(ba, ba);
    float h = lenSq > 1e-4 ? clamp(dot(pa, ba) / lenSq, 0.0, 1.0) : 0.0;
    float d = length(pa - ba * h);
    g = max(g, smoothstep(0.06, 0.03, d));
  }
  return g;
}

void main() {
  // Blue plane background (the "far" field).
  vec3 plane = enforceMaxSaturation(depthToChromostereopsis(1.0)); // pure blue
  vec3 color = mix(u_bg, plane, 0.85);

  vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
  vec2 gp = v_uv * aspect * 6.0;
  vec2 cell = floor(gp);
  vec2 f = fract(gp);

  float seed = hash21(cell);
  // Only some cells host a glyph.
  if (seed > 0.45) {
    float cov = glyph(f, seed);
    // Glyph depth: near (red), with a gentle per-glyph bob so the layer
    // breathes very slightly.
    float gd = 0.0 + 0.15 * (0.5 + 0.5 * sin(u_time + seed * 6.28)) + (u_depth - 0.5) * 0.4;
    vec3 glyphCol = enforceMaxSaturation(depthToChromostereopsis(clamp(gd, 0.0, 1.0)));
    color = mix(color, glyphCol, cov);
  }

  fragColor = vec4(color, 1.0);
}
