/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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
  Volume1,
  Heart,
  Share2,
  Mic2,
  ListMusic,
  Radio,
  Tv,
  Sliders,
  Waves,
  Activity,
  Maximize2,
  Download,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { IndieTrack, formatDuration } from '../utils/musicDiscovery';
import { AudioVisualizer } from './AudioVisualizer';
import { D3AudioVisualizer } from './D3AudioVisualizer';
import { MobileVisualizerModal } from './MobileVisualizerModal';

interface PlayerBarProps {
  currentTrack: IndieTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  isLiked: boolean;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onToggleLike: (trackId: string) => void;
  onShare: (track: IndieTrack) => void;
  onToggleLyrics: () => void;
  onToggleQueue: () => void;
  onSelectArtist: (artistId: string) => void;
  isVideoVisible?: boolean;
  onToggleVideo?: () => void;
  onOpenSettings?: () => void;
  crossfadeDuration?: number;
  isVisualizerOpen?: boolean;
  onToggleVisualizer?: (open: boolean) => void;
  isDownloaded?: boolean;
  isDownloading?: boolean;
  onDownloadTrack?: (track: IndieTrack) => void;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  isShuffle,
  repeatMode,
  isLiked,
  onPlay,
  onPause,
  onNext,
  onPrevious,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleShuffle,
  onToggleRepeat,
  onToggleLike,
  onShare,
  onToggleLyrics,
  onToggleQueue,
  onSelectArtist,
  isVideoVisible = false,
  onToggleVideo,
  onOpenSettings,
  crossfadeDuration = 4,
  isVisualizerOpen: externalVisualizerOpen,
  onToggleVisualizer,
  isDownloaded = false,
  isDownloading = false,
  onDownloadTrack,
}) => {
  const [isSeeking, setIsSeeking] = useState(false);
  const [tempSeekTime, setTempSeekTime] = useState(0);
  const [internalVisualizerOpen, setInternalVisualizerOpen] = useState(false);
  const [hoverSeekTime, setHoverSeekTime] = useState<number | null>(null);
  const [hoverSeekPos, setHoverSeekPos] = useState<number>(0);
  const [showVolumeTooltip, setShowVolumeTooltip] = useState(false);

  const isVisualizerOpen =
    externalVisualizerOpen !== undefined ? externalVisualizerOpen : internalVisualizerOpen;

  const setIsVisualizerOpen = (val: boolean) => {
    setInternalVisualizerOpen(val);
    if (onToggleVisualizer) onToggleVisualizer(val);
  };

  if (!currentTrack) {
    return (
      <footer className="h-20 bg-[#121216] border-t border-white/10 px-4 flex items-center justify-between text-neutral-400 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center text-neutral-500">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <p className="text-neutral-300 font-medium">Ready to discover indie gems</p>
            <p className="text-neutral-500 text-[11px]">Choose a track or personalized playlist to start</p>
          </div>
        </div>
      </footer>
    );
  }

  const effectiveDuration = duration || currentTrack.duration;
  const displayCurrentTime = isSeeking ? tempSeekTime : currentTime;
  const progressPercent =
    effectiveDuration > 0
      ? Math.min(100, Math.max(0, (displayCurrentTime / effectiveDuration) * 100))
      : 0;
  const volumePercent = isMuted ? 0 : Math.round(volume * 100);

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setTempSeekTime(val);
  };

  const handleSeekCommit = (e: React.SyntheticEvent<HTMLInputElement>) => {
    const val = parseFloat(e.currentTarget.value);
    setIsSeeking(false);
    onSeek(val);
  };

  const handleScrubberMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverSeekTime(ratio * effectiveDuration);
    setHoverSeekPos(e.clientX - rect.left);
  };

  return (
    <footer className="h-20 sm:h-24 bg-[#121216] border-t border-white/10 px-3 sm:px-4 lg:px-6 flex items-center justify-between select-none z-30 shadow-2xl relative shrink-0">
      {/* Left: Track Information */}
      <div className="flex items-center gap-2 sm:gap-3 flex-1 md:flex-initial md:w-1/4 md:min-w-[200px] min-w-0">
        <img
          src={currentTrack.coverUrl}
          alt={currentTrack.title}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover shadow-md border border-white/10 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-bold text-white truncate hover:underline cursor-pointer">
            {currentTrack.title}
          </p>
          <button
            onClick={() => onSelectArtist(currentTrack.artistId)}
            className="text-[11px] sm:text-xs text-neutral-400 hover:text-white truncate block text-left transition-colors"
          >
            {currentTrack.artist}
          </button>
          <div className="flex items-center gap-1.5 mt-0.5">
            {currentTrack.language === 'kannada' ? (
              <span className="text-[9px] font-bold text-amber-300 bg-amber-500/20 px-1.5 py-0.2 rounded-full border border-amber-500/30">
                ಕನ್ನಡ
              </span>
            ) : currentTrack.language === 'hindi' ? (
              <span className="text-[9px] font-bold text-rose-300 bg-rose-500/20 px-1.5 py-0.2 rounded-full border border-rose-500/30">
                हिन्दी
              </span>
            ) : null}
            {currentTrack.fullSongAvailable || currentTrack.youtubeId ? (
              <span className="text-[9px] font-bold text-black bg-[#1ed760] px-1.5 py-0.2 rounded-full inline-flex items-center gap-0.5 shadow-sm">
                FULL SONG
              </span>
            ) : null}
            {currentTrack.isSpotifyHit ? (
              <span className="hidden sm:inline-flex text-[10px] text-[#1ed760] font-semibold items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1ed760] animate-pulse" />
                Spotify Hit
              </span>
            ) : (
              <span className="hidden sm:inline-block text-[10px] text-purple-400 font-mono">
                {(currentTrack.obscurity * 100).toFixed(0)}% underground
              </span>
            )}
          </div>
        </div>

        {/* Mobile Quick Tap D3 Visualizer Pill */}
        <button
          onClick={() => setIsVisualizerOpen(true)}
          className="md:hidden flex items-center gap-1 px-2 py-1 rounded-full bg-white/[0.07] hover:bg-white/15 border border-white/10 active:scale-95 transition-all shrink-0"
          title="Open D3 Audio Visualizer"
          aria-label="Open D3 Audio Visualizer on phone"
        >
          <Waves className="w-3.5 h-3.5 text-[#1ed760] animate-pulse" />
          <span className="text-[10px] font-mono font-bold text-neutral-200">D3</span>
        </button>

        {/* Like, Download & Share */}
        <div className="hidden sm:flex items-center gap-1 ml-1">
          <button
            onClick={() => onToggleLike(currentTrack.id)}
            className="p-1.5 text-neutral-400 hover:text-rose-500 rounded-full transition-colors"
            aria-label={isLiked ? 'Unlike track' : 'Like track'}
            title={isLiked ? 'Unlike track' : 'Save to Liked Songs'}
          >
            <Heart
              className={`w-4 h-4 ${
                isLiked ? 'text-rose-500 fill-rose-500' : 'text-neutral-400'
              }`}
            />
          </button>
          {onDownloadTrack && (
            <button
              onClick={() => onDownloadTrack(currentTrack)}
              disabled={isDownloading}
              className={`p-1.5 rounded-full transition-colors ${
                isDownloaded
                  ? 'text-[#1ed760] hover:text-[#1ed760]/80'
                  : isDownloading
                  ? 'text-neutral-400 cursor-wait'
                  : 'text-neutral-400 hover:text-white'
              }`}
              aria-label={isDownloaded ? 'Song downloaded to device' : 'Download song for offline listening'}
              title={
                isDownloaded
                  ? 'Downloaded (saved offline & to device)'
                  : isDownloading
                  ? 'Downloading song...'
                  : 'Download song (.wav)'
              }
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#1ed760]" />
              ) : isDownloaded ? (
                <CheckCircle2 className="w-4 h-4 text-[#1ed760]" />
              ) : (
                <Download className="w-4 h-4" />
              )}
            </button>
          )}
          <button
            onClick={() => onShare(currentTrack)}
            className="p-1.5 text-neutral-400 hover:text-white rounded-full transition-colors"
            aria-label="Share current track"
            title="Share track"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Center: Controls & Scrubber */}
      <div className="flex flex-col items-center justify-center max-w-xl w-2/4 px-2">
        {/* Buttons */}
        <div className="flex items-center gap-4 sm:gap-5 mb-1.5">
          {/* Shuffle */}
          <button
            onClick={onToggleShuffle}
            className={`p-1.5 rounded-full transition-all active:scale-90 ${
              isShuffle ? 'text-[#1ed760]' : 'text-neutral-400 hover:text-white'
            }`}
            aria-label={isShuffle ? 'Disable shuffle' : 'Enable shuffle'}
            title={isShuffle ? 'Shuffle enabled' : 'Enable shuffle'}
          >
            <Shuffle className="w-4 h-4" />
          </button>

          {/* Previous */}
          <button
            onClick={onPrevious}
            className="p-1.5 text-neutral-300 hover:text-white active:scale-90 transition-all"
            aria-label="Previous track"
            title="Previous track"
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </button>

          {/* Play/Pause */}
          <button
            onClick={isPlaying ? onPause : onPlay}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#1ed760] hover:bg-[#1db954] hover:scale-105 active:scale-95 text-black flex items-center justify-center transition-all shadow-lg shadow-[#1ed760]/30"
            aria-label={isPlaying ? 'Pause' : 'Play'}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-black" />
            ) : (
              <Play className="w-5 h-5 fill-black ml-0.5" />
            )}
          </button>

          {/* Next */}
          <button
            onClick={onNext}
            className="p-1.5 text-neutral-300 hover:text-white active:scale-90 transition-all"
            aria-label="Next track"
            title="Next track"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>

          {/* Repeat */}
          <button
            onClick={onToggleRepeat}
            className={`p-1.5 rounded-full transition-all active:scale-90 ${
              repeatMode !== 'off' ? 'text-[#1ed760]' : 'text-neutral-400 hover:text-white'
            }`}
            aria-label={`Repeat mode: ${repeatMode}`}
            title={`Repeat mode: ${repeatMode}`}
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="w-4 h-4" />
            ) : (
              <Repeat className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Scrubber bar */}
        <div className="w-full flex items-center gap-2.5 text-[11px] font-mono text-neutral-400 select-none">
          <span className="w-10 text-right tabular-nums text-neutral-300">
            {formatDuration(displayCurrentTime)}
          </span>
          <div
            className="relative flex-1 flex items-center group py-2"
            onMouseMove={handleScrubberMouseMove}
            onMouseLeave={() => setHoverSeekTime(null)}
          >
            {hoverSeekTime !== null && (
              <div
                className="absolute -top-6 px-1.5 py-0.5 rounded bg-black/90 border border-white/20 text-[10px] font-mono text-white shadow pointer-events-none -translate-x-1/2 z-20"
                style={{ left: `${hoverSeekPos}px` }}
              >
                {formatDuration(hoverSeekTime)}
              </div>
            )}
            <input
              type="range"
              min={0}
              max={effectiveDuration}
              step={0.1}
              value={displayCurrentTime}
              onMouseDown={() => setIsSeeking(true)}
              onTouchStart={() => setIsSeeking(true)}
              onChange={handleSeekChange}
              onMouseUp={handleSeekCommit}
              onTouchEnd={handleSeekCommit}
              style={{
                background: `linear-gradient(to right, #1ed760 0%, #1ed760 ${progressPercent}%, rgba(255, 255, 255, 0.2) ${progressPercent}%, rgba(255, 255, 255, 0.2) 100%)`,
              }}
              className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer focus:outline-none accent-[#1ed760]"
              aria-label="Seek track position"
            />
          </div>
          <span className="w-10 text-left tabular-nums text-neutral-400">
            {formatDuration(effectiveDuration)}
          </span>
        </div>
      </div>

      {/* Right: Soundwave Visualizer, Lyrics, Queue, Volume */}
      <div className="flex items-center justify-end gap-3 w-1/4 min-w-[200px]">
        {/* Interactive D3 Real-Time Spectrum Visualizer (Desktop & Tablet) */}
        <div
          onClick={() => setIsVisualizerOpen(true)}
          className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 cursor-pointer group transition-all"
          title="Open Fullscreen D3 Real-Time Audio Visualizer"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setIsVisualizerOpen(true);
          }}
        >
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1ed760] animate-pulse" />
              <span className="text-[10px] font-mono font-bold tracking-wider text-neutral-300 uppercase">
                D3 Visualizer
              </span>
            </div>
            <D3AudioVisualizer
              isPlaying={isPlaying}
              variant="compact"
              mode="wave"
              theme="emerald"
              width={75}
              height={18}
            />
          </div>
          <Maximize2 className="w-3.5 h-3.5 text-neutral-400 group-hover:text-[#1ed760] group-hover:scale-110 transition-transform ml-0.5" />
        </div>

        {/* Dedicated D3 Visualizer Toggle Button */}
        <button
          onClick={() => setIsVisualizerOpen(true)}
          className={`p-1.5 rounded-full transition-all relative group flex items-center gap-1 ${
            isVisualizerOpen
              ? 'bg-[#1ed760] text-black font-bold shadow-md shadow-[#1ed760]/30'
              : 'text-neutral-400 hover:text-white hover:bg-white/10'
          }`}
          aria-label="Open D3 Audio Visualizer"
          title="D3 Real-Time Audio Visualizer (Easy to use on phone & desktop)"
        >
          <Waves className={`w-4 h-4 ${isPlaying ? 'text-[#1ed760]' : ''}`} />
        </button>

        {/* Video Mode toggle button */}
        {currentTrack.youtubeId && onToggleVideo && (
          <button
            onClick={onToggleVideo}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
              isVideoVisible
                ? 'bg-[#1ed760] text-black shadow-lg shadow-[#1ed760]/30 font-bold'
                : 'bg-white/10 hover:bg-white/15 text-neutral-300 hover:text-white'
            }`}
            title={isVideoVisible ? 'Minimize Video to Audio Mode' : 'Watch Official Music Video'}
          >
            <Tv className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">{isVideoVisible ? 'Video Open' : 'Music Video'}</span>
          </button>
        )}

        {/* Lyrics */}
        <button
          onClick={onToggleLyrics}
          className="p-1.5 text-neutral-400 hover:text-white rounded-full transition-colors relative"
          aria-label="Toggle lyrics and liner notes"
          title="Lyrics & Liner Notes"
        >
          <Mic2 className="w-4 h-4" />
        </button>

        {/* Queue */}
        <button
          onClick={onToggleQueue}
          className="p-1.5 text-neutral-400 hover:text-white rounded-full transition-colors relative"
          aria-label="Toggle play queue"
          title="Play Queue"
        >
          <ListMusic className="w-4 h-4" />
        </button>

        {/* Playback Settings & Crossfade */}
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="p-1.5 text-neutral-400 hover:text-white rounded-full hover:bg-white/10 transition-all relative group flex items-center gap-1"
            aria-label="Open playback settings"
            title={`Playback Settings • Crossfade: ${crossfadeDuration === 0 ? 'Off' : `${crossfadeDuration}s`}`}
          >
            <Sliders className="w-4 h-4 group-hover:text-[#1ed760] transition-colors" />
            {crossfadeDuration > 0 && (
              <span className="hidden 2xl:inline text-[9px] font-mono font-bold bg-[#1ed760]/20 text-[#1ed760] px-1 rounded-sm border border-[#1ed760]/30">
                {crossfadeDuration}s
              </span>
            )}
          </button>
        )}

        {/* Volume */}
        <div
          className="flex items-center gap-2 w-28 sm:w-32 relative group/vol"
          onMouseEnter={() => setShowVolumeTooltip(true)}
          onMouseLeave={() => setShowVolumeTooltip(false)}
        >
          {showVolumeTooltip && (
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-black/90 backdrop-blur border border-white/20 text-[10px] font-mono text-white shadow pointer-events-none z-20 whitespace-nowrap">
              {isMuted ? 'Muted' : `${volumePercent}%`}
            </div>
          )}
          <button
            onClick={onToggleMute}
            className={`p-1.5 rounded-full transition-all active:scale-95 ${
              isMuted || volume === 0
                ? 'text-rose-400 bg-rose-500/10'
                : 'text-neutral-400 hover:text-white hover:bg-white/10'
            }`}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            title={isMuted ? 'Unmute' : `Mute (Current: ${volumePercent}%)`}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : volume < 0.5 ? (
              <Volume1 className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            style={{
              background: `linear-gradient(to right, #1ed760 0%, #1ed760 ${volumePercent}%, rgba(255, 255, 255, 0.2) ${volumePercent}%, rgba(255, 255, 255, 0.2) 100%)`,
            }}
            className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer focus:outline-none accent-[#1ed760]"
            aria-label="Volume slider"
            title={`Volume: ${volumePercent}%`}
          />
        </div>
      </div>

      {/* Mobile & Fullscreen D3 Real-Time Visualizer Modal */}
      <MobileVisualizerModal
        isOpen={isVisualizerOpen}
        onClose={() => setIsVisualizerOpen(false)}
        track={currentTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        isMuted={isMuted}
        isShuffle={isShuffle}
        repeatMode={repeatMode}
        isLiked={isLiked}
        onPlay={onPlay}
        onPause={onPause}
        onNext={onNext}
        onPrevious={onPrevious}
        onSeek={onSeek}
        onVolumeChange={onVolumeChange}
        onToggleMute={onToggleMute}
        onToggleShuffle={onToggleShuffle}
        onToggleRepeat={onToggleRepeat}
        onToggleLike={onToggleLike}
      />
    </footer>
  );
};
