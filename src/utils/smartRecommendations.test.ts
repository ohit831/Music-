/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_TRACKS } from '../data/indieCatalog';
import { getPersonalizedNextTracks, pickSmartNextTrack } from './smartRecommendations';
import type { PlayHistoryItem, SkippedTrackItem } from '../services/listeningHistoryService';

describe('Smart Taste-Based Next Track & Recommendation Engine', () => {
  test('prioritizes matching language & artist tracks when playing a Kannada hit', () => {
    const singara = INITIAL_TRACKS.find((t) => t.id === 'kn-trk-1')!;
    assert.ok(singara, 'Expected Singara Siriye (kn-trk-1) in catalog');

    const recs = getPersonalizedNextTracks({
      currentTrack: singara,
      catalog: INITIAL_TRACKS,
      likedTrackIds: new Set(['kn-trk-1']),
      recentHistory: [],
      skippedTracks: [],
      limit: 5,
    });

    assert.equal(recs.length, 5);
    // Top recommendations should be Kannada tracks matching Singara Siriye's language/artist vibe
    assert.equal(recs[0].track.language, 'kannada');
    assert.notEqual(recs[0].track.id, singara.id);
    assert.ok(
      recs[0].reason.includes('Vijay Prakash') ||
        recs[0].reason.includes('B. Ajaneesh Loknath') ||
        recs[0].reason.includes('Ananya Bhat') ||
        recs[0].reason.includes('Kannada') ||
        recs[0].reason.includes('Singara Siriye')
    );
  });

  test('shifts recommendations cleanly when switching to Hindi Bollywood music', () => {
    const kesariya = INITIAL_TRACKS.find((t) => t.id === 'hn-trk-1')!;
    assert.ok(kesariya, 'Expected Kesariya (hn-trk-1) in catalog');

    const recs = getPersonalizedNextTracks({
      currentTrack: kesariya,
      catalog: INITIAL_TRACKS,
      likedTrackIds: new Set(['hn-trk-1']),
      recentHistory: [],
      skippedTracks: [],
      limit: 5,
    });

    assert.equal(recs[0].track.language, 'hindi');
    assert.ok(
      recs.slice(0, 3).some((r) => r.track.artist.toLowerCase().includes('arijit')),
      'Expected Arijit Singh collaborations among top Hindi matches'
    );
  });

  test('heavily penalizes early-skipped tracks so they are not recommended next', () => {
    const singara = INITIAL_TRACKS.find((t) => t.id === 'kn-trk-1')!;
    const belageddu = INITIAL_TRACKS.find((t) => t.id === 'kn-trk-7')!;
    assert.ok(singara && belageddu, 'Expected Kannada tracks in catalog');

    const skipped: SkippedTrackItem[] = [
      {
        trackId: belageddu.id,
        title: belageddu.title,
        artist: belageddu.artist,
        genre: belageddu.genre,
        skippedAt: Date.now(),
        listenedSeconds: 5,
        reason: 'early_skip',
        coverUrl: belageddu.coverUrl,
      },
    ];

    const recs = getPersonalizedNextTracks({
      currentTrack: singara,
      catalog: INITIAL_TRACKS,
      likedTrackIds: new Set(),
      recentHistory: [],
      skippedTracks: skipped,
      limit: 5,
    });

    assert.ok(
      !recs.slice(0, 5).some((r) => r.track.id === belageddu.id),
      'Skipped track should not appear at the top of Up Next'
    );
  });

  test('avoids bouncing back to tracks already played in the current session', () => {
    const singara = INITIAL_TRACKS.find((t) => t.id === 'kn-trk-1')!;
    assert.ok(singara);
    const firstPick = pickSmartNextTrack({
      currentTrack: singara,
      catalog: INITIAL_TRACKS,
      likedTrackIds: new Set([singara.id]),
      recentHistory: [],
      skippedTracks: [],
    });
    assert.ok(firstPick);

    const secondPick = pickSmartNextTrack({
      currentTrack: firstPick,
      catalog: INITIAL_TRACKS,
      likedTrackIds: new Set([singara.id]),
      recentHistory: [],
      skippedTracks: [],
      sessionPlayedIds: new Set([singara.id, firstPick.id]),
    });

    assert.ok(secondPick);
    assert.notEqual(secondPick.id, singara.id);
    assert.notEqual(secondPick.id, firstPick.id);
  });

  test('learns from completed listening history to boost matching artists and vibes', () => {
    const sulthan = INITIAL_TRACKS.find((t) => t.id === 'kn-trk-6')!;
    const sse = INITIAL_TRACKS.find((t) => t.id === 'kn-trk-8')!;
    assert.ok(sulthan && sse, 'Expected Sulthan and SSE in catalog');

    const baselineRecs = getPersonalizedNextTracks({
      currentTrack: sulthan,
      catalog: INITIAL_TRACKS,
      likedTrackIds: new Set(),
      recentHistory: [],
      skippedTracks: [],
      limit: INITIAL_TRACKS.length,
    });
    const baselineSanjithRank = baselineRecs.findIndex(
      (r) => r.track.artist.toLowerCase().includes('sanjith hegde') && r.track.id !== sse.id
    );

    const history: PlayHistoryItem[] = [
      {
        trackId: sse.id,
        title: sse.title,
        artist: sse.artist,
        artistId: sse.artistId,
        genre: sse.genre,
        playedAt: Date.now() - 120000,
        listenedSeconds: 240,
        completed: true,
        coverUrl: sse.coverUrl,
        obscurity: sse.obscurity,
        energy: sse.energy,
        melancholy: sse.melancholy,
        language: sse.language,
      },
    ];

    const learnedRecs = getPersonalizedNextTracks({
      currentTrack: sulthan,
      catalog: INITIAL_TRACKS,
      likedTrackIds: new Set([sse.id]),
      recentHistory: history,
      skippedTracks: [],
      limit: 12,
    });

    const sanjithRecIdx = learnedRecs.findIndex(
      (r) => r.track.artist.toLowerCase().includes('sanjith hegde') && r.track.id !== sse.id
    );
    assert.ok(
      sanjithRecIdx !== -1 && (baselineSanjithRank === -1 || sanjithRecIdx < baselineSanjithRank),
      'Expected completed history + liked song to promote matching artist tracks higher in Up Next'
    );
  });

  test('shuffle mode still selects from top personalized matches', () => {
    const singara = INITIAL_TRACKS.find((t) => t.id === 'kn-trk-1')!;
    assert.ok(singara);
    const top5 = getPersonalizedNextTracks({
      currentTrack: singara,
      catalog: INITIAL_TRACKS,
      likedTrackIds: new Set([singara.id]),
      recentHistory: [],
      skippedTracks: [],
      limit: 5,
    }).map((r) => r.track.id);

    const picked = pickSmartNextTrack(
      {
        currentTrack: singara,
        catalog: INITIAL_TRACKS,
        likedTrackIds: new Set([singara.id]),
        recentHistory: [],
        skippedTracks: [],
      },
      true,
      () => 0.6
    );

    assert.ok(picked && top5.includes(picked.id));
  });
});
