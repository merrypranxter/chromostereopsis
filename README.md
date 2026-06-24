# chromostereopsis

> red floats. blue sinks. your own eyeball does the 3D. no glasses.

## what it does

Pure saturated red and pure blue at the same depth appear at **different** depths — red advances, blue recedes — because of longitudinal chromatic aberration in your own eye. Flat art that pops into layers with zero stereo trick.

**Sibling of `chromadepth`** — cross-link hard:
- `chromadepth` = engineered depth via **ChromaDepth GLASSES** (red→near, blue→far).
- `chromostereopsis` = **naked-eye**, no glasses, exploits your eye's own chromatic aberration; effect can even **reverse** per viewer.

## engines

- `src/shaders/redblue-field.frag` — max-separation pure-primary field.
- `src/shaders/depth-from-hue.frag` — map scene depth → red↔blue axis.
- `src/shaders/polarity-flip.frag` — black vs white background (effect inverts).
- `src/shaders/edge-tuning.frag` — thin red figures on blue ground.
- `src/shaders/breathing.frag` — animate red→blue so layers pulse.
- `src/shaders/ca-enhance.frag` — subtle chromatic aberration boost (`chromatic_aberration`).

## pipeline

1. scene/pattern → assign layer/depth → map to red→blue axis.
2. render **maximum-saturation** pure-channel colors on controlled background.
3. optional CA enhancement pass.
4. minimal post (heavy finishers kill the effect).

## aesthetic regimes

- `deep_field` — starfield, red near / blue far, black ground.
- `floating_glyphs` — red sigils hovering off blue plane.
- `polarity_demo` — same art on black vs white, side by side (watch invert).
- `breathing_layers` — slow red↔blue cycle, depth pulses.
- `type_pops` — red text floating off blue.

## parameters

```
mode: deep_field | floating_glyphs | polarity_demo | breathing | type_pops
background: black | white   (ignored by polarity_demo, which is a fixed split)
saturation: 1.0 (must be max)
ca_enhance: 0.0–0.01  (keep it tiny; ~0.004 typical — larger reads as an
                       RGB-split glitch and destroys the effect)
```

## gotchas

- **effect strength + direction vary per person** — some see it reversed. Say so.
- needs MAX saturation + pure R/B. Orange/cyan are weak.
- background polarity flips it.
- best at certain viewing distances.
- don't over-design — heavy finishers destroy it.

## run it

The main app loads shaders over `fetch`, so it needs to be served (not
opened from `file://`):

```bash
npm start          # python3 -m http.server 8080
# then open http://localhost:8080
```

Controls: `1`–`5` switch modes · scroll pushes depth · click swaps the
background · `c` toggles the CA pass · space pauses. (Click-to-swap has no
effect in `polarity_demo`, which is a fixed black/white split by design.)

No-server demos live in [`examples/`](./examples/) — those run straight
from `file://`. Start with `examples/01-canvas2d-redblue.html`.

## structure

```
chromostereopsis/
├── index.html                 # WebGL2 app shell
├── src/
│   ├── js/
│   │   ├── main.js            # renderer, modes, input, CA ping-pong
│   │   └── depth-mapper.js    # depth → red/blue axis (pure, tested)
│   ├── shaders/
│   │   ├── fullscreen.vert    # gl_VertexID fullscreen triangle
│   │   ├── redblue-field.frag # 1 deep_field
│   │   ├── depth-from-hue.frag# 2 floating_glyphs
│   │   ├── polarity-flip.frag # 3 polarity_demo
│   │   ├── breathing.frag     # 4 breathing_layers
│   │   ├── edge-tuning.frag   # 5 type_pops
│   │   └── ca-enhance.frag    # optional CA post pass
│   └── data/presets.json      # per-mode tunables
├── examples/                  # standalone, no-server demos
├── docs/                      # visual-targets, math-reference, perceptual-math
└── test/                      # node:test unit tests for the mapper
```

## test

```bash
npm test           # node --test
```

## ecosystem

**Consumes:** `chromatic_aberration`, `color_systems`  
**Consumed by:** none  
**Adjacent:** `anaglyph_stereo`, `parallax_depth_fields`, `pulfrich_effect`, `wiggle_stereoscopy`  
**Sibling:** `chromadepth` (hard cross-link)  
**Lane:** 3 (perceptual)
