import test from 'node:test';
import assert from 'node:assert/strict';
import type { IndieTrack } from './musicDiscovery';
import {
  buildVibeMatchQueue,
  computeSonicProfile,
  describeSonicVibe,
  scoreSonicSimilarity,
} from './vibeMatch';

function makeTrack(
  id: string,
  overrides: Partial<IndieTrack> = {}
): IndieTrack {
  return {
    id,
    title: `Track ${id}`,
    artist: `Artist ${id}`,
    artistId: `art-${id}`,
    album: 'Test Album',
    coverUrl: 'https://example.com/cover.jpg',
    genre: 'Indie Rock',
    duration: 200,
    releaseYear: 2025,
    monthlyListeners: 50000,
    energy: 0.5,
    acousticness: 0.5,
    melancholy: 0.5,
    obscurity: 0.5,
    tags: [],
    ...overrides,
  };
}

test('computeSonicProfile clamps values and provides safe defaults', () => {
  assert.deepEqual(computeSonicProfile({ energy: 1.4, melancholy: -0.2 }), {
    energy: 1,
    melancholy: 0,
  });
  assert.deepEqual(
    computeSonicProfile({ energy: Number.NaN, melancholy: undefined as unknown as number }),
    { energy: 0.5, melancholy: 0.5 }
  );
});

test('describeSonicVibe classifies key sonic quadrants', () => {
  assert.equal(describeSonicVibe({ energy: 0.9, melancholy: 0.1 }), 'High-Energy Euphoria');
  assert.equal(describeSonicVibe({ energy: 0.75, melancholy: 0.7 }), 'Cathartic Drive');
  assert.equal(describeSonicVibe({ energy: 0.35, melancholy: 0.85 }), 'Deep Melancholy');
  assert.equal(describeSonicVibe({ energy: 0.4, melancholy: 0.2 }), 'Warm & Mellow');
});

test('buildVibeMatchQueue ranks tracks strictly by energy + melancholy proximity rather than artist affinity', () => {
  const anchor = makeTrack('anchor', {
    artistId: 'same-artist',
    energy: 0.9,
    melancholy: 0.1,
  });

  // Same artist, completely opposite mood (calm & deeply melancholic)
  const sameArtistWrongVibe = makeTrack('same-art-sad', {
    artistId: 'same-artist',
    energy: 0.2,
    melancholy: 0.9,
  });

  // Different artist, very close sonic match
  const closeMatch = makeTrack('diff-art-close', {
    artistId: 'other-artist-1',
    energy: 0.88,
    melancholy: 0.14,
  });

  // Different artist, moderate match
  const mediumMatch = makeTrack('diff-art-mid', {
    artistId: 'other-artist-2',
    energy: 0.72,
    melancholy: 0.3,
  });

  const result = buildVibeMatchQueue(anchor, [
    anchor,
    sameArtistWrongVibe,
    mediumMatch,
    closeMatch,
  ]);

  assert.deepEqual(
    result.tracks.map((t) => t.id),
    ['diff-art-close', 'diff-art-mid', 'same-art-sad']
  );
  assert.ok(result.items[0].matchScore > 90);
  assert.ok(result.items[2].matchScore < 40);
});

test('buildVibeMatchQueue adapts dynamically when switching to a melancholic anchor', () => {
  const highEnergyA = makeTrack('hi-a', { energy: 0.92, melancholy: 0.08 });
  const highEnergyB = makeTrack('hi-b', { energy: 0.88, melancholy: 0.12 });
  const sadAnchor = makeTrack('sad-anchor', { energy: 0.32, melancholy: 0.86 });
  const sadMatchA = makeTrack('sad-a', { energy: 0.35, melancholy: 0.82 });
  const sadMatchB = makeTrack('sad-b', { energy: 0.4, melancholy: 0.78 });

  const catalog = [highEnergyA, highEnergyB, sadAnchor, sadMatchA, sadMatchB];

  const euphoricQueue = buildVibeMatchQueue(highEnergyA, catalog, { limit: 2 });
  assert.deepEqual(
    euphoricQueue.tracks.map((t) => t.id),
    ['hi-b', 'sad-b']
  );

  const melancholyQueue = buildVibeMatchQueue(sadAnchor, catalog, { limit: 2 });
  assert.deepEqual(
    melancholyQueue.tracks.map((t) => t.id),
    ['sad-a', 'sad-b']
  );
  assert.equal(melancholyQueue.vibeLabel, 'Deep Melancholy');
});

test('buildVibeMatchQueue excludes anchor, excludeIds, dismissedIds, and duplicates', () => {
  const anchor = makeTrack('a', { energy: 0.6, melancholy: 0.6 });
  const excluded = makeTrack('b', { energy: 0.61, melancholy: 0.6 });
  const dismissed = makeTrack('c', { energy: 0.62, melancholy: 0.6 });
  const valid = makeTrack('d', { energy: 0.63, melancholy: 0.6 });
  const validDup = makeTrack('d', { energy: 0.63, melancholy: 0.6 });

  const result = buildVibeMatchQueue(anchor, [anchor, excluded, dismissed, valid, validDup], {
    excludeIds: new Set(['b']),
    dismissedIds: new Set(['c']),
  });

  assert.deepEqual(
    result.tracks.map((t) => t.id),
    ['d']
  );
  const sim = scoreSonicSimilarity(anchor, valid);
  assert.ok(sim.reason.includes('% vibe'));
});
