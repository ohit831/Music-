/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IndieTrack } from './musicDiscovery';

export type LyricLineKind = 'lyric' | 'heading' | 'spacer';

export interface SyncedLyricLine {
  id: string;
  index: number;
  text: string;
  startTime: number; // seconds
  endTime: number; // seconds
  kind: LyricLineKind;
  hasExplicitTimestamp: boolean;
}

export interface ActiveLyricState {
  activeIndex: number; // index inside SyncedLyricLine[], or -1 if none active
  lineProgress: number; // 0 to 1 progress through the active line
}

const LRC_LINE_REGEX = /^\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]\s*(.*)$/;
const SECTION_HEADING_REGEX = /^\[[^\]]+\]$/;

/**
 * Parse an LRC timestamp prefix like "[01:12.50] Some lyric" into seconds + clean text.
 * Returns null for non-timestamp lines (including section headings like "[Chorus]").
 */
export function parseLrcLine(rawLine: string): { time: number; text: string } | null {
  const match = rawLine.trim().match(LRC_LINE_REGEX);
  if (!match) return null;

  const mins = Number.parseInt(match[1], 10);
  const secs = Number.parseInt(match[2], 10);
  const fracRaw = match[3] || '';
  const frac = fracRaw
    ? Number.parseInt(fracRaw.padEnd(3, '0').slice(0, 3), 10) / 1000
    : 0;

  if (!Number.isFinite(mins) || !Number.isFinite(secs) || secs >= 60) {
    return null;
  }

  return {
    time: Number((mins * 60 + secs + frac).toFixed(2)),
    text: match[4].trim(),
  };
}

/**
 * Format timestamp in seconds to M:SS for lyric rows.
 */
