/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Heart,
  Tv,
  Search,
  Radio,
  Loader2,
  History,
  X,
} from 'lucide-react';
import { IndieTrack, Playlist, formatDuration } from '../utils/musicDiscovery';
import type { RecommendedTrackItem } from '../utils/smartRecommendations';
import {
  getSearchShortcuts,
  recordSearchHistory,
  removeSearchShortcut,
  SearchHistoryEntry,
  subscribeSearchHistory,
} from '../utils/searchHistory';

interface FrontMusicControllerProps {
  currentTrack: IndieTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  isLiked: boolean;
  isVideoVisible: boolean;
  allTracks: IndieTrack[];
  onPlayTrack: (track: IndieTrack) => void;
  onPauseTrack: () => void;
  onResumeTrack: () => void;
  onNextTrack: () => void;
  onPreviousTrack: () => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onToggleLike: (trackId: string) => void;
  onToggleVideo: () => void;
  onPlayYouTubeTrack?: (track: IndieTrack) => void;
  recommendedNextTracks?: RecommendedTrackItem[];
  onAddToQueue?: (track: IndieTrack) => void;
  activeHomePlaylist?: Playlist | null;
  activeHomePlaylistTracks?: IndieTrack[];
}

export const FrontMusicController: React.FC<FrontMusicControllerProps> = ({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  isShuffle,
  repeatMode,
  isLiked,
  isVideoVisible,
  allTracks,
  onPlayTrack,
  onPauseTrack,
  onResumeTrack,
  onNextTrack,
  onPreviousTrack,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleShuffle,
  onToggleRepeat,
  onToggleLike,
  onToggleVideo,
  onPlayYouTubeTrack,
  recommendedNextTracks = [],
  onAddToQueue,
  activeHomePlaylist = null,
  activeHomePlaylistTracks = [],
}) => {
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);
  const [ytSearchQuery, setYtSearchQuery] = useState('');
  const [isSearchingYt, setIsSearchingYt] = useState(false);
  const [ytSearchResults, setYtSearchResults] = useState<IndieTrack[]>([]);
  const [showYtResults, setShowYtResults] = useState(false);
  const [artworkFailed, setArtworkFailed] = useState<string | null>(null);
  const [searchShortcuts, setSearchShortcuts] = useState<SearchHistoryEntry[]>(() => getSearchShortcuts(6));
  const searchTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const sync = () => setSearchShortcuts(getSearchShortcuts(6));
    sync();
    return subscribeSearchHistory(sync);
  }, []);

  const upNextRec = recommendedNextTracks[0] || null;

  // Quick switch pool prioritizes tracks from the user's active Home playlist + personalized Up Next recommendations
  const quickSwitchTracks = [
    ...(currentTrack ? [currentTrack] : []),
    ...recommendedNextTracks.map((r) => r.track),
    ...activeHomePlaylistTracks,
    ...allTracks.filter((t) => t.id !== 'kn-trk-1').slice(0, 14),
  ]
    .filter((t, idx, arr) => arr.findIndex((x) => x.id === t.id) === idx)
    .slice(0, 14);

  const handleSearchYouTube = async (queryText: string) => {
    const q = queryText.trim();
    if (!q) {
      setYtSearchResults([]);
      setShowYtResults(false);
      return;
    }

    recordSearchHistory(q, 'youtube_controller');
    setIsSearchingYt(true);
    setShowYtResults(true);

    try {
      const res = await fetch(`/api/search-full-music?q=${encodeURIComponent(q)}&limit=25`);
      if (res.ok) {
        const data = await res.json();
        if (data.results && Array.isArray(data.results)) {
          setYtSearchResults(data.results);
        }
      }
    } catch (err) {
      console.warn('YouTube search failed:', err);
    } finally {
      setIsSearchingYt(false);
    }
  };

  const handleYtInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setYtSearchQuery(val);

    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current);
    }

    if (val.trim().length >= 2) {
      searchTimeoutRef.current = window.setTimeout(() => {
        handleSearchYouTube(val);
      }, 400);
    } else {
      setYtSearchResults([]);
      setShowYtResults(false);
    }
  };

  const handleSelectYtTrack = (track: IndieTrack) => {
    setShowYtResults(false);
    setYtSearchQuery('');
    if (onPlayYouTubeTrack) {
      onPlayYouTubeTrack(track);
    } else {
      onPlayTrack(track);
    }
  };

  const safeDuration = duration > 0 ? duration : currentTrack?.duration || 240;
  const displayTime = isScrubbing ? scrubValue : currentTime;
  const progressPercent = Math.min(100, Math.max(0, (displayTime / safeDuration) * 100));

  return (
    <section
      aria-label="Now Playing Studio Deck"
      className="relative rounded-3xl bg-[#131521] border border-white/[0.08] p-5 sm:p-6 shadow-2xl overflow-hidden animate-fade-in"
    >
      {/* Subtle Top Metadata Header (Clean editorial text, zero pill stacks) */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2 text-xs text-neutral-400 min-w-0">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-300 whitespace-nowrap">
            Now Playing
          </span>
          <span aria-hidden="true">·</span>
          <span className="truncate text-neutral-400">Apna Hi-Fi Studio</span>
        </div>

        <button
          onClick={onToggleVideo}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer shrink-0 ${
            isVideoVisible
              ? 'bg-white text-black'
              : 'bg-white/[0.07] hover:bg-white/[0.12] text-neutral-200 border border-white/10'
          }`}
          title={isVideoVisible ? 'Hide Video Window' : 'Watch Music Video'}
        >
          <Tv className="w-3.5 h-3.5" />
          <span>{isVideoVisible ? 'Hide Video' : 'Video'}</span>
        </button>
      </div>

      {/* Main Hi-Fi Playback Row (Screenshot 2 Matte Obsidian + White Play Button) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* Track Artwork & Metadata (5 cols) */}
        <div className="lg:col-span-5 flex items-center gap-4 min-w-0">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-[#1a1d2c] border border-white/10 shadow-xl shrink-0">
            {currentTrack && artworkFailed !== currentTrack.id ? (
              <img
                src={currentTrack.coverUrl}
                alt={currentTrack.title}
                referrerPolicy="no-referrer"
                onError={() => setArtworkFailed(currentTrack.id)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-neutral-950 text-sky-400">
                <Radio className="w-7 h-7" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-white truncate leading-tight">
                {currentTrack?.title || 'No Song Playing'}
              </h2>
              {currentTrack && (
                <button
                  onClick={() => onToggleLike(currentTrack.id)}
                  className="p-1.5 rounded-full text-neutral-400 hover:text-rose-500 transition-colors shrink-0 cursor-pointer"
                  aria-label={isLiked ? 'Unlike track' : 'Like track'}
                  title={isLiked ? 'Unlike track' : 'Like track'}
                >
                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                </button>
              )}
            </div>

            <p className="text-sm text-neutral-400 truncate mt-0.5">
              {currentTrack?.artist || 'Select a song to start'}
            </p>

            {/* Clean unboxed typographic metadata */}
            {currentTrack && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-neutral-400 truncate">
                <span>
                  {currentTrack.language === 'kannada'
                    ? 'ಕನ್ನಡ Kannada'
                    : currentTrack.language === 'hindi'
                    ? 'हिन्दी Bollywood'
                    : currentTrack.genre}
                </span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{currentTrack.releaseYear}</span>
                {currentTrack.energy > 0.7 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-sky-400">High Energy</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Minimalist White Scrubber & White Circular Play/Pause Controls (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-center gap-3.5">
          <div className="flex items-center justify-center lg:justify-end gap-3 sm:gap-5">
            <button
              onClick={onToggleShuffle}
              className={`min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full transition-colors cursor-pointer ${
                isShuffle
                  ? 'text-sky-400 bg-sky-400/10'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
              title={isShuffle ? 'Shuffle Enabled' : 'Enable Shuffle'}
              aria-label="Toggle Shuffle"
            >
              <Shuffle className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <button
              onClick={onPreviousTrack}
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full text-neutral-200 hover:text-white hover:bg-white/5 active:scale-90 transition-all cursor-pointer"
              title="Previous Track"
              aria-label="Previous Track"
            >
              <SkipBack className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
            </button>

            {/* Iconic Crisp White Circular Play/Pause Button (Screenshot 2) */}
            <button
              onClick={isPlaying ? onPauseTrack : onResumeTrack}
              className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-white hover:bg-neutral-200 text-black flex items-center justify-center shadow-[0_8px_24px_rgba(255,255,255,0.18)] active:scale-95 transition-all cursor-pointer"
              title={isPlaying ? 'Pause' : 'Play'}
              aria-label={isPlaying ? 'Pause Track' : 'Play Track'}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 fill-black stroke-black" />
              ) : (
                <Play className="w-6 h-6 fill-black stroke-black ml-0.5" />
              )}
            </button>

            <button
              onClick={onNextTrack}
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full text-neutral-200 hover:text-white hover:bg-white/5 active:scale-90 transition-all cursor-pointer"
              title="Next Track"
              aria-label="Next Track"
            >
              <SkipForward className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
            </button>

            <button
              onClick={onToggleRepeat}
              className={`min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full transition-colors cursor-pointer ${
                repeatMode !== 'off'
                  ? 'text-sky-400 bg-sky-400/10'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
              title={`Repeat: ${repeatMode}`}
              aria-label="Toggle Repeat"
            >
              {repeatMode === 'one' ? (
                <Repeat1 className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <Repeat className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </button>

            {/* Volume Control */}
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-white/10">
              <button
                onClick={onToggleMute}
                className="p-1.5 text-neutral-400 hover:text-white cursor-pointer"
                title={isMuted ? 'Unmute' : 'Mute'}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-neutral-300" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.02"
                value={isMuted ? 0 : volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                style={{
                  background: `linear-gradient(to right, #ffffff 0%, #ffffff ${
                    isMuted ? 0 : Math.round(volume * 100)
                  }%, rgba(255,255,255,0.16) ${isMuted ? 0 : Math.round(volume * 100)}%, rgba(255,255,255,0.16) 100%)`,
                }}
                className="w-16 h-1 rounded-full appearance-none cursor-pointer accent-white"
                aria-label="Volume Slider"
              />
            </div>
          </div>

          {/* Crisp White Minimalist Scrub Slider */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono tabular-nums text-neutral-400 w-9 text-right shrink-0">
              {formatDuration(Math.round(displayTime))}
            </span>

            <input
              type="range"
              min="0"
              max={safeDuration}
              step="0.5"
              value={displayTime}
              onMouseDown={() => setIsScrubbing(true)}
              onTouchStart={() => setIsScrubbing(true)}
              onChange={(e) => setScrubValue(parseFloat(e.target.value))}
              onMouseUp={() => {
                setIsScrubbing(false);
                onSeek(scrubValue);
              }}
              onTouchEnd={() => {
                setIsScrubbing(false);
                onSeek(scrubValue);
              }}
              style={{
                background: `linear-gradient(to right, #ffffff 0%, #ffffff ${progressPercent}%, rgba(255,255,255,0.16) ${progressPercent}%, rgba(255,255,255,0.16) 100%)`,
              }}
              className="flex-1 h-1 rounded-full appearance-none cursor-pointer accent-white"
              aria-label="Seek Track Slider"
            />

            <span className="text-[11px] font-mono tabular-nums text-neutral-400 w-9 shrink-0">
              {formatDuration(Math.round(safeDuration))}
            </span>
          </div>
        </div>
      </div>

      {/* Recently Played / Up Next Strip (Screenshot 2 Left-Phone Style) */}
      <div className="mt-5 pt-4 border-t border-white/[0.07]">
        <div className="flex items-center justify-between gap-2 mb-2.5 flex-wrap">
          <span className="text-xs font-semibold text-neutral-200">
            {activeHomePlaylist
              ? `Playlist Quick Switch · ${activeHomePlaylist.title}`
              : 'Recently Played & Up Next'}
          </span>

          {upNextRec && (
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <span className="text-sky-400 font-medium">Up next:</span>
              <span className="truncate max-w-[180px] text-neutral-200 font-medium">
                {upNextRec.track.title}
              </span>
              {onAddToQueue && (
                <button
                  onClick={() => onAddToQueue(upNextRec.track)}
                  className="text-sky-400 hover:text-sky-300 font-medium cursor-pointer"
                  title={`Queue ${upNextRec.track.title}`}
                >
                  + Queue
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 no-scrollbar">
          {quickSwitchTracks.map((track) => {
            const isThisPlaying = currentTrack?.id === track.id && isPlaying;
            return (
              <button
                key={track.id}
                onClick={() => onPlayTrack(track)}
                className={`flex items-center gap-2.5 p-2 pr-3.5 rounded-xl border transition-colors shrink-0 cursor-pointer text-left ${
                  currentTrack?.id === track.id
                    ? 'bg-white/[0.12] border-white/25 text-white'
                    : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.06] text-neutral-300 hover:text-white'
                }`}
                title={`Play ${track.title} by ${track.artist}`}
              >
                <div className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-[#1a1d2c]">
                  <img
                    src={track.coverUrl}
                    alt={track.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  {isThisPlaying && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Pause className="w-3.5 h-3.5 fill-white text-white" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 max-w-[140px]">
                  <p className="text-xs font-semibold truncate leading-tight">{track.title}</p>
                  <p className="text-[11px] text-neutral-400 truncate">{track.artist}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Clean Search Bar for Any YouTube Song or Link */}
      <div className="mt-4 pt-3.5 border-t border-white/[0.07] relative z-20">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
            {isSearchingYt ? (
              <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
            ) : (
              <Search className="w-4 h-4 text-neutral-400" />
            )}
          </div>
          <input
            type="text"
            value={ytSearchQuery}
            onChange={handleYtInputChange}
            placeholder="Search & play ANY song from YouTube (e.g. Kesariya, Arijit, KGF, 90s Hits, or link)..."
            className="w-full pl-10 pr-24 py-2.5 bg-white/[0.06] border border-white/10 focus:border-sky-400/60 rounded-xl text-xs sm:text-sm text-white placeholder-neutral-400 outline-none transition-colors"
          />
          <button
            onClick={() => handleSearchYouTube(ytSearchQuery)}
            disabled={!ytSearchQuery.trim() || isSearchingYt}
            className="absolute right-1.5 top-1.5 bottom-1.5 px-3.5 rounded-lg bg-white hover:bg-neutral-200 disabled:opacity-40 text-black font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>Play YT</span>
          </button>
        </div>

        {/* Search History Shortcuts */}
        {searchShortcuts.length > 0 && !showYtResults && (
          <div className="flex items-center gap-2 overflow-x-auto pt-2.5 no-scrollbar">
            <span className="text-[11px] font-medium text-neutral-400 flex items-center gap-1 shrink-0">
              <History className="w-3 h-3 text-sky-400" />
              Recent:
            </span>
            {searchShortcuts.map((entry) => (
              <div
                key={`yt-sc-${entry.normalized}`}
                className="inline-flex items-center rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-[11px] text-neutral-200 shrink-0"
              >
                <button
                  type="button"
                  onClick={() => {
                    setYtSearchQuery(entry.query);
                    handleSearchYouTube(entry.query);
                  }}
                  className="pl-2.5 pr-1 py-1 cursor-pointer hover:text-sky-400"
                >
                  {entry.query}
                </button>
                <button
                  type="button"
                  onClick={() => removeSearchShortcut(entry.query)}
                  className="pr-2 pl-0.5 py-1 text-neutral-500 hover:text-rose-400 cursor-pointer"
                  aria-label={`Remove ${entry.query}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Live Search Results Dropdown */}
        {showYtResults && ytSearchResults.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-[#161824] border border-white/15 rounded-2xl p-2 shadow-2xl z-50 max-h-72 overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between px-2.5 py-1.5 text-xs text-neutral-400 border-b border-white/10">
              <span className="font-semibold text-white">
                Results ({ytSearchResults.length})
              </span>
              <button
                onClick={() => setShowYtResults(false)}
                className="text-xs text-neutral-400 hover:text-white cursor-pointer"
              >
                Close
              </button>
            </div>
            <div className="divide-y divide-white/5 mt-1">
              {ytSearchResults.map((track) => (
                <div
                  key={track.id}
                  onClick={() => handleSelectYtTrack(track)}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer group"
                >
                  <img
                    src={track.coverUrl}
                    alt={track.title}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-lg object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-white truncate group-hover:text-sky-400 transition-colors">
                      {track.title}
                    </p>
                    <p className="text-[11px] text-neutral-400 truncate">{track.artist}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectYtTrack(track);
                    }}
                    className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shrink-0 active:scale-95 shadow"
                    aria-label={`Play ${track.title}`}
                  >
                    <Play className="w-3.5 h-3.5 fill-black ml-0.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
