/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveVisualizerVibe,
  describeVisualizerPace,
  hexToRgba,
  hslToHex,
} from './visualizerVibe';

const HEX_REGEX = /^#[0-9a-f]{6}$/;

function hexToHue(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  let h = 0;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  const deg = h * 60;
  return deg < 0 ? deg + 360 : deg;
}

test('hslToHex and hexToRgba produce valid CSS colors', () => {
  assert.match(hslToHex(38, 90, 58), HEX_REGEX);
  assert.match(hslToHex(-22, 80, 55), HEX_REGEX);
  assert.equal(hexToRgba('#1ed760', 0.5), 'rgba(30, 215, 96, 0.50)');
});

test('deriveVisualizerVibe produces contrasting warm vs cool palettes for euphoric vs melancholic tracks', () => {
  const euphoric = deriveVisualizerVibe({ energy: 0.88, melancholy: 0.14, bpm: 130 });
  const melancholic = deriveVisualizerVibe({ energy: 0.26, melancholy: 0.78, bpm: 76 });
  const cathartic = deriveVisualizerVibe({ energy: 0.85, melancholy: 0.78, bpm: 136 });
  const mellow = deriveVisualizerVibe({ energy: 0.25, melancholy: 0.2, bpm: 84 });

  for (const cfg of [euphoric, melancholic, cathartic, mellow]) {
    assert.match(cfg.palette.primary, HEX_REGEX);
    assert.match(cfg.palette.secondary, HEX_REGEX);
    assert.match(cfg.palette.tertiary, HEX_REGEX);
    assert.match(cfg.palette.glow, /^rgba\(\d+, \d+, \d+, 0\.\d{2}\)$/);
  }

  // Distinct primary colors for distinct vibes
  assert.notEqual(euphoric.palette.primary, melancholic.palette.primary);
  assert.notEqual(cathartic.palette.primary, mellow.palette.primary);

  // Euphoric should land in warm amber/gold-orange range (~15°..75°)
  const euphoricHue = hexToHue(euphoric.palette.primary);
  assert.ok(euphoricHue >= 15 && euphoricHue <= 75, `expected warm hue, got ${euphoricHue}`);

  // Deep melancholy should land in cool cobalt/indigo range (~195°..260°)
  const melancholicHue = hexToHue(melancholic.palette.primary);
  assert.ok(
    melancholicHue >= 195 && melancholicHue <= 260,
    `expected cool indigo/blue hue, got ${melancholicHue}`
  );

  // Warm & mellow should land in organic emerald/teal range (~120°..185°)
  const mellowHue = hexToHue(mellow.palette.primary);
  assert.ok(mellowHue >= 120 && mellowHue <= 185, `expected emerald/teal hue, got ${mellowHue}`);

  assert.equal(euphoric.vibeLabel, 'High-Energy Euphoria');
  assert.equal(melancholic.vibeLabel, 'Deep Melancholy');
  assert.equal(cathartic.vibeLabel, 'Cathartic Drive');
  assert.equal(mellow.vibeLabel, 'Warm & Mellow');
});

test('visualizer speed scales up with energy and slows down with melancholy', () => {
  const calmMelancholic = deriveVisualizerVibe({ energy: 0.2, melancholy: 0.85, bpm: 72 });
  const midBalanced = deriveVisualizerVibe({ energy: 0.5, melancholy: 0.5, bpm: 105 });
  const highEnergySameBpm = deriveVisualizerVibe({ energy: 0.9, melancholy: 0.15, bpm: 105 });
  const highEnergyFastBpm = deriveVisualizerVibe({ energy: 0.9, melancholy: 0.15, bpm: 150 });
  const highEnergyMelancholic = deriveVisualizerVibe({ energy: 0.9, melancholy: 0.85, bpm: 105 });

  assert.ok(calmMelancholic.speedMultiplier < midBalanced.speedMultiplier);
  assert.ok(midBalanced.speedMultiplier < highEnergySameBpm.speedMultiplier);
  assert.ok(highEnergyMelancholic.speedMultiplier < highEnergySameBpm.speedMultiplier);
  assert.ok(highEnergySameBpm.speedMultiplier < highEnergyFastBpm.speedMultiplier);

  assert.ok(calmMelancholic.peakDecayMultiplier < highEnergyFastBpm.peakDecayMultiplier);
  assert.equal(describeVisualizerPace(calmMelancholic.speedMultiplier), 'Slow Reverie');
  assert.equal(describeVisualizerPace(highEnergyFastBpm.speedMultiplier), 'Kinetic Surge');
});

test('deriveVisualizerVibe safely clamps invalid or missing sonic metadata', () => {
  const fallback = deriveVisualizerVibe(null);
  assert.deepEqual(fallback.profile, { energy: 0.5, melancholy: 0.5 });
  assert.equal(fallback.vibeLabel, 'Balanced Mood');
  assert.match(fallback.palette.primary, HEX_REGEX);

  const clamped = deriveVisualizerVibe({ energy: 4.5, melancholy: -2, bpm: NaN });
  assert.deepEqual(clamped.profile, { energy: 1, melancholy: 0 });
  assert.ok(clamped.speedMultiplier >= 0.45 && clamped.speedMultiplier <= 2.1);
});
