/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, ListMusic, Play, Trash2, Sparkles, Plus } from 'lucide-react';
import { IndieTrack, formatDuration } from '../utils/musicDiscovery';
import type { RecommendedTrackItem } from '../utils/smartRecommendations';
import type { SonicProfile, VibeMatchItem } from '../utils/vibeMatch';

interface QueueDrawerProps {
  currentTrack: IndieTrack | null;
  queue: IndieTrack[];
  recommendedNextTracks?: RecommendedTrackItem[];
  isOpen: boolean;
  onClose: () => void;
  onPlayTrack: (track: IndieTrack) => void;
  onRemoveFromQueue: (index: number) => void;
  onClearQueue: () => void;
  onAddToQueue?: (track: IndieTrack) => void;
  onDismissRecommendation?: (track: IndieTrack) => void;
  isVibeMatchActive?: boolean;
  vibeLabel?: string;
  vibeAnchorProfile?: SonicProfile | null;
  vibeMatchByTrackId?: Record<string, VibeMatchItem>;
  onToggleVibeMatch?: () => void;
}

export const QueueDrawer: React.FC<QueueDrawerProps> = ({
  currentTrack,
  queue,
  recommendedNextTracks = [],
  isOpen,
  onClose,
  onPlayTrack,
  onRemoveFromQueue,
  onClearQueue,
  onAddToQueue,
  onDismissRecommendation,
  isVibeMatchActive = false,
  vibeLabel,
  vibeAnchorProfile,
  vibeMatchByTrackId,
  onToggleVibeMatch,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-y-0 right-0 z-40 w-full max-w-sm bg-[#131317] border-l border-white/10 shadow-2xl flex flex-col animate-slide-left"
      role="dialog"
      aria-modal="true"
      aria-labelledby="queue-drawer-title"
    >
      <div className="flex items-center justify-between p-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <ListMusic className="w-5 h-5 text-[#1ed760]" />
          <h2 id="queue-drawer-title" className="text-base font-bold text-white">
            Play Queue
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-neutral-300">
            {queue.length + (currentTrack ? 1 : 0)}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-neutral-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          aria-label="Close play queue"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Now Playing */}
        {currentTrack && (
          <div>
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">
              Now Playing
            </h3>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#1ed760]/10 border border-[#1ed760]/30">
              <img
                src={currentTrack.coverUrl}
                alt={currentTrack.title}
                className="w-12 h-12 rounded-lg object-cover shadow-sm"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{currentTrack.title}</p>
                <p className="text-xs text-neutral-300 truncate">{currentTrack.artist}</p>
              </div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#1ed760] animate-pulse shrink-0" />
            </div>
          </div>
        )}

        {/* Active Vibe Match Sonic Profile Summary */}
        {isVibeMatchActive && vibeAnchorProfile && (
          <div
            data-testid="vibe-match-banner"
            className="p-3.5 rounded-xl bg-[#1ed760]/10 border border-[#1ed760]/30 space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <Sparkles className="w-4 h-4 text-[#1ed760] shrink-0" />
                <span className="text-xs font-bold text-white truncate">
                  Vibe Match · {vibeLabel || 'Active'}
                </span>
              </div>
              {onToggleVibeMatch && (
                <button
                  type="button"
                  onClick={onToggleVibeMatch}
                  className="text-[11px] font-semibold text-neutral-300 hover:text-white px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/15 transition-colors cursor-pointer shrink-0"
                >
                  Turn Off
                </button>
              )}
            </div>
            <div className="flex items-center gap-3 text-[11px] text-neutral-300">
              <span>
                Energy{' '}
                <strong className="text-[#1ed760] tabular-nums">
                  {Math.round(vibeAnchorProfile.energy * 100)}%
                </strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Melancholy{' '}
                <strong className="text-[#1ed760] tabular-nums">
                  {Math.round(vibeAnchorProfile.melancholy * 100)}%
                </strong>
              </span>
            </div>
          </div>
        )}

        {/* Next in Queue */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Next Up ({queue.length})
            </h3>
            <div className="flex items-center gap-2.5">
              {!isVibeMatchActive && onToggleVibeMatch && currentTrack && (
                <button
                  type="button"
                  onClick={onToggleVibeMatch}
                  className="text-xs text-[#1ed760] hover:text-emerald-300 flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Vibe Match
                </button>
              )}
              {queue.length > 0 && (
                <button
                  onClick={onClearQueue}
                  className="text-xs text-neutral-400 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear
                </button>
              )}
            </div>
          </div>

          {queue.length === 0 ? (
            <div className="text-center py-5 px-3 bg-white/5 rounded-2xl border border-dashed border-white/10 text-neutral-400">
              <Sparkles className="w-6 h-6 mx-auto mb-1.5 text-[#1ed760]" />
              <p className="text-xs font-semibold text-white">Smart Autoplay is Active</p>
              <p className="text-[11px] text-neutral-400 mt-1">
                Songs matching what you play &amp; like will play automatically next.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {queue.map((track, idx) => (
                <div
                  key={`${track.id}-${idx}`}
                  className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/10 transition-colors border border-transparent hover:border-white/10"
                >
                  <button
                    onClick={() => onPlayTrack(track)}
                    className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 group/img"
                    aria-label={`Play ${track.title}`}
                  >
                    <img
                      src={track.coverUrl}
                      alt={track.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                      <Play className="w-4 h-4 fill-white text-white" />
                    </div>
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{track.title}</p>
                    <p className="text-xs text-neutral-400 truncate">{track.artist}</p>
                    {isVibeMatchActive && vibeMatchByTrackId?.[track.id] && (
                      <p className="text-[11px] font-medium text-[#1ed760] truncate mt-0.5 tabular-nums">
                        {vibeMatchByTrackId[track.id].reason}
                      </p>
                    )}
                  </div>

                  <span className="text-xs text-neutral-400">
                    {formatDuration(track.duration)}
                  </span>

                  <button
                    onClick={() => onRemoveFromQueue(idx)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-neutral-400 hover:text-rose-400 rounded-lg hover:bg-white/10 transition-opacity"
                    aria-label={`Remove ${track.title} from queue`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Auto-Suggested Next based on played music */}
        {recommendedNextTracks.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#1ed760]" />
                <h3 className="text-xs font-semibold text-[#1ed760] uppercase tracking-wider">
                  Recommended Next For You
                </h3>
              </div>
            </div>

            <div className="space-y-2">
              {recommendedNextTracks.slice(0, 6).map(({ track, reason }, idx) => (
                <div
                  key={`q-rec-${track.id}`}
                  className={`group flex items-center gap-2.5 p-2.5 rounded-xl border transition-colors ${
                    idx === 0 && queue.length === 0
                      ? 'bg-[#1ed760]/10 border-[#1ed760]/30'
                      : 'bg-white/[0.03] hover:bg-white/10 border-white/5'
                  }`}
                >
                  <button
                    onClick={() => onPlayTrack(track)}
                    className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 group/img cursor-pointer"
                    aria-label={`Play ${track.title}`}
                  >
                    <img
                      src={track.coverUrl}
                      alt={track.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                      <Play className="w-4 h-4 fill-white text-white" />
                    </div>
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-white truncate">{track.title}</p>
                      {idx === 0 && queue.length === 0 && (
                        <span className="text-[8px] font-black bg-[#1ed760] text-black px-1 rounded shrink-0">
                          AUTO
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-400 truncate">{track.artist}</p>
                    <p className="text-[10px] text-emerald-400 truncate">{reason}</p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {onAddToQueue && (
                      <button
                        onClick={() => onAddToQueue(track)}
                        className="p-1.5 text-neutral-300 hover:text-[#1ed760] rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                        aria-label={`Add ${track.title} to queue`}
                        title="Add to Up Next Queue"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onDismissRecommendation && (
                      <button
                        onClick={() => onDismissRecommendation(track)}
                        className="p-1.5 text-neutral-400 hover:text-rose-400 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                        aria-label={`Skip suggestion ${track.title}`}
                        title="Not for me (suggest another)"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
