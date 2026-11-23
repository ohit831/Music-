/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IndieTrack } from './musicDiscovery';
import type { PlayHistoryItem, SkippedTrackItem } from '../services/listeningHistoryService';

export interface RecommendedTrackItem {
  track: IndieTrack;
  score: number;
  reason: string;
}

export interface RecommendationContext {
  currentTrack: IndieTrack | null;
  catalog: IndieTrack[];
  likedTrackIds: Set<string>;
  recentHistory: PlayHistoryItem[];
  skippedTracks: SkippedTrackItem[];
  sessionPlayedIds?: Set<string>;
  preferredLanguages?: string[];
  excludeTrackIds?: Set<string>;
  limit?: number;
}

const STOP_ARTIST_TOKENS = new Set([
  'and',
  'the',
  'feat',
  'featuring',
  'ft',
  'music',
  'official',
  'records',
  'studio',
  'original',
  'various',
  'artists',
]);

export function inferTrackLanguage(track: {
  id?: string;
  language?: string;
  genre?: string;
  tags?: string[];
  title?: string;
  artist?: string;
}): string {
  const explicit = (track.language || '').toLowerCase().trim();
  if (explicit) return explicit;

  const id = (track.id || '').toLowerCase();
  const genre = (track.genre || '').toLowerCase();
  const tags = (track.tags || []).join(' ').toLowerCase();
  const combined = `${genre} ${tags}`;

  if (id.startsWith('kn-') || combined.includes('kannada') || combined.includes('sandalwood')) {
    return 'kannada';
  }
  if (
    id.startsWith('hn-') ||
    combined.includes('hindi') ||
    combined.includes('bollywood') ||
    combined.includes('sufi')
  ) {
    return 'hindi';
  }
  return 'english';
}

function extractArtistNames(artistStr: string): string[] {
  return (artistStr || '')
    .split(/,|&|\bfeat\.?\b|\bfeaturing\b|\bft\.?\b|\bx\b/i)
    .map((part) => part.trim())
    .filter((part) => part.length >= 3 && !STOP_ARTIST_TOKENS.has(part.toLowerCase()));
}

function formatLanguageLabel(lang: string): string {
  if (lang === 'kannada') return 'Kannada';
  if (lang === 'hindi') return 'Hindi';
  if (lang === 'english') return 'Global';
  return lang.charAt(0).toUpperCase() + lang.slice(1);
}

/**
 * Score and rank upcoming songs based on what the user is currently playing,
 * their recent listening completions, liked songs, preferred languages, and skips.
 */
