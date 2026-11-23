/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type EqualizerPreset =
  | 'flat'
  | 'bass-boost'
  | 'treble-boost'
  | 'electronic'
  | 'hip-hop'
  | 'rock'
  | 'vocal';

export type AppTheme = 'spotify-dark' | 'amoled-black' | 'gym-neon';
export type VolumeLevel = 'quiet' | 'normal' | 'loud';
export type AudioStreamingQuality = 'low' | 'normal' | 'high' | 'lossless';
export type DownloadQuality = 'normal' | 'high' | 'ultra';

export interface EqualizerBand {
  freq: string;
  gain: number; // in dB (-6 to +6)
}

export const EQUALIZER_CONFIGS: Record<EqualizerPreset, { label: string; description: string; bands: EqualizerBand[] }> = {
  'flat': {
    label: 'Flat / Standard',
    description: 'Natural sound balance as recorded in studio',
    bands: [
      { freq: '60Hz', gain: 0 },
      { freq: '230Hz', gain: 0 },
      { freq: '910Hz', gain: 0 },
      { freq: '3.6kHz', gain: 0 },
      { freq: '14kHz', gain: 0 },
    ],
  },
  'bass-boost': {
    label: '🏋️ Bass Booster (Gym Heavy)',
    description: 'Punchy low-end sub-bass for workout motivation beats',
    bands: [
      { freq: '60Hz', gain: 6 },
      { freq: '230Hz', gain: 4.5 },
      { freq: '910Hz', gain: 1 },
      { freq: '3.6kHz', gain: -1 },
      { freq: '14kHz', gain: 1 },
    ],
  },
  'treble-boost': {
    label: '✨ Treble Booster',
    description: 'Crisp high frequencies for acoustic and classical clarity',
    bands: [
      { freq: '60Hz', gain: -2 },
      { freq: '230Hz', gain: 0 },
      { freq: '910Hz', gain: 1.5 },
      { freq: '3.6kHz', gain: 4 },
      { freq: '14kHz', gain: 5.5 },
    ],
  },
  'electronic': {
    label: '⚡ Electronic / Dance',
    description: 'Optimized for EDM drops, synths, and club beats',
    bands: [
      { freq: '60Hz', gain: 4.5 },
      { freq: '230Hz', gain: 2.5 },
      { freq: '910Hz', gain: 0 },
      { freq: '3.6kHz', gain: 3 },
      { freq: '14kHz', gain: 4 },
    ],
  },
  'hip-hop': {
    label: '🎤 Hip-Hop & Rap',
    description: 'Deep 808 bass kick with clear vocal presence',
    bands: [
      { freq: '60Hz', gain: 5 },
      { freq: '230Hz', gain: 3 },
      { freq: '910Hz', gain: -1 },
      { freq: '3.6kHz', gain: 2 },
      { freq: '14kHz', gain: 3 },
    ],
  },
  'rock': {
    label: '🎸 Rock & Heavy Metal',
    description: 'Boosted electric guitars and punchy drum fills',
    bands: [
      { freq: '60Hz', gain: 4 },
      { freq: '230Hz', gain: 2 },
      { freq: '910Hz', gain: -1.5 },
      { freq: '3.6kHz', gain: 2.5 },
      { freq: '14kHz', gain: 3.5 },
    ],
  },
  'vocal': {
    label: '🗣️ Vocal & Acoustic',
    description: 'Brings voices forward, great for podcasts and melodies',
    bands: [
      { freq: '60Hz', gain: -2 },
      { freq: '230Hz', gain: 1 },
      { freq: '910Hz', gain: 4.5 },
      { freq: '3.6kHz', gain: 3.5 },
      { freq: '14kHz', gain: 0 },
    ],
  },
};

export interface PlaybackSettings {
  // Playback & EQ
  crossfadeDuration: number; // in seconds (0 to 12s, 0 = off)
  gaplessPlayback: boolean;
  volumeNormalization: boolean;
  automix: boolean;
  equalizer: EqualizerPreset;
  volumeLevel: VolumeLevel;
  monoAudio: boolean;
  // Audio Quality
  audioQuality: AudioStreamingQuality;
  downloadQuality: DownloadQuality;
  dataSaver: boolean;
  autoAdjustQuality: boolean;
  downloadOverCellular: boolean;
  // Appearance & App
  theme: AppTheme;
  compactMode: boolean;
  canvasVideo: boolean;
  explicitFilter: boolean;
  lockScreenPlayback: boolean;
  smartAutoNext: boolean;
  // Music Languages
  preferredLanguages: string[];
}

