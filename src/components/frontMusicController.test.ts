/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { resolveFullSong, KNOWN_YOUTUBE_HITS, parseMusicUrl } from '../utils/musicDiscovery';

describe('Front Music Controller & Universal YouTube Streaming Logic', () => {
  it('resolves canonical YouTube video IDs for Kannada hits accurately without fallbacks', async () => {
    const kannadaTrack = {
      title: 'Singara Siriye',
      artist: 'Vijay Prakash',
    };
    const resolved = await resolveFullSong(kannadaTrack);
    assert.strictEqual(resolved, KNOWN_YOUTUBE_HITS['singara siriye']);
    assert.ok(resolved && resolved.length === 11);
  });

  it('resolves canonical YouTube video IDs for Hindi chartbusters accurately', async () => {
    const hindiTrack = {
      title: 'Kesariya',
      artist: 'Arijit Singh',
    };
    const resolved = await resolveFullSong(hindiTrack);
    assert.strictEqual(resolved, KNOWN_YOUTUBE_HITS['kesariya']);
  });

  it('resolves canonical YouTube video IDs for 90s Golden Era hits', async () => {
    const retroTrack = {
      title: 'Nanna Preethiya Hudugi',
      artist: 'Mano',
    };
    const resolved = await resolveFullSong(retroTrack);
    assert.strictEqual(resolved, KNOWN_YOUTUBE_HITS['nanna preethiya hudugi']);
  });

  it('parses various YouTube URL formats into direct 11-char video IDs', () => {
    // 1. Direct ID
    const r1 = parseMusicUrl('dQw4w9WgXcQ');
    assert.strictEqual(r1.type, 'youtube');
    assert.strictEqual(r1.value, 'dQw4w9WgXcQ');

    // 2. Standard watch URL
    const r2 = parseMusicUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    assert.strictEqual(r2.type, 'youtube');
    assert.strictEqual(r2.value, 'dQw4w9WgXcQ');

    // 3. Short youtu.be URL
    const r3 = parseMusicUrl('https://youtu.be/dQw4w9WgXcQ');
    assert.strictEqual(r3.type, 'youtube');
    assert.strictEqual(r3.value, 'dQw4w9WgXcQ');

    // 4. YouTube Music URL
    const r4 = parseMusicUrl('https://music.youtube.com/watch?v=dQw4w9WgXcQ&feature=share');
    assert.strictEqual(r4.type, 'youtube');
    assert.strictEqual(r4.value, 'dQw4w9WgXcQ');
  });

  it('verifies Spotify Global Top hits resolve to verified working video IDs', async () => {
    const hits = ['taste', 'kill bill', 'do i wanna know', 'too sweet', 'lose control', 'espresso', 'birds of a feather'];
    for (const h of hits) {
      assert.ok(KNOWN_YOUTUBE_HITS[h], `Missing verified ID for ${h}`);
      assert.strictEqual(KNOWN_YOUTUBE_HITS[h].length, 11);
      const res = await resolveFullSong({ title: h, artist: 'Artist' });
      assert.strictEqual(res, KNOWN_YOUTUBE_HITS[h]);
    }
  });

  it('rejects obsolete mock IDs and correctly re-resolves verified canonical IDs', async () => {
    // If a track carries a known invalid mock ID 'k0Q4_w9N9qg' for Taste
    const badTrack = {
      title: 'Taste',
      artist: 'Sabrina Carpenter',
      youtubeId: 'k0Q4_w9N9qg', // Old 404 ID
    };
    const resolved = await resolveFullSong(badTrack);
    assert.strictEqual(resolved, 'KEG7b851Ric'); // Must resolve to the real verified ID, not the 404
  });
});
