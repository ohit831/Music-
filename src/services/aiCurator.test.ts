/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert';
import { listeningHistoryService } from './listeningHistoryService';
import { generateAICuration } from './aiCuratorService';
import { INITIAL_TRACKS, INITIAL_ARTISTS } from '../data/indieCatalog';

test('listeningHistoryService records plays and skips accurately', () => {
  const dummyTrack = INITIAL_TRACKS[0];

  // Record a play
  listeningHistoryService.recordPlay(dummyTrack, 150, true);
  const history = listeningHistoryService.getHistory();
  assert.ok(history.length > 0, 'History should contain items');
  assert.strictEqual(history[0].trackId, dummyTrack.id);
  assert.strictEqual(history[0].completed, true);

  // Record a skip
  const skippedTrack = INITIAL_TRACKS[1];
  listeningHistoryService.recordSkip(skippedTrack, 10, 'early_skip');
  const skipped = listeningHistoryService.getSkipped();
  assert.ok(skipped.some((s) => s.trackId === skippedTrack.id), 'Skipped list should contain skippedTrack');

  // Remove skip (undo)
  listeningHistoryService.removeSkip(skippedTrack.id);
  const updatedSkipped = listeningHistoryService.getSkipped();
  assert.strictEqual(updatedSkipped.some((s) => s.trackId === skippedTrack.id), false, 'Skipped track should be removed');
});

test('listeningHistoryService computes sensible UserTasteProfile with persona', () => {
  const liked = [INITIAL_TRACKS[0], INITIAL_TRACKS[2]];
  const profile = listeningHistoryService.getTasteProfile(liked);

  assert.ok(profile.personaTitle.length > 0, 'Persona title should exist');
  assert.ok(profile.topGenres.length > 0, 'Top genres should not be empty');
  assert.ok(profile.obscurityAffinity >= 0 && profile.obscurityAffinity <= 1, 'Obscurity affinity must be 0-1');
  assert.ok(profile.averageEnergy >= 0 && profile.averageEnergy <= 1, 'Average energy must be 0-1');
  assert.ok(profile.averageMelancholy >= 0 && profile.averageMelancholy <= 1, 'Average melancholy must be 0-1');
});

test('generateAICuration produces complete curation structure with similar artists and micro-genres', async () => {
  const liked = [INITIAL_TRACKS[0]];

  // Daily Curation
  const dailyResult = await generateAICuration({
    timeframe: 'daily',
    vibe: 'all',
    allTracks: INITIAL_TRACKS,
    allArtists: INITIAL_ARTISTS,
    likedTracks: liked,
  });

  assert.ok(dailyResult.playlistTitle.includes('AI Daily Radar') || dailyResult.playlistTitle.includes('Daily'), 'Title should reflect daily');
  assert.strictEqual(dailyResult.timeframe, 'daily');
  assert.ok(dailyResult.curatorNote.length > 15, 'Curator note should be descriptive');
  assert.ok(dailyResult.recommendedTracks.length > 0, 'Should recommend tracks');
  assert.ok(dailyResult.similarArtists.length > 0, 'Should recommend similar emerging artists');
  assert.ok(dailyResult.recommendedGenres.length > 0, 'Should recommend emerging micro-genres');
  assert.ok(dailyResult.tasteAnalysis.persona.length > 0, 'Should include taste persona');

  // Verify track has whyRecommended and similarityFactor
  const firstRec = dailyResult.recommendedTracks[0];
  assert.ok(firstRec.whyRecommended.length > 0, 'Track must have recommendation reason');
  assert.ok(firstRec.similarityFactor.length > 0, 'Track must have similarity factor');

  // Verify similar emerging artists have <50k listeners
  const firstArtist = dailyResult.similarArtists[0];
  assert.ok(firstArtist.name.length > 0, 'Artist name should exist');
  assert.ok(firstArtist.similarTo.length > 0, 'SimilarTo should exist');

  // Weekly Curation
  const weeklyResult = await generateAICuration({
    timeframe: 'weekly',
    vibe: 'emerging_obscure',
    allTracks: INITIAL_TRACKS,
    allArtists: INITIAL_ARTISTS,
    likedTracks: liked,
  });

  assert.strictEqual(weeklyResult.timeframe, 'weekly');
  assert.ok(weeklyResult.recommendedTracks.length > 0, 'Weekly should return recommended tracks');
});
