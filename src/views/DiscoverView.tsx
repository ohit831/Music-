/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Sparkles,
  Sliders,
  Disc,
  Play,
  Save,
  Check,
  RefreshCw,
  Zap,
  Moon,
  Sun,
  Flame,
  Radio,
  Share2,
  ChevronRight,
} from 'lucide-react';
import {
  IndieTrack,
  Playlist,
  DiscoveryPreferences,
  generatePersonalizedMix,
  scoreTrackAffinity,
} from '../utils/musicDiscovery';
import { TrackRow } from '../components/TrackRow';

interface DiscoverViewProps {
  tracks: IndieTrack[];
  currentTrack: IndieTrack | null;
  isPlaying: boolean;
  likedTrackIds: Set<string>;
  onPlayTrack: (track: IndieTrack) => void;
  onPauseTrack: () => void;
  onToggleLike: (trackId: string) => void;
  onShareTrack: (track: IndieTrack) => void;
  onAddToQueue: (track: IndieTrack) => void;
  onSelectArtist: (artistId: string) => void;
  userPlaylists: Playlist[];
  onAddToPlaylist: (playlistId: string, trackId: string) => void;
  onSavePersonalizedPlaylist: (playlist: Playlist) => void;
  onGoToCurator?: () => void;
  onEditMetadata?: (track: IndieTrack) => void;
}

const SUBGENRES = [
  'Dream Pop',
  'Bedroom Lo-Fi',
  'Indie Rock',
  'Neo-Folk',
  'Math Rock',
  'Shoegaze',
  'Synthwave',
];

