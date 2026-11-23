import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateCrossfadeTransitionState } from './PlayerBar';

describe('calculateCrossfadeTransitionState', () => {
  it('returns isCrossfading = false when crossfade is disabled (0s)', () => {
    const state = calculateCrossfadeTransitionState(true, 178, 180, 0);
    assert.strictEqual(state.isCrossfading, false);
    assert.strictEqual(state.fadeType, null);
    assert.strictEqual(state.fadeProgress, 0);
  });

  it('returns isCrossfading = false when playback is paused', () => {
    const state = calculateCrossfadeTransitionState(false, 178, 180, 4);
    assert.strictEqual(state.isCrossfading, false);
  });

  it('detects active Fade-Out zone during the last crossfade seconds of a track', () => {
    // 4s crossfade, 180s duration, at 178s -> 2s remaining (halfway through fade out)
    const state = calculateCrossfadeTransitionState(true, 178, 180, 4);
    assert.strictEqual(state.isCrossfading, true);
    assert.strictEqual(state.isFadeOutZone, true);
    assert.strictEqual(state.fadeType, 'out');
    assert.strictEqual(state.remainingTime, 2);
    // fadeProgress should be (4 - 2) / 4 = 0.5 (50%)
    assert.strictEqual(Math.round(state.fadeProgress * 100), 50);
  });

  it('detects start of Fade-Out zone accurately', () => {
    // At 176s of 180s track with 4s crossfade -> exactly 4s remaining
    const state = calculateCrossfadeTransitionState(true, 176, 180, 4);
    assert.strictEqual(state.isCrossfading, true);
    assert.strictEqual(state.isFadeOutZone, true);
    assert.strictEqual(state.fadeType, 'out');
    assert.strictEqual(state.fadeProgress, 0);
  });

  it('detects near end of Fade-Out zone with high progress', () => {
    // At 179.6s of 180s track with 4s crossfade -> 0.4s remaining
    const state = calculateCrossfadeTransitionState(true, 179.6, 180, 4);
    assert.strictEqual(state.isCrossfading, true);
    assert.strictEqual(state.isFadeOutZone, true);
    assert.strictEqual(state.fadeType, 'out');
    assert.strictEqual(Math.round(state.fadeProgress * 100), 90);
  });

  it('detects active Fade-In zone at the beginning of an incoming track', () => {
    // 4s crossfade (fadeInWindow = 3s max), at 1.5s -> 50% through fade in
    const state = calculateCrossfadeTransitionState(true, 1.5, 180, 4);
    assert.strictEqual(state.isCrossfading, true);
    assert.strictEqual(state.isFadeInZone, true);
    assert.strictEqual(state.fadeType, 'in');
    assert.strictEqual(Math.round(state.fadeProgress * 100), 50);
  });

  it('returns isCrossfading = false during the middle of the track', () => {
    // At 60s of 180s track with 4s crossfade
    const state = calculateCrossfadeTransitionState(true, 60, 180, 4);
    assert.strictEqual(state.isCrossfading, false);
    assert.strictEqual(state.isFadeOutZone, false);
    assert.strictEqual(state.isFadeInZone, false);
    assert.strictEqual(state.fadeType, null);
    assert.strictEqual(state.fadeProgress, 0);
  });
});
