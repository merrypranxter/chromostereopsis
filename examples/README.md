# Examples

Standalone, copy-pasteable demonstrations of chromostereopsis. Each is
self-contained and progressively more involved. The HTML ones with
inline shaders/CSS run straight from `file://` — no server needed. The
main app (`/index.html`) loads shaders over `fetch`, so it needs a
server (`npm start`).

> Reminder: the effect varies per viewer. Some people see red advance,
> some see it reverse, some barely see it. View at ~arm's length, give
> your eyes a second to settle, and try both black and white backgrounds.

| File | Tech | Server needed? | Shows |
|------|------|----------------|-------|
| [`01-canvas2d-redblue.html`](./01-canvas2d-redblue.html) | Canvas 2D | no | Minimal red/blue starfield, no WebGL |
| [`02-css-only-type-pops.html`](./02-css-only-type-pops.html) | HTML/CSS | no | "Type pops" with zero JS |
| [`03-depth-mapper-node.mjs`](./03-depth-mapper-node.mjs) | Node | no | Using the depth mapper headlessly |
| [`04-minimal-webgl-field.html`](./04-minimal-webgl-field.html) | WebGL2 | no | Smallest full-screen GLSL field |
| [`05-svg-floating-glyphs.html`](./05-svg-floating-glyphs.html) | SVG | no | Red glyphs floating off a blue plane |
| [`06-polarity-split.html`](./06-polarity-split.html) | Canvas 2D | no | Black vs white polarity flip, side by side |
