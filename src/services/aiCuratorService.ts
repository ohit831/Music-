/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IndieTrack, IndieArtist } from '../utils/musicDiscovery';
import {
  PlayHistoryItem,
  SkippedTrackItem,
  UserTasteProfile,
  listeningHistoryService,
} from './listeningHistoryService';

export interface AICuratedTrackRecommendation {
  id: string;
  title: string;
  artist: string;
  genre: string;
  monthlyListeners: number;
  whyRecommended: string;
  similarityFactor: string;
  track: IndieTrack;
}

export interface EmergingArtistRecommendation {
  id: string;
  name: string;
  genre: string;
  monthlyListeners: number;
  bio: string;
  similarTo: string;
  spotlightTrack: string;
  coverUrl?: string;
}

export interface RecommendedMicroGenre {
  genre: string;
  description: string;
  moodTag: string;
}

export interface AICurationResult {
  playlistTitle: string;
  playlistDescription: string;
  timeframe: 'daily' | 'weekly';
  curatorNote: string;
  reasoning: string;
  recommendedTracks: AICuratedTrackRecommendation[];
  similarArtists: EmergingArtistRecommendation[];
  recommendedGenres: RecommendedMicroGenre[];
  tasteAnalysis: {
    persona: string;
    energyLevel: string;
    obscurityRating: string;
    skippedPatternSummary: string;
  };
  generatedAt: string;
  isAIPowered: boolean;
}

export interface GenerateCurationParams {
  timeframe: 'daily' | 'weekly';
  vibe?: string;
  allTracks: IndieTrack[];
  allArtists: IndieArtist[];
  likedTracks: IndieTrack[];
}

export async function generateAICuration(params: GenerateCurationParams): Promise<AICurationResult> {
  const { timeframe, vibe = 'all', allTracks, allArtists, likedTracks } = params;

  const history = listeningHistoryService.getHistory();
  const skipped = listeningHistoryService.getSkipped();
  const tasteProfile = listeningHistoryService.getTasteProfile(likedTracks);

  // Prepare concise payload for AI model
  const payload = {
    timeframe,
    vibe,
    tasteProfile: {
      personaTitle: tasteProfile.personaTitle,
      topGenres: tasteProfile.topGenres.slice(0, 4),
      obscurityAffinity: tasteProfile.obscurityAffinity,
      averageEnergy: tasteProfile.averageEnergy,
      averageMelancholy: tasteProfile.averageMelancholy,
    },
    listeningHistory: history.slice(0, 15).map((h) => ({
      title: h.title,
      artist: h.artist,
      genre: h.genre,
      completed: h.completed,
    })),
    likedTracks: likedTracks.slice(0, 15).map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      genre: t.genre,
      obscurity: t.obscurity,
      listeners: t.monthlyListeners,
    })),
    skippedTracks: skipped.slice(0, 10).map((s) => ({
      title: s.title,
      artist: s.artist,
      genre: s.genre,
      reason: s.reason,
    })),
    catalogSample: allTracks
      .slice(0, 40)
      .map((t) => ({
        id: t.id,
        title: t.title,
        artist: t.artist,
        genre: t.genre,
        listeners: t.monthlyListeners,
        obscurity: t.obscurity,
      })),
  };

  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/ai-curator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(3500),
      });

      if (res.ok) {
      const data = await res.json();
      if (data && data.recommendedTracks && Array.isArray(data.recommendedTracks)) {
        // Map raw recommended track IDs back to full IndieTrack catalog objects
        const resolvedTracks: AICuratedTrackRecommendation[] = data.recommendedTracks
          .map((item: any) => {
            const matchedTrack =
              allTracks.find((t) => t.id === item.id) ||
              allTracks.find((t) => t.title.toLowerCase() === (item.title || '').toLowerCase()) ||
              allTracks.find((t) => t.genre === item.genre) ||
              allTracks[Math.floor(Math.random() * allTracks.length)];

            return {
              id: item.id || matchedTrack.id,
              title: item.title || matchedTrack.title,
              artist: item.artist || matchedTrack.artist,
              genre: item.genre || matchedTrack.genre,
              monthlyListeners: item.monthlyListeners || matchedTrack.monthlyListeners,
              whyRecommended: item.whyRecommended || `Matches your love for ${matchedTrack.genre}`,
              similarityFactor: item.similarityFactor || `Sonic match with your liked tracks`,
              track: matchedTrack,
            };
          })
          .filter(Boolean);

        return {
          ...data,
          timeframe,
          recommendedTracks: resolvedTracks,
          generatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isAIPowered: true,
        };
      }
    }
  } catch (err) {
    console.warn('AI Curator API call failed, falling back to algorithmic curator:', err);
  }
}

  // Graceful Algorithmic Curation Fallback
  return generateAlgorithmicCuratorFallback({
    timeframe,
    vibe,
    allTracks,
    allArtists,
    likedTracks,
    history,
    skipped,
    tasteProfile,
  });
}

