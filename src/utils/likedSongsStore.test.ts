import test from 'node:test';
import assert from 'node:assert/strict';
import type { IndieTrack } from './musicDiscovery';
import {
  DEFAULT_LIKED_TRACK_IDS,
  LIKED_SONGS_STORAGE_KEY,
  loadLikedSongsState,
  mergeTracksWithLikedSnapshots,
  resolveLikedTracks,
  saveLikedSongsState,
  syncLikedTrackMetadata,
  toggleLikedSong,
  type StorageLike,
} from './likedSongsStore';

function createMemoryStorage(initial: Record<string, string> = {}): StorageLike {
  const map = new Map<string, string>(Object.entries(initial));
  return {
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

function makeTrack(id: string, overrides: Partial<IndieTrack> = {}): IndieTrack {
  return {
    id,
    title: `Song ${id}`,
    artist: `Artist ${id}`,
    artistId: `art-${id}`,
    album: `Album ${id}`,
    coverUrl: `https://example.com/${id}.jpg`,
    duration: 210,
    genre: 'Indie Pop',
    releaseYear: 2025,
    monthlyListeners: 25000,
    obscurity: 0.7,
    energy: 0.6,
    acousticness: 0.4,
    melancholy: 0.4,
    tags: ['indie'],
    lyrics: [],
    ...overrides,
  };
}

const CATALOG: IndieTrack[] = [
  makeTrack('trk-1', { title: 'Default One' }),
  makeTrack('trk-2', { title: 'Default Two' }),
  makeTrack('trk-3', { title: 'Catalog Three' }),
  makeTrack('trk-4', { title: 'Default Four' }),
];

test('loadLikedSongsState initializes default liked songs when storage is empty', () => {
  const storage = createMemoryStorage();
  const state = loadLikedSongsState(CATALOG, storage);
  assert.deepEqual(state.ids, DEFAULT_LIKED_TRACK_IDS);
  assert.equal(resolveLikedTracks(state, CATALOG).length, 3);
});

test('loadLikedSongsState preserves an intentional empty list after unliking all tracks', () => {
  const storage = createMemoryStorage({
    [LIKED_SONGS_STORAGE_KEY]: JSON.stringify({ version: 1, ids: [], tracksById: {} }),
  });
  const state = loadLikedSongsState(CATALOG, storage);
  assert.deepEqual(state.ids, []);
  assert.deepEqual(resolveLikedTracks(state, CATALOG), []);
});

test('toggleLikedSong adds, deduplicates, and removes catalog tracks immediately', () => {
  const storage = createMemoryStorage();
  const initial = loadLikedSongsState(CATALOG, storage);

  const likedRes = toggleLikedSong(initial, 'trk-3', CATALOG);
  assert.equal(likedRes.isLiked, true);
  assert.equal(likedRes.state.ids[0], 'trk-3');
  assert.equal(likedRes.state.ids.length, 4);
  assert.equal(new Set(likedRes.state.ids).size, 4);

  saveLikedSongsState(likedRes.state, storage);
  const reloaded = loadLikedSongsState(CATALOG, storage);
  assert.deepEqual(reloaded.ids, ['trk-3', 'trk-1', 'trk-2', 'trk-4']);

  const unlikedRes = toggleLikedSong(reloaded, 'trk-1', CATALOG);
  assert.equal(unlikedRes.isLiked, false);
  assert.deepEqual(unlikedRes.state.ids, ['trk-3', 'trk-2', 'trk-4']);
});

test('custom/YouTube searched tracks persist full metadata across reloads even when outside catalog', () => {
  const storage = createMemoryStorage();
  const initial = loadLikedSongsState(CATALOG, storage);

  const ytTrack = makeTrack('yt-custom-99', {
    title: 'Kesariya (Live Acoustic)',
    artist: 'Arijit Singh',
    youtubeId: 'BddP6PYo2gs',
    fullSongAvailable: true,
    language: 'hindi',
  });

  const likedRes = toggleLikedSong(initial, ytTrack, CATALOG);
  assert.equal(likedRes.isLiked, true);
  assert.equal(likedRes.state.ids[0], 'yt-custom-99');

  saveLikedSongsState(likedRes.state, storage);

  // Reload against only the base catalog (without yt-custom-99 in catalog)
  const reloaded = loadLikedSongsState(CATALOG, storage);
  const resolved = resolveLikedTracks(reloaded, CATALOG);
  assert.equal(resolved[0].id, 'yt-custom-99');
  assert.equal(resolved[0].title, 'Kesariya (Live Acoustic)');
  assert.equal(resolved[0].youtubeId, 'BddP6PYo2gs');

  const merged = mergeTracksWithLikedSnapshots(CATALOG, reloaded);
  assert.equal(merged.some((t) => t.id === 'yt-custom-99'), true);
  assert.equal(merged.length, CATALOG.length + 1);
});

test('syncLikedTrackMetadata updates persisted snapshot for liked tracks only', () => {
  const storage = createMemoryStorage();
  const initial = loadLikedSongsState(CATALOG, storage);
  const updated = syncLikedTrackMetadata(
    initial,
    makeTrack('trk-1', { title: 'Edited Title', youtubeId: 'abc123' })
  );
  assert.equal(updated.tracksById['trk-1'].title, 'Edited Title');
  assert.equal(updated.tracksById['trk-1'].youtubeId, 'abc123');

  const unchanged = syncLikedTrackMetadata(initial, makeTrack('trk-999', { title: 'Not Liked' }));
  assert.equal(unchanged, initial);
});
