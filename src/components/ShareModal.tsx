/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Share2,
  Send,
  Code,
  Sparkles,
  Music,
  ExternalLink,
} from 'lucide-react';
import { IndieTrack, Playlist, createSharePayload } from '../utils/musicDiscovery';
import { INITIAL_FRIEND_ACTIVITY } from '../data/indieCatalog';

interface ShareModalProps {
  track: IndieTrack | null;
  playlist: Playlist | null;
  isOpen: boolean;
  onClose: () => void;
  onSendToFriend?: (friendName: string, itemTitle: string, note: string) => void;
}

type CardTheme = 'emerald' | 'sunset' | 'velvet' | 'obsidian' | 'ocean';

const THEMES: Record<CardTheme, { name: string; bg: string; waveColor: string; border: string }> = {
  emerald: {
    name: 'Emerald Tape',
    bg: 'bg-gradient-to-br from-emerald-950 via-zinc-900 to-black',
    waveColor: 'bg-emerald-400',
    border: 'border-emerald-500/30',
  },
  sunset: {
    name: 'Neon Sunset',
    bg: 'bg-gradient-to-br from-rose-950 via-purple-950 to-neutral-950',
    waveColor: 'bg-rose-400',
    border: 'border-rose-500/30',
  },
  velvet: {
    name: 'Dream Velvet',
    bg: 'bg-gradient-to-br from-violet-950 via-indigo-950 to-stone-950',
    waveColor: 'bg-violet-400',
    border: 'border-violet-500/30',
  },
  obsidian: {
    name: 'Indie Noir',
    bg: 'bg-gradient-to-br from-zinc-900 via-neutral-950 to-black',
    waveColor: 'bg-white',
    border: 'border-zinc-700/50',
  },
  ocean: {
    name: 'Pacific Mist',
    bg: 'bg-gradient-to-br from-cyan-950 via-slate-900 to-black',
    waveColor: 'bg-cyan-400',
    border: 'border-cyan-500/30',
  },
};

