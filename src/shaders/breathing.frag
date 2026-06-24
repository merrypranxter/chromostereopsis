#version 300 es
precision highp float;

// ── breathing.frag ───────────────────────────────────────────────────
// Mode 4 — "Breathing Layers".
//
// A slow red↔blue cycle pushes the whole field forward and back along
// the chromostereoptic depth axis. Concentric soft bands phase against
// each other so the layers appear to pulse in depth — breathing.
// Hypnotic, subtle, alive. Keep the cycle slow; fast motion reads as
// color change rather than depth.
// ─────────────────────────────────────────────────────────────────────

in vec2 v_uv;
out vec4 fragColor;

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_depth;
uniform vec3  u_bg;
uniform float u_rate;   // breaths per second-ish (default ~0.1)

vec3 enforceMaxSaturation(vec3 rgb) {
  float maxC = max(rgb.r, max(rgb.g, rgb.b));
  if (maxC > 0.0) rgb /= maxC;
  return rgb;
}

vec3 depthToChromostereopsis(float depth) {
  return mix(vec3(1.0, 0.0, 0.0), vec3(0.0, 0.0, 1.0), clamp(depth, 0.0, 1.0));
}

void main() {
  vec2 aspect = vec2(u_resolution.x / max(u_resolution.y, 1.0), 1.0);
  vec2 c = (v_uv - 0.5) * aspect;
  float r = length(c);

  float rate = max(u_rate, 0.001);
  // Global breath: slow sine over the whole field.
  float breath = 0.5 + 0.5 * sin(u_time * 6.28318 * rate);

  // Radial bands whose phase is offset by radius, so inner and outer
  // rings breathe slightly out of sync — that desync sells the depth.
  float band = 0.5 + 0.5 * sin(r * 18.0 - u_time * 6.28318 * rate * 2.0);

  // Combine into a depth value, biased by scroll.
  float depth = clamp(mix(breath, band, 0.5) + (u_depth - 0.5) * 0.4, 0.0, 1.0);

  vec3 color = enforceMaxSaturation(depthToChromostereopsis(depth));
  // Gentle vignette toward background so edges don't harden.
  float vig = smoothstep(1.2, 0.2, r);
  color = mix(u_bg, color, vig);

  fragColor = vec4(color, 1.0);
}
