/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Mic2, Disc3, Radio, Heart } from 'lucide-react';
import { IndieTrack } from '../utils/musicDiscovery';

interface LyricsDrawerProps {
  track: IndieTrack | null;
  isOpen: boolean;
  onClose: () => void;
  isLiked: boolean;
  onToggleLike: (trackId: string) => void;
}

export const LyricsDrawer: React.FC<LyricsDrawerProps> = ({
  track,
  isOpen,
  onClose,
  isLiked,
  onToggleLike,
}) => {
  const [activeTab, setActiveTab] = useState<'lyrics' | 'liner'>('lyrics');

  if (!isOpen || !track) return null;

  return (
    <div
      className="fixed inset-y-0 right-0 z-40 w-full max-w-md bg-[#121216] border-l border-white/10 shadow-2xl flex flex-col animate-slide-left"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lyrics-drawer-title"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-white/10">
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

        <div className="flex items-center gap-1">
          <button
            onClick={() => onToggleLike(track.id)}
            className="p-2 text-neutral-400 hover:text-rose-500 rounded-full transition-colors"
            aria-label={isLiked ? 'Unlike track' : 'Like track'}
          >
            <Heart
              className={`w-5 h-5 ${
                isLiked ? 'text-rose-500 fill-rose-500' : 'text-neutral-400'
              }`}
            />
          </button>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
            aria-label="Close lyrics drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 px-5 pt-3 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('lyrics')}
          className={`flex items-center gap-2 pb-3 border-b-2 transition-colors ${
            activeTab === 'lyrics'
              ? 'border-[#1ed760] text-[#1ed760]'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <Mic2 className="w-4 h-4" />
          Lyrics
        </button>
        <button
          onClick={() => setActiveTab('liner')}
          className={`flex items-center gap-2 pb-3 border-b-2 transition-colors ${
            activeTab === 'liner'
              ? 'border-[#1ed760] text-[#1ed760]'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <Disc3 className="w-4 h-4" />
          Liner Notes & Gear
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {activeTab === 'lyrics' && (
          <div className="space-y-4 font-medium leading-relaxed">
            {track.lyrics && track.lyrics.length > 0 ? (
              track.lyrics.map((line, idx) => {
                if (!line) return <div key={idx} className="h-4" />;
                const isHeading = line.startsWith('[');
                return (
                  <p
                    key={idx}
                    className={
                      isHeading
                        ? 'text-xs uppercase tracking-widest text-[#1ed760] font-bold mt-4'
                        : 'text-lg text-neutral-200 hover:text-white transition-colors cursor-default'
                    }
                  >
                    {line}
                  </p>
                );
              })
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
    </div>
  );
};
