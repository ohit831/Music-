/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  SILENT_KEEPALIVE_WAV_DATA_URI,
  isAuthenticAudioCandidate,
  buildAudioSearchQueries,
  computeSafeSeekTarget,
  buildMediaMetadataInit,
} from './backgroundPlayback';
import { IndieTrack } from './musicDiscovery';

describe('Lock-Screen & Background Audio Playback Helpers', () => {
  test('generates a valid silent WAV data URI for MediaSession keep-alive', () => {
    assert.ok(SILENT_KEEPALIVE_WAV_DATA_URI.startsWith('data:audio/wav;base64,'));
    const b64 = SILENT_KEEPALIVE_WAV_DATA_URI.split(',')[1];
    const buf = Buffer.from(b64, 'base64');
    assert.equal(buf.slice(0, 4).toString('ascii'), 'RIFF');
    assert.equal(buf.slice(8, 12).toString('ascii'), 'WAVE');
    assert.ok(buf.length > 44);
  });

  test('rejects instrumental, karaoke, nightcore, and mismatched artist covers', () => {
    assert.equal(
      isAuthenticAudioCandidate(
        {
          title: 'Espresso (Sped Up)',
          language: 'instrumental',
          artists: 'skyemane, Sapphink',
          hasEncryptedUrl: true,
        },
        'Espresso',
        'Sabrina Carpenter'
      ),
      false
    );

    assert.equal(
      isAuthenticAudioCandidate(
        {
          title: 'Kantara Singara Siriye',
          language: 'kannada',
          artists: 'Nikita Saja',
          hasEncryptedUrl: true,
        },
        'Singara Siriye',
        'Vijay Prakash, Ananya Bhat & B. Ajaneesh Loknath'
      ),
      false
    );

    assert.equal(
      isAuthenticAudioCandidate(
        {
          title: 'Believer (Melody Karaoke Version)',
          language: 'english',
          artists: 'ZZang KARAOKE',
          hasEncryptedUrl: true,
        },
        'Believer',
        'Imagine Dragons'
      ),
      false
    );

    assert.equal(
      isAuthenticAudioCandidate(
        {
          title: 'Chaleya (From "Jawan")',
          language: 'hindi',
          artists: 'Anirudh Ravichander, Arijit Singh, Shilpa Rao',
          hasEncryptedUrl: true,
        },
        'Chaleya',
        'Arijit Singh & Shilpa Rao'
      ),
      true
    );

    assert.equal(
      isAuthenticAudioCandidate(
        {
          title: 'Singara Siriye',
          language: 'kannada',
          artists: 'Vijay Prakash, Ananya Bhat, B. Ajaneesh Loknath',
          hasEncryptedUrl: true,
        },
        'Singara Siriye',
        'Vijay Prakash & B. Ajaneesh Loknath'
      ),
      true
    );
  });

  test('builds clean primary-artist search queries from multi-artist strings', () => {
    const queries = buildAudioSearchQueries(
      'Singara Siriye',
      'Vijay Prakash, Ananya Bhat & B. Ajaneesh Loknath'
    );
    assert.equal(queries[0], 'Singara Siriye Vijay Prakash');
    assert.ok(queries.includes('Singara Siriye Vijay Prakash, Ananya Bhat & B. Ajaneesh Loknath'));
    assert.ok(queries.includes('Singara Siriye'));
  });

  test('computes safe seek targets for full-length and preview streams', () => {
    assert.equal(computeSafeSeekTarget(85, 210, true), 85);
    assert.equal(computeSafeSeekTarget(12, 30, false), 12);
    // Past 30s preview boundary wraps smoothly instead of jumping to EOF
    const wrapped = computeSafeSeekTarget(70, 30, false);
    assert.ok(wrapped >= 0 && wrapped < 28, `Expected wrapped < 28, got ${wrapped}`);
  });

  test('builds MediaMetadata payload with multi-size artwork', () => {
    const track: IndieTrack = {
      id: 'trk-test',
      title: 'Dwapara',
      artist: 'Jaskaran Singh',
      artistId: 'art-1',
      album: 'Krishnam Pranaya Sakhi',
      coverUrl: 'https://example.com/cover.jpg',
      genre: 'Kannada Hits',
      duration: 283,
      releaseYear: 2024,
      monthlyListeners: 5000000,
      energy: 0.7,
      acousticness: 0.3,
      melancholy: 0.2,
      obscurity: 0.1,
      tags: ['kannada'],
    };

    const meta = buildMediaMetadataInit(track);
    assert.equal(meta.title, 'Dwapara');
    assert.equal(meta.artist, 'Jaskaran Singh');
    assert.equal(meta.album, 'Krishnam Pranaya Sakhi');
    assert.equal(meta.artwork.length, 3);
    assert.equal(meta.artwork[0].src, 'https://example.com/cover.jpg');
  });
});
