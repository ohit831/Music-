/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialBurstTriggerState,
  detectBeatBurstTrigger,
  spawnAmbientParticles,
  spawnLightBurstParticles,
  stepBeatParticles,
} from './beatParticles';

function createSeededRng(seed = 42): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

test('detectBeatBurstTrigger fires on BPM downbeats and bass transients with cooldown', () => {
  let state = createInitialBurstTriggerState();

  // Paused playback does not emit bursts
  const paused = detectBeatBurstTrigger({
    elapsedMs: 100,
    bpm: 120,
    bassIntensity: 0.9,
    energy: 0.8,
    sensitivity: 1.2,
    isPlaying: false,
    beatPulseEnabled: true,
    state,
  });
  assert.equal(paused.shouldBurst, false);

  // Beat 0 triggers a synchronized downbeat burst
  const beat0 = detectBeatBurstTrigger({
    elapsedMs: 20,
    bpm: 120, // 500ms period
    bassIntensity: 0.2,
    energy: 0.85,
    sensitivity: 1.2,
    isPlaying: true,
    beatPulseEnabled: true,
    state: paused.nextState,
  });
  assert.equal(beat0.shouldBurst, true);
  assert.equal(beat0.reason, 'downbeat');
  assert.ok(beat0.intensity >= 0.5 && beat0.intensity <= 1);
  state = beat0.nextState;

  // Same beat with flat bass does not re-trigger
  const midBeat = detectBeatBurstTrigger({
    elapsedMs: 220,
    bpm: 120,
    bassIntensity: 0.2,
    energy: 0.85,
    sensitivity: 1.2,
    isPlaying: true,
    beatPulseEnabled: true,
    state,
  });
  assert.equal(midBeat.shouldBurst, false);
  state = midBeat.nextState;

  // Strong live bass transient spike after cooldown fires a bass-transient burst
  const bassKick = detectBeatBurstTrigger({
    elapsedMs: 260,
    bpm: 120,
    bassIntensity: 0.72,
    energy: 0.85,
    sensitivity: 1.2,
    isPlaying: true,
    beatPulseEnabled: true,
    state,
  });
  assert.equal(bassKick.shouldBurst, true);
  assert.equal(bassKick.reason, 'bass-transient');
  assert.ok(bassKick.intensity >= 0.6);
  state = bassKick.nextState;

  // Next BPM beat (520ms) triggers another synchronized downbeat burst
  const beat1 = detectBeatBurstTrigger({
    elapsedMs: 520,
    bpm: 120,
    bassIntensity: 0.3,
    energy: 0.85,
    sensitivity: 1.2,
    isPlaying: true,
    beatPulseEnabled: true,
    state,
  });
  assert.equal(beat1.shouldBurst, true);
  assert.equal(beat1.reason, 'downbeat');
});

test('spawnLightBurstParticles scales particle count & velocity with beat intensity and reduced motion', () => {
  const softBurst = spawnLightBurstParticles({
    width: 1200,
    height: 800,
    intensity: 0.28,
    energy: 0.3,
    random: createSeededRng(10),
  });
  const strongBurst = spawnLightBurstParticles({
    width: 1200,
    height: 800,
    intensity: 0.95,
    energy: 0.9,
    random: createSeededRng(10),
  });
  const reducedBurst = spawnLightBurstParticles({
    width: 1200,
    height: 800,
    intensity: 0.95,
    energy: 0.9,
    prefersReducedMotion: true,
    random: createSeededRng(10),
  });

  assert.equal(strongBurst.filter((p) => p.kind === 'flare').length, 1);
  assert.ok(strongBurst.length > softBurst.length);
  assert.ok(reducedBurst.length < strongBurst.length);

  const avgSpeed = (list: typeof strongBurst) => {
    const sparks = list.filter((p) => p.kind === 'spark');
    return sparks.reduce((sum, p) => sum + Math.hypot(p.vx, p.vy), 0) / sparks.length;
  };
  assert.ok(avgSpeed(strongBurst) > avgSpeed(softBurst));
  assert.ok(avgSpeed(reducedBurst) < avgSpeed(strongBurst));
});

test('stepBeatParticles moves, fades, expires burst particles, wraps ambient motes, and enforces cap', () => {
  const ambient = spawnAmbientParticles(800, 600, 10, createSeededRng(7));
  const burst = spawnLightBurstParticles({
    width: 800,
    height: 600,
    intensity: 0.85,
    energy: 0.8,
    originX: 400,
    originY: 300,
    random: createSeededRng(12),
  });

  const combined = [...ambient, ...burst];
  const stepped = stepBeatParticles(combined, 0.05, 800, 600, 1.2, 110);
  const firstSparkBefore = burst.find((p) => p.kind === 'spark')!;
  const firstSparkAfter = stepped.find((p) => p.kind === 'spark')!;
  assert.notEqual(firstSparkAfter.x, firstSparkBefore.x);
  assert.ok(firstSparkAfter.life > 0);

  // Advance well past maxLife -> all burst particles expire while ambient motes persist
  let aged = stepped;
  for (let i = 0; i < 30; i++) {
    aged = stepBeatParticles(aged, 0.08, 800, 600, 1.0, 110);
  }
  assert.equal(aged.filter((p) => p.kind !== 'ambient').length, 0);
  assert.equal(aged.filter((p) => p.kind === 'ambient').length, 10);

  // Enforce strict particle cap
  const flood = [
    ...ambient,
    ...spawnLightBurstParticles({ width: 800, height: 600, intensity: 1, energy: 1, random: createSeededRng(1) }),
    ...spawnLightBurstParticles({ width: 800, height: 600, intensity: 1, energy: 1, random: createSeededRng(2) }),
    ...spawnLightBurstParticles({ width: 800, height: 600, intensity: 1, energy: 1, random: createSeededRng(3) }),
  ];
  const capped = stepBeatParticles(flood, 0.016, 800, 600, 1.0, 25);
  assert.equal(capped.length, 25);
  assert.equal(capped.filter((p) => p.kind === 'ambient').length, 10);
});
