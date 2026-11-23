/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IndieTrack } from './musicDiscovery';

export interface QuickVibePreset {
  id: string;
  name: string;
  hindiName: string;
  emoji: string;
  color: string;
  description: string;
  tags: string[];
}

export const QUICK_VIBE_PRESETS: QuickVibePreset[] = [
  {
    id: 'gym-beast',
    name: 'Gym Beast',
    hindiName: 'जिम बीस्ट',
    emoji: '🏋️',
    color: 'from-emerald-500 to-green-600',
    description: 'High BPM, heavy bass & workout power anthems',
    tags: ['gym', 'mass', 'energy', 'bass', 'workout', 'kantara', 'kgf'],
  },
  {
    id: 'kannada-mass',
    name: 'Kannada Hits',
    hindiName: 'ಕನ್ನಡ ಹಿಟ್ಸ್',
    emoji: '🐘',
    color: 'from-amber-500 to-yellow-600',
    description: 'Sandalwood chartbusters & mass cinema anthems',
    tags: ['kannada', 'sandalwood', 'singara', 'dheera', 'sulthan'],
  },
  {
    id: 'bollywood-top',
    name: 'Bollywood & Hindi',
    hindiName: 'बॉलीवुड टॉप',
    emoji: '🪕',
    color: 'from-rose-500 to-pink-600',
    description: 'Bollywood romantic, party & trending hits',
    tags: ['hindi', 'bollywood', 'arijit', 'kesariya', 'party'],
  },
  {
    id: 'retro-90s',
    name: '90s Golden Hits',
    hindiName: '90s सदाबहार',
    emoji: '📻',
    color: 'from-orange-500 to-amber-600',
    description: 'Nostalgic 90s Kannada & Bollywood classics',
    tags: ['90s', 'retro', 'nostalgia', 'spb', 'kumar sanu', 'alka'],
  },
  {
    id: 'viral-top',
    name: 'Top 50 Hits',
    hindiName: 'टॉप 50',
    emoji: '🔥',
    color: 'from-purple-500 to-indigo-600',
    description: 'Spotify global viral & trending tracks',
    tags: ['spotify', 'viral', 'top', 'chart', 'billie', 'sabrina'],
  },
];

/**
 * Filter tracks by fast access search query with multi-field fuzzy matching
 */
export function fastSearchTracks(tracks: IndieTrack[], query: string): IndieTrack[] {
  if (!query || !query.trim()) return tracks;
  const clean = query.trim().toLowerCase();

  return tracks.filter((track) => {
    const titleMatch = track.title.toLowerCase().includes(clean);
    const artistMatch = track.artist.toLowerCase().includes(clean);
    const genreMatch = track.genre.toLowerCase().includes(clean);
    const langMatch = track.language ? track.language.toLowerCase().includes(clean) : false;
    const tagMatch = track.tags ? track.tags.some((t) => t.toLowerCase().includes(clean)) : false;

    return titleMatch || artistMatch || genreMatch || langMatch || tagMatch;
  });
}

/**
 * Get tracks matching a quick vibe preset
 */
export function getTracksByVibe(tracks: IndieTrack[], vibeId: string): IndieTrack[] {
  if (vibeId === 'all') return tracks;

  const preset = QUICK_VIBE_PRESETS.find((p) => p.id === vibeId);
  if (!preset) return tracks;

  return tracks.filter((track) => {
    const text = `${track.title} ${track.artist} ${track.genre} ${track.language || ''} ${(track.tags || []).join(' ')}`.toLowerCase();
    return preset.tags.some((tag) => text.includes(tag.toLowerCase()));
  });
}

/**
 * Returns top 6 instant access tracks for quick play
 */
export function getInstantAccessTracks(tracks: IndieTrack[]): IndieTrack[] {
  // Prioritize top popular & culturally key songs (Singara Siriye, Kesariya, etc.)
  return [...tracks]
    .sort((a, b) => {
      const aScore = (a.isSpotifyHit ? 2 : 0) + (a.fullSongAvailable ? 1 : 0);
      const bScore = (b.isSpotifyHit ? 2 : 0) + (b.fullSongAvailable ? 1 : 0);
      return bScore - aScore;
    })
    .slice(0, 6);
}
