/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PLAYBACK_SETTINGS,
  EQUALIZER_CONFIGS,
  loadPlaybackSettings,
  savePlaybackSettings,
  estimateCacheSize,
  clearAppCache,
  PlaybackSettings,
} from './playbackSettings';

// Mock localStorage for node test runner
class MockLocalStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get length(): number {
    return this.store.size;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] ?? null;
  }
}

describe('Spotify-style Playback & App Settings', () => {
  beforeEach(() => {
    (globalThis as any).localStorage = new MockLocalStorage();
  });

  test('DEFAULT_PLAYBACK_SETTINGS has gym bass-boost, spotify-dark, and lockScreenPlayback defaults', () => {
    assert.equal(DEFAULT_PLAYBACK_SETTINGS.crossfadeDuration, 4);
    assert.equal(DEFAULT_PLAYBACK_SETTINGS.gaplessPlayback, true);
    assert.equal(DEFAULT_PLAYBACK_SETTINGS.automix, true);
    assert.equal(DEFAULT_PLAYBACK_SETTINGS.equalizer, 'bass-boost');
    assert.equal(DEFAULT_PLAYBACK_SETTINGS.theme, 'spotify-dark');
    assert.equal(DEFAULT_PLAYBACK_SETTINGS.audioQuality, 'high');
    assert.equal(DEFAULT_PLAYBACK_SETTINGS.lockScreenPlayback, true);
    assert.equal(DEFAULT_PLAYBACK_SETTINGS.smartAutoNext, true);
  });

  test('EQUALIZER_CONFIGS contains 7 studio presets with 5 frequency bands', () => {
    const presets = Object.keys(EQUALIZER_CONFIGS);
    assert.equal(presets.length, 7);
    assert.ok(presets.includes('bass-boost'));
    assert.ok(presets.includes('flat'));
    assert.ok(presets.includes('electronic'));

    // Check bass-boost boosts 60Hz and 230Hz
    const bassBands = EQUALIZER_CONFIGS['bass-boost'].bands;
    assert.equal(bassBands.length, 5);
    assert.equal(bassBands[0].freq, '60Hz');
    assert.ok(bassBands[0].gain > 0, '60Hz sub-bass should be boosted');
  });

  test('loadPlaybackSettings returns defaults when storage is empty', () => {
    const settings = loadPlaybackSettings();
    assert.equal(settings.crossfadeDuration, 4);
    assert.equal(settings.equalizer, 'bass-boost');
    assert.equal(settings.theme, 'spotify-dark');
    assert.equal(settings.lockScreenPlayback, true);
    assert.equal(settings.smartAutoNext, true);
  });

  test('savePlaybackSettings stores and loadPlaybackSettings retrieves modified values', () => {
    const custom: PlaybackSettings = {
      ...DEFAULT_PLAYBACK_SETTINGS,
      crossfadeDuration: 8,
      equalizer: 'electronic',
      theme: 'gym-neon',
      monoAudio: true,
      audioQuality: 'lossless',
      lockScreenPlayback: false,
      smartAutoNext: false,
    };

    savePlaybackSettings(custom);
    const loaded = loadPlaybackSettings();

    assert.equal(loaded.crossfadeDuration, 8);
    assert.equal(loaded.equalizer, 'electronic');
    assert.equal(loaded.theme, 'gym-neon');
    assert.equal(loaded.monoAudio, true);
    assert.equal(loaded.audioQuality, 'lossless');
    assert.equal(loaded.lockScreenPlayback, false);
    assert.equal(loaded.smartAutoNext, false);
  });

  test('estimateCacheSize and clearAppCache function correctly', () => {
    localStorage.setItem('apna_music_search_cache', 'sample search cache string');
    const { cachedMb, totalMb } = estimateCacheSize();
    assert.ok(cachedMb > 0);
    assert.ok(totalMb >= cachedMb);

    const cleared = clearAppCache();
    assert.equal(cleared, true);
    assert.equal(localStorage.getItem('apna_music_search_cache'), null);
  });
});
