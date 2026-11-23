/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildListingPlaylists,
  resolveActiveHomePlaylist,
  getPlaylistListingTracks,
  getDefaultInitialTrack,
} from './playlistListings.ts';
import { INITIAL_PLAYLISTS, INITIAL_TRACKS } from '../data/indieCatalog.ts';

test('getDefaultInitialTrack never defaults to Singara Siriye (kn-trk-1)', () => {
  const liked = new Set(['trk-1', 'trk-2']);
  const track = getDefaultInitialTrack(INITIAL_PLAYLISTS, INITIAL_TRACKS, liked, null);
  assert.ok(track);
  assert.notEqual(track.id, 'kn-trk-1');
  assert.notEqual(track.title.toLowerCase(), 'singara siriye');
});

test('buildListingPlaylists puts user-created playlists and Liked Songs ahead of curated playlists', () => {
  const customPl = {
    id: 'pl-custom-gym',
    title: 'My Gym Beast Mix',
    description: 'User custom mix',
    coverGradient: 'from-emerald-500 to-black',
    coverEmoji: '🏋️',
    trackIds: ['hn-trk-1', 'sp-trk-1'],
    createdAt: '2026-11-14',
    owner: 'You',
  };

  const ordered = buildListingPlaylists([customPl, ...INITIAL_PLAYLISTS], new Set(['sp-trk-12']));
  assert.equal(ordered[0].id, 'pl-custom-gym');
  assert.equal(ordered[1].id, 'pl-liked');

  const resolved = resolveActiveHomePlaylist(ordered, null);
  assert.equal(resolved?.id, 'pl-custom-gym');
});

test('resolveActiveHomePlaylist respects explicit preferredPlaylistId', () => {
  const ordered = buildListingPlaylists(INITIAL_PLAYLISTS, new Set());
  const resolved = resolveActiveHomePlaylist(ordered, 'pl-hindi-bollywood');
  assert.equal(resolved?.id, 'pl-hindi-bollywood');

  const tracks = getPlaylistListingTracks(resolved, INITIAL_TRACKS);
  assert.ok(tracks.length > 0);
  assert.equal(tracks[0].id, 'hn-trk-1');
});
