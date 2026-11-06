/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatBytes,
  estimateTrackFileSize,
  calculateTotalStorage,
  recordDownload,
  getDownloadedTracks,
  isTrackDownloaded,
  removeDownload,
  clearAllDownloads,
  createPlayableWavBlob,
  DownloadedTrackInfo,
} from './downloadManager';
import { IndieTrack } from './musicDiscovery';

test('formatBytes correctly formats various byte counts', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(512), '512 B');
  assert.equal(formatBytes(1024), '1.0 KB');
  assert.equal(formatBytes(1048576), '1.0 MB');
  assert.equal(formatBytes(5242880), '5.0 MB');
  assert.equal(formatBytes(1073741824), '1.0 GB');
});

test('estimateTrackFileSize produces proportional values with a sensible minimum', () => {
  const shortSong = estimateTrackFileSize(30);
  const normalSong = estimateTrackFileSize(200);
  const longSong = estimateTrackFileSize(400);

  assert.ok(shortSong >= 1572864, 'Should enforce minimum file size');
  assert.ok(normalSong > shortSong, 'Normal song should be larger than short song');
  assert.ok(longSong > normalSong, 'Long song should be larger than normal song');
});

test('calculateTotalStorage aggregates bytes and count accurately', () => {
  const sampleTracks: DownloadedTrackInfo[] = [
    {
      trackId: 't1',
      title: 'Song 1',
      artist: 'Artist 1',
      coverUrl: '',
      duration: 180,
      genre: 'Indie',
      downloadedAt: 1000,
      fileSizeBytes: 2 * 1024 * 1024,
    },
    {
      trackId: 't2',
      title: 'Song 2',
      artist: 'Artist 2',
      coverUrl: '',
      duration: 200,
      genre: 'Rock',
      downloadedAt: 2000,
      fileSizeBytes: 3 * 1024 * 1024,
    },
  ];

  const result = calculateTotalStorage(sampleTracks);
  assert.equal(result.count, 2);
  assert.equal(result.totalBytes, 5 * 1024 * 1024);
  assert.equal(result.formatted, '5.0 MB');
});

test('recordDownload, getDownloadedTracks, isTrackDownloaded, and removeDownload lifecycle', () => {
  clearAllDownloads();
  assert.equal(getDownloadedTracks().length, 0);

  const mockTrack: IndieTrack = {
    id: 'test-trk-100',
    title: 'Echo Valley',
    artist: 'Luna & The Tides',
    artistId: 'art-1',
    album: 'Horizons',
    duration: 215,
    coverUrl: 'https://example.com/cover.jpg',
    genre: 'Dream Pop',
    energy: 0.6,
    melancholy: 0.5,
    acousticness: 0.4,
    obscurity: 0.8,
    monthlyListeners: 15000,
    releaseYear: 2024,
    tags: ['dreamy', 'lo-fi'],
  };

  assert.equal(isTrackDownloaded('test-trk-100'), false);

  // Record download
  const record = recordDownload(mockTrack);
  assert.equal(record.trackId, 'test-trk-100');
  assert.equal(record.title, 'Echo Valley');
  assert.ok(record.fileSizeBytes > 0);

  assert.equal(isTrackDownloaded('test-trk-100'), true);
  const tracks = getDownloadedTracks();
  assert.equal(tracks.length, 1);
  assert.equal(tracks[0].trackId, 'test-trk-100');

  // Remove download
  const removed = removeDownload('test-trk-100');
  assert.equal(removed, true);
  assert.equal(isTrackDownloaded('test-trk-100'), false);
  assert.equal(getDownloadedTracks().length, 0);

  clearAllDownloads();
});

test('createPlayableWavBlob generates a valid RIFF/WAVE binary blob', async () => {
  const blob = createPlayableWavBlob('Sonic Bliss', 1, 8000); // 1 sec at 8kHz for fast test
  assert.equal(blob.type, 'audio/wav');
  assert.ok(blob.size > 44, 'Blob must include 44-byte WAV header plus PCM samples');

  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  // Check 'RIFF' signature
  const riff = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  assert.equal(riff, 'RIFF');

  // Check 'WAVE' format
  const wave = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
  assert.equal(wave, 'WAVE');

  // Check 'fmt ' subchunk
  const fmt = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);
  assert.equal(fmt, 'fmt ');

  // Check 'data' subchunk
  const data = String.fromCharCode(bytes[36], bytes[37], bytes[38], bytes[39]);
  assert.equal(data, 'data');
});
