#version 300 es
precision highp float;

// ── redblue-field.frag ───────────────────────────────────────────────
// Mode 1 base + the canonical "Deep Field".
//
// The goldmine engine: pure-primary red/blue field with maximum
// saturation enforced. Red is focused BEHIND the retina (advances),
// blue IN FRONT (recedes). Your own eye's longitudinal chromatic
// aberration splits a flat field into depth. No glasses.
//
// This shader renders a starfield: red stars in the foreground, blue
// stars in the background, on a controlled background. The depth pops
// with zero stereo trick.
// ─────────────────────────────────────────────────────────────────────

in vec2 v_uv;
out vec4 fragColor;

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_depth;   // 0.0 = near (red), 1.0 = far (blue) — global push
uniform vec3  u_bg;      // background color (black or white)
uniform float u_density; // star density, ~stars per cell

// Reused from `color_systems`: clamp an RGB triple to maximum saturation
// by normalising to its brightest channel. Orange/cyan are perceptually
// weak for chromostereopsis — only pure #FF0000 / #0000FF carry the
// effect, so every color path funnels through this.
vec3 enforceMaxSaturation(vec3 rgb) {
  float maxC = max(rgb.r, max(rgb.g, rgb.b));
  if (maxC > 0.0) rgb /= maxC;
  return rgb;
}

// Map a normalised depth to the red↔blue axis.
// depth: 0.0 = closest (red), 1.0 = farthest (blue).
vec3 depthToChromostereopsis(float depth) {
  return mix(vec3(1.0, 0.0, 0.0), vec3(0.0, 0.0, 1.0), clamp(depth, 0.0, 1.0));
}

// Cheap hash → [0,1)
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}

void main() {
  vec2 uv = v_uv;
  // Aspect-correct so cells stay square regardless of canvas shape.
  vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
  vec2 p = uv * aspect;

  vec3 color = u_bg;

  // Layered starfield: each layer has its own depth and cell scale.
  // Nearer layers (lower depth) drift faster — a weak parallax that
  // reinforces the chromatic depth without becoming "post".
  const int LAYERS = 5;
  for (int i = 0; i < LAYERS; i++) {
    float fi = float(i);
    float layerDepth = clamp(fi / float(LAYERS - 1) + (u_depth - 0.5), 0.0, 1.0);
    float scale = mix(8.0, 26.0, fi / float(LAYERS - 1)) * u_density;

    // Slow drift, faster for near layers.
    vec2 drift = vec2(u_time * (0.02 + 0.04 * (1.0 - layerDepth)), 0.0);
    vec2 gp = (p + drift) * scale;
    vec2 cell = floor(gp);
    vec2 f = fract(gp);

    float rnd = hash21(cell + fi * 17.0);
    if (rnd > 1.0 - 0.06) {           // sparse stars
      vec2 starPos = vec2(hash21(cell + 3.0), hash21(cell + 7.0));
      float d = length(f - starPos);
      float twinkle = 0.6 + 0.4 * sin(u_time * 2.0 + rnd * 6.28);
      float star = smoothstep(0.06, 0.0, d) * twinkle;
      vec3 starCol = depthToChromostereopsis(layerDepth);
      color = mix(color, enforceMaxSaturation(starCol), star);
    }
  }

  fragColor = vec4(color, 1.0);
}
