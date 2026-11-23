/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applySpectrumBarBeatPulse,
  computeBeatCounterState,
  computeBeatEnvelope,
  computeBeatPulseFrame,
  estimateBeatIntensityFromBins,
  resolveTrackBpm,
} from './beatPulse';

test('resolveTrackBpm honors explicit track BPM and estimates tempo from sonic profile when missing', () => {
  const explicit = resolveTrackBpm({ bpm: 128, energy: 0.4, melancholy: 0.6, genre: 'House' });
  assert.equal(explicit.bpm, 128);
  assert.equal(explicit.isEstimated, false);
  assert.equal(explicit.beatIntervalMs, Math.round(60000 / 128));

  const calmLofi = resolveTrackBpm({ energy: 0.28, melancholy: 0.72, genre: 'Bedroom Lo-Fi' });
  const upbeatFolkPop = resolveTrackBpm({
    energy: 0.85,
    melancholy: 0.15,
    genre: 'Kannada Folk Pop',
  });

  assert.equal(calmLofi.isEstimated, true);
  assert.equal(upbeatFolkPop.isEstimated, true);
  assert.ok(
    calmLofi.bpm < upbeatFolkPop.bpm,
    `expected calm lo-fi BPM (${calmLofi.bpm}) < upbeat folk pop BPM (${upbeatFolkPop.bpm})`
  );
  assert.ok(calmLofi.beatIntervalMs > upbeatFolkPop.beatIntervalMs);

  const fallback = resolveTrackBpm(null);
  assert.equal(fallback.isEstimated, true);
  assert.ok(fallback.bpm >= 60 && fallback.bpm <= 168);
});

test('computeBeatEnvelope peaks shortly after downbeat and decays smoothly before next beat', () => {
  const start = computeBeatEnvelope(0);
  const peak = computeBeatEnvelope(0.12);
  const mid = computeBeatEnvelope(0.5);
  const tail = computeBeatEnvelope(0.95);

  assert.equal(start, 0);
  assert.ok(peak > 0.99, `expected peak near 1, got ${peak}`);
  assert.ok(peak > mid && mid > tail, `expected monotonic decay: ${peak} > ${mid} > ${tail}`);
  assert.ok(tail < 0.05);
});

test('estimateBeatIntensityFromBins extracts low-end bass intensity safely', () => {
  assert.equal(estimateBeatIntensityFromBins(null), 0);
  assert.equal(estimateBeatIntensityFromBins([]), 0);

  const silent = new Uint8Array(64);
  assert.equal(estimateBeatIntensityFromBins(silent), 0);

  const heavyKick = new Uint8Array(64);
  for (let i = 0; i < 12; i++) heavyKick[i] = 255;
  assert.equal(estimateBeatIntensityFromBins(heavyKick), 1);

  const midBass = new Uint8Array(64);
  for (let i = 0; i < 12; i++) midBass[i] = 128;
  const val = estimateBeatIntensityFromBins(midBass);
  assert.ok(val > 0.48 && val < 0.52, `expected ~0.5, got ${val}`);
});

test('computeBeatPulseFrame scales central element with BPM phase, energy, and bass intensity', () => {
  // Disabled state returns strictly neutral 1.0 scale
  const disabled = computeBeatPulseFrame({
    elapsedMs: 60,
    bpm: 120,
    energy: 0.9,
    melancholy: 0.1,
    bassIntensity: 0.9,
    sensitivity: 1.5,
    isPlaying: true,
    enabled: false,
  });
  assert.equal(disabled.scale, 1);
  assert.equal(disabled.ringOpacity, 0);

  // At 120 BPM (500ms period), 60ms is phase=0.12 (peak attack), 450ms is phase=0.90 (decay tail)
  const peakFrame = computeBeatPulseFrame({
    elapsedMs: 60,
    bpm: 120,
    energy: 0.85,
    melancholy: 0.15,
    bassIntensity: 0.6,
    sensitivity: 1.2,
    isPlaying: true,
    enabled: true,
  });
  const tailFrame = computeBeatPulseFrame({
    elapsedMs: 450,
    bpm: 120,
    energy: 0.85,
    melancholy: 0.15,
    bassIntensity: 0.1,
    sensitivity: 1.2,
    isPlaying: true,
    enabled: true,
  });
  const calmPeakFrame = computeBeatPulseFrame({
    elapsedMs: 60,
    bpm: 120,
    energy: 0.25,
    melancholy: 0.8,
    bassIntensity: 0.1,
    sensitivity: 1.2,
    isPlaying: true,
    enabled: true,
  });

  assert.ok(peakFrame.scale > 1.07 && peakFrame.scale <= 1.15);
  assert.ok(peakFrame.scale > tailFrame.scale);
  assert.ok(peakFrame.scale > calmPeakFrame.scale);
  assert.equal(peakFrame.isDownbeat, true);
  assert.equal(tailFrame.isDownbeat, false);
  assert.ok(peakFrame.ringOpacity > tailFrame.ringOpacity);

  // Reduced motion dampens scale and disables expanding beat ring
  const reducedFrame = computeBeatPulseFrame({
    elapsedMs: 60,
    bpm: 120,
    energy: 0.85,
    melancholy: 0.15,
    bassIntensity: 0.8,
    sensitivity: 1.5,
    isPlaying: true,
    enabled: true,
    prefersReducedMotion: true,
  });
  assert.ok(reducedFrame.scale < peakFrame.scale);
  assert.equal(reducedFrame.ringOpacity, 0);

  // Paused state stays in subtle resting breath range
  const pausedFrame = computeBeatPulseFrame({
    elapsedMs: 500,
    bpm: 120,
    energy: 0.85,
    melancholy: 0.15,
    bassIntensity: 0,
    sensitivity: 1.2,
    isPlaying: false,
    enabled: true,
  });
  assert.ok(pausedFrame.scale >= 1 && pausedFrame.scale <= 1.028);
  assert.equal(pausedFrame.ringOpacity, 0);
});

