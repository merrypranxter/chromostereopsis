// Using the depth mapper headlessly (no browser, no GL).
//
//   node examples/03-depth-mapper-node.mjs
//
// Demonstrates assigning chromostereoptic colors to an abstract scene
// the same way a renderer would, then printing the resulting palette.
// Useful for generating swatches, SVG/CSS, or print-export pipelines.

import {
  depthToColor,
  rgbToHex,
  assignDepthColors,
  normalizeDepth,
} from '../src/js/depth-mapper.js';

// 1. A simple depth ramp: 9 layers from near (red) to far (blue).
console.log('Depth ramp (near → far):');
for (let i = 0; i <= 8; i++) {
  const depth = i / 8;
  const hex = rgbToHex(depthToColor(depth));
  const bar = '█'.repeat(20);
  console.log(`  depth ${depth.toFixed(2)}  ${hex}  ${bar}`);
}

// 2. A "scene" with world-space z values that get normalised then mapped.
const scene = [
  { name: 'foreground glyph', z: 1.0 },
  { name: 'mid sigil',        z: 4.0 },
  { name: 'far plane',        z: 9.0 },
];
const zs = scene.map((e) => e.z);
const near = Math.min(...zs);
const far = Math.max(...zs);

const colored = assignDepthColors(
  scene.map((e) => ({ ...e, depth: normalizeDepth(e.z, near, far) })),
);

console.log('\nScene → chromostereopsis palette:');
for (const el of colored) {
  console.log(`  ${el.name.padEnd(18)} z=${el.z}  depth=${el.depth.toFixed(2)}  ${el.hex}`);
}

// 3. Emit a tiny CSS custom-property block you could paste anywhere.
console.log('\nCSS:');
console.log(':root {');
for (const el of colored) {
  const slug = el.name.replace(/\s+/g, '-');
  console.log(`  --${slug}: ${el.hex};`);
}
console.log('}');
