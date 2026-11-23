/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Mic2, Disc3, Radio, Heart, ArrowDownToLine } from 'lucide-react';
import { IndieTrack } from '../utils/musicDiscovery';
import {
  buildSyncedLyrics,
  formatLyricTimestamp,
  getActiveLyricState,
} from '../utils/syncedLyrics';

interface LyricsDrawerProps {
  track: IndieTrack | null;
  isOpen: boolean;
  onClose: () => void;
  isLiked: boolean;
  onToggleLike: (trackId: string) => void;
  currentTime?: number;
  duration?: number;
  isPlaying?: boolean;
  onSeek?: (seconds: number) => void;
}

export const LyricsDrawer: React.FC<LyricsDrawerProps> = ({
  track,
  isOpen,
  onClose,
  isLiked,
  onToggleLike,
  currentTime = 0,
  duration = 0,
  isPlaying = false,
  onSeek,
}) => {
  const [activeTab, setActiveTab] = useState<'lyrics' | 'liner'>('lyrics');
  const [autoScroll, setAutoScroll] = useState(true);
  const activeLineRef = useRef<HTMLButtonElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const isProgrammaticScrollRef = useRef(false);

  const effectiveDuration = duration > 1 ? duration : track?.duration || 0;

  const syncedLines = useMemo(
    () => buildSyncedLyrics(track, effectiveDuration),
    [track, effectiveDuration]
  );

  const hasSungLyrics = useMemo(
    () => syncedLines.some((line) => line.kind === 'lyric'),
    [syncedLines]
  );

  const { activeIndex, lineProgress } = useMemo(
    () => getActiveLyricState(syncedLines, currentTime),
    [syncedLines, currentTime]
  );

  // Determine which section heading (e.g. [Verse 1], [Chorus]) owns the active line
  const activeHeadingIndex = useMemo(() => {
    if (activeIndex < 0) return -1;
    for (let i = activeIndex - 1; i >= 0; i--) {
      if (syncedLines[i].kind === 'heading') return i;
    }
    return -1;
  }, [syncedLines, activeIndex]);

  // Reset auto-scroll when changing tracks or re-opening the drawer
  useEffect(() => {
    if (isOpen) {
      setAutoScroll(true);
    }
  }, [isOpen, track?.id]);

  // Smoothly center the currently sung line when activeIndex updates
  useEffect(() => {
    if (!isOpen || activeTab !== 'lyrics' || !autoScroll || activeIndex < 0) return;
    const el = activeLineRef.current;
    if (!el || typeof el.scrollIntoView !== 'function') return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    isProgrammaticScrollRef.current = true;
    el.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'center',
    });

    const timer = window.setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 450);
    return () => window.clearTimeout(timer);
  }, [activeIndex, isOpen, activeTab, autoScroll, track?.id]);

  if (!isOpen || !track) return null;

  const handleUserScrollIntent = () => {
    if (!isProgrammaticScrollRef.current && autoScroll) {
      setAutoScroll(false);
    }
  };

  const handleJumpToActive = () => {
    setAutoScroll(true);
    if (activeLineRef.current && typeof activeLineRef.current.scrollIntoView === 'function') {
      isProgrammaticScrollRef.current = true;
      activeLineRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 450);
    }
  };

  const handleSelectLine = (startTime: number) => {
    if (onSeek) {
      setAutoScroll(true);
      onSeek(startTime);
    }
  };

  return (
    <div
      className="fixed inset-y-0 right-0 z-40 w-full max-w-md bg-[#121216] border-l border-white/10 shadow-2xl flex flex-col animate-slide-left"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lyrics-drawer-title"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={track.coverUrl}
            alt={track.title}
            className="w-12 h-12 rounded-xl object-cover shadow-md border border-white/10 shrink-0"
          />
          <div className="min-w-0">
            <h3 id="lyrics-drawer-title" className="text-base font-bold text-white truncate">
              {track.title}
            </h3>
            <p className="text-xs text-neutral-400 truncate">{track.artist}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onToggleLike(track.id)}
            className="p-2 text-neutral-400 hover:text-rose-500 rounded-full transition-colors cursor-pointer"
            aria-label={isLiked ? 'Unlike track' : 'Like track'}
          >
            <Heart
              className={`w-5 h-5 ${
                isLiked ? 'text-rose-500 fill-rose-500' : 'text-neutral-400'
              }`}
            />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close lyrics drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 px-5 pt-3 gap-6 text-sm font-semibold shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('lyrics')}
          className={`flex items-center gap-2 pb-3 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'lyrics'
              ? 'border-[#1ed760] text-[#1ed760]'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <Mic2 className="w-4 h-4" />
          Lyrics
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('liner')}
          className={`flex items-center gap-2 pb-3 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'liner'
              ? 'border-[#1ed760] text-[#1ed760]'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <Disc3 className="w-4 h-4" />
          Liner Notes & Gear
        </button>
      </div>

      {/* Sync Controls Strip */}
      {activeTab === 'lyrics' && hasSungLyrics && (
        <div
          data-testid="lyrics-sync-bar"
          className="flex items-center justify-between gap-2 px-5 py-2.5 bg-white/[0.03] border-b border-white/[0.07] text-xs shrink-0"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isPlaying ? 'bg-[#1ed760] animate-pulse' : 'bg-neutral-500'
              }`}
              aria-hidden="true"
            />
            <span className="font-semibold text-neutral-200 truncate">Time-Synced</span>
            <span className="font-mono text-[11px] text-neutral-400 tabular-nums shrink-0">
              {formatLyricTimestamp(currentTime)} / {formatLyricTimestamp(effectiveDuration)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => (autoScroll ? setAutoScroll(false) : handleJumpToActive())}
            aria-pressed={autoScroll}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors cursor-pointer shrink-0 border ${
              autoScroll
                ? 'bg-[#1ed760]/15 text-[#1ed760] border-[#1ed760]/35'
                : 'bg-white/[0.06] text-neutral-300 border-white/10 hover:text-white hover:bg-white/10'
            }`}
          >
            {autoScroll ? 'Auto-Scroll On' : 'Auto-Scroll Off'}
          </button>
        </div>
      )}

      {/* Content */}
      <div
        ref={scrollContainerRef}
        onWheel={handleUserScrollIntent}
        onTouchMove={handleUserScrollIntent}
        className="flex-1 overflow-y-auto p-5 space-y-6 relative"
      >
        {activeTab === 'lyrics' && (
          <div className="space-y-2 pb-10">
            {hasSungLyrics ? (
              <>
                {syncedLines.map((line) => {
                  if (line.kind === 'spacer') {
                    return <div key={line.id} className="h-3" aria-hidden="true" />;
                  }

                  if (line.kind === 'heading') {
                    const isSectionActive = line.index === activeHeadingIndex;
                    return (
                      <p
                        key={line.id}
                        className={`text-[11px] uppercase tracking-widest font-bold pt-3 pb-1 px-3 transition-colors ${
                          isSectionActive ? 'text-[#1ed760]' : 'text-neutral-500'
                        }`}
                      >
                        {line.text}
                      </p>
                    );
                  }

                  const isActive = line.index === activeIndex;
                  const isPast = activeIndex >= 0 && line.index < activeIndex;
                  const state = isActive ? 'active' : isPast ? 'past' : 'upcoming';

                  return (
                    <button
                      key={line.id}
                      ref={isActive ? activeLineRef : undefined}
                      type="button"
                      onClick={() => handleSelectLine(line.startTime)}
                      aria-current={isActive ? 'true' : undefined}
                      data-lyric-index={line.index}
                      data-lyric-state={state}
                      title={
                        onSeek
                          ? `Jump to ${formatLyricTimestamp(line.startTime)}`
                          : undefined
                      }
                      className={`group w-full text-left rounded-xl px-3.5 py-2.5 transition-all duration-200 relative overflow-hidden border ${
                        onSeek ? 'cursor-pointer' : 'cursor-default'
                      } ${
                        isActive
                          ? 'bg-[#1ed760]/12 border-[#1ed760]/35 shadow-sm'
                          : 'bg-transparent border-transparent hover:bg-white/[0.04] hover:border-white/[0.06]'
                      }`}
                    >
                      {isActive && (
                        <span
                          aria-hidden="true"
                          className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#1ed760]"
                        />
                      )}

                      <div className="flex items-baseline justify-between gap-3">
                        <span
                          className={`leading-snug transition-colors duration-200 ${
                            isActive
                              ? 'text-lg sm:text-[19px] font-bold text-white'
                              : isPast
                              ? 'text-base font-medium text-neutral-500 group-hover:text-neutral-300'
                              : 'text-base font-medium text-neutral-300 group-hover:text-white'
                          }`}
                        >
                          {line.text}
                        </span>
                        <span
                          className={`text-[10px] font-mono tabular-nums shrink-0 transition-opacity ${
                            isActive
                              ? 'text-[#1ed760] font-semibold opacity-100'
                              : 'text-neutral-500 opacity-60 group-hover:opacity-100'
                          }`}
                        >
                          {formatLyricTimestamp(line.startTime)}
                        </span>
                      </div>

                      {isActive && (
                        <div
                          aria-hidden="true"
                          className="mt-2 h-0.5 w-full rounded-full bg-white/10 overflow-hidden"
                        >
                          <div
                            className="h-full bg-[#1ed760] rounded-full transition-[width] duration-150 ease-linear"
                            style={{ width: `${Math.max(4, Math.round(lineProgress * 100))}%` }}
                          />
                        </div>
                      )}
                    </button>
                  );
                })}

                {onSeek && (
                  <p className="text-[11px] text-neutral-500 px-3 pt-4">
                    Tap any line to jump straight to that moment in the track.
                  </p>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-neutral-400">
                <Radio className="w-12 h-12 mx-auto mb-3 opacity-30 text-[#1ed760]" />
                <p className="text-base font-semibold text-white">Instrumental Indie Exploration</p>
                <p className="text-xs text-neutral-400 max-w-xs mx-auto mt-1">
                  This track is purely instrumental. Close your eyes and immerse yourself in the textures.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'liner' && (
          <div className="space-y-6">
            {/* Story */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#1ed760]">
                Recording Story & Origins
              </span>
              <p className="text-sm text-neutral-300 leading-relaxed">
                {track.linerNotes || 'Recorded in a DIY bedroom studio with tape machines and vintage pedals.'}
              </p>
            </div>

            {/* Track Specs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
                <p className="text-[11px] text-neutral-400">Subgenre</p>
                <p className="text-sm font-semibold text-white">{track.genre}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
                <p className="text-[11px] text-neutral-400">Underground Index</p>
                <p className="text-sm font-semibold text-[#1ed760]">
                  {(track.obscurity * 100).toFixed(0)}% Rare
                </p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
                <p className="text-[11px] text-neutral-400">Energy & Pulse</p>
                <p className="text-sm font-semibold text-white">
                  {(track.energy * 100).toFixed(0)}%
                </p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
                <p className="text-[11px] text-neutral-400">Acoustic Warmth</p>
                <p className="text-sm font-semibold text-white">
                  {(track.acousticness * 100).toFixed(0)}%
                </p>
              </div>
            </div>

            {/* Tags */}
            <div>
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                Sonic Tags
              </p>
              <div className="flex flex-wrap gap-2">
                {track.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-xs rounded-full text-neutral-300 transition-colors"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Re-Sync Pill when user scrolls away */}
      {activeTab === 'lyrics' && hasSungLyrics && !autoScroll && activeIndex >= 0 && (
        <div className="px-5 py-3 border-t border-white/10 bg-[#121216]/95 shrink-0 flex justify-center">
          <button
            type="button"
            onClick={handleJumpToActive}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#1ed760] hover:bg-emerald-400 text-black text-xs font-bold shadow-md transition-colors cursor-pointer"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            Sync to current line
          </button>
        </div>
      )}
    </div>
  );
};
