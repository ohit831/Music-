/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IndieTrack } from '../utils/musicDiscovery';
import type { VibeMatchUsageEvent } from '../utils/vibeHistory';

export interface PlayHistoryItem {
  trackId: string;
  title: string;
  artist: string;
  artistId: string;
  genre: string;
  playedAt: number; // timestamp ms
  listenedSeconds: number;
  completed: boolean;
  coverUrl: string;
  obscurity: number;
  energy: number;
  melancholy: number;
  language?: string;
}

export interface SkippedTrackItem {
  trackId: string;
  title: string;
  artist: string;
  genre: string;
  skippedAt: number; // timestamp ms
  listenedSeconds: number;
  reason: 'early_skip' | 'disliked' | 'manual_next';
  coverUrl: string;
}

export interface UserTasteProfile {
  personaTitle: string;
  personaDescription: string;
  obscurityAffinity: number; // 0 to 1 (1 = hyper obscure underground)
  averageEnergy: number; // 0 to 1
  averageMelancholy: number; // 0 to 1
  topGenres: { genre: string; count: number; percentage: number }[];
  favoriteArtists: { name: string; playCount: number }[];
  skippedGenres: string[];
  skippedArtists: string[];
  totalPlays: number;
  totalLikes: number;
  totalSkips: number;
}

const STORAGE_KEYS = {
  HISTORY: 'indiewave_listening_history_v1',
  SKIPPED: 'indiewave_skipped_tracks_v1',
  TASTE: 'indiewave_taste_profile_v1',
  VIBE_HISTORY: 'indiewave_vibe_match_history_v1',
};

// Seed initial realistic listening history if empty so user gets rich instant AI recommendations
const SEED_HISTORY: PlayHistoryItem[] = [
  {
    trackId: 'trk-1',
    title: 'Silver Pines & Tape Hiss',
    artist: 'Ghost Cassette',
    artistId: 'art-1',
    genre: 'Bedroom Lo-Fi',
    playedAt: Date.now() - 3600000 * 2,
    listenedSeconds: 194,
    completed: true,
    coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    obscurity: 0.95,
    energy: 0.28,
    melancholy: 0.82,
  },
  {
    trackId: 'trk-2',
    title: 'Lucid Sea Mist',
    artist: 'Pale Moonflower',
    artistId: 'art-2',
    genre: 'Dream Pop',
    playedAt: Date.now() - 3600000 * 4,
    listenedSeconds: 245,
    completed: true,
    coverUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80',
    obscurity: 0.88,
    energy: 0.42,
    melancholy: 0.74,
  },
  {
    trackId: 'trk-3',
    title: 'Topanga Sunset Glow',
    artist: 'Canyon Echoes',
    artistId: 'art-3',
    genre: 'Neo-Folk',
    playedAt: Date.now() - 3600000 * 8,
    listenedSeconds: 218,
    completed: true,
    coverUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&auto=format&fit=crop&q=80',
    obscurity: 0.91,
    energy: 0.35,
    melancholy: 0.65,
  },
  {
    trackId: 'hn-trk-1',
    title: 'Kesariya (From "Brahmastra")',
    artist: 'Arijit Singh & Pritam',
    artistId: 'art-hn-arijit',
    genre: 'Bollywood Romantic',
    playedAt: Date.now() - 3600000 * 12,
    listenedSeconds: 268,
    completed: true,
    coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80',
    obscurity: 0.1,
    energy: 0.68,
    melancholy: 0.35,
    language: 'hindi',
  },
  {
    trackId: 'trk-5',
    title: 'Slow Bloom Violet',
    artist: 'Cerulean Mirage',
    artistId: 'art-5',
    genre: 'Shoegaze',
    playedAt: Date.now() - 3600000 * 18,
    listenedSeconds: 271,
    completed: true,
    coverUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
    obscurity: 0.93,
    energy: 0.62,
    melancholy: 0.88,
  },
];

const SEED_SKIPPED: SkippedTrackItem[] = [
  {
    trackId: 'trk-edm-skip',
    title: 'Club Bang Neon Peak',
    artist: 'Electro Syndicate',
    genre: 'Commercial EDM',
    skippedAt: Date.now() - 3600000 * 6,
    listenedSeconds: 12,
    reason: 'early_skip',
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
  },
  {
    trackId: 'trk-autotune-trap',
    title: 'Diamond Flex 2024',
    artist: 'Trap Kingz',
    genre: 'Commercial Trap',
    skippedAt: Date.now() - 3600000 * 20,
    listenedSeconds: 8,
    reason: 'disliked',
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
  },
];

