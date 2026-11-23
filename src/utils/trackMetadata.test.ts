/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TRACK_METADATA_STORAGE_KEY,
  TRACK_TAG_MAX_COUNT,
  TRACK_TAG_MAX_LEN,
  TRACK_TITLE_MAX,
  addTagsToList,
  applyTrackMetadataOverride,
  applyTrackMetadataOverrides,
  collectCatalogTags,
  filterTracksByTag,
  loadTrackMetadataOverrides,
  normalizeCustomTag,
  parseTagInput,
  removeTagFromList,
  restoreOriginalTrack,
  saveTrackMetadataOverrides,
  validateAndNormalizeMetadata,
} from './trackMetadata';
import { IndieTrack } from './musicDiscovery';

function createMemoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

const SAMPLE_TRACK: IndieTrack = {
  id: 'trk-101',
  title: 'Midnight Echoes',
  artist: 'Velvet Tape',
  artistId: 'art-1',
  album: 'Cassette Sessions',
  coverUrl: 'https://example.com/art.jpg',
  genre: 'Dream Pop',
  duration: 215,
  releaseYear: 2024,
  monthlyListeners: 4500,
  energy: 0.6,
  acousticness: 0.3,
  melancholy: 0.7,
  obscurity: 0.85,
  tags: ['dreamy', 'indie'],
  language: 'english',
  bpm: 112,
  linerNotes: 'Recorded on 4-track tape.',
};

test('normalizeCustomTag strips hashes, collapses spaces, lowercases, and enforces max length', () => {
  assert.equal(normalizeCustomTag('  #Gym-PR  '), 'gym-pr');
  assert.equal(normalizeCustomTag('Morning   Cardio\nRun'), 'morning cardio run');
  assert.equal(normalizeCustomTag('   ###   '), '');
  const tooLong = 'a'.repeat(50);
  assert.equal(normalizeCustomTag(tooLong).length, TRACK_TAG_MAX_LEN);
});

test('parseTagInput parses comma-separated values cleanly and deduplicates', () => {
  assert.deepEqual(parseTagInput('gym-pr, #Gym-PR, late-night , , focus'), [
    'gym-pr',
    'late-night',
    'focus',
  ]);
});

test('addTagsToList prevents duplicates and enforces 10-tag cap', () => {
  const initial = ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6', 'tag7', 'tag8'];
  const res = addTagsToList(initial, 'TAG2, tag9, tag10, tag11');
  assert.equal(res.tags.length, TRACK_TAG_MAX_COUNT);
  assert.deepEqual(res.added, ['tag9', 'tag10']);
  assert.equal(res.duplicateCount, 1);
  assert.equal(res.limitReached, true);
  assert.equal(res.tags.includes('tag11'), false);
});

test('removeTagFromList removes case-insensitively and preserves other tags', () => {
  const updated = removeTagFromList(['favorites', 'gym-pr', 'chill'], '#GYM-PR');
  assert.deepEqual(updated, ['favorites', 'chill']);
});