export const DEFAULT_PLAYBACK_SETTINGS: PlaybackSettings = {
  crossfadeDuration: 4, // 4 seconds by default
  gaplessPlayback: true,
  volumeNormalization: true,
  automix: true,
  equalizer: 'bass-boost', // Gym motivation bass by default
  volumeLevel: 'normal',
  monoAudio: false,
  audioQuality: 'high',
  downloadQuality: 'high',
  dataSaver: false,
  autoAdjustQuality: true,
  downloadOverCellular: true,
  theme: 'spotify-dark',
  compactMode: false,
  canvasVideo: true,
  explicitFilter: false,
  lockScreenPlayback: true,
  smartAutoNext: true,
  preferredLanguages: ['kannada', 'hindi', 'english'],
};

const SETTINGS_KEY = 'apna_music_spotify_settings';
const LEGACY_KEY = 'indiewave_playback_settings';

export function loadPlaybackSettings(): PlaybackSettings {
  try {
    let raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      raw = localStorage.getItem(LEGACY_KEY);
    }
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
      equalizer: Object.keys(EQUALIZER_CONFIGS).includes(parsed.equalizer)
        ? parsed.equalizer
        : DEFAULT_PLAYBACK_SETTINGS.equalizer,
      volumeLevel: ['quiet', 'normal', 'loud'].includes(parsed.volumeLevel)
        ? parsed.volumeLevel
        : DEFAULT_PLAYBACK_SETTINGS.volumeLevel,
      monoAudio:
        typeof parsed.monoAudio === 'boolean'
          ? parsed.monoAudio
          : DEFAULT_PLAYBACK_SETTINGS.monoAudio,
      audioQuality: ['low', 'normal', 'high', 'lossless'].includes(parsed.audioQuality)
        ? parsed.audioQuality
        : DEFAULT_PLAYBACK_SETTINGS.audioQuality,
      downloadQuality: ['normal', 'high', 'ultra'].includes(parsed.downloadQuality)
        ? parsed.downloadQuality
        : DEFAULT_PLAYBACK_SETTINGS.downloadQuality,
      dataSaver:
        typeof parsed.dataSaver === 'boolean'
          ? parsed.dataSaver
          : DEFAULT_PLAYBACK_SETTINGS.dataSaver,
      autoAdjustQuality:
        typeof parsed.autoAdjustQuality === 'boolean'
          ? parsed.autoAdjustQuality
          : DEFAULT_PLAYBACK_SETTINGS.autoAdjustQuality,
      downloadOverCellular:
        typeof parsed.downloadOverCellular === 'boolean'
          ? parsed.downloadOverCellular
          : DEFAULT_PLAYBACK_SETTINGS.downloadOverCellular,
      theme: ['spotify-dark', 'amoled-black', 'gym-neon'].includes(parsed.theme)
        ? parsed.theme
        : DEFAULT_PLAYBACK_SETTINGS.theme,
      compactMode:
        typeof parsed.compactMode === 'boolean'
          ? parsed.compactMode
          : DEFAULT_PLAYBACK_SETTINGS.compactMode,
      canvasVideo:
        typeof parsed.canvasVideo === 'boolean'
          ? parsed.canvasVideo
          : DEFAULT_PLAYBACK_SETTINGS.canvasVideo,
      explicitFilter:
        typeof parsed.explicitFilter === 'boolean'
          ? parsed.explicitFilter
          : DEFAULT_PLAYBACK_SETTINGS.explicitFilter,
      lockScreenPlayback:
        typeof parsed.lockScreenPlayback === 'boolean'
          ? parsed.lockScreenPlayback
          : DEFAULT_PLAYBACK_SETTINGS.lockScreenPlayback,
      smartAutoNext:
        typeof parsed.smartAutoNext === 'boolean'
          ? parsed.smartAutoNext
          : DEFAULT_PLAYBACK_SETTINGS.smartAutoNext,
      preferredLanguages: Array.isArray(parsed.preferredLanguages)
        ? parsed.preferredLanguages
        : DEFAULT_PLAYBACK_SETTINGS.preferredLanguages,
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

export function estimateCacheSize(): { cachedMb: number; totalMb: number } {
  try {
    let bytes = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        bytes += (localStorage.getItem(key) || '').length * 2;
      }
    }
    const cachedMb = Math.round((bytes / (1024 * 1024) + 18.4) * 10) / 10;
    return { cachedMb, totalMb: 48.6 };
  } catch {
    return { cachedMb: 18.4, totalMb: 48.6 };
  }
}

export function clearAppCache(): boolean {
  try {
    const keysToRemove = [
      'indiewave_listening_history',
      'indiewave_skipped_tracks',
      'indiewave_ai_curation_cache',
      'apna_music_search_cache',
    ];
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    return true;
  } catch {
    return false;
  }
}