class ListeningHistoryService {
  private history: PlayHistoryItem[] = [];
  private skipped: SkippedTrackItem[] = [];
  private vibeMatchHistory: VibeMatchUsageEvent[] = [];
  private listeners: (() => void)[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const storedHistory = localStorage.getItem(STORAGE_KEYS.HISTORY);
      this.history = storedHistory ? JSON.parse(storedHistory) : [...SEED_HISTORY];

      const storedSkipped = localStorage.getItem(STORAGE_KEYS.SKIPPED);
      this.skipped = storedSkipped ? JSON.parse(storedSkipped) : [...SEED_SKIPPED];

      const storedVibes = localStorage.getItem(STORAGE_KEYS.VIBE_HISTORY);
      this.vibeMatchHistory = storedVibes ? JSON.parse(storedVibes) : [];
    } catch (e) {
      this.history = [...SEED_HISTORY];
      this.skipped = [...SEED_SKIPPED];
      this.vibeMatchHistory = [];
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(this.history));
      localStorage.setItem(STORAGE_KEYS.SKIPPED, JSON.stringify(this.skipped));
      localStorage.setItem(STORAGE_KEYS.VIBE_HISTORY, JSON.stringify(this.vibeMatchHistory));
      this.notifyListeners();
    } catch (e) {
      console.warn('Failed to save listening history to storage', e);
    }
  }

  public subscribe(fn: () => void) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error(err);
      }
    });
  }

  /**
   * Record a track play when user starts or completes playback
   */
  public recordPlay(track: IndieTrack, listenedSeconds: number, completed = false) {
    if (!track) return;

    // Check if the same track was recorded in the last 15 seconds to avoid duplicates
    const recent = this.history[0];
    if (recent && recent.trackId === track.id && Date.now() - recent.playedAt < 15000) {
      recent.listenedSeconds = Math.max(recent.listenedSeconds, listenedSeconds);
      recent.completed = recent.completed || completed;
      this.saveToStorage();
      return;
    }

    const item: PlayHistoryItem = {
      trackId: track.id,
      title: track.title,
      artist: track.artist,
      artistId: track.artistId,
      genre: track.genre,
      playedAt: Date.now(),
      listenedSeconds,
      completed,
      coverUrl: track.coverUrl,
      obscurity: track.obscurity ?? 0.5,
      energy: track.energy ?? 0.5,
      melancholy: track.melancholy ?? 0.5,
      language: track.language,
    };

    // Keep up to 100 recent plays
    this.history = [item, ...this.history.slice(0, 99)];
    this.saveToStorage();
  }

  /**
   * Record a track skip (e.g. user pressed next within 25 seconds or clicked dislike)
   */
  public recordSkip(track: IndieTrack, listenedSeconds: number, reason: 'early_skip' | 'disliked' | 'manual_next' = 'early_skip') {
    if (!track) return;

    // Check if already in skipped list recently
    const existingIdx = this.skipped.findIndex((s) => s.trackId === track.id);
    const item: SkippedTrackItem = {
      trackId: track.id,
      title: track.title,
      artist: track.artist,
      genre: track.genre,
      skippedAt: Date.now(),
      listenedSeconds,
      reason,
      coverUrl: track.coverUrl,
    };

    if (existingIdx !== -1) {
      this.skipped[existingIdx] = item;
    } else {
      this.skipped = [item, ...this.skipped.slice(0, 49)];
    }
    this.saveToStorage();
  }

  /**
   * Remove a track from the skipped list (undo skip)
   */
  public removeSkip(trackId: string) {
    this.skipped = this.skipped.filter((s) => s.trackId !== trackId);
    this.saveToStorage();
  }

  public clearSkipped() {
    this.skipped = [];
    this.saveToStorage();
  }

  public getHistory(): PlayHistoryItem[] {
    return [...this.history];
  }

  public getSkipped(): SkippedTrackItem[] {
    return [...this.skipped];
  }

  /**
   * Record an explicit Vibe Match activation or dynamic track-switch sync
   */
  public recordVibeMatchUsage(
    track: IndieTrack,
    vibeLabel: string,
    matchedCount: number,
    source: 'toggle' | 'dynamic_switch' = 'toggle'
  ) {
    if (!track) return;

    // Deduplicate rapid repeats for the same track within 4 seconds
    const latest = this.vibeMatchHistory[0];
    if (
      latest &&
      latest.trackId === track.id &&
      latest.source === source &&
      Date.now() - latest.usedAt < 4000
    ) {
      return;
    }

    const evt: VibeMatchUsageEvent = {
      id: `${track.id}-${Date.now()}`,
      trackId: track.id,
      trackTitle: track.title,
      artist: track.artist,
      energy: track.energy ?? 0.5,
      melancholy: track.melancholy ?? 0.5,
      vibeLabel,
      matchedCount,
      usedAt: Date.now(),
      source,
    };

    this.vibeMatchHistory = [evt, ...this.vibeMatchHistory.slice(0, 49)];
    this.saveToStorage();
  }

  public getVibeMatchHistory(): VibeMatchUsageEvent[] {
    return [...this.vibeMatchHistory];
  }

  /**
   * Compute comprehensive taste profile from history, likes, and skips
   */
  public getTasteProfile(likedTracks: IndieTrack[]): UserTasteProfile {
    const genreCounts: Record<string, number> = {};
    const artistCounts: Record<string, number> = {};
    let totalObscurity = 0;
    let totalEnergy = 0;
    let totalMelancholy = 0;
    let countedTracks = 0;

    // Weight liked tracks heavily (weight = 3)
    likedTracks.forEach((t) => {
      genreCounts[t.genre] = (genreCounts[t.genre] || 0) + 3;
      artistCounts[t.artist] = (artistCounts[t.artist] || 0) + 3;
      totalObscurity += (t.obscurity ?? 0.5) * 3;
      totalEnergy += (t.energy ?? 0.5) * 3;
      totalMelancholy += (t.melancholy ?? 0.5) * 3;
      countedTracks += 3;
    });

    // Weight history items by completion (completed = 2, uncompleted = 1)
    this.history.forEach((h) => {
      const weight = h.completed ? 2 : 1;
      genreCounts[h.genre] = (genreCounts[h.genre] || 0) + weight;
      artistCounts[h.artist] = (artistCounts[h.artist] || 0) + weight;
      totalObscurity += h.obscurity * weight;
      totalEnergy += h.energy * weight;
      totalMelancholy += h.melancholy * weight;
      countedTracks += weight;
    });

    // Skipped items deduct from affinity
    const skippedGenres = Array.from(new Set(this.skipped.map((s) => s.genre)));
    const skippedArtists = Array.from(new Set(this.skipped.map((s) => s.artist)));

    const totalWeight = Object.values(genreCounts).reduce((a, b) => a + b, 0) || 1;
    const topGenres = Object.entries(genreCounts)
      .map(([genre, count]) => ({
        genre,
        count,
        percentage: Math.round((count / totalWeight) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const favoriteArtists = Object.entries(artistCounts)
      .map(([name, playCount]) => ({ name, playCount }))
      .sort((a, b) => b.playCount - a.playCount)
      .slice(0, 6);

    const avgObscurity = countedTracks > 0 ? totalObscurity / countedTracks : 0.75;
    const avgEnergy = countedTracks > 0 ? totalEnergy / countedTracks : 0.45;
    const avgMelancholy = countedTracks > 0 ? totalMelancholy / countedTracks : 0.65;

    // Determine persona archetype
    let personaTitle = 'The Underground Dreamer';
    let personaDescription = 'Drawn to cassette tape flutter, subterranean dream pop, and low-commercial gems.';

    if (avgObscurity > 0.8) {
      if (avgMelancholy > 0.65) {
        personaTitle = 'The Nocturnal Cassette Scout';
        personaDescription = 'Finds emotional sanctuary in obscure shoegaze, bedroom lo-fi, and rain-soaked reverb.';
      } else {
        personaTitle = 'The Secret Crate Digger';
        personaDescription = 'Chases hyper-obscure releases (<1,000 monthly listeners) before the algorithms find them.';
      }
    } else if (topGenres.some((g) => g.genre.includes('Kannada') || g.genre.includes('Bollywood'))) {
      personaTitle = 'The Desi Indie & Heritage Explorer';
      personaDescription = 'Seamlessly fuses coastal Kannada folk acoustics, Sandalwood anthems, and modern indie poetry.';
    } else if (avgEnergy > 0.7) {
      personaTitle = 'The High-Octane Alt Enthusiast';
      personaDescription = 'Loves raw fuzz guitars, pulsating math rock riffs, and relentless live energy.';
    }

    return {
      personaTitle,
      personaDescription,
      obscurityAffinity: Math.min(1, Math.max(0, avgObscurity)),
      averageEnergy: Math.min(1, Math.max(0, avgEnergy)),
      averageMelancholy: Math.min(1, Math.max(0, avgMelancholy)),
      topGenres,
      favoriteArtists,
      skippedGenres,
      skippedArtists,
      totalPlays: this.history.length,
      totalLikes: likedTracks.length,
      totalSkips: this.skipped.length,
    };
  }
}

export const listeningHistoryService = new ListeningHistoryService();
