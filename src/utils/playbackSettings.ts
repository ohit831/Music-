/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PlaybackSettings {
  crossfadeDuration: number; // in seconds (0 to 12s, 0 = off)
  gaplessPlayback: boolean;
  volumeNormalization: boolean;
  automix: boolean;
  audioQuality: 'normal' | 'high' | 'lossless';
}

export const DEFAULT_PLAYBACK_SETTINGS: PlaybackSettings = {
  crossfadeDuration: 4, // 4 seconds by default
  gaplessPlayback: true,
  volumeNormalization: true,
  automix: true,
  audioQuality: 'high',
};

const SETTINGS_KEY = 'indiewave_playback_settings';

export function loadPlaybackSettings(): PlaybackSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_PLAYBACK_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      crossfadeDuration:
        typeof parsed.crossfadeDuration === 'number'
          ? Math.max(0, Math.min(12, Math.round(parsed.crossfadeDuration)))
          : DEFAULT_PLAYBACK_SETTINGS.crossfadeDuration,
      gaplessPlayback:
        typeof parsed.gaplessPlayback === 'boolean'
          ? parsed.gaplessPlayback
          : DEFAULT_PLAYBACK_SETTINGS.gaplessPlayback,
      volumeNormalization:
        typeof parsed.volumeNormalization === 'boolean'
          ? parsed.volumeNormalization
          : DEFAULT_PLAYBACK_SETTINGS.volumeNormalization,
      automix:
        typeof parsed.automix === 'boolean'
          ? parsed.automix
          : DEFAULT_PLAYBACK_SETTINGS.automix,
      audioQuality: ['normal', 'high', 'lossless'].includes(parsed.audioQuality)
        ? parsed.audioQuality
        : DEFAULT_PLAYBACK_SETTINGS.audioQuality,
    };
  } catch {
    return DEFAULT_PLAYBACK_SETTINGS;
  }
}

export function savePlaybackSettings(settings: PlaybackSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn('Failed to save playback settings to localStorage:', err);
  }
}