test('validateAndNormalizeMetadata rejects missing title, artist, genre, or out-of-range year/BPM', () => {
  const invalid = validateAndNormalizeMetadata('trk-101', {
    title: '   ',
    artist: '',
    album: 'A',
    genre: '',
    releaseYear: 1850,
    bpm: 420,
    tags: [],
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.title);
  assert.ok(invalid.errors.artist);
  assert.ok(invalid.errors.genre);
  assert.ok(invalid.errors.releaseYear);
  assert.ok(invalid.errors.bpm);
});

test('validateAndNormalizeMetadata accepts valid metadata, truncates oversized text, and normalizes tags', () => {
  const result = validateAndNormalizeMetadata(
    'trk-101',
    {
      title: `  ${'X'.repeat(150)}  `,
      artist: '  Velvet Tape Remastered  ',
      album: '  Deluxe Tape  ',
      genre: 'Shoegaze',
      releaseYear: '2025',
      language: 'Kannada',
      bpm: '128',
      linerNotes: 'Mastered for Hi-Fi.',
      tags: ['#Morning-Cardio', 'morning-cardio', 'BOSS-MODE'],
    },
    '2026-11-16T10:00:00.000Z'
  );

  assert.equal(result.valid, true);
  assert.ok(result.override);
  assert.equal(result.override.title.length, TRACK_TITLE_MAX);
  assert.equal(result.override.artist, 'Velvet Tape Remastered');
  assert.equal(result.override.album, 'Deluxe Tape');
  assert.equal(result.override.genre, 'Shoegaze');
  assert.equal(result.override.releaseYear, 2025);
  assert.equal(result.override.language, 'kannada');
  assert.equal(result.override.bpm, 128);
  assert.deepEqual(result.override.tags, ['morning-cardio', 'boss-mode']);
});

test('applyTrackMetadataOverride updates target track without mutating unrelated tracks', () => {
  const other: IndieTrack = { ...SAMPLE_TRACK, id: 'trk-202', title: 'Other Song' };
  const overrideRes = validateAndNormalizeMetadata('trk-101', {
    title: 'Midnight Echoes (Studio Cut)',
    artist: 'Velvet Tape',
    album: 'Night Drive LP',
    genre: 'Synthwave',
    releaseYear: 2026,
    language: 'english',
    bpm: 132,
    linerNotes: 'New mix notes',
    tags: ['night-drive', 'hi-fi'],
  });
  assert.ok(overrideRes.override);

  const updatedList = applyTrackMetadataOverrides([SAMPLE_TRACK, other], {
    'trk-101': overrideRes.override,
  });

  assert.equal(updatedList[0].title, 'Midnight Echoes (Studio Cut)');
  assert.equal(updatedList[0].album, 'Night Drive LP');
  assert.equal(updatedList[0].genre, 'Synthwave');
  assert.deepEqual(updatedList[0].tags, ['night-drive', 'hi-fi']);
  assert.equal(updatedList[1].title, 'Other Song');

  // Direct mismatch test
  assert.equal(applyTrackMetadataOverride(other, overrideRes.override).title, 'Other Song');
});

test('restoreOriginalTrack reverts overrides cleanly', () => {
  const edited = { ...SAMPLE_TRACK, title: 'Renamed', tags: ['custom'] };
  const restored = restoreOriginalTrack('trk-101', [SAMPLE_TRACK], edited);
  assert.equal(restored?.title, 'Midnight Echoes');
  assert.deepEqual(restored?.tags, ['dreamy', 'indie']);
});

test('collectCatalogTags & filterTracksByTag organize tracks by custom tags', () => {
  const tracks: IndieTrack[] = [
    { ...SAMPLE_TRACK, id: '1', tags: ['gym-pr', 'favorites'] },
    { ...SAMPLE_TRACK, id: '2', tags: ['gym-pr', 'chill'] },
    { ...SAMPLE_TRACK, id: '3', tags: ['chill'] },
  ];
  const aggregated = collectCatalogTags(tracks);
  assert.deepEqual(aggregated[0], { tag: 'chill', count: 2 });
  assert.deepEqual(aggregated[1], { tag: 'gym-pr', count: 2 });

  const filtered = filterTracksByTag(tracks, '#GYM-PR');
  assert.deepEqual(
    filtered.map((t) => t.id),
    ['1', '2']
  );
});

test('loadTrackMetadataOverrides & saveTrackMetadataOverrides round-trip and filter corrupt entries', () => {
  const prevStorage = globalThis.localStorage;
  const mem = createMemoryStorage();
  Object.defineProperty(globalThis, 'localStorage', {
    value: mem,
    configurable: true,
    writable: true,
  });

  try {
    const valid = validateAndNormalizeMetadata('trk-101', {
      title: 'Saved Title',
      artist: 'Saved Artist',
      album: 'Saved Album',
      genre: 'Pop',
      releaseYear: 2025,
      tags: ['saved-tag'],
    }).override!;

    saveTrackMetadataOverrides({ 'trk-101': valid });
    const loaded = loadTrackMetadataOverrides();
    assert.equal(loaded['trk-101']?.title, 'Saved Title');
    assert.deepEqual(loaded['trk-101']?.tags, ['saved-tag']);

    // Inject malformed data into storage and verify sanitization rejects it safely
    mem.setItem(
      TRACK_METADATA_STORAGE_KEY,
      JSON.stringify({
        'trk-101': valid,
        'bad-entry': { trackId: 'bad-entry', title: '', artist: '' },
      })
    );
    const cleaned = loadTrackMetadataOverrides();
    assert.ok(cleaned['trk-101']);
    assert.equal(cleaned['bad-entry'], undefined);
  } finally {
    Object.defineProperty(globalThis, 'localStorage', {
      value: prevStorage,
      configurable: true,
      writable: true,
    });
  }
});
