// Unit tests for the depth mapper.
// Run with: npm test   (uses the built-in node:test runner, no deps)

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  clamp,
  mix,
  depthToChromostereopsis,
  enforceMaxSaturation,
  depthToColor,
  rgbToHex,
  assignDepthColors,
  normalizeDepth,
} from '../src/js/depth-mapper.js';

test('clamp keeps values in range', () => {
  assert.equal(clamp(-1), 0);
  assert.equal(clamp(2), 1);
  assert.equal(clamp(0.5), 0.5);
  assert.equal(clamp(5, 0, 10), 5);
});

test('mix interpolates linearly', () => {
  assert.equal(mix(0, 10, 0), 0);
  assert.equal(mix(0, 10, 1), 10);
  assert.equal(mix(0, 10, 0.5), 5);
});

test('depth 0 is pure red, depth 1 is pure blue', () => {
  assert.deepEqual(depthToChromostereopsis(0), [1, 0, 0]);
  assert.deepEqual(depthToChromostereopsis(1), [0, 0, 1]);
});

test('depth clamps out-of-range input', () => {
  assert.deepEqual(depthToChromostereopsis(-5), [1, 0, 0]);
  assert.deepEqual(depthToChromostereopsis(99), [0, 0, 1]);
});

test('enforceMaxSaturation normalises to brightest channel', () => {
  assert.deepEqual(enforceMaxSaturation([0.5, 0, 0]), [1, 0, 0]);
  assert.deepEqual(enforceMaxSaturation([0.2, 0.4, 0.1]), [0.5, 1, 0.25]);
});

test('enforceMaxSaturation leaves black alone (no divide-by-zero)', () => {
  assert.deepEqual(enforceMaxSaturation([0, 0, 0]), [0, 0, 0]);
});

test('depthToColor produces max-saturated primaries at the extremes', () => {
  assert.deepEqual(depthToColor(0), [1, 0, 0]);
  assert.deepEqual(depthToColor(1), [0, 0, 1]);
});

test('the midpoint stays max-saturated, not a muddy purple', () => {
  // mix gives [0.5, 0, 0.5]; enforceMaxSaturation pushes it to [1,0,1].
  // This is the whole point: never emit weak/desaturated color.
  assert.deepEqual(depthToColor(0.5), [1, 0, 1]);
});

test('rgbToHex round-trips the primaries', () => {
  assert.equal(rgbToHex([1, 0, 0]), '#ff0000');
  assert.equal(rgbToHex([0, 0, 1]), '#0000ff');
  assert.equal(rgbToHex([1, 1, 1]), '#ffffff');
});

test('assignDepthColors does not mutate input and adds color + hex', () => {
  const scene = [{ depth: 0, name: 'glyph' }, { depth: 1, name: 'plane' }];
  const out = assignDepthColors(scene);
  assert.equal(out[0].hex, '#ff0000');
  assert.equal(out[1].hex, '#0000ff');
  assert.equal(out[0].name, 'glyph');
  // original untouched
  assert.equal(scene[0].color, undefined);
});

test('normalizeDepth maps a world-z range into 0..1', () => {
  assert.equal(normalizeDepth(0, 0, 10), 0);
  assert.equal(normalizeDepth(10, 0, 10), 1);
  assert.equal(normalizeDepth(5, 0, 10), 0.5);
  // degenerate range
  assert.equal(normalizeDepth(5, 3, 3), 0);
});
