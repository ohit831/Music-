import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PLAYLIST_GRADIENT_PRESETS,
  buildCompactPlaylistPayload,
  buildPlaylistJsonShareLink,
  decodePlaylistJsonPayload,
  parsePlaylistJsonInput,
} from './playlistJsonShare';

test('buildCompactPlaylistPayload deduplicates track IDs and omits default metadata for compactness', () => {
  const payload = buildCompactPlaylistPayload({
    title: 'Late Night Kannada Gym',
    description: 'Custom indie collection created by you.',
    coverEmoji: '✨',
    coverGradient: PLAYLIST_GRADIENT_PRESETS[0],
    isCollaborative: false,
    trackIds: ['kn-1', 'kn-2', 'kn-1', '  ', 'hn-5'],
  });

  assert.deepEqual(payload, {
    v: 1,
    t: 'Late Night Kannada Gym',
    ids: ['kn-1', 'kn-2', 'hn-5'],
  });
});

test('buildPlaylistJsonShareLink and decodePlaylistJsonPayload round-trip Unicode titles, emojis, and track IDs', () => {
  const exported = buildPlaylistJsonShareLink(
    {
      title: 'ಕನ್ನಡ Gym Beast 🏋️',
      description: 'Heavy bass lifts',
      coverEmoji: '⚡',
      coverGradient: PLAYLIST_GRADIENT_PRESETS[3],
      isCollaborative: true,
      trackIds: ['kn-1', 'kn-3', 'kn-4'],
    },
    'https://apna.example.com'
  );

  assert.ok(exported.shareUrl.startsWith('https://apna.example.com/?plj='));
  assert.equal(exported.trackCount, 3);
  assert.ok(!exported.encodedPayload.includes('+'));
  assert.ok(!exported.encodedPayload.includes('/'));
  assert.ok(!exported.encodedPayload.includes('='));

  const decoded = decodePlaylistJsonPayload(exported.encodedPayload);
  assert.ok(decoded);
  assert.equal(decoded.title, 'ಕನ್ನಡ Gym Beast 🏋️');
  assert.equal(decoded.description, 'Heavy bass lifts');
  assert.equal(decoded.coverEmoji, '⚡');
  assert.equal(decoded.coverGradient, PLAYLIST_GRADIENT_PRESETS[3]);
  assert.equal(decoded.isCollaborative, true);
  assert.deepEqual(decoded.trackIds, ['kn-1', 'kn-3', 'kn-4']);
  assert.equal(decoded.matchedTrackCount, 3);
  assert.equal(decoded.unknownTrackCount, 0);
});

test('parsePlaylistJsonInput handles full share URLs, raw JSON, catalog filtering, and rejects invalid input', () => {
  const catalogIds = new Set(['trk-1', 'trk-2', 'kn-1']);
  const exported = buildPlaylistJsonShareLink(
    {
      title: 'Backup Mix',
      trackIds: ['trk-1', 'missing-track', 'kn-1'],
    },
    'https://apna.example.com'
  );

  // Full URL input
  const fromUrl = parsePlaylistJsonInput(exported.shareUrl, catalogIds);
  assert.ok(fromUrl);
  assert.equal(fromUrl.title, 'Backup Mix');
  assert.deepEqual(fromUrl.trackIds, ['trk-1', 'kn-1']);
  assert.equal(fromUrl.matchedTrackCount, 2);
  assert.equal(fromUrl.unknownTrackCount, 1);

  // Raw JSON input with standard keys
  const fromJson = parsePlaylistJsonInput(
    JSON.stringify({ title: 'Raw JSON List', trackIds: ['trk-2', 'trk-1'] }),
    catalogIds
  );
  assert.ok(fromJson);
  assert.equal(fromJson.title, 'Raw JSON List');
  assert.deepEqual(fromJson.trackIds, ['trk-2', 'trk-1']);

  // Malformed inputs safely return null
  assert.equal(parsePlaylistJsonInput('', catalogIds), null);
  assert.equal(parsePlaylistJsonInput('not-valid-base64!!!', catalogIds), null);
  assert.equal(parsePlaylistJsonInput('{"foo":"bar"}', catalogIds), null);
});
