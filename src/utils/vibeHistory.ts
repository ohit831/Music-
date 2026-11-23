/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { PlayHistoryItem } from '../services/listeningHistoryService';
import { describeSonicVibe } from './vibeMatch';

export interface VibeMatchUsageEvent {
  id: string;
  trackId: string;
  trackTitle: string;
  artist: string;
  energy: number;
  melancholy: number;
  vibeLabel: string;
  matchedCount: number;
  usedAt: number;
  source: 'toggle' | 'dynamic_switch';
}

export interface VibeHistoryEntry {
  id: string;
  title: string;
  artist: string;
  energy: number;
  melancholy: number;
  vibeLabel: string;
  timestamp: number;
  source: 'vibe_match' | 'listening';
}

export interface VibeQuadrantShare {
  label: string;
  count: number;
  percentage: number;
}

export interface VibeHistorySummary {
  hasData: boolean;
  averageEnergy: number; // 0 to 1 (blended across recent sessions + Vibe Match usage)
  averageMelancholy: number; // 0 to 1
  dominantVibeLabel: string;
  listeningAverageEnergy: number | null;
  listeningAverageMelancholy: number | null;
  vibeMatchAverageEnergy: number | null;
  vibeMatchAverageMelancholy: number | null;
  recentSessionCount: number;
  vibeMatchUseCount: number;
  energyTrend: 'rising' | 'calming' | 'steady';
  melancholyTrend: 'deeper' | 'brighter' | 'steady';
  vibeDistribution: VibeQuadrantShare[];
  recentEntries: VibeHistoryEntry[];
}

function clampUnit(value: unknown, fallback = 0.5): number {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, Math.min(1, value));
}

function computeWeightedAverage(
  points: Array<{ energy: number; melancholy: number; weight: number }>
): { energy: number; melancholy: number } | null {
  if (points.length === 0) return null;
  let weightSum = 0;
  let energySum = 0;
  let melancholySum = 0;

  for (const pt of points) {
    const w = pt.weight > 0 ? pt.weight : 1;
    weightSum += w;
    energySum += clampUnit(pt.energy) * w;
    melancholySum += clampUnit(pt.melancholy) * w;
  }

  if (weightSum <= 0) return null;
  return {
    energy: Number((energySum / weightSum).toFixed(3)),
    melancholy: Number((melancholySum / weightSum).toFixed(3)),
  };
}

/**
 * Summarize a listener's average sonic preferences (Energy & Melancholy),
 * directional trends, mood distribution, and recent timeline from both
 * recent listening sessions and Vibe Match usage.
 */
