/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IndieTrack } from './musicDiscovery';

export interface SonicProfile {
  energy: number;
  melancholy: number;
}

export interface VibeMatchItem {
  track: IndieTrack;
  matchScore: number; // 0 to 100
  sonicDistance: number; // Euclidean distance in (energy, melancholy) space
  energyDelta: number;
  melancholyDelta: number;
  reason: string;
}

export interface VibeMatchQueueResult {
  anchorProfile: SonicProfile;
  vibeLabel: string;
  items: VibeMatchItem[];
  tracks: IndieTrack[];
}

export interface BuildVibeMatchOptions {
  limit?: number;
  excludeIds?: Set<string>;
  dismissedIds?: Set<string>;
}

const DEFAULT_SONIC_VALUE = 0.5;
const MAX_SONIC_DISTANCE = Math.SQRT2;

function clampUnit(value: unknown, fallback = DEFAULT_SONIC_VALUE): number {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, Math.min(1, value));
}

export function computeSonicProfile(
  track: Pick<IndieTrack, 'energy' | 'melancholy'>
): SonicProfile {
  return {
    energy: clampUnit(track.energy),
    melancholy: clampUnit(track.melancholy),
  };
}

export function describeSonicVibe(profile: SonicProfile): string {
  const { energy, melancholy } = profile;
  if (energy >= 0.72 && melancholy <= 0.32) return 'High-Energy Euphoria';
  if (energy >= 0.65 && melancholy >= 0.55) return 'Cathartic Drive';
  if (energy < 0.58 && melancholy >= 0.6) return 'Deep Melancholy';
  if (energy < 0.55 && melancholy < 0.4) return 'Warm & Mellow';
  if (energy >= 0.7) return 'Upbeat Pulse';
  return 'Balanced Mood';
}

export function scoreSonicSimilarity(
  anchor: Pick<IndieTrack, 'energy' | 'melancholy' | 'artistId' | 'acousticness'>,
  candidate: IndieTrack
): VibeMatchItem {
  const target = computeSonicProfile(anchor);
  const cand = computeSonicProfile(candidate);

  const energyDelta = Math.abs(target.energy - cand.energy);
  const melancholyDelta = Math.abs(target.melancholy - cand.melancholy);
  const sonicDistance = Math.hypot(energyDelta, melancholyDelta);
  const normalizedDistance = Math.min(1, sonicDistance / MAX_SONIC_DISTANCE);
  const matchScore = Math.max(0, Math.min(100, Math.round((1 - normalizedDistance) * 100)));

  return {
    track: candidate,
    matchScore,
    sonicDistance,
    energyDelta,
    melancholyDelta,
    reason: formatSonicReason(cand, matchScore),
  };
}

export function formatSonicReason(profile: SonicProfile, matchScore: number): string {
  const ePct = Math.round(profile.energy * 100);
  const mPct = Math.round(profile.melancholy * 100);
  return `${matchScore}% vibe · E ${ePct}% · M ${mPct}%`;
}

export function buildVibeMatchQueue(
  anchorTrack: IndieTrack | null,
  catalog: IndieTrack[],
  options: BuildVibeMatchOptions = {}
): VibeMatchQueueResult {
  const limit = options.limit ?? 12;

  if (!anchorTrack) {
    return {
      anchorProfile: { energy: DEFAULT_SONIC_VALUE, melancholy: DEFAULT_SONIC_VALUE },
      vibeLabel: 'Balanced Mood',
      items: [],
      tracks: [],
    };
  }

  const anchorProfile = computeSonicProfile(anchorTrack);
  const vibeLabel = describeSonicVibe(anchorProfile);
  const excludeIds = options.excludeIds ?? new Set<string>();
  const dismissedIds = options.dismissedIds ?? new Set<string>();

  const seenIds = new Set<string>([anchorTrack.id]);
  const candidates: IndieTrack[] = [];

  for (const track of catalog) {
    if (!track || !track.id) continue;
    if (seenIds.has(track.id)) continue;
    if (excludeIds.has(track.id) || dismissedIds.has(track.id)) continue;
    seenIds.add(track.id);
    candidates.push(track);
  }

  const scored = candidates.map((candidate) => scoreSonicSimilarity(anchorTrack, candidate));

  // Primary sort: pure (energy, melancholy) Euclidean distance ascending.
  // Tie-breakers favor sonic acoustic proximity and artist variety rather than artist-chaining.
  scored.sort((a, b) => {
    const distDiff = a.sonicDistance - b.sonicDistance;
    if (Math.abs(distDiff) > 0.002) {
      return distDiff;
    }

    const aSameArtist = a.track.artistId === anchorTrack.artistId ? 1 : 0;
    const bSameArtist = b.track.artistId === anchorTrack.artistId ? 1 : 0;
    if (aSameArtist !== bSameArtist) {
      return aSameArtist - bSameArtist;
    }

    const aAcousticDiff = Math.abs(
      clampUnit(anchorTrack.acousticness) - clampUnit(a.track.acousticness)
    );
    const bAcousticDiff = Math.abs(
      clampUnit(anchorTrack.acousticness) - clampUnit(b.track.acousticness)
    );
    if (Math.abs(aAcousticDiff - bAcousticDiff) > 0.01) {
      return aAcousticDiff - bAcousticDiff;
    }

    return a.track.id.localeCompare(b.track.id);
  });

  const items = scored.slice(0, Math.max(0, limit));
  return {
    anchorProfile,
    vibeLabel,
    items,
    tracks: items.map((item) => item.track),
  };
}
