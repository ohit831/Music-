/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDuration,
  calculatePlaylistDuration,
  filterIndieCatalog,
  scoreTrackAffinity,
  generatePersonalizedMix,
  createSharePayload,
  decodeSharePayload,
  resolveFullSong,
  IndieTrack,
  DiscoveryPreferences,
} from './musicDiscovery';

const mockCatalog: IndieTrack[] = [
  {
    id: 'track-1',
    title: 'Silver Pines & Tape Hiss',
    artist: 'Ghost Cassette',
    artistId: 'artist-ghost',
    album: 'Faded Forest Memories',
    coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23',
    genre: 'Bedroom Lo-Fi',
    duration: 184, // 3:04
    releaseYear: 2025,
    monthlyListeners: 1200,
    energy: 0.3,
    acousticness: 0.8,
    melancholy: 0.7,
    obscurity: 0.85,
    tags: ['tape hiss', 'chill', 'rain', 'nostalgia'],
  },
  {
    id: 'track-2',
    title: 'Neon Overdrive',
    artist: 'The Velvet Strangers',
    artistId: 'artist-velvet',
    album: 'Post-Midnight Static',
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4',
    genre: 'Indie Rock',
    duration: 215, // 3:35
    releaseYear: 2026,
    monthlyListeners: 8400,
    energy: 0.85,
    acousticness: 0.1,
    melancholy: 0.2,
    obscurity: 0.45,
    tags: ['garage', 'fuzzy guitar', 'driving', 'anthem'],
  },
  {
    id: 'track-3',
    title: 'Lucid Sea Mist',
    artist: 'Pale Moonflower',
    artistId: 'artist-moonflower',
    album: 'Tides of Subconscious',
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819',
    genre: 'Dream Pop',
    duration: 240, // 4:00
    releaseYear: 2025,
    monthlyListeners: 3100,
    energy: 0.45,
    acousticness: 0.5,
    melancholy: 0.6,
    obscurity: 0.7,
    tags: ['reverb', 'ethereal', 'synth', 'shimmer'],
  },
];

test('formatDuration formats seconds accurately', () => {
  assert.equal(formatDuration(0), '0:00');
  assert.equal(formatDuration(65), '1:05');
  assert.equal(formatDuration(184), '3:04');
  assert.equal(formatDuration(240), '4:00');
  assert.equal(formatDuration(-10), '0:00');
});

test('calculatePlaylistDuration produces human readable duration strings', () => {
  const durationStr = calculatePlaylistDuration(mockCatalog);
  // 184 + 215 + 240 = 639 seconds = 10 min 39 sec
  assert.equal(durationStr, '10 min 39 sec');
});

test('filterIndieCatalog filters by query and genre', () => {
  const byGenre = filterIndieCatalog('', 'Dream Pop', mockCatalog);
  assert.equal(byGenre.length, 1);
  assert.equal(byGenre[0].id, 'track-3');

  const bySearch = filterIndieCatalog('tape hiss', null, mockCatalog);
  assert.equal(bySearch.length, 1);
  assert.equal(bySearch[0].id, 'track-1');

  const byArtist = filterIndieCatalog('Velvet', null, mockCatalog);
  assert.equal(byArtist.length, 1);
  assert.equal(byArtist[0].id, 'track-2');

  const all = filterIndieCatalog('', 'All', mockCatalog);
  assert.equal(all.length, 3);

  const sampleRegionalTracks: IndieTrack[] = [
    ...mockCatalog,
    {
      id: 'kn-sample-1',
      title: 'Singara Siriye',
      artist: 'Vijay Prakash',
      artistId: 'art-kn-vp',
      album: 'Kantara',
      coverUrl: '',
      genre: 'Kannada Folk Pop',
      language: 'kannada',
      duration: 279,
      releaseYear: 2022,
      monthlyListeners: 20000000,
      energy: 0.8,
      acousticness: 0.4,
      melancholy: 0.2,
      obscurity: 0.05,
      tags: ['kannada', 'kantara'],
    },
    {
      id: 'hn-sample-1',
      title: 'Kesariya',
      artist: 'Arijit Singh',
      artistId: 'art-hn-as',
      album: 'Brahmāstra',
      coverUrl: '',
      genre: 'Hindi Romantic',
      language: 'hindi',
      duration: 268,
      releaseYear: 2022,
      monthlyListeners: 70000000,
      energy: 0.7,
      acousticness: 0.3,
      melancholy: 0.1,
      obscurity: 0.02,
      tags: ['hindi', 'bollywood'],
    },
  ];

  const kannadaFiltered = filterIndieCatalog('', 'kannada', sampleRegionalTracks);
  assert.equal(kannadaFiltered.length, 1);
  assert.equal(kannadaFiltered[0].id, 'kn-sample-1');

  const hindiFiltered = filterIndieCatalog('', 'hindi', sampleRegionalTracks);
  assert.equal(hindiFiltered.length, 1);
  assert.equal(hindiFiltered[0].id, 'hn-sample-1');
});

