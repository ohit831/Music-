/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Search, X, Play, History, Trash2 } from 'lucide-react';
import { QUICK_VIBE_PRESETS } from '../utils/fastAccess';
import {
  clearSearchHistory,
  getSearchShortcuts,
  recordSearchHistory,
  removeSearchShortcut,
  SearchHistoryEntry,
  subscribeSearchHistory,
} from '../utils/searchHistory';

interface FastAccessBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedVibe: string;
  onSelectVibe: (vibeId: string) => void;
  onQuickPlay: () => void;
  totalMatches: number;
}

export const FastAccessBar: React.FC<FastAccessBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedVibe,
  onSelectVibe,
  onQuickPlay,
  totalMatches,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const recordTimerRef = useRef<number | null>(null);
  const [shortcuts, setShortcuts] = useState<SearchHistoryEntry[]>(() => getSearchShortcuts(8));

  useEffect(() => {
    const sync = () => setShortcuts(getSearchShortcuts(8));
    sync();
    return subscribeSearchHistory(sync);
  }, []);

  // Global keyboard shortcut: press "/" or Ctrl/Cmd+K to focus fast search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if ((e.key === '/' && !isTyping) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const scheduleHistoryRecord = (val: string) => {
    if (recordTimerRef.current) {
      window.clearTimeout(recordTimerRef.current);
    }
    if (val.trim().length >= 2) {
      recordTimerRef.current = window.setTimeout(() => {
        recordSearchHistory(val, 'fast_bar');
      }, 650);
    }
  };

  const handleInputChange = (val: string) => {
    onSearchChange(val);
    scheduleHistoryRecord(val);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim().length >= 2) {
      if (recordTimerRef.current) window.clearTimeout(recordTimerRef.current);
      recordSearchHistory(searchQuery, 'fast_bar');
    }
    onQuickPlay();
  };

  const handleUseShortcut = (term: string) => {
    recordSearchHistory(term, 'fast_bar');
    onSelectVibe('all');
    onSearchChange(term);
  };

  return (
    <div className="space-y-3">
      {/* Discover Music Header + Clean Search Bar (Screenshot 1) */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Discover music
        </h1>
        {searchQuery && (
          <span className="text-xs font-mono tabular-nums text-sky-400">
            {totalMatches} songs matching
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2.5">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Search playlists, artists, and songs"
            className="w-full pl-10 pr-9 py-2.5 bg-[#1b1e2e] border border-white/[0.08] focus:border-sky-400/70 rounded-xl text-sm text-white placeholder-neutral-400 outline-none transition-colors"
            aria-label="Fast Search Music"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-white cursor-pointer"
              aria-label="Clear fast search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          type="submit"
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black font-semibold text-xs sm:text-sm active:scale-95 transition-all shrink-0 cursor-pointer"
          title="Play top match immediately"
        >
          <Play className="w-3.5 h-3.5 fill-black" />
          <span>Quick Play</span>
        </button>
      </form>

      {/* Search History Shortcuts Row */}
      {shortcuts.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-xs">
          <span className="flex items-center gap-1 text-[11px] font-medium text-neutral-400 shrink-0 mr-1">
            <History className="w-3.5 h-3.5 text-sky-400" />
            <span>Shortcuts:</span>
          </span>
          {shortcuts.map((entry) => (
            <div
              key={entry.normalized}
              className={`inline-flex items-center rounded-lg border transition-colors shrink-0 ${
                searchQuery.trim().toLowerCase() === entry.normalized
                  ? 'bg-sky-400/15 border-sky-400/60 text-white'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] text-neutral-300'
              }`}
            >
              <button
                type="button"
                onClick={() => handleUseShortcut(entry.query)}
                className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 text-[11px] font-medium cursor-pointer"
                title={`Quick search "${entry.query}" (searched ${entry.count}x)`}
              >
                <span>{entry.query}</span>
                {entry.count > 1 && (
                  <span className="text-[10px] font-mono tabular-nums text-sky-400">
                    {entry.count}×
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => removeSearchShortcut(entry.query)}
                className="pr-2 pl-0.5 py-1 text-neutral-500 hover:text-rose-400 cursor-pointer"
                aria-label={`Remove search shortcut ${entry.query}`}
                title="Remove shortcut"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => clearSearchHistory()}
            className="flex items-center gap-1 px-2 py-1 text-[11px] text-neutral-400 hover:text-rose-300 shrink-0 cursor-pointer"
            title="Clear all search shortcuts"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear</span>
          </button>
        </div>
      )}

      {/* Clean Vibe Filter Tabs (No garish gradient pill bloat) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        <button
          onClick={() => {
            onSelectVibe('all');
            if (searchQuery) onSearchChange('');
          }}
          className={`px-3.5 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
            selectedVibe === 'all' && !searchQuery
              ? 'bg-white text-black font-semibold'
              : 'bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 hover:text-white'
          }`}
        >
          All Songs
        </button>

        {QUICK_VIBE_PRESETS.map((preset) => {
          const isActive = selectedVibe === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => {
                onSelectVibe(preset.id);
                if (searchQuery) onSearchChange('');
              }}
              className={`px-3.5 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-sky-400 text-slate-950 font-semibold'
                  : 'bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 hover:text-white'
              }`}
            >
              {preset.name}
            </button>
          );
        })}
      </div>
    </div>
  );
};
