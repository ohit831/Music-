/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SearchSource = 'search_view' | 'fast_bar' | 'youtube_controller';

export interface SearchHistoryEntry {
  query: string;
  normalized: string;
  count: number;
  lastSearchedAt: number;
  source: SearchSource;
}

const STORAGE_KEY = 'apna_music_search_history_v1';
const EVENT_NAME = 'apnamusic:search-history-changed';
const MAX_ENTRIES = 24;

function normalizeQuery(query: string): string {
  return query.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function loadSearchHistory(): SearchHistoryEntry[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is SearchHistoryEntry =>
        Boolean(item) &&
        typeof item.query === 'string' &&
        typeof item.normalized === 'string' &&
        typeof item.count === 'number' &&
        typeof item.lastSearchedAt === 'number'
    );
  } catch {
    return [];
  }
}

export function saveSearchHistory(entries: SearchHistoryEntry[]): void {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
    } catch {
      // Ignore storage quota errors
    }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  }
}

/**
 * Pure update: add or bump a search query in an existing list.
 */
export function addSearchEntry(
  entries: SearchHistoryEntry[],
  rawQuery: string,
  source: SearchSource = 'search_view',
  now: number = Date.now()
): SearchHistoryEntry[] {
  const cleanQuery = rawQuery.trim().replace(/\s+/g, ' ');
  if (cleanQuery.length < 2) return entries;

  const norm = normalizeQuery(cleanQuery);
  const existingIdx = entries.findIndex((e) => e.normalized === norm);

  let updated: SearchHistoryEntry[];
  if (existingIdx !== -1) {
    const existing = entries[existingIdx];
    const bumped: SearchHistoryEntry = {
      query: cleanQuery,
      normalized: norm,
      count: existing.count + 1,
      lastSearchedAt: now,
      source,
    };
    updated = [bumped, ...entries.filter((_, idx) => idx !== existingIdx)];
  } else {
    const created: SearchHistoryEntry = {
      query: cleanQuery,
      normalized: norm,
      count: 1,
      lastSearchedAt: now,
      source,
    };
    updated = [created, ...entries];
  }

  return updated.slice(0, MAX_ENTRIES);
}

/**
 * Rank shortcuts combining frequency and recency so top frequent + recent searches surface first.
 */
export function rankSearchShortcuts(
  entries: SearchHistoryEntry[],
  limit = 10,
  now: number = Date.now()
): SearchHistoryEntry[] {
  const oneDayMs = 24 * 60 * 60 * 1000;
  return [...entries]
    .sort((a, b) => {
      const aAgeDays = Math.max(0, (now - a.lastSearchedAt) / oneDayMs);
      const bAgeDays = Math.max(0, (now - b.lastSearchedAt) / oneDayMs);
      const aScore = a.count * 2.5 + Math.max(0, 10 - aAgeDays * 1.5);
      const bScore = b.count * 2.5 + Math.max(0, 10 - bAgeDays * 1.5);
      if (Math.abs(bScore - aScore) > 0.01) {
        return bScore - aScore;
      }
      return b.lastSearchedAt - a.lastSearchedAt;
    })
    .slice(0, limit);
}

export function recordSearchHistory(
  query: string,
  source: SearchSource = 'search_view'
): SearchHistoryEntry[] {
  const current = loadSearchHistory();
  const next = addSearchEntry(current, query, source);
  if (next !== current) {
    saveSearchHistory(next);
  }
  return next;
}

export function getSearchShortcuts(limit = 8): SearchHistoryEntry[] {
  return rankSearchShortcuts(loadSearchHistory(), limit);
}

export function removeSearchShortcut(query: string): SearchHistoryEntry[] {
  const norm = normalizeQuery(query);
  const next = loadSearchHistory().filter((e) => e.normalized !== norm);
  saveSearchHistory(next);
  return next;
}

export function clearSearchHistory(): void {
  saveSearchHistory([]);
}

export function subscribeSearchHistory(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}
