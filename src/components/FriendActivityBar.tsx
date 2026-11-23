/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Users, Headphones, Share2, ChevronRight, Sparkles } from 'lucide-react';
import { FriendActivity } from '../utils/musicDiscovery';

interface FriendActivityBarProps {
  friendActivities: FriendActivity[];
  isOpen: boolean;
  onToggle: () => void;
  onListenAlong: (trackId: string) => void;
  onShareWithFriend: (friendName: string) => void;
}

export const FriendActivityBar: React.FC<FriendActivityBarProps> = ({
  friendActivities,
  isOpen,
  onToggle,
  onListenAlong,
  onShareWithFriend,
}) => {
  if (!isOpen) {
    return (
      <aside className="music-app-friends hidden xl:flex w-12 bg-[#0d0d11] border-l border-white/10 flex-col items-center py-4 shrink-0 select-none">
        <button
          onClick={onToggle}
          className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          title="Open Friend Activity"
          aria-label="Open Friend Activity sidebar"
        >
          <Users className="w-5 h-5" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="music-app-friends hidden xl:flex w-[280px] bg-[#0c0c10] border-l border-white/10 flex-col h-full shrink-0 select-none">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[#1ed760]" />
          <h2 className="text-sm font-bold text-white tracking-wide">Friend Activity</h2>
        </div>
        <button
          onClick={onToggle}
          className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Collapse friend activity"
          title="Collapse"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Friends list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {friendActivities.map((friend) => (
          <div
            key={friend.id}
            className="group relative p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all space-y-2.5"
          >
            {/* Top: Avatar, Name, Time */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative">
                  <img
                    src={friend.avatar}
                    alt={friend.friendName}
                    className="w-8 h-8 rounded-full object-cover border border-white/10"
                  />
                  {friend.isListeningNow && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#1ed760] ring-2 ring-[#0c0c10]" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">{friend.friendName}</p>
                  <p className="text-[10px] text-neutral-400 flex items-center gap-1">
                    {friend.isListeningNow ? (
                      <span className="text-[#1ed760] font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#1ed760] animate-pulse" />
                        Listening now
                      </span>
                    ) : (
                      friend.timeAgo
                    )}
                  </p>
                </div>
              </div>

              <button
                onClick={() => onShareWithFriend(friend.friendName)}
                className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-white rounded-lg transition-opacity"
                title={`Send track to ${friend.friendName}`}
                aria-label={`Send track to ${friend.friendName}`}
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Song Card */}
            <div className="flex items-center gap-2.5 bg-black/30 p-2 rounded-xl border border-white/5">
              <img
                src={friend.coverUrl}
                alt={friend.trackTitle}
                className="w-9 h-9 rounded-lg object-cover shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate">{friend.trackTitle}</p>
                <p className="text-[11px] text-neutral-400 truncate">{friend.artist}</p>
              </div>
            </div>

            {/* Actions: Listen Along */}
            {friend.isListeningNow && (
              <button
                onClick={() => onListenAlong(friend.trackId)}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-semibold bg-[#1ed760]/20 hover:bg-[#1ed760]/30 text-[#1ed760] border border-[#1ed760]/40 transition-colors"
                aria-label={`Listen along with ${friend.friendName}`}
              >
                <Headphones className="w-3.5 h-3.5" />
                Listen Along
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Social Jam invite footer */}
      <div className="p-3 border-t border-white/10 bg-white/5">
        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
          <Sparkles className="w-4 h-4 text-[#1ed760]" />
          <span>Indie Jam Session</span>
        </div>
        <p className="text-[11px] text-neutral-400 mt-1 leading-normal">
          Friends can contribute tracks into your collaborative playlists in real time.
        </p>
      </div>
    </aside>
  );
};