export const ShareModal: React.FC<ShareModalProps> = ({
  track,
  playlist,
  isOpen,
  onClose,
  onSendToFriend,
}) => {
  const [selectedTheme, setSelectedTheme] = useState<CardTheme>('emerald');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState(INITIAL_FRIEND_ACTIVITY[0].friendName);
  const [personalNote, setPersonalNote] = useState('');
  const [sentSuccess, setSentSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'card' | 'friend' | 'embed'>('card');

  if (!isOpen || (!track && !playlist)) return null;

  const title = track ? track.title : playlist?.title || '';
  const subtitle = track ? track.artist : `${playlist?.trackIds.length || 0} indie tracks`;
  const coverUrl = track ? track.coverUrl : undefined;
  const emoji = playlist ? playlist.coverEmoji : '🎵';
  const genre = track ? track.genre : 'Indie Discovery';

  const shareInfo = track
    ? createSharePayload(track, personalNote)
    : {
        payloadStr: '',
        shareUrl: `${window.location.origin}/?playlist=${playlist?.id}`,
        summaryText: `Check out this playlist "${playlist?.title}" on Apna Music!`,
      };

  const soundwaveHeights = [
    14, 28, 42, 20, 36, 48, 22, 16, 32, 44, 26, 40, 52, 34, 18, 30, 46, 24, 38, 20, 14, 32, 48, 28,
  ];

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareInfo.shareUrl).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  const handleCopyEmbed = () => {
    const embedCode = `<iframe src="${shareInfo.shareUrl}" width="100%" height="152" frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
    navigator.clipboard.writeText(embedCode).catch(() => {});
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2200);
  };

  const handleSendFriend = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSendToFriend) {
      onSendToFriend(selectedFriend, title, personalNote || 'Check out this awesome indie track!');
    }
    setSentSuccess(true);
    setTimeout(() => {
      setSentSuccess(false);
      onClose();
    }, 1800);
  };

  const currentTheme = THEMES[selectedTheme];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      <div className="relative w-full max-w-xl bg-[#16161a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#1ed760]/10 text-[#1ed760] rounded-lg">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 id="share-modal-title" className="text-lg font-bold text-white">
                Share Indie Soundwave
              </h2>
              <p className="text-xs text-neutral-400">Share with friends or export soundwave card</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
            aria-label="Close share dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 px-5 pt-3 gap-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('card')}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === 'card'
                ? 'border-[#1ed760] text-[#1ed760]'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            Soundwave Card
          </button>
          <button
            onClick={() => setActiveTab('friend')}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === 'friend'
                ? 'border-[#1ed760] text-[#1ed760]'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            Send to Indie Friend
          </button>
          <button
            onClick={() => setActiveTab('embed')}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === 'embed'
                ? 'border-[#1ed760] text-[#1ed760]'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            Embed Widget
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {activeTab === 'card' && (
            <div className="space-y-5">
              {/* Soundwave Preview Card (Spotify style code) */}
              <div
                className={`relative rounded-2xl p-6 border ${currentTheme.border} ${currentTheme.bg} shadow-2xl transition-all duration-300 overflow-hidden`}
              >
                {/* Background watermark */}
                <div className="absolute -right-6 -bottom-6 opacity-5 pointer-events-none">
                  <Music className="w-48 h-48 text-white" />
                </div>

                <div className="flex items-center gap-4 mb-5">
                  {coverUrl ? (
                    <img
                      src={coverUrl}
                      alt={title}
                      className="w-20 h-20 rounded-xl object-cover shadow-lg border border-white/10"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-800 flex items-center justify-center text-3xl shadow-lg border border-white/10">
                      {emoji}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-white/10 text-white/80 mb-1.5">
                      {genre}
                    </span>
                    <h3 className="text-lg font-bold text-white truncate">{title}</h3>
                    <p className="text-sm text-neutral-300 truncate">{subtitle}</p>
                    <p className="text-[11px] text-neutral-400 mt-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#1ed760]" />
                      Apna Music Verified
                    </p>
                  </div>
                </div>

                {/* Spotify-style Soundwave Barcode */}
                <div className="bg-black/40 backdrop-blur-sm rounded-xl p-3 border border-white/10 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 px-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#1ed760] animate-pulse" />
                    <span className="text-[10px] font-mono tracking-widest text-neutral-300 font-bold">
                      INDIE•CODE
                    </span>
                  </div>
                  <div className="flex items-end gap-1 flex-1 h-9 justify-center px-2">
                    {soundwaveHeights.map((h, i) => (
                      <div
                        key={i}
                        style={{ height: `${h}px` }}
                        className={`w-1 rounded-full ${currentTheme.waveColor} opacity-90 transition-all`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] font-mono text-neutral-400 px-2">#0894</span>
                </div>
              </div>

              {/* Theme selector */}
              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2.5">
                  Card Vibe Aesthetic
                </label>
                <div className="flex gap-2 flex-wrap">
                  {(Object.keys(THEMES) as CardTheme[]).map((thmKey) => (
                    <button
                      key={thmKey}
                      onClick={() => setSelectedTheme(thmKey)}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                        selectedTheme === thmKey
                          ? 'border-[#1ed760] bg-[#1ed760]/20 text-[#1ed760] font-semibold'
                          : 'border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10'
                      }`}
                    >
                      {THEMES[thmKey].name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleCopyLink}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm bg-[#1ed760] hover:bg-[#1db954] text-black transition-transform active:scale-95 shadow-lg shadow-[#1ed760]/20"
                >
                  {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedLink ? 'Link Copied!' : 'Copy Share Link'}
                </button>

                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                    shareInfo.summaryText
                  )}&url=${encodeURIComponent(shareInfo.shareUrl)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Post to X / Twitter
                </a>
              </div>
            </div>
          )}

          {activeTab === 'friend' && (
            <form onSubmit={handleSendFriend} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                  Select Indie Friend
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {INITIAL_FRIEND_ACTIVITY.map((friend) => (
                    <button
                      type="button"
                      key={friend.id}
                      onClick={() => setSelectedFriend(friend.friendName)}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                        selectedFriend === friend.friendName
                          ? 'border-[#1ed760] bg-[#1ed760]/10 ring-1 ring-[#1ed760]'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <img
                        src={friend.avatar}
                        alt={friend.friendName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{friend.friendName}</p>
                        <p className="text-[11px] text-neutral-400 truncate">
                          {friend.isListeningNow ? '🟢 Listening now' : friend.timeAgo}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="friend-note-input" className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                  Personal Note (Optional)
                </label>
                <textarea
                  id="friend-note-input"
                  value={personalNote}
                  onChange={(e) => setPersonalNote(e.target.value)}
                  placeholder="e.g. Check out the tape delay on that rhythm guitar at 1:20!"
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#1ed760] transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={sentSuccess}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm bg-[#1ed760] hover:bg-[#1db954] text-black transition-all disabled:opacity-50"
              >
                {sentSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    Sent to {selectedFriend}!
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Recommendation to {selectedFriend}
                  </>
                )}
              </button>
            </form>
          )}

          {activeTab === 'embed' && (
            <div className="space-y-4">
              <p className="text-sm text-neutral-300">
                Embed this mini Apna Music player card directly into your blog, portfolio, or Notion page:
              </p>
              <div className="bg-black/50 border border-white/10 rounded-xl p-4 font-mono text-xs text-neutral-300 overflow-x-auto">
                {`<iframe src="${shareInfo.shareUrl}" width="100%" height="152" frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen" loading="lazy"></iframe>`}
              </div>
              <button
                onClick={handleCopyEmbed}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-colors"
              >
                {copiedEmbed ? <Check className="w-4 h-4 text-[#1ed760]" /> : <Code className="w-4 h-4" />}
                {copiedEmbed ? 'Embed Code Copied!' : 'Copy Embed Snippet'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