test('scoreTrackAffinity prioritizes genre and obscurity matches', () => {
  const lofiPrefs: DiscoveryPreferences = {
    genres: ['Bedroom Lo-Fi'],
    minObscurity: 0.7,
    maxObscurity: 1.0,
    energyTarget: 0.3,
    melancholyTarget: 0.7,
  };

  const scoreLofi = scoreTrackAffinity(mockCatalog[0], lofiPrefs, new Set());
  const scoreRock = scoreTrackAffinity(mockCatalog[1], lofiPrefs, new Set());

  assert.ok(scoreLofi > scoreRock, 'Lo-Fi track should score higher with Lo-Fi preferences');
});

test('generatePersonalizedMix constructs valid playlist with ordered tracks', () => {
  const rockPrefs: DiscoveryPreferences = {
    genres: ['Indie Rock'],
    minObscurity: 0.3,
    maxObscurity: 0.6,
    energyTarget: 0.9,
    melancholyTarget: 0.2,
  };

  const result = generatePersonalizedMix('My Indie Rock Radar', rockPrefs, mockCatalog, 2);
  assert.equal(result.tracks.length, 2);
  assert.equal(result.playlist.title, 'My Indie Rock Radar');
  assert.equal(result.tracks[0].genre, 'Indie Rock');
  assert.ok(result.playlist.trackIds.includes(result.tracks[0].id));
});

test('createSharePayload and decodeSharePayload encode and recover track sharing metadata', () => {
  const track = mockCatalog[0];
  const share = createSharePayload(track, 'Found this underground gem, check the tape delay!');

  assert.ok(share.shareUrl.includes(track.id));
  assert.ok(share.summaryText.includes('Silver Pines & Tape Hiss'));

  const decoded = decodeSharePayload(share.payloadStr);
  assert.ok(decoded !== null);
  assert.equal(decoded?.tId, track.id);
  assert.equal(decoded?.title, track.title);
  assert.equal(decoded?.artist, track.artist);
  assert.equal(decoded?.note, 'Found this underground gem, check the tape delay!');
});

test('resolveFullSong correctly matches canonical Kannada and Hindi song titles to authentic video IDs', async () => {
  // Kannada test
  const singara = await resolveFullSong({
    title: 'Singara Siriye',
    artist: 'Vijay Prakash',
  });
  assert.equal(singara, 'Q-yJcnX0Qzg');

  // Hindi test
  const tumHiHo = await resolveFullSong({
    title: 'Tum Hi Ho',
    artist: 'Arijit Singh',
  });
  assert.equal(tumHiHo, 'IJq0yyWug1k');

  // Pehle Bhi Main test
  const pehleBhiMain = await resolveFullSong({
    title: 'Pehle Bhi Main',
    artist: 'Vishal Mishra',
  });
  assert.equal(pehleBhiMain, '2ENXZq5hJyo');

  // Chaiyya Chaiyya test
  const chaiyya = await resolveFullSong({
    title: 'Chaiyya Chaiyya',
    artist: 'Sukhwinder Singh',
  });
  assert.equal(chaiyya, 'PQmrmVs10X8');
});
