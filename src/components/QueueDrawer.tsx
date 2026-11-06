/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, ListMusic, Play, Trash2, ArrowRight } from 'lucide-react';
import { IndieTrack, formatDuration } from '../utils/musicDiscovery';

interface QueueDrawerProps {
  currentTrack: IndieTrack | null;
  queue: IndieTrack[];
  isOpen: boolean;
  onClose: () => void;
  onPlayTrack: (track: IndieTrack) => void;
  onRemoveFromQueue: (index: number) => void;
  onClearQueue: () => void;
}

export const QueueDrawer: React.FC<QueueDrawerProps> = ({
  currentTrack,
  queue,
  isOpen,
  onClose,
  onPlayTrack,
  onRemoveFromQueue,
  onClearQueue,
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

        {/* Next in Queue */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Next Up ({queue.length})
            </h3>
            {queue.length > 0 && (
              <button
                onClick={onClearQueue}
                className="text-xs text-neutral-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>

          {queue.length === 0 ? (
            <div className="text-center py-10 bg-white/5 rounded-2xl border border-dashed border-white/10 text-neutral-400">
              <ListMusic className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#1ed760]" />
              <p className="text-sm font-semibold text-white">Your queue is empty</p>
              <p className="text-xs text-neutral-400 mt-1">
                Add tracks from playlists or discover recommendations!
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
      </div>
    </div>
  );
};