export function getPersonalizedNextTracks(ctx: RecommendationContext): RecommendedTrackItem[] {
  const {
    currentTrack,
    catalog,
    likedTrackIds,
    recentHistory,
    skippedTracks,
    sessionPlayedIds = new Set<string>(),
    preferredLanguages = ['kannada', 'hindi', 'english'],
    excludeTrackIds = new Set<string>(),
    limit = 10,
  } = ctx;

  if (!catalog || catalog.length === 0) return [];

  // Build weighted user taste accumulators from likes + listening history
  const artistAffinity = new Map<string, number>();
  const genreAffinity = new Map<string, number>();
  const langAffinity = new Map<string, number>();

  let energySum = 0;
  let melancholySum = 0;
  let obscuritySum = 0;
  let tasteWeightTotal = 0;

  const catalogById = new Map<string, IndieTrack>();
  for (const t of catalog) {
    catalogById.set(t.id, t);
  }

  // Weight liked tracks strongly
  likedTrackIds.forEach((likedId) => {
    const t = catalogById.get(likedId);
    if (!t) return;
    const w = 3.0;
    extractArtistNames(t.artist).forEach((name) => {
      const key = name.toLowerCase();
      artistAffinity.set(key, (artistAffinity.get(key) || 0) + w);
    });
    const gKey = (t.genre || '').toLowerCase();
    if (gKey) genreAffinity.set(gKey, (genreAffinity.get(gKey) || 0) + w);
    const lKey = inferTrackLanguage(t);
    langAffinity.set(lKey, (langAffinity.get(lKey) || 0) + w);

    energySum += (t.energy ?? 0.5) * w;
    melancholySum += (t.melancholy ?? 0.5) * w;
    obscuritySum += (t.obscurity ?? 0.3) * w;
    tasteWeightTotal += w;
  });

  // Weight recent history (most recent plays count more, completed listens count 2x)
  recentHistory.slice(0, 25).forEach((item, idx) => {
    const recencyFactor = Math.max(0.4, 1.3 - idx * 0.05);
    const w = (item.completed ? 2.0 : 1.0) * recencyFactor;
    extractArtistNames(item.artist).forEach((name) => {
      const key = name.toLowerCase();
      artistAffinity.set(key, (artistAffinity.get(key) || 0) + w);
    });
    const gKey = (item.genre || '').toLowerCase();
    if (gKey) genreAffinity.set(gKey, (genreAffinity.get(gKey) || 0) + w);

    const catalogTrack = catalogById.get(item.trackId);
    const lKey = item.language
      ? item.language.toLowerCase()
      : catalogTrack
      ? inferTrackLanguage(catalogTrack)
      : inferTrackLanguage({ id: item.trackId, genre: item.genre });
    langAffinity.set(lKey, (langAffinity.get(lKey) || 0) + w);

    energySum += (item.energy ?? 0.5) * w;
    melancholySum += (item.melancholy ?? 0.5) * w;
    obscuritySum += (item.obscurity ?? 0.3) * w;
    tasteWeightTotal += w;
  });

  // Build skip penalties
  const skippedTrackIds = new Set<string>();
  const skippedArtistPenalties = new Map<string, number>();
  const skippedGenrePenalties = new Map<string, number>();

  skippedTracks.slice(0, 30).forEach((sk) => {
    skippedTrackIds.add(sk.trackId);
    const penaltyWeight = sk.reason === 'disliked' ? 2.0 : 1.0;
    extractArtistNames(sk.artist).forEach((name) => {
      const key = name.toLowerCase();
      skippedArtistPenalties.set(key, (skippedArtistPenalties.get(key) || 0) + penaltyWeight);
    });
    const gKey = (sk.genre || '').toLowerCase();
    if (gKey) skippedGenrePenalties.set(gKey, (skippedGenrePenalties.get(gKey) || 0) + penaltyWeight);
  });

  const avgEnergy = tasteWeightTotal > 0 ? energySum / tasteWeightTotal : currentTrack?.energy ?? 0.65;
  const avgMelancholy =
    tasteWeightTotal > 0 ? melancholySum / tasteWeightTotal : currentTrack?.melancholy ?? 0.4;
  const avgObscurity =
    tasteWeightTotal > 0 ? obscuritySum / tasteWeightTotal : currentTrack?.obscurity ?? 0.2;

  const currentLang = currentTrack ? inferTrackLanguage(currentTrack) : null;
  const currentArtists = currentTrack ? extractArtistNames(currentTrack.artist) : [];
  const currentArtistsLower = new Set(currentArtists.map((a) => a.toLowerCase()));
  const currentGenreLower = (currentTrack?.genre || '').toLowerCase();
  const currentTagsLower = new Set((currentTrack?.tags || []).map((t) => t.toLowerCase()));
  const isCurrent90s = Boolean(
    currentTrack &&
      (currentTrack.id.includes('90s') ||
        (currentTrack.releaseYear >= 1985 && currentTrack.releaseYear <= 2001))
  );

  const veryRecentTrackIds = new Set(recentHistory.slice(0, 3).map((h) => h.trackId));
  const normalizedPreferredLangs = new Set(preferredLanguages.map((l) => l.toLowerCase()));

  const scored: RecommendedTrackItem[] = [];

  for (const candidate of catalog) {
    if (currentTrack && candidate.id === currentTrack.id) continue;
    if (excludeTrackIds.has(candidate.id)) continue;

    let score = 15;
    let bestReason = 'Recommended for your vibe';
    let bestSignalStrength = -1;

    const assignReason = (strength: number, reasonText: string) => {
      if (strength > bestSignalStrength) {
        bestSignalStrength = strength;
        bestReason = reasonText;
      }
    };

    const candLang = inferTrackLanguage(candidate);
    const candArtists = extractArtistNames(candidate.artist);
    const candArtistsLower = candArtists.map((a) => a.toLowerCase());
    const candGenreLower = (candidate.genre || '').toLowerCase();

    // 1. Immediate seed similarity to currentTrack (anchors Up Next to what was just played)
    if (currentTrack) {
      // Language continuity
      if (candLang === currentLang) {
        score += 34;
        assignReason(18, `Matches your ${formatLanguageLabel(candLang)} vibe`);
      } else if ((langAffinity.get(candLang) || 0) < 2) {
        score -= 10;
      }

      // Shared artist / composer
      const matchedArtist = candArtists.find((a) => currentArtistsLower.has(a.toLowerCase()));
      if (matchedArtist) {
        score += 28;
        assignReason(35, `More from ${matchedArtist}`);
      }

      // Genre overlap
      if (candGenreLower && currentGenreLower) {
        if (candGenreLower === currentGenreLower) {
          score += 22;
          assignReason(24, `Similar ${candidate.genre} sound`);
        } else {
          const curWords = currentGenreLower.split(/\s+/).filter((w) => w.length >= 4);
          if (curWords.some((w) => candGenreLower.includes(w))) {
            score += 12;
            assignReason(16, `Similar to ${currentTrack.title}`);
          }
        }
      }

      // Tag overlap
      let tagHits = 0;
      (candidate.tags || []).forEach((tag) => {
        if (currentTagsLower.has(tag.toLowerCase())) tagHits += 1;
      });
      if (tagHits > 0) {
        score += Math.min(12, tagHits * 4);
      }

      // 90s / Era cohesion
      const isCand90s =
        candidate.id.includes('90s') ||
        (candidate.releaseYear >= 1985 && candidate.releaseYear <= 2001);
      if (isCurrent90s && isCand90s) {
        score += 14;
        assignReason(26, `Classic 90s mood like ${currentTrack.title}`);
      } else if (Math.abs((candidate.releaseYear || 2024) - (currentTrack.releaseYear || 2024)) <= 4) {
        score += 5;
      }

      // Sonic mood similarity to active song
      const eDiff = Math.abs((candidate.energy ?? 0.5) - (currentTrack.energy ?? 0.5));
      const mDiff = Math.abs((candidate.melancholy ?? 0.5) - (currentTrack.melancholy ?? 0.5));
      const oDiff = Math.abs((candidate.obscurity ?? 0.3) - (currentTrack.obscurity ?? 0.3));
      const sonicBonus = (1 - eDiff) * 9 + (1 - mDiff) * 7 + (1 - oDiff) * 4;
      score += sonicBonus;

      if (sonicBonus >= 16 && candLang === currentLang) {
        assignReason(
          22,
          (candidate.energy ?? 0.5) >= 0.72
            ? `High-energy match for ${currentTrack.title}`
            : `Matches ${currentTrack.title}'s mood`
        );
      }
    }

    // 2. Historical & Liked Taste Affinity
    let maxArtistTaste = 0;
    let favArtistDisplay = '';
    for (let i = 0; i < candArtistsLower.length; i++) {
      const aff = artistAffinity.get(candArtistsLower[i]) || 0;
      if (aff > maxArtistTaste) {
        maxArtistTaste = aff;
        favArtistDisplay = candArtists[i];
      }
    }
    if (maxArtistTaste > 0) {
      const boost = Math.min(20, maxArtistTaste * 3.5);
      score += boost;
      if (favArtistDisplay && !currentArtistsLower.has(favArtistDisplay.toLowerCase())) {
        assignReason(25, `Because you like ${favArtistDisplay}`);
      }
    }

    const histGenreScore = genreAffinity.get(candGenreLower) || 0;
    if (histGenreScore > 0) {
      score += Math.min(14, histGenreScore * 2.5);
      assignReason(15, `Fits your ${candidate.genre} taste`);
    }

    const histLangScore = langAffinity.get(candLang) || 0;
    if (histLangScore > 0) {
      score += Math.min(12, histLangScore * 1.8);
    }

    // Proximity to cumulative user energy/melancholy taste
    const histSonic =
      (1 - Math.abs((candidate.energy ?? 0.5) - avgEnergy)) * 6 +
      (1 - Math.abs((candidate.melancholy ?? 0.5) - avgMelancholy)) * 5 +
      (1 - Math.abs((candidate.obscurity ?? 0.3) - avgObscurity)) * 3;
    score += histSonic;

    // Liked track comfort boost
    if (likedTrackIds.has(candidate.id)) {
      score += 12;
      assignReason(20, 'From your Liked Songs');
    }

    // Preferred language setting bonus
    if (normalizedPreferredLangs.has(candLang)) {
      score += 7;
    }

    // Popularity / verified full-song tie-breaker
    if (candidate.fullSongAvailable || candidate.youtubeId) {
      score += 3;
    }
    if (candidate.popularity) {
      score += (candidate.popularity / 100) * 4;
    }

    // 3. Skip & Repetition Protection
    if (skippedTrackIds.has(candidate.id)) {
      score -= 85;
    }

    let artistSkipPenalty = 0;
    candArtistsLower.forEach((a) => {
      artistSkipPenalty += skippedArtistPenalties.get(a) || 0;
    });
    if (artistSkipPenalty > 0 && maxArtistTaste < artistSkipPenalty) {
      score -= Math.min(25, artistSkipPenalty * 8);
    }

    const genreSkipPenalty = skippedGenrePenalties.get(candGenreLower) || 0;
    if (genreSkipPenalty > 0 && histGenreScore < genreSkipPenalty) {
      score -= Math.min(18, genreSkipPenalty * 6);
    }

    if (sessionPlayedIds.has(candidate.id)) {
      score -= 65;
    } else if (veryRecentTrackIds.has(candidate.id)) {
      score -= 35;
    }

    scored.push({
      track: candidate,
      score: Math.round(score * 10) / 10,
      reason: bestReason,
    });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

/**
 * Pick the #1 best next track to autoplay when the current track finishes or user clicks Next.
 * When shuffle is enabled, samples from the top 5 personalized recommendations so shuffle
 * stays aligned with what the listener enjoys.
 */
export function pickSmartNextTrack(
  ctx: RecommendationContext,
  isShuffle = false,
  randomFn: () => number = Math.random
): IndieTrack | null {
  const candidates = getPersonalizedNextTracks({
    ...ctx,
    limit: isShuffle ? 5 : 1,
  });

  if (candidates.length === 0) return null;
  if (!isShuffle || candidates.length === 1) {
    return candidates[0].track;
  }

  const idx = Math.min(candidates.length - 1, Math.floor(randomFn() * candidates.length));
  return candidates[idx].track;
}
