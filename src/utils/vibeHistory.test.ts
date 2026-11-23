import test from 'node:test';
import assert from 'node:assert/strict';
import type { PlayHistoryItem } from '../services/listeningHistoryService';
import { buildVibeHistorySummary, VibeMatchUsageEvent } from './vibeHistory';

function makePlay(id: string, energy: number, melancholy: number, playedAt: number, completed = true): PlayHistoryItem {
  return {
    trackId: id,
    title: `Song ${id}`,
    artist: `Artist ${id}`,
    artistId: `art-${id}`,
    genre: 'Indie',
    playedAt,
    listenedSeconds: completed ? 200 : 40,
    completed,
    coverUrl: 'https://example.com/c.jpg',
    obscurity: 0.5,
    energy,
    melancholy,
  };
}

function makeVibeEvent(
  id: string,
  energy: number,
  melancholy: number,
  usedAt: number,
  source: 'toggle' | 'dynamic_switch' = 'toggle'
): VibeMatchUsageEvent {
  return {
    id,
    trackId: `trk-${id}`,
    trackTitle: `Vibe ${id}`,
    artist: `Artist ${id}`,
    energy,
    melancholy,
    vibeLabel: energy > 0.7 ? 'High-Energy Euphoria' : 'Deep Melancholy',
    matchedCount: 12,
    usedAt,
    source,
  };
}

test('buildVibeHistorySummary handles empty listening and Vibe Match history gracefully', () => {
  const summary = buildVibeHistorySummary([], []);
  assert.equal(summary.hasData, false);
  assert.equal(summary.recentSessionCount, 0);
  assert.equal(summary.vibeMatchUseCount, 0);
  assert.equal(summary.vibeMatchAverageEnergy, null);
  assert.equal(summary.dominantVibeLabel, 'Balanced Mood');
});

test('buildVibeHistorySummary blends recent listening sessions and weighted Vibe Match usage accurately', () => {
  const plays = [
    makePlay('p1', 0.3, 0.8, 1000, true),
    makePlay('p2', 0.4, 0.7, 2000, false),
  ];
  const vibes = [
    makeVibeEvent('v1', 0.9, 0.1, 3000, 'toggle'),
    makeVibeEvent('v2', 0.86, 0.14, 4000, 'dynamic_switch'),
  ];

  const summary = buildVibeHistorySummary(plays, vibes);
  assert.equal(summary.hasData, true);
  assert.equal(summary.recentSessionCount, 2);
  assert.equal(summary.vibeMatchUseCount, 2);
  assert.ok(summary.listeningAverageEnergy !== null && summary.listeningAverageEnergy < 0.4);
  assert.ok(summary.vibeMatchAverageEnergy !== null && summary.vibeMatchAverageEnergy > 0.85);
  // Blended energy sits between listening avg (~0.34) and vibe match avg (~0.88), pulled slightly toward higher-weight Vibe Match
  assert.ok(summary.averageEnergy > 0.6 && summary.averageEnergy < 0.75);
  assert.equal(summary.recentEntries[0].id, 'vm-v2');
  assert.equal(summary.recentEntries[0].source, 'vibe_match');
});

test('buildVibeHistorySummary detects rising energy and brighter mood trends across timeline', () => {
  const plays = [
    makePlay('old1', 0.25, 0.85, 1000),
    makePlay('old2', 0.3, 0.8, 2000),
    makePlay('new1', 0.85, 0.15, 3000),
    makePlay('new2', 0.92, 0.1, 4000),
  ];

  const summary = buildVibeHistorySummary(plays, []);
  assert.equal(summary.energyTrend, 'rising');
  assert.equal(summary.melancholyTrend, 'brighter');
  assert.ok(summary.vibeDistribution.length >= 2);
});

test('buildVibeHistorySummary clamps out-of-range sonic metadata safely', () => {
  const plays = [makePlay('weird', 1.8, -0.5, 5000)];
  const summary = buildVibeHistorySummary(plays, []);
  assert.equal(summary.averageEnergy, 1);
  assert.equal(summary.averageMelancholy, 0);
  assert.equal(summary.dominantVibeLabel, 'High-Energy Euphoria');
});
