/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Sparkles, Users, Music } from 'lucide-react';
import { Playlist } from '../utils/musicDiscovery';

interface PlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePlaylist: (playlist: Playlist) => void;
  existingPlaylist?: Playlist | null;
}

const GRADIENT_PRESETS = [
  'from-emerald-600 via-teal-900 to-black',
  'from-purple-600 via-indigo-950 to-neutral-950',
  'from-rose-600 via-pink-900 to-zinc-950',
  'from-amber-600 via-orange-950 to-stone-950',
  'from-cyan-600 via-blue-950 to-slate-950',
  'from-zinc-700 via-neutral-900 to-black',
];

const EMOJI_PRESETS = ['✨', '📼', '☕', '🌧️', '⚡', '🌙', '🌊', '🎸', '🪐', '📻'];

export const PlaylistModal: React.FC<PlaylistModalProps> = ({
  isOpen,
  onClose,
  onCreatePlaylist,
  existingPlaylist,
}) => {
  const [title, setTitle] = useState(existingPlaylist?.title || '');
  const [description, setDescription] = useState(existingPlaylist?.description || '');
  const [selectedGradient, setSelectedGradient] = useState(
    existingPlaylist?.coverGradient || GRADIENT_PRESETS[0]
  );
  const [selectedEmoji, setSelectedEmoji] = useState(existingPlaylist?.coverEmoji || '✨');
  const [isCollaborative, setIsCollaborative] = useState(
    existingPlaylist?.isCollaborative || false
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newPlaylist: Playlist = {
      id: existingPlaylist ? existingPlaylist.id : `pl-user-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || 'Custom indie collection created by you.',
      coverGradient: selectedGradient,
      coverEmoji: selectedEmoji,
      trackIds: existingPlaylist ? existingPlaylist.trackIds : [],
      isPersonalized: false,
      isCollaborative,
      createdAt: existingPlaylist ? existingPlaylist.createdAt : new Date().toISOString().split('T')[0],
      owner: 'You',
    };

    onCreatePlaylist(newPlaylist);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="playlist-modal-title"
    >
      <div className="relative w-full max-w-md bg-[#18181c] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#1ed760]/10 text-[#1ed760] rounded-lg">
              <Music className="w-5 h-5" />
            </div>
            <h2 id="playlist-modal-title" className="text-lg font-bold text-white">
              {existingPlaylist ? 'Edit Playlist' : 'Create New Playlist'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Cover Preview */}
          <div className="flex items-center gap-4">
            <div
              className={`w-24 h-24 rounded-2xl bg-gradient-to-tr ${selectedGradient} flex items-center justify-center text-4xl shadow-xl border border-white/15 shrink-0`}
            >
              {selectedEmoji}
            </div>
            <div className="flex-1 space-y-2">
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                Cover Emoji
              </label>
              <div className="flex gap-1.5 flex-wrap">
                {EMOJI_PRESETS.map((emoji) => (
                  <button
                    type="button"
                    key={emoji}
                    onClick={() => setSelectedEmoji(emoji)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-base transition-all ${
                      selectedEmoji === emoji
                        ? 'bg-white/20 ring-2 ring-[#1ed760]'
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Color Gradient presets */}
          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Cover Atmosphere Theme
            </label>
            <div className="flex gap-2.5">
              {GRADIENT_PRESETS.map((gradient, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => setSelectedGradient(gradient)}
                  className={`w-8 h-8 rounded-full bg-gradient-to-tr ${gradient} border transition-all ${
                    selectedGradient === gradient
                      ? 'border-white scale-110 shadow-lg'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                  aria-label={`Select gradient style ${i + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="playlist-title-input" className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
              Playlist Name *
            </label>
            <input
              id="playlist-title-input"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 3 AM Tape Whispers"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#1ed760] transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="playlist-desc-input" className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              id="playlist-desc-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Give your playlist a vibe or story..."
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#1ed760] transition-colors resize-none"
            />
          </div>

          {/* Collaborative toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2.5">
              <Users className="w-5 h-5 text-[#1ed760]" />
              <div>
                <p className="text-sm font-semibold text-white">Collaborative Playlist</p>
                <p className="text-xs text-neutral-400">Allow friends to add tracks to this playlist</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsCollaborative(!isCollaborative)}
              className={`w-11 h-6 rounded-full transition-colors relative ${
                isCollaborative ? 'bg-[#1ed760]' : 'bg-neutral-700'
              }`}
              role="switch"
              aria-checked={isCollaborative}
              aria-label="Toggle collaborative playlist"
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform absolute top-0.5 left-0.5 ${
                  isCollaborative ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-neutral-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#1ed760] hover:bg-[#1db954] text-black transition-all shadow-lg shadow-[#1ed760]/20"
            >
              <Sparkles className="w-4 h-4" />
              {existingPlaylist ? 'Save Changes' : 'Create Playlist'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
