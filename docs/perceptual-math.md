# Perceptual Math

Deeper notes on *why* chromostereopsis works, and how that maps onto the
shaders and the depth mapper. This is the long-form companion to
[`math-reference.md`](./math-reference.md).

> TL;DR — Red floats, blue sinks, and your own eye does the rendering.
> There are no glasses, no shutters, no headset. Pure saturated red and
> pure saturated blue, painted flat, are split into depth by the
> chromatic aberration of your own eye.

## 1. Longitudinal chromatic aberration (LCA)

The eye is a single (compound) lens, and like any simple lens its
refractive index varies with wavelength. Short wavelengths bend more
than long ones, so different colors focus at different distances *along*
the optical axis (hence *longitudinal*):

| Color | Wavelength | Focus relative to retina | Apparent depth |
|-------|-----------:|--------------------------|----------------|
| Red   | ~700 nm    | **behind** the retina    | advances (near) |
| Green | ~550 nm    | ~on the retina           | neutral |
| Blue  | ~400 nm    | **in front of** retina   | recedes (far) |

Total LCA across the visible band is roughly **2 dioptres** for the human
eye. The brain reads the focal mismatch between a red edge and a blue
edge as a depth difference, even though both are painted on the same flat
plane.

This is the entire trick. Everything in this repo is in service of
presenting the eye with clean, high-contrast, maximally-separated red and
blue so LCA has the strongest possible signal to work with.

## 2. Why pupil decentration matters

LCA alone produces *blur*, not necessarily *parallax*. The directional
"this color is nearer" signal comes from **transverse** chromatic
aberration, which appears when the pupil is **decentred** relative to the
optical axis — the eye's aperture acts like an off-axis prism, laterally
displacing the red and blue images by different amounts.

Most people's pupils are slightly nasally decentred, which is why most
viewers see **red advancing**. People with the opposite decentration —
or who view with the other eye, or on a bright field — can see the effect
**reverse**. This is not a bug in the art; it is a real, measurable
individual difference. Always tell viewers the direction may flip for
them.

## 3. Polarity inversion (background adaptation)

On a **dark** field the effect usually reads red-near / blue-far. On a
**bright** field, retinal adaptation and the change in effective pupil
size can **invert** it — blue advances, red recedes. The
[`polarity-flip.frag`](../src/shaders/polarity-flip.frag) mode renders the
*identical* pattern on black and white halves so a viewer can watch the
depth flip across the seam. The shader does **not** swap colors to fake
it — both halves are the same pure primaries; the inversion happens in
the eye.

## 4. The max-saturation requirement

Depth separation scales with the **spectral purity** of the two colors.
A desaturated "red" (say `#FF6666`) contains green and blue energy that
focuses near the retina and washes out the LCA signal. The effect needs
the extremes:

```
maxC = max(r, max(g, b))
if maxC > 0:  rgb /= maxC      # normalise to the brightest channel
```

This `enforceMaxSaturation` step appears identically in every fragment
shader and in [`depth-mapper.js`](../src/js/depth-mapper.js). Orange,
cyan, and pastels are perceptually weak — they are filtered out before
they ever reach the screen.

## 5. The depth → color map

Scene depth is mapped linearly onto the red↔blue axis:

```
color(depth) = mix(#FF0000, #0000FF, depth)      # depth ∈ [0, 1]
             then enforceMaxSaturation(...)
```

- `depth = 0` → pure red → **near**
- `depth = 1` → pure blue → **far**

The JS (`depthToColor`) and GLSL (`depthToChromostereopsis` +
`enforceMaxSaturation`) implementations are kept byte-for-byte
equivalent so a scene assembled in JS matches what the shader draws.

## 6. Keep the post minimal

The effect lives in the eye, not the shader. Heavy bloom, tone-mapping,
or large chromatic-aberration splits *destroy* it by muddying the pure
primaries. The optional [`ca-enhance.frag`](../src/shaders/ca-enhance.frag)
pass is deliberately a whisper (`u_amount ≈ 0.004`): it nudges the
image's own aberration in the same direction as the eye's, and at `0.0`
it is a pure passthrough. If it ever looks like an RGB-split glitch,
it is too strong.

## 7. Practical viewing notes

- **Distance matters.** There is a sweet spot (often ~arm's length for a
  monitor); too close or too far weakens it.
- **High contrast edges** between red and blue read strongest — see
  [`edge-tuning.frag`](../src/shaders/edge-tuning.frag).
- **Give it a second.** The depth often "pops" after a moment of
  fixation as the eye settles.
- **It varies per person, and that's the point.** Some see it strongly,
  some weakly, some reversed.

## See also

- Sibling: **`chromadepth`** — *engineered* depth via ChromaDepth
  glasses (red→near, blue→far). chromostereopsis is the glasses-free
  cousin; cross-link hard.
- Consumes: `chromatic_aberration` (CA enhancement), `color_systems`
  (max-saturation enforcement).
- Adjacent: `anaglyph_stereo`, `parallax_depth_fields`, `pulfrich_effect`,
  `wiggle_stereoscopy`.
