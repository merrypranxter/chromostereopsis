#version 300 es
precision highp float;

// ── ca-enhance.frag ──────────────────────────────────────────────────
// Optional post pass — subtle chromatic-aberration boost.
//
// Mirrors the eye's longitudinal chromatic aberration in the image
// itself: the red channel is sampled slightly outward and the blue
// channel slightly inward from the optical center. This nudges the
// naked-eye effect a little harder WITHOUT becoming a heavy finisher.
//
// Borrowed in spirit from the `chromatic_aberration` repo — kept
// minimal here on purpose. The effect lives in the eye; this is a
// whisper, not a filter. Keep u_amount small (0.0..~0.01). At 0.0 the
// pass is a pure passthrough.
//
// GOTCHA: too much CA just looks like a cheap RGB-split glitch and
// destroys the illusion. Resist the urge to crank it.
// ─────────────────────────────────────────────────────────────────────

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_scene;   // previously rendered field (FBO ping-pong)
uniform vec2      u_resolution;
uniform float     u_amount;  // 0.0 = off, ~0.004 = tasteful

void main() {
  vec2 uv = v_uv;
  // Direction from optical center; aberration grows toward the edges,
  // exactly like the real thing.
  vec2 dir = uv - 0.5;

  // Red pushed outward, blue pulled inward, green stays put.
  vec2 rOff = uv + dir * u_amount;
  vec2 bOff = uv - dir * u_amount;

  float r = texture(u_scene, rOff).r;
  float g = texture(u_scene, uv).g;
  float b = texture(u_scene, bOff).b;

  fragColor = vec4(r, g, b, 1.0);
}
