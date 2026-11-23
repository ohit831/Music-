/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveAnimatedFocusGradient } from './animatedFocus';

test('deriveAnimatedFocusGradient differentiates all four energy/melancholy quadrants', () => {
  const euphoric = deriveAnimatedFocusGradient({ energy: 0.92, melancholy: 0.12, bpm: 136 });
  const cathartic = deriveAnimatedFocusGradient({ energy: 0.88, melancholy: 0.85, bpm: 128 });
  const melancholyTrack = deriveAnimatedFocusGradient({ energy: 0.18, melancholy: 0.9, bpm: 74 });
  const mellow = deriveAnimatedFocusGradient({ energy: 0.22, melancholy: 0.15, bpm: 84 });

  const accents = new Set([
    euphoric.accentPrimary,
    cathartic.accentPrimary,
    melancholyTrack.accentPrimary,
    mellow.accentPrimary,
  ]);
  assert.equal(accents.size, 4, 'Each energy/melancholy quadrant should produce a distinct accent color');

  assert.equal(euphoric.vibeLabel, 'High-Energy Euphoria');
  assert.equal(cathartic.vibeLabel, 'Cathartic Drive');
  assert.equal(melancholyTrack.vibeLabel, 'Deep Melancholy');
  assert.equal(mellow.vibeLabel, 'Warm & Mellow');

  for (const cfg of [euphoric, cathartic, melancholyTrack, mellow]) {
    assert.match(cfg.surfaceGradientCss, /^linear-gradient\(\d+deg,/);
    assert.match(cfg.orbPrimaryCss, /^radial-gradient\(/);
    assert.match(cfg.orbSecondaryCss, /^radial-gradient\(/);
    assert.ok(cfg.animationDurationSec >= 14 && cfg.animationDurationSec <= 36);
    assert.equal(cfg.cssVariables['--focus-duration'], `${cfg.animationDurationSec}s`);
  }
});

test('deriveAnimatedFocusGradient drifts faster with high energy and slower with high melancholy', () => {
  const highEnergy = deriveAnimatedFocusGradient({ energy: 0.95, melancholy: 0.1 });
  const balanced = deriveAnimatedFocusGradient({ energy: 0.5, melancholy: 0.5 });
  const deepMelancholy = deriveAnimatedFocusGradient({ energy: 0.12, melancholy: 0.94 });

  assert.ok(
    highEnergy.animationDurationSec < balanced.animationDurationSec,
    `Expected highEnergy (${highEnergy.animationDurationSec}s) < balanced (${balanced.animationDurationSec}s)`
  );
  assert.ok(
    balanced.animationDurationSec < deepMelancholy.animationDurationSec,
    `Expected balanced (${balanced.animationDurationSec}s) < deepMelancholy (${deepMelancholy.animationDurationSec}s)`
  );
});

test('deriveAnimatedFocusGradient handles null/missing track metadata and AMOLED theme safely', () => {
  const fallback = deriveAnimatedFocusGradient(null);
  assert.equal(fallback.energy, 0.5);
  assert.equal(fallback.melancholy, 0.5);
  assert.ok(fallback.surfaceGradientCss.includes('linear-gradient'));

  const standard = deriveAnimatedFocusGradient({ energy: 0.7, melancholy: 0.4 }, 'spotify-dark');
  const amoled = deriveAnimatedFocusGradient({ energy: 0.7, melancholy: 0.4 }, 'amoled-black');

  assert.equal(amoled.baseColor, '#020204');
  assert.ok(amoled.ambientOpacity < standard.ambientOpacity);
});