function generateAlgorithmicCuratorFallback(context: {
  timeframe: 'daily' | 'weekly';
  vibe: string;
  allTracks: IndieTrack[];
  allArtists: IndieArtist[];
  likedTracks: IndieTrack[];
  history: PlayHistoryItem[];
  skipped: SkippedTrackItem[];
  tasteProfile: UserTasteProfile;
}): AICurationResult {
  const { timeframe, vibe, allTracks, allArtists, likedTracks, skipped, tasteProfile } = context;

  const skippedTrackIds = new Set(skipped.map((s) => s.trackId));
  const skippedGenres = new Set(skipped.map((s) => s.genre.toLowerCase()));
  const likedTrackIds = new Set(likedTracks.map((t) => t.id));
  const likedGenres = new Set(likedTracks.map((t) => t.genre.toLowerCase()));

  // Filter out skipped tracks and heavily penalize skipped genres
  let candidates = allTracks.filter((t) => !skippedTrackIds.has(t.id));

  // Vibe filters
  if (vibe === 'emerging_obscure') {
    candidates = candidates.filter((t) => t.obscurity > 0.6 || t.monthlyListeners < 15000);
  } else if (vibe === 'chill_bedroom') {
    candidates = candidates.filter((t) => ['Bedroom Lo-Fi', 'Dream Pop', 'Shoegaze', 'Neo-Folk'].includes(t.genre));
  } else if (vibe === 'kannada_fusion') {
    candidates = candidates.filter((t) => t.language === 'kannada' || t.genre.includes('Kannada'));
  } else if (vibe === 'indie_rock') {
    candidates = candidates.filter((t) => ['Indie Rock', 'Rock', 'Shoegaze', 'Math Rock'].includes(t.genre));
  }

  // Score candidate tracks
  const scored = candidates.map((track) => {
    let score = 0;
    // Boost if matching liked genre
    if (likedGenres.has(track.genre.toLowerCase())) score += 5;
    // Boost emerging indie gems (<10k listeners)
    if (track.monthlyListeners < 10000) score += 4;
    // Boost obscurity if user likes obscure
    if (tasteProfile.obscurityAffinity > 0.6) score += (track.obscurity || 0) * 3;
    // Energy alignment
    const energyDiff = Math.abs((track.energy || 0.5) - tasteProfile.averageEnergy);
    score += (1 - energyDiff) * 2;
    // Penalty if skipped genre
    if (skippedGenres.has(track.genre.toLowerCase())) score -= 8;
    // Avoid recommending songs already liked too often
    if (likedTrackIds.has(track.id)) score -= 2;

    return { track, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const selected = scored.slice(0, 10).map((s) => s.track);

  const referenceArtist = likedTracks[0]?.artist || 'Ghost Cassette';

  const recommendedTracks: AICuratedTrackRecommendation[] = selected.map((t) => ({
    id: t.id,
    title: t.title,
    artist: t.artist,
    genre: t.genre,
    monthlyListeners: t.monthlyListeners,
    whyRecommended: `Matches your affinity for ${t.genre} and low-compression acoustics`,
    similarityFactor: `Similar warmth to "${likedTracks[0]?.title || 'Silver Pines'}" without commercial gloss`,
    track: t,
  }));

  // Emerging Artists selection
  const emergingArtists: EmergingArtistRecommendation[] = allArtists
    .filter((a) => a.monthlyListeners < 50000 && !tasteProfile.skippedArtists.includes(a.name))
    .slice(0, 4)
    .map((a) => ({
      id: a.id,
      name: a.name,
      genre: a.genres[0] || 'Indie',
      monthlyListeners: a.monthlyListeners,
      bio: a.bio,
      similarTo: referenceArtist,
      spotlightTrack: allTracks.find((t) => t.artistId === a.id)?.title || 'Latest Single',
      coverUrl: a.coverUrl,
    }));

  const recommendedGenres: RecommendedMicroGenre[] = [
    {
      genre: 'Slowcore & Tape Flutter',
      description: 'Ultra-low tempo, tape hiss analog warmth, and deeply introspective vocal melodies.',
      moodTag: 'Rainy Night Sanctuary',
    },
    {
      genre: 'Kannada Neo-Folk Fusion',
      description: 'Acoustic charango, Indian flute trills, and organic rhythm sections pioneered by emerging Bengaluru indie acts.',
      moodTag: 'Coastal Sunrise Reverie',
    },
    {
      genre: 'Hypnagogic Dream Pop',
      description: 'Shimmering chorus-drenched guitars, nostalgic synthesizers, and ethereal floating harmonies.',
      moodTag: 'Submerged Euphoria',
    },
    {
      genre: 'Midwest Emo Revival',
      description: 'Twinkly open-tuning guitars, sudden dynamic shifts, and heart-on-sleeve confessional lyrics.',
      moodTag: 'Late Night Drive',
    },
  ];

  const titlePrefix = timeframe === 'daily' ? 'AI Daily Radar' : 'Weekly Deep Dive';
  const playlistTitle = `${titlePrefix}: ${tasteProfile.personaTitle} Vol. ${new Date().getDate()}`;
  const playlistDescription = `Hand-curated by Aura Music AI analyzing ${likedTracks.length} liked tracks and avoiding ${skipped.length} skipped styles. Spotlights underground artists with <10k monthly listeners.`;

  const curatorNote = `Welcome to your ${timeframe} curated dispatch. Based on your love for ${
    tasteProfile.topGenres[0]?.genre || 'atmospheric indie'
  } and preference for raw, analog textures, we selected emerging gems with fewer than 10,000 monthly listeners. Because you skipped high-tempo commercial tracks, we strictly dialed down artificial compression and prioritized lush acoustic reverb.`;

  return {
    playlistTitle,
    playlistDescription,
    timeframe,
    curatorNote,
    reasoning: `Filtered through ${allTracks.length} catalog items. High obscurity weighting (${Math.round(
      tasteProfile.obscurityAffinity * 100
    )}%), melancholy tolerance (${Math.round(tasteProfile.averageMelancholy * 100)}%).`,
    recommendedTracks,
    similarArtists: emergingArtists,
    recommendedGenres,
    tasteAnalysis: {
      persona: tasteProfile.personaTitle,
      energyLevel: `${Math.round(tasteProfile.averageEnergy * 100)}% Balanced Energy`,
      obscurityRating: `${Math.round(tasteProfile.obscurityAffinity * 100)}% Underground Purity`,
      skippedPatternSummary:
        skipped.length > 0
          ? `Filtered out ${skipped.length} tracks (${skipped.slice(0, 2).map((s) => s.genre).join(', ')})`
          : 'No skips recorded yet — curating full discovery spectrum',
    },
    generatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    isAIPowered: false,
  };
}