test('computeBeatCounterState cycles 1..4 at exact BPM intervals and resets when paused', () => {
  const paused = computeBeatCounterState(1250, 120, false);
  assert.equal(paused.beatNumber, 1);
  assert.equal(paused.isDownbeat, false);

  // At 120 BPM, each beat is 500ms
  const b1 = computeBeatCounterState(50, 120, true);
  const b2 = computeBeatCounterState(550, 120, true);
  const b3 = computeBeatCounterState(1050, 120, true);
  const b4 = computeBeatCounterState(1550, 120, true);
  const b1Wrap = computeBeatCounterState(2050, 120, true);

  assert.equal(b1.beatNumber, 1);
  assert.equal(b1.isDownbeat, true);
  assert.equal(b2.beatNumber, 2);
  assert.equal(b3.beatNumber, 3);
  assert.equal(b4.beatNumber, 4);
  assert.equal(b1Wrap.beatNumber, 1);
});

test('applySpectrumBarBeatPulse boosts spectrum bars rhythmically by BPM, band, and energy', () => {
  // Disabled or paused returns base value unchanged with zero pulseBoost
  const disabled = applySpectrumBarBeatPulse({
    baseValue: 42,
    barIndex: 2,
    totalBars: 40,
    elapsedMs: 60,
    bpm: 120,
    energy: 0.9,
    melancholy: 0.1,
    sensitivity: 1.2,
    isPlaying: true,
    enabled: false,
  });
  assert.equal(disabled.value, 42);
  assert.equal(disabled.pulseBoost, 0);

  // At 120 BPM (500ms/beat), 60ms is primary downbeat peak (phase 0.12), 450ms is decay trough
  const lowDownbeat = applySpectrumBarBeatPulse({
    baseValue: 20,
    barIndex: 2,
    totalBars: 40,
    elapsedMs: 60,
    bpm: 120,
    energy: 0.85,
    melancholy: 0.15,
    sensitivity: 1.2,
    isPlaying: true,
    enabled: true,
  });
  const lowTrough = applySpectrumBarBeatPulse({
    baseValue: 20,
    barIndex: 2,
    totalBars: 40,
    elapsedMs: 450,
    bpm: 120,
    energy: 0.85,
    melancholy: 0.15,
    sensitivity: 1.2,
    isPlaying: true,
    enabled: true,
  });
  assert.ok(
    lowDownbeat.value > lowTrough.value + 30,
    `expected strong downbeat bar pulse (${lowDownbeat.value}) > trough (${lowTrough.value})`
  );

  // High-air band peaks strongly on syncopated half-beat (totalBeats 0.62 -> 310ms at 120 BPM)
  const highHalfBeat = applySpectrumBarBeatPulse({
    baseValue: 15,
    barIndex: 34,
    totalBars: 40,
    elapsedMs: 310,
    bpm: 120,
    energy: 0.85,
    melancholy: 0.15,
    sensitivity: 1.2,
    isPlaying: true,
    enabled: true,
  });
  assert.ok(highHalfBeat.pulseBoost > 25, `expected high-band secondary pulse, got ${highHalfBeat.pulseBoost}`);

  // Reduced motion dampens pulseBoost cleanly and output never exceeds 255
  const reduced = applySpectrumBarBeatPulse({
    baseValue: 240,
    barIndex: 2,
    totalBars: 40,
    elapsedMs: 60,
    bpm: 120,
    energy: 0.95,
    melancholy: 0.05,
    sensitivity: 2.0,
    isPlaying: true,
    enabled: true,
    prefersReducedMotion: true,
  });
  assert.ok(reduced.pulseBoost < lowDownbeat.pulseBoost);
  assert.ok(reduced.value <= 255);
});