export function buildVibeHistorySummary(
  recentHistory: PlayHistoryItem[],
  vibeMatchEvents: VibeMatchUsageEvent[],
  maxRecentSessions = 20
): VibeHistorySummary {
  const recentPlays = [...recentHistory]
    .sort((a, b) => b.playedAt - a.playedAt)
    .slice(0, Math.max(1, maxRecentSessions));

  const recentVibes = [...vibeMatchEvents]
    .sort((a, b) => b.usedAt - a.usedAt)
    .slice(0, 30);

  const listeningPoints = recentPlays.map((item) => ({
    energy: clampUnit(item.energy),
    melancholy: clampUnit(item.melancholy),
    weight: item.completed ? 1.25 : 1,
  }));

  // Explicit Vibe Match activations carry higher preference signal than passive plays
  const vibeMatchPoints = recentVibes.map((evt) => ({
    energy: clampUnit(evt.energy),
    melancholy: clampUnit(evt.melancholy),
    weight: evt.source === 'toggle' ? 1.75 : 1.4,
  }));

  const listeningAvg = computeWeightedAverage(listeningPoints);
  const vibeMatchAvg = computeWeightedAverage(vibeMatchPoints);
  const blendedAvg = computeWeightedAverage([...listeningPoints, ...vibeMatchPoints]);

  if (!blendedAvg) {
    return {
      hasData: false,
      averageEnergy: 0.5,
      averageMelancholy: 0.5,
      dominantVibeLabel: 'Balanced Mood',
      listeningAverageEnergy: null,
      listeningAverageMelancholy: null,
      vibeMatchAverageEnergy: null,
      vibeMatchAverageMelancholy: null,
      recentSessionCount: 0,
      vibeMatchUseCount: 0,
      energyTrend: 'steady',
      melancholyTrend: 'steady',
      vibeDistribution: [],
      recentEntries: [],
    };
  }

  // Merge timeline ordered newest -> oldest for trends & feed
  const combinedTimeline: VibeHistoryEntry[] = [
    ...recentVibes.map((evt) => {
      const energy = clampUnit(evt.energy);
      const melancholy = clampUnit(evt.melancholy);
      return {
        id: `vm-${evt.id}`,
        title: evt.trackTitle,
        artist: evt.artist,
        energy,
        melancholy,
        vibeLabel: evt.vibeLabel || describeSonicVibe({ energy, melancholy }),
        timestamp: evt.usedAt,
        source: 'vibe_match' as const,
      };
    }),
    ...recentPlays.map((play, idx) => {
      const energy = clampUnit(play.energy);
      const melancholy = clampUnit(play.melancholy);
      return {
        id: `play-${play.trackId}-${play.playedAt}-${idx}`,
        title: play.title,
        artist: play.artist,
        energy,
        melancholy,
        vibeLabel: describeSonicVibe({ energy, melancholy }),
        timestamp: play.playedAt,
        source: 'listening' as const,
      };
    }),
  ].sort((a, b) => b.timestamp - a.timestamp);

  // Trend detection: compare newest half vs older half (requires >= 4 samples)
  let energyTrend: VibeHistorySummary['energyTrend'] = 'steady';
  let melancholyTrend: VibeHistorySummary['melancholyTrend'] = 'steady';

  if (combinedTimeline.length >= 4) {
    const split = Math.floor(combinedTimeline.length / 2);
    const newer = combinedTimeline.slice(0, split);
    const older = combinedTimeline.slice(split);

    const newerAvgE = newer.reduce((s, p) => s + p.energy, 0) / newer.length;
    const olderAvgE = older.reduce((s, p) => s + p.energy, 0) / older.length;
    const deltaE = newerAvgE - olderAvgE;
    if (deltaE >= 0.07) energyTrend = 'rising';
    else if (deltaE <= -0.07) energyTrend = 'calming';

    const newerAvgM = newer.reduce((s, p) => s + p.melancholy, 0) / newer.length;
    const olderAvgM = older.reduce((s, p) => s + p.melancholy, 0) / older.length;
    const deltaM = newerAvgM - olderAvgM;
    if (deltaM >= 0.07) melancholyTrend = 'deeper';
    else if (deltaM <= -0.07) melancholyTrend = 'brighter';
  }

  // Distribution across vibe labels
  const labelCounts = new Map<string, number>();
  for (const entry of combinedTimeline) {
    labelCounts.set(entry.vibeLabel, (labelCounts.get(entry.vibeLabel) || 0) + 1);
  }
  const totalEntries = combinedTimeline.length || 1;
  const vibeDistribution: VibeQuadrantShare[] = Array.from(labelCounts.entries())
    .map(([label, count]) => ({
      label,
      count,
      percentage: Math.round((count / totalEntries) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return {
    hasData: true,
    averageEnergy: blendedAvg.energy,
    averageMelancholy: blendedAvg.melancholy,
    dominantVibeLabel: describeSonicVibe({
      energy: blendedAvg.energy,
      melancholy: blendedAvg.melancholy,
    }),
    listeningAverageEnergy: listeningAvg?.energy ?? null,
    listeningAverageMelancholy: listeningAvg?.melancholy ?? null,
    vibeMatchAverageEnergy: vibeMatchAvg?.energy ?? null,
    vibeMatchAverageMelancholy: vibeMatchAvg?.melancholy ?? null,
    recentSessionCount: recentPlays.length,
    vibeMatchUseCount: recentVibes.length,
    energyTrend,
    melancholyTrend,
    vibeDistribution,
    recentEntries: combinedTimeline.slice(0, 6),
  };
}