export function formatLyricTimestamp(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * Build a deterministic, time-synced lyric timeline from a track's existing metadata.
 * Priority:
 *   1. Explicit `track.syncedLyrics` entries ({ time, text })
 *   2. Explicit LRC-prefixed timestamps inside `track.lyrics` ("[00:14.2] ...")
 *   3. Weighted duration-mapped timing across `track.lyrics` using `durationOverride || track.duration`
 */
export function buildSyncedLyrics(
  track: Pick<IndieTrack, 'id' | 'duration' | 'lyrics' | 'syncedLyrics'> | null,
  durationOverride?: number
): SyncedLyricLine[] {
  if (!track) return [];

  const effectiveDuration =
    typeof durationOverride === 'number' && Number.isFinite(durationOverride) && durationOverride > 1
      ? durationOverride
      : typeof track.duration === 'number' && Number.isFinite(track.duration) && track.duration > 1
      ? track.duration
      : 180;

  // 1. Explicit structured syncedLyrics metadata
  if (Array.isArray(track.syncedLyrics) && track.syncedLyrics.length > 0) {
    const sorted = [...track.syncedLyrics]
      .filter((item) => item && typeof item.time === 'number' && Number.isFinite(item.time))
      .sort((a, b) => a.time - b.time);

    return sorted.map((item, idx) => {
      const nextTime = sorted[idx + 1]?.time ?? Math.max(effectiveDuration, item.time + 4);
      const startTime = Math.max(0, Number(item.time.toFixed(2)));
      const endTime = Math.max(startTime + 0.5, Number(nextTime.toFixed(2)));
      const trimmed = (item.text || '').trim();
      const kind: LyricLineKind = !trimmed
        ? 'spacer'
        : SECTION_HEADING_REGEX.test(trimmed)
        ? 'heading'
        : 'lyric';

      return {
        id: `${track.id}-sync-${idx}`,
        index: idx,
        text: trimmed,
        startTime,
        endTime,
        kind,
        hasExplicitTimestamp: true,
      };
    });
  }

  const rawLyrics = track.lyrics;
  if (!Array.isArray(rawLyrics) || rawLyrics.length === 0) {
    return [];
  }

  // 2. Check for LRC-style timestamped lines inside track.lyrics
  const parsedLrc = rawLyrics.map((line) => parseLrcLine(line || ''));
  const hasAnyLrc = parsedLrc.some((entry) => entry !== null);

  if (hasAnyLrc) {
    const items: Array<{ text: string; startTime: number; kind: LyricLineKind }> = [];
    let lastTime = 0;

    for (let i = 0; i < rawLyrics.length; i++) {
      const parsed = parsedLrc[i];
      if (parsed) {
        lastTime = Math.max(0, parsed.time);
        const kind: LyricLineKind = !parsed.text
          ? 'spacer'
          : SECTION_HEADING_REGEX.test(parsed.text)
          ? 'heading'
          : 'lyric';
        items.push({ text: parsed.text, startTime: lastTime, kind });
      } else {
        const trimmed = (rawLyrics[i] || '').trim();
        const kind: LyricLineKind = !trimmed
          ? 'spacer'
          : SECTION_HEADING_REGEX.test(trimmed)
          ? 'heading'
          : 'lyric';
        items.push({ text: trimmed, startTime: lastTime, kind });
      }
    }

    return items.map((item, idx) => {
      let nextLyricTime = effectiveDuration;
      for (let j = idx + 1; j < items.length; j++) {
        if (items[j].kind === 'lyric' && items[j].startTime > item.startTime) {
          nextLyricTime = items[j].startTime;
          break;
        }
      }
      const endTime = Math.max(item.startTime + 0.5, Number(nextLyricTime.toFixed(2)));
      return {
        id: `${track.id}-lrc-${idx}`,
        index: idx,
        text: item.text,
        startTime: Number(item.startTime.toFixed(2)),
        endTime,
        kind: item.kind,
        hasExplicitTimestamp: true,
      };
    });
  }

  // 3. Derive proportional timeline across existing plain-text track.lyrics metadata
  const classified = rawLyrics.map((raw) => {
    const text = (raw || '').trim();
    if (!text) return { text: '', kind: 'spacer' as LyricLineKind, weight: 0.35 };
    if (SECTION_HEADING_REGEX.test(text)) {
      return { text, kind: 'heading' as LyricLineKind, weight: 0.25 };
    }
    // Weight sung lines mildly by character count so longer lines stay highlighted slightly longer
    const charWeight = Math.max(0.75, Math.min(1.45, text.length / 34));
    return { text, kind: 'lyric' as LyricLineKind, weight: charWeight };
  });

  const lyricIndices: number[] = [];
  classified.forEach((item, idx) => {
    if (item.kind === 'lyric') lyricIndices.push(idx);
  });

  if (lyricIndices.length === 0) {
    return classified.map((item, idx) => ({
      id: `${track.id}-line-${idx}`,
      index: idx,
      text: item.text,
      startTime: 0,
      endTime: effectiveDuration,
      kind: item.kind,
      hasExplicitTimestamp: false,
    }));
  }

  // Compute total weight starting from the first sung lyric through the last sung lyric
  const firstLyricIdx = lyricIndices[0];
  let totalWeight = 0;
  for (let i = firstLyricIdx; i < classified.length; i++) {
    totalWeight += classified[i].weight;
  }

  // Keep a small outro tail (4%) while starting the first sung line right at 0s
  // so line 1 is immediately highlighted when playback starts or resets to 0:00.
  const activeSpan = Math.max(1, effectiveDuration * 0.96);
  let cursorWeight = 0;
  const startTimes: number[] = new Array(classified.length).fill(0);

  for (let i = 0; i < classified.length; i++) {
    if (i <= firstLyricIdx) {
      startTimes[i] = 0;
      if (i === firstLyricIdx) {
        cursorWeight += classified[i].weight;
      }
    } else {
      startTimes[i] = Number(((cursorWeight / totalWeight) * activeSpan).toFixed(2));
      cursorWeight += classified[i].weight;
    }
  }

  return classified.map((item, idx) => {
    const startTime = startTimes[idx];
    let endTime = effectiveDuration;

    if (item.kind === 'lyric') {
      const nextLyricIdx = lyricIndices.find((li) => li > idx);
      if (nextLyricIdx !== undefined) {
        endTime = startTimes[nextLyricIdx];
      } else {
        endTime = effectiveDuration;
      }
    } else {
      const nextTime = startTimes[idx + 1] ?? effectiveDuration;
      endTime = Math.max(startTime, nextTime);
    }

    return {
      id: `${track.id}-line-${idx}`,
      index: idx,
      text: item.text,
      startTime,
      endTime: Math.max(startTime + 0.25, Number(endTime.toFixed(2))),
      kind: item.kind,
      hasExplicitTimestamp: false,
    };
  });
}

/**
 * Determine which lyric line is currently active for a given playback currentTime,
 * along with normalized 0..1 progress across that line.
 */
export function getActiveLyricState(
  lines: SyncedLyricLine[],
  currentTime: number
): ActiveLyricState {
  if (!lines.length || !Number.isFinite(currentTime)) {
    return { activeIndex: -1, lineProgress: 0 };
  }

  const safeTime = Math.max(0, currentTime);
  let activeIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.kind !== 'lyric') continue;
    if (safeTime + 0.05 >= line.startTime) {
      activeIndex = i;
    } else {
      break;
    }
  }

  if (activeIndex === -1) {
    return { activeIndex: -1, lineProgress: 0 };
  }

  const activeLine = lines[activeIndex];
  const span = Math.max(0.25, activeLine.endTime - activeLine.startTime);
  const progress = Math.max(0, Math.min(1, (safeTime - activeLine.startTime) / span));

  return {
    activeIndex,
    lineProgress: Number(progress.toFixed(3)),
  };
}
