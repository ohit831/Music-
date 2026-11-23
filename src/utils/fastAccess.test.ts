/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  fastSearchTracks,
  getTracksByVibe,
  getInstantAccessTracks,
  QUICK_VIBE_PRESETS,
} from './fastAccess';
import { IndieTrack } from './musicDiscovery';

const MOCK_TRACKS: IndieTrack[] = [
  {
    id: 'kn-1',
    youtubeId: 'vid-1',
    title: 'Singara Siriye',
    artist: 'Vijay Prakash',
    artistId: 'art-1',
    album: 'Kantara',
    coverUrl: 'https://example.com/cover1.jpg',
    genre: 'Kannada Folk Pop',
    duration: 279,
    releaseYear: 2022,
    monthlyListeners: 14200000,
    energy: 0.85,
    acousticness: 0.3,
    melancholy: 0.1,
    obscurity: 0.05,
    tags: ['kannada', 'kantara', 'mass', 'spotify hit'],
    isSpotifyHit: true,
    fullSongAvailable: true,
    language: 'kannada',
  },
  {
    id: 'hn-1',
    youtubeId: 'vid-2',
    title: 'Kesariya',
    artist: 'Arijit Singh',
    artistId: 'art-2',
    album: 'Brahmastra',
    coverUrl: 'https://example.com/cover2.jpg',
    genre: 'Bollywood Romance',
    duration: 268,
    releaseYear: 2022,
    monthlyListeners: 42000000,
    energy: 0.72,
    acousticness: 0.4,
    melancholy: 0.2,
    obscurity: 0.02,
    tags: ['hindi', 'bollywood', 'arijit', 'romance'],
    isSpotifyHit: true,
    fullSongAvailable: true,
    language: 'hindi',
  },
  {
    id: '90s-1',
    youtubeId: 'vid-3',
    title: 'Nanna Preethiya Hudugi',
    artist: 'SP Balasubrahmanyam',
    artistId: 'art-3',
    album: 'Amrutha Varshini',
    coverUrl: 'https://example.com/cover3.jpg',
    genre: 'Kannada 90s Romance',
    duration: 290,
    releaseYear: 1997,
    monthlyListeners: 6800000,
    energy: 0.75,
    acousticness: 0.45,
    melancholy: 0.15,
    obscurity: 0.15,
    tags: ['90s', 'kannada', 'retro', 'spb'],
    isSpotifyHit: true,
    fullSongAvailable: true,
    language: 'kannada',
  },
  {
    id: 'gym-edm',
    youtubeId: 'vid-4',
    title: 'Beast Mode Hardstyle',
    artist: 'Bass Warrior',
    artistId: 'art-4',
    album: 'Heavy Iron',
    coverUrl: 'https://example.com/cover4.jpg',
    genre: 'Hardstyle EDM',
    duration: 180,
    releaseYear: 2024,
    monthlyListeners: 1200000,
    energy: 0.98,
    acousticness: 0.02,
    melancholy: 0.05,
    obscurity: 0.3,
    tags: ['gym', 'workout', 'mass', 'bass', 'energy'],
    isSpotifyHit: false,
    fullSongAvailable: true,
  },
];

describe('Fast Access Pure Logic Utilities', () => {
  it('QUICK_VIBE_PRESETS contains 5 distinct presets with emojis and tags', () => {
    assert.strictEqual(QUICK_VIBE_PRESETS.length, 5);
    assert.ok(QUICK_VIBE_PRESETS.some((p) => p.id === 'gym-beast'));
    assert.ok(QUICK_VIBE_PRESETS.some((p) => p.id === 'kannada-mass'));
    assert.ok(QUICK_VIBE_PRESETS.some((p) => p.id === 'bollywood-top'));
  });

  it('fastSearchTracks matches songs by title, artist, or tags regardless of case', () => {
    const resTitle = fastSearchTracks(MOCK_TRACKS, 'kesariya');
    assert.strictEqual(resTitle.length, 1);
    assert.strictEqual(resTitle[0].title, 'Kesariya');

    const resArtist = fastSearchTracks(MOCK_TRACKS, 'arijit');
    assert.strictEqual(resArtist.length, 1);
    assert.strictEqual(resArtist[0].artist, 'Arijit Singh');

    const resLang = fastSearchTracks(MOCK_TRACKS, 'kannada');
    assert.strictEqual(resLang.length, 2);

    const resEmpty = fastSearchTracks(MOCK_TRACKS, '');
    assert.strictEqual(resEmpty.length, 4);
  });

  it('getTracksByVibe filters by gym-beast vibe tags correctly', () => {
    const gymTracks = getTracksByVibe(MOCK_TRACKS, 'gym-beast');
    assert.ok(gymTracks.length >= 2);
    assert.ok(gymTracks.some((t) => t.id === 'gym-edm'));
    assert.ok(gymTracks.some((t) => t.id === 'kn-1')); // has 'mass' tag
  });

  it('getTracksByVibe filters by kannada-mass vibe correctly', () => {
    const kannadaTracks = getTracksByVibe(MOCK_TRACKS, 'kannada-mass');
    assert.strictEqual(kannadaTracks.length, 2);
  });

  it('getInstantAccessTracks prioritizes hit songs and returns top list', () => {
    const instant = getInstantAccessTracks(MOCK_TRACKS);
    assert.ok(instant.length <= 6);
    assert.strictEqual(instant[0].isSpotifyHit, true);
  });
});
