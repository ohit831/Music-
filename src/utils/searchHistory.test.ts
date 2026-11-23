/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addSearchEntry,
  rankSearchShortcuts,
  SearchHistoryEntry,
} from './searchHistory.ts';

test('addSearchEntry deduplicates case-insensitively and increments count', () => {
  const t1 = 1_000_000;
  const t2 = 2_000_000;
  let entries: SearchHistoryEntry[] = [];
  entries = addSearchEntry(entries, 'Kesariya', 'search_view', t1);
  entries = addSearchEntry(entries, '  kesariya  ', 'fast_bar', t2);

  assert.equal(entries.length, 1);
  assert.equal(entries[0].count, 2);
  assert.equal(entries[0].query, 'kesariya');
  assert.equal(entries[0].lastSearchedAt, t2);
  assert.equal(entries[0].source, 'fast_bar');
});

test('addSearchEntry ignores single-character or empty queries', () => {
  const entries = addSearchEntry([], 'a', 'search_view', 1000);
  assert.equal(entries.length, 0);
});

test('rankSearchShortcuts boosts frequently searched queries and recent searches', () => {
  const now = 10_000_000_000;
  const entries: SearchHistoryEntry[] = [
    {
      query: 'Old Rare Query',
      normalized: 'old rare query',
      count: 1,
      lastSearchedAt: now - 10 * 24 * 3600 * 1000,
      source: 'search_view',
    },
    {
      query: 'Arijit Singh',
      normalized: 'arijit singh',
      count: 5,
      lastSearchedAt: now - 3600 * 1000,
      source: 'youtube_controller',
    },
    {
      query: 'Kannada Gym',
      normalized: 'kannada gym',
      count: 2,
      lastSearchedAt: now - 1000,
      source: 'fast_bar',
    },
  ];

  const ranked = rankSearchShortcuts(entries, 5, now);
  assert.equal(ranked[0].query, 'Arijit Singh');
  assert.equal(ranked[1].query, 'Kannada Gym');
  assert.equal(ranked[2].query, 'Old Rare Query');
});