export const DiscoverView: React.FC<DiscoverViewProps> = ({
  tracks,
  currentTrack,
  isPlaying,
  likedTrackIds,
  onPlayTrack,
  onPauseTrack,
  onToggleLike,
  onShareTrack,
  onAddToQueue,
  onSelectArtist,
  userPlaylists,
  onAddToPlaylist,
  onSavePersonalizedPlaylist,
  onGoToCurator,
  onEditMetadata,
}) => {
  const [selectedGenres, setSelectedGenres] = useState<string[]>(['Dream Pop', 'Bedroom Lo-Fi']);
  const [obscurityTarget, setObscurityTarget] = useState<number>(0.75); // 0 to 1
  const [energyTarget, setEnergyTarget] = useState<number>(0.4); // 0 to 1
  const [melancholyTarget, setMelancholyTarget] = useState<number>(0.65); // 0 to 1
  const [mixTitle, setMixTitle] = useState<string>('My Midnight Indie Capsule');
  const [savedMixToast, setSavedMixToast] = useState(false);
  const [rouletteIndex, setRouletteIndex] = useState(0);

  const toggleGenre = (genre: string) => {
    if (selectedGenres.includes(genre)) {
      if (selectedGenres.length > 1) {
        setSelectedGenres(selectedGenres.filter((g) => g !== genre));
      }
    } else {
      setSelectedGenres([...selectedGenres, genre]);
    }
  };

  const currentPrefs: DiscoveryPreferences = {
    genres: selectedGenres,
    minObscurity: Math.max(0, obscurityTarget - 0.25),
    maxObscurity: Math.min(1, obscurityTarget + 0.25),
    energyTarget,
    melancholyTarget,
  };

  // Generate real-time scored tracks
  const scoredTracks = tracks
    .map((track) => ({
      track,
      affinity: scoreTrackAffinity(track, currentPrefs, likedTrackIds),
    }))
    .sort((a, b) => b.affinity - a.affinity);

  const handleSaveMix = () => {
    const { playlist } = generatePersonalizedMix(mixTitle, currentPrefs, tracks, 8);
    onSavePersonalizedPlaylist(playlist);
    setSavedMixToast(true);
    setTimeout(() => setSavedMixToast(false), 2500);
  };

  const handleNextRoulette = () => {
    setRouletteIndex((prev) => (prev + 1) % tracks.length);
  };

  const rouletteTrack = tracks[rouletteIndex] || tracks[0];

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 rounded-lg bg-[#1ed760]/20 text-[#1ed760]">
              <Sliders className="w-5 h-5" />
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white">
              Indie Sound Capsule & Radar
            </h1>
          </div>
          <p className="text-xs md:text-sm text-neutral-400">
            Tune algorithmic parameters to discover unreleased tape loops and rare indie gems.
          </p>
        </div>

        <button
          onClick={handleSaveMix}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1ed760] hover:bg-[#1db954] text-black font-bold text-xs md:text-sm transition-transform active:scale-95 shadow-lg shadow-[#1ed760]/20 shrink-0"
        >
          {savedMixToast ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {savedMixToast ? 'Saved to Your Library!' : 'Save Personalized Mix'}
        </button>
      </div>

      {/* AI Curator Spotlight Card */}
      {onGoToCurator && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 md:p-5 rounded-2xl bg-gradient-to-r from-purple-900/30 via-[#161622] to-emerald-900/20 border border-purple-500/30 shadow-lg">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-500 to-[#1ed760] flex items-center justify-center text-black font-extrabold shrink-0 shadow-md">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-sm">AI Music Curator Engine Active</span>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-500 text-white font-mono">
                  GEMINI 3.8
                </span>
              </div>
              <p className="text-xs text-neutral-300 mt-0.5">
                Generate personalized Daily or Weekly playlists analyzing your play history and skipped tracks.
              </p>
            </div>
          </div>
          <button
            onClick={onGoToCurator}
            className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-500 to-[#1ed760] text-black font-black text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            <span>Open AI Curator</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Interactive Sound Capsule Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sliders Panel */}
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#1ed760]" />
              Sonic Parameters
            </h2>
            <button
              onClick={() => {
                setObscurityTarget(0.8);
                setEnergyTarget(0.5);
                setMelancholyTarget(0.7);
                setSelectedGenres(['Dream Pop', 'Bedroom Lo-Fi', 'Shoegaze']);
              }}
              className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>

          {/* Subgenres selector */}
          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2.5">
              Favorite Subgenres
            </label>
            <div className="flex flex-wrap gap-2">
              {SUBGENRES.map((genre) => {
                const isSelected = selectedGenres.includes(genre);
                return (
                  <button
                    key={genre}
                    onClick={() => toggleGenre(genre)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-[#1ed760] text-black shadow-md shadow-[#1ed760]/20'
                        : 'bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10'
                    }`}
                  >
                    {genre}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Obscurity / Underground slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-neutral-300">Underground Index</span>
              <span className="font-mono text-[#1ed760] font-bold">
                {obscurityTarget < 0.4
                  ? 'Trending Indie (<10k plays)'
                  : obscurityTarget < 0.7
                  ? 'Underground (<5k plays)'
                  : 'Hyper Basement Gem (<1.5k plays)'}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={obscurityTarget}
              onChange={(e) => setObscurityTarget(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-[#1ed760]"
              aria-label="Underground obscurity slider"
            />
            <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
              <span>Known on Bandcamp</span>
              <span>Ultra Obscure Tapes</span>
            </div>
          </div>

          {/* Energy Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-neutral-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Energy & Drive
              </span>
              <span className="font-mono text-neutral-300">{(energyTarget * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={energyTarget}
              onChange={(e) => setEnergyTarget(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-[#1ed760]"
              aria-label="Energy slider"
            />
            <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
              <span>Mellow / Acoustic</span>
              <span>Overdrive / Post-Punk</span>
            </div>
          </div>

          {/* Melancholy vs Euphoria */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-neutral-300 flex items-center gap-1.5">
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                Vibe Temperature
              </span>
              <span className="font-mono text-neutral-300">
                {melancholyTarget > 0.5 ? 'Melancholic / Hazy' : 'Euphoric / Warm'}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={melancholyTarget}
              onChange={(e) => setMelancholyTarget(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-[#1ed760]"
              aria-label="Vibe temperature slider"
            />
            <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
              <span>Golden Hour Euphoria</span>
              <span>Rainy Midnight Gloom</span>
            </div>
          </div>

          {/* Playlist Name Input */}
          <div className="pt-2 border-t border-white/10 flex items-center gap-3">
            <label htmlFor="mix-title-input" className="text-xs text-neutral-400 font-semibold shrink-0">
              Mix Name:
            </label>
            <input
              id="mix-title-input"
              type="text"
              value={mixTitle}
              onChange={(e) => setMixTitle(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#1ed760]"
            />
          </div>
        </div>

        {/* Blind Tape Roulette Widget */}
        <div className="bg-gradient-to-b from-[#181820] to-[#0d0d12] border border-white/10 rounded-3xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Tape Roulette
              </span>
              <button
                onClick={handleNextRoulette}
                className="text-xs text-neutral-400 hover:text-white flex items-center gap-1"
                aria-label="Spin next tape"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Spin Next
              </button>
            </div>

            {/* Vintage Cassette Mockup */}
            <div className="relative rounded-2xl bg-neutral-900 border-2 border-neutral-700 p-4 shadow-2xl overflow-hidden group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] font-mono tracking-widest text-neutral-400">
                  C-60 CHROME TAPE
                </span>
                <span className="text-[9px] font-mono text-[#1ed760]">SIDE A</span>
              </div>

              {/* Tape Reels */}
              <div className="h-16 bg-neutral-950 rounded-xl border border-neutral-800 flex items-center justify-around px-4 my-2">
                <div className="w-10 h-10 rounded-full border-2 border-white/20 flex items-center justify-center animate-spin [animation-duration:8s]">
                  <div className="w-3 h-3 rounded-full bg-white/40" />
                </div>
                <div className="w-16 h-4 bg-neutral-800 rounded flex items-center justify-center">
                  <div className="w-12 h-1 bg-amber-900 rounded-full" />
                </div>
                <div className="w-10 h-10 rounded-full border-2 border-white/20 flex items-center justify-center animate-spin [animation-duration:8s]">
                  <div className="w-3 h-3 rounded-full bg-white/40" />
                </div>
              </div>

              <div className="mt-3">
                <p className="text-sm font-bold text-white truncate">{rouletteTrack.title}</p>
                <p className="text-xs text-neutral-400 truncate">{rouletteTrack.artist}</p>
              </div>
            </div>

            <p className="text-xs text-neutral-400 leading-snug">
              Blind preview: sample raw cuts without cover bias to find unexpected favorites.
            </p>
          </div>

          <div className="pt-4 flex gap-2">
            <button
              onClick={() => onPlayTrack(rouletteTrack)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#1ed760] hover:bg-[#1db954] text-black font-bold text-xs transition-transform active:scale-95"
            >
              <Play className="w-4 h-4 fill-black" />
              Listen to Tape
            </button>
            <button
              onClick={() => onToggleLike(rouletteTrack.id)}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white transition-colors"
              aria-label="Like roulette track"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
            </button>
          </div>
        </div>
      </div>

      {/* Personalized Match Results */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>Personalized Affinity Matches</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-[#1ed760] font-mono">
                {scoredTracks.length} tracks matched
              </span>
            </h2>
            <p className="text-xs text-neutral-400">
              Ranked by your subgenres, obscurity preference, and energy curves
            </p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-3 divide-y divide-white/5">
          {scoredTracks.map((item, idx) => (
            <TrackRow
              key={item.track.id}
              track={item.track}
              index={idx}
              isPlaying={isPlaying}
              isCurrentTrack={currentTrack?.id === item.track.id}
              isLiked={likedTrackIds.has(item.track.id)}
              onPlay={onPlayTrack}
              onPause={onPauseTrack}
              onToggleLike={onToggleLike}
              onShare={onShareTrack}
              onAddToQueue={onAddToQueue}
              onSelectArtist={onSelectArtist}
              userPlaylists={userPlaylists}
              onAddToPlaylist={onAddToPlaylist}
              onEditMetadata={onEditMetadata}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
