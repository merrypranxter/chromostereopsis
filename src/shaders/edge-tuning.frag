#version 300 es
precision highp float;

// ── edge-tuning.frag ─────────────────────────────────────────────────
// Mode 5 base — "Type Pops" / thin red figures on blue ground.
//
// Chromostereopsis is strongest at high-contrast EDGES between pure red
// and pure blue. Thin red figures on a blue ground maximise edge length
// per area, so the depth separation reads strongest. This shader draws
// crisp red bars/strokes on a pure-blue field — the strokes feel
// embossed, 3D, with no shadow or bevel.
//
// Tunable: u_edge controls stroke thickness. Thinner = more edges =
// stronger pop, up to the point the figure dissolves.
// ─────────────────────────────────────────────────────────────────────

in vec2 v_uv;
out vec4 fragColor;

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_depth;
uniform vec3  u_bg;
uniform float u_edge;   // stroke thickness 0.02..0.2

vec3 enforceMaxSaturation(vec3 rgb) {
  float maxC = max(rgb.r, max(rgb.g, rgb.b));
  if (maxC > 0.0) rgb /= maxC;
  return rgb;
}

vec3 depthToChromostereopsis(float depth) {
  return mix(vec3(1.0, 0.0, 0.0), vec3(0.0, 0.0, 1.0), clamp(depth, 0.0, 1.0));
}

void main() {
  vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
  vec2 p = v_uv * aspect;

  // Pure blue ground (the receding plane).
  vec3 color = mix(u_bg, enforceMaxSaturation(depthToChromostereopsis(1.0)), 0.9);

  // A grid of thin red vertical + horizontal strokes — a lattice that
  // floats forward off the blue.
  float thick = clamp(u_edge, 0.01, 0.45);
  float freq = 9.0;
  vec2 g = fract(p * freq + vec2(u_time * 0.05, 0.0));
  float v = smoothstep(thick, thick * 0.5, abs(g.x - 0.5));
  float h = smoothstep(thick, thick * 0.5, abs(g.y - 0.5));
  float lattice = max(v, h);

  // Strokes ride the near (red) end of the axis; scroll nudges it.
  vec3 red = enforceMaxSaturation(depthToChromostereopsis(clamp(0.0 + (u_depth - 0.5) * 0.3, 0.0, 1.0)));
  color = mix(color, red, lattice);

  fragColor = vec4(color, 1.0);
}
