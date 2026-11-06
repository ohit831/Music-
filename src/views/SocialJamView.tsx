/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Users,
  Radio,
  Send,
  Plus,
  Play,
  Heart,
  Sparkles,
  MessageCircle,
  Share2,
} from 'lucide-react';
import { IndieTrack, formatDuration } from '../utils/musicDiscovery';
import { AudioVisualizer } from '../components/AudioVisualizer';

interface JamMessage {
  id: string;
  sender: string;
  avatar: string;
  text: string;
  time: string;
  isReaction?: boolean;
}

interface SocialJamViewProps {
  currentTrack: IndieTrack | null;
  isPlaying: boolean;
  onPlayTrack: (track: IndieTrack) => void;
  availableTracks: IndieTrack[];
  onShareTrack: (track: IndieTrack) => void;
}

export const SocialJamView: React.FC<SocialJamViewProps> = ({
  currentTrack,
  isPlaying,
  onPlayTrack,
  availableTracks,
  onShareTrack,
}) => {
  const [messages, setMessages] = useState<JamMessage[]>([
    {
      id: 'm1',
      sender: 'Maya Chen',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
      text: 'Welcome to the Indie Jam! Everyone drop your latest Bandcamp discovery.',
      time: '1:12 PM',
    },
    {
      id: 'm2',
      sender: 'Liam Morales',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
      text: 'That tape hiss on Pale Moonflower is insane 🔥',
      time: '1:14 PM',
    },
    {
      id: 'm3',
      sender: 'Sofia Lindqvist',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
      text: 'Adding some math rock into the queue!',
      time: '1:16 PM',
    },
  ]);

  const [inputMsg, setInputMsg] = useState('');
  const [reactionBurst, setReactionBurst] = useState<string | null>(null);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    const newMsg: JamMessage = {
      id: `msg-${Date.now()}`,
      sender: 'You',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
      text: inputMsg.trim(),
      time: 'Just now',
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputMsg('');
  };

  const handleSendReaction = (emoji: string) => {
    setReactionBurst(emoji);
    setTimeout(() => setReactionBurst(null), 1200);

    const reactionMsg: JamMessage = {
      id: `rx-${Date.now()}`,
      sender: 'You',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
      text: emoji,
      time: 'Just now',
      isReaction: true,
    };
    setMessages((prev) => [...prev, reactionMsg]);
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in relative">
      {/* Floating Reaction Animation */}
      {reactionBurst && (
        <div className="fixed top-1/3 left-1/2 -translate-x-1/2 text-7xl animate-bounce pointer-events-none z-50 drop-shadow-2xl">
          {reactionBurst}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1ed760] animate-ping" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#1ed760]">
              LIVE COLLABORATIVE SESSION
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">
            Indie Basement Jam Room #404
          </h1>
          <p className="text-xs text-neutral-400">
            Listen in sync with friends, queue underground gems, and trade liner notes live.
          </p>
        </div>

        {/* Friends Pills */}
        <div className="flex items-center -space-x-2">
          <img
            src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80"
            alt="You"
            className="w-9 h-9 rounded-full ring-2 ring-[#0c0c10] object-cover"
            title="You"
          />
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80"
            alt="Maya"
            className="w-9 h-9 rounded-full ring-2 ring-[#0c0c10] object-cover"
            title="Maya Chen"
          />
          <img
            src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80"
            alt="Liam"
            className="w-9 h-9 rounded-full ring-2 ring-[#0c0c10] object-cover"
            title="Liam Morales"
          />
          <img
            src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80"
            alt="Sofia"
            className="w-9 h-9 rounded-full ring-2 ring-[#0c0c10] object-cover"
            title="Sofia Lindqvist"
          />
          <span className="w-9 h-9 rounded-full bg-white/10 text-xs font-bold text-white flex items-center justify-center ring-2 ring-[#0c0c10]">
            +2
          </span>
        </div>
      </div>

      {/* Main Grid: Jam Player & Live Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Currently Playing Session Track + Collaborative Queue */}
        <div className="lg:col-span-2 space-y-6">
          {/* Live Sync Banner */}
          <div className="bg-gradient-to-br from-[#1a1c24] via-[#12141a] to-[#0d0e12] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {currentTrack ? (
                <img
                  src={currentTrack.coverUrl}
                  alt={currentTrack.title}
                  className="w-36 h-36 rounded-2xl object-cover shadow-2xl border border-white/10"
                />
              ) : (
                <div className="w-36 h-36 rounded-2xl bg-white/5 flex items-center justify-center text-neutral-500">
                  <Radio className="w-12 h-12" />
                </div>
              )}

              <div className="flex-1 text-center sm:text-left space-y-2">
                <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#1ed760]/20 text-[#1ed760] inline-block border border-[#1ed760]/30">
                  Streaming in Sync (4 listeners)
                </span>
                <h2 className="text-2xl font-extrabold text-white">
                  {currentTrack ? currentTrack.title : 'Select a track to jam'}
                </h2>
                <p className="text-sm text-neutral-300">
                  {currentTrack ? `${currentTrack.artist} • ${currentTrack.album}` : ''}
                </p>

                {/* Real-time spectrum */}
                <div className="pt-2">
                  <AudioVisualizer isPlaying={isPlaying} barsCount={28} height={32} />
                </div>
              </div>
            </div>

            {/* Quick Emoji Reaction Bar */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs text-neutral-400 font-semibold">Quick Reaction:</span>
              <div className="flex gap-2">
                {['🔥', '📼', '🎸', '☕', '💖', '✨'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleSendReaction(emoji)}
                    className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/15 active:scale-95 text-xl flex items-center justify-center transition-all border border-white/10 hover:border-[#1ed760]"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Collaborative Quick Add to Queue */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#1ed760]" />
                Drop an Indie Gem into Live Jam
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableTracks.slice(0, 4).map((track) => (
                <div
                  key={track.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-black/30 hover:bg-black/50 border border-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={track.coverUrl}
                      alt={track.title}
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{track.title}</p>
                      <p className="text-[11px] text-neutral-400 truncate">{track.artist}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => onPlayTrack(track)}
                    className="p-2 rounded-xl bg-[#1ed760] hover:bg-[#1db954] text-black font-semibold text-xs transition-transform active:scale-95"
                    aria-label={`Play ${track.title} in session`}
                  >
                    <Play className="w-3.5 h-3.5 fill-black" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Live Chat & Track Liner Reactions */}
        <div className="bg-[#141418] border border-white/10 rounded-3xl flex flex-col h-[540px] shadow-2xl overflow-hidden">
          <div className="p-4 border-b border-white/10 flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-[#1ed760]" />
            <h2 className="text-sm font-bold text-white">Jam Chat & Liner Notes</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m) => (
              <div key={m.id} className="flex items-start gap-2.5">
                <img
                  src={m.avatar}
                  alt={m.sender}
                  className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-bold text-white">{m.sender}</span>
                    <span className="text-[10px] text-neutral-500">{m.time}</span>
                  </div>
                  {m.isReaction ? (
                    <span className="text-2xl mt-0.5 inline-block">{m.text}</span>
                  ) : (
                    <p className="text-xs text-neutral-300 mt-0.5 leading-relaxed bg-white/5 p-2 rounded-xl border border-white/5 inline-block">
                      {m.text}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10 flex gap-2">
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              placeholder="Comment on this track..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#1ed760]"
            />
            <button
              type="submit"
              className="p-2 rounded-xl bg-[#1ed760] hover:bg-[#1db954] text-black transition-colors"
              aria-label="Send jam message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
