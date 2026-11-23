/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  Radio,
  Tv,
  Waves,
  Disc3,
  Share2,
  ListMusic,
  Download,
  CheckCircle2,
  Loader2,
  Volume2,
  VolumeX,
  Pencil,
} from 'lucide-react';
import { IndieTrack, formatDuration } from '../utils/musicDiscovery';
import { TrackTransitionDirection, getPlayerBarAnimationClasses } from '../utils/playerTransition';
import { D3AudioVisualizer } from './D3AudioVisualizer';

interface NowPlayingOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  track: IndieTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  isLiked: boolean;
  isVideoVisible?: boolean;
  isDownloaded?: boolean;
  isDownloading?: boolean;
  transitionDirection?: TrackTransitionDirection;
  transitionCount?: number;
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
  onToggleLyrics: () => void;
  onToggleQueue: () => void;
  onToggleVideo?: () => void;
  onShare: (track: IndieTrack) => void;
  onDownloadTrack?: (track: IndieTrack) => void;
  onSelectArtist: (artistId: string) => void;
  onEditMetadata?: (track: IndieTrack) => void;
}

export const NowPlayingOverlay: React.FC<NowPlayingOverlayProps> = ({
  isOpen,
  onClose,
  track,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  isShuffle,
  repeatMode,
  isLiked,
  isVideoVisible = false,
  isDownloaded = false,
  isDownloading = false,
  transitionDirection = 'jump',
  transitionCount = 0,
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
  onToggleLyrics,
  onToggleQueue,
  onToggleVideo,
  onShare,
  onDownloadTrack,
  onSelectArtist,
  onEditMetadata,
}) => {
  const [isSeeking, setIsSeeking] = useState(false);
  const [tempSeek, setTempSeek] = useState(0);
  const [stageMode, setStageMode] = useState<'artwork' | 'visualizer'>('artwork');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showLyricsExpanded, setShowLyricsExpanded] = useState(false);
  const [artworkErrorId, setArtworkErrorId] = useState<string | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (!isOpen) {
      setShowMoreMenu(false);
      return;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setPrefersReducedMotion(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  if (!isOpen || !track) return null;

  const effectiveDuration = duration || track.duration || 210;
  const displayTime = isSeeking ? tempSeek : currentTime;
  const progressPercent =
    effectiveDuration > 0
      ? Math.min(100, Math.max(0, (displayTime / effectiveDuration) * 100))
      : 0;

  const animClasses = getPlayerBarAnimationClasses(
    transitionDirection,
    transitionCount > 0,
    prefersReducedMotion
  );

  const lyricsPreviewLines: string[] = Array.isArray(track.lyrics) && track.lyrics.length > 0
    ? track.lyrics
        .map((l: string) => l.trim())
        .filter((l: string) => Boolean(l) && !l.startsWith('['))
    : [
        `${track.title} — ${track.artist}`,
        'Turn the volume up and let the bass carry the room',
        'Every beat locked in, crystal-clear Hi-Fi stream',
      ];

  const hasArtError = artworkErrorId === track.id;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-[#171822] via-[#101118] to-[#090a0f] text-white overflow-y-auto animate-fade-in select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Now Playing"
    >
      {/* Subtle Ambient Background Aura */}
      <div
        className="pointer-events-none fixed inset-0 opacity-25 blur-3xl"
        style={{
          background:
            'radial-gradient(circle at 50% 28%, rgba(56, 189, 248, 0.22), rgba(16, 17, 24, 0) 65%)',
        }}
        aria-hidden="true"
      />

      {/* Top Navigation Header (Screenshot 2 Center Screen) */}
      <header className="relative z-20 flex items-center justify-between max-w-2xl w-full mx-auto px-5 pt-5 pb-3 shrink-0">
        <button
          onClick={onClose}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-neutral-300 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
          aria-label="Minimize Now Playing"
          title="Minimize"
        >
          <ChevronDown className="w-6 h-6" />
        </button>

        <div className="text-center min-w-0 px-2">
          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-neutral-400">
            Now Playing
          </p>
          <p className="text-xs font-semibold text-neutral-200 truncate">
            Apna Hi-Fi
          </p>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMoreMenu((prev) => !prev)}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-neutral-300 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
            aria-label="Track options"
            title="Track options"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>

          {showMoreMenu && (
            <div className="absolute right-0 mt-1 w-52 rounded-2xl bg-[#181a24] border border-white/10 shadow-2xl p-1.5 z-50 text-xs">
              {onEditMetadata && (
                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    onEditMetadata(track);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-white font-medium hover:bg-white/10 text-left cursor-pointer"
                >
                  <Pencil className="w-4 h-4 text-sky-400" />
                  <span>Edit Metadata</span>
                </button>
              )}
              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  onClose();
                  onToggleQueue();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-neutral-200 hover:bg-white/10 text-left cursor-pointer"
              >
                <ListMusic className="w-4 h-4 text-sky-400" />
                <span>View Play Queue</span>
              </button>
              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  onClose();
                  onToggleLyrics();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-neutral-200 hover:bg-white/10 text-left cursor-pointer"
              >
                <Disc3 className="w-4 h-4 text-sky-400" />
                <span>Full Liner Notes</span>
              </button>
              {onToggleVideo && (
                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    onToggleVideo();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-neutral-200 hover:bg-white/10 text-left cursor-pointer"
                >
                  <Tv className="w-4 h-4 text-sky-400" />
                  <span>{isVideoVisible ? 'Hide Video Window' : 'Watch Video'}</span>
                </button>
              )}
              {onDownloadTrack && (
                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    onDownloadTrack(track);
                  }}
                  disabled={isDownloading}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-neutral-200 hover:bg-white/10 text-left cursor-pointer disabled:opacity-50"
                >
                  {isDownloading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                  ) : isDownloaded ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Download className="w-4 h-4 text-sky-400" />
                  )}
                  <span>{isDownloaded ? 'Downloaded Offline' : 'Save for Offline'}</span>
                </button>
              )}
              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  onShare(track);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-neutral-200 hover:bg-white/10 text-left cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-sky-400" />
                <span>Share Track</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Container */}
      <div className="relative z-10 flex-1 flex flex-col justify-between max-w-lg w-full mx-auto px-6 py-4 gap-6">
        {/* Top Mode Segmented Switch (Artwork vs Spectrum) */}
        <div className="flex justify-center">
          <div className="inline-flex items-center p-1 rounded-xl bg-white/[0.06] border border-white/10 text-xs">
            <button
              onClick={() => setStageMode('artwork')}
              className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                stageMode === 'artwork'
                  ? 'bg-white text-black font-semibold'
                  : 'text-neutral-300 hover:text-white'
              }`}
            >
              Artwork
            </button>
            <button
              onClick={() => setStageMode('visualizer')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                stageMode === 'visualizer'
                  ? 'bg-white text-black font-semibold'
                  : 'text-neutral-300 hover:text-white'
              }`}
            >
              <Waves className="w-3.5 h-3.5" />
              <span>Visualizer</span>
            </button>
          </div>
        </div>

        {/* Center Artwork / Visualizer Frame */}
        <div className="flex items-center justify-center">
          {stageMode === 'artwork' ? (
            <div className="w-64 h-64 sm:w-80 sm:h-80 rounded-2xl overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.65)] border border-white/10 bg-[#181922] relative">
              {hasArtError ? (
                <div
                  key={`${track.id}-np-fallback`}
                  className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 via-[#151722] to-neutral-950 text-sky-400 gap-2 ${animClasses.artworkEnterClass}`}
                >
                  <Radio className="w-10 h-10" />
                  <span className="text-xs text-neutral-400 px-4 text-center truncate max-w-full">
                    {track.title}
                  </span>
                </div>
              ) : (
                <img
                  key={track.id}
                  src={track.coverUrl}
                  alt={track.title}
                  referrerPolicy="no-referrer"
                  onError={() => setArtworkErrorId(track.id)}
                  className={`w-full h-full object-cover will-change-transform ${animClasses.artworkEnterClass}`}
                />
              )}
            </div>
          ) : (
            <div className="w-full max-w-sm h-64 sm:h-80 rounded-2xl bg-black/50 border border-white/10 p-4 flex items-center justify-center overflow-hidden shadow-2xl">
              <D3AudioVisualizer
                isPlaying={isPlaying}
                variant="expanded"
                mode="wave"
                theme="cyber"
                height={240}
                className="w-full"
              />
            </div>
          )}
        </div>

        {/* Track Title, Artist & Subtle Heart */}
        <div className="flex items-center justify-between gap-3">
          <div className="w-10 shrink-0" />
          <div
            key={`np-meta-${track.id}`}
            className={`text-center min-w-0 flex-1 ${animClasses.metaEnterClass}`}
          >
            <h2 className="text-xl sm:text-2xl font-bold text-white truncate tracking-tight">
              {track.title}
            </h2>
            <button
              onClick={() => {
                onClose();
                onSelectArtist(track.artistId);
              }}
              className="text-sm text-neutral-400 hover:text-white transition-colors truncate max-w-full cursor-pointer mt-0.5"
            >
              {track.artist}
            </button>
          </div>
          <button
            onClick={() => onToggleLike(track.id)}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-neutral-400 hover:text-rose-500 active:scale-90 transition-all cursor-pointer shrink-0"
            aria-label={isLiked ? 'Unlike track' : 'Like track'}
          >
            <Heart
              className={`w-5 h-5 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`}
            />
          </button>
        </div>

        {/* Minimalist White Scrubber Bar */}
        <div className="space-y-1.5">
          <input
            type="range"
            min={0}
            max={effectiveDuration}
            step={0.5}
            value={displayTime}
            onMouseDown={() => setIsSeeking(true)}
            onTouchStart={() => setIsSeeking(true)}
            onChange={(e) => setTempSeek(parseFloat(e.target.value))}
            onMouseUp={(e) => {
              const val = parseFloat(e.currentTarget.value);
              setIsSeeking(false);
              onSeek(val);
            }}
            onTouchEnd={(e) => {
              const val = parseFloat(e.currentTarget.value);
              setIsSeeking(false);
              onSeek(val);
            }}
            style={{
              background: `linear-gradient(to right, #ffffff 0%, #ffffff ${progressPercent}%, rgba(255,255,255,0.18) ${progressPercent}%, rgba(255,255,255,0.18) 100%)`,
            }}
            className="w-full h-1 rounded-full appearance-none cursor-pointer accent-white focus:outline-none"
            aria-label="Seek track position"
          />
          <div className="flex items-center justify-between text-xs font-mono tabular-nums text-neutral-400">
            <span>{formatDuration(Math.round(displayTime))}</span>
            <span>{formatDuration(Math.round(effectiveDuration))}</span>
          </div>
        </div>

        {/* Bold White Circular Play/Pause Transport Controls (Screenshot 2) */}
        <div className="flex items-center justify-between px-2">
          <button
            onClick={onToggleShuffle}
            className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-colors cursor-pointer ${
              isShuffle ? 'text-sky-400' : 'text-neutral-400 hover:text-white'
            }`}
            aria-label={isShuffle ? 'Disable shuffle' : 'Enable shuffle'}
          >
            <Shuffle className="w-5 h-5" />
          </button>

          <button
            onClick={onPrevious}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
            aria-label="Previous track"
          >
            <SkipBack className="w-6 h-6 fill-current" />
          </button>

          <button
            onClick={isPlaying ? onPause : onPlay}
            className="w-15 h-15 rounded-full bg-white text-black flex items-center justify-center shadow-[0_10px_30px_rgba(255,255,255,0.22)] hover:scale-105 active:scale-95 transition-transform cursor-pointer"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-7 h-7 fill-black" />
            ) : (
              <Play className="w-7 h-7 fill-black ml-0.5" />
            )}
          </button>

          <button
            onClick={onNext}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
            aria-label="Next track"
          >
            <SkipForward className="w-6 h-6 fill-current" />
          </button>

          <button
            onClick={onToggleRepeat}
            className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-colors cursor-pointer ${
              repeatMode !== 'off' ? 'text-sky-400' : 'text-neutral-400 hover:text-white'
            }`}
            aria-label={`Repeat mode: ${repeatMode}`}
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="w-5 h-5" />
            ) : (
              <Repeat className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Subtle Volume Row */}
        <div className="flex items-center gap-3 px-4">
          <button
            onClick={onToggleMute}
            className="p-1.5 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
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
            className="w-full h-1 bg-white/15 rounded-full appearance-none cursor-pointer accent-white"
            aria-label="Volume slider"
          />
        </div>

        {/* Bottom Expandable Lyrics Peek (Screenshot 2: ^ LYRICS) */}
        <div className="pt-2 pb-4 border-t border-white/[0.07]">
          <button
            onClick={() => setShowLyricsExpanded((prev) => !prev)}
            className="w-full flex flex-col items-center gap-1.5 py-2 text-center group cursor-pointer"
          >
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-[0.18em] uppercase text-neutral-400 group-hover:text-white transition-colors">
              <ChevronUp
                className={`w-3.5 h-3.5 transition-transform ${
                  showLyricsExpanded ? 'rotate-180' : ''
                }`}
              />
              <span>Lyrics</span>
            </span>
            {!showLyricsExpanded ? (
              <div className="space-y-1 max-w-xs mx-auto">
                <p className="text-xs font-medium text-neutral-200 line-clamp-1">
                  {lyricsPreviewLines[0]}
                </p>
                {lyricsPreviewLines[1] && (
                  <p className="text-xs text-neutral-500 line-clamp-1">
                    {lyricsPreviewLines[1]}
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-2 max-h-44 overflow-y-auto space-y-2 text-sm text-neutral-200 leading-relaxed px-2">
                {lyricsPreviewLines.map((line, i) => (
                  <p key={i} className={i === 0 ? 'font-semibold text-white' : 'text-neutral-300'}>
                    {line}
                  </p>
                ))}
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                    onToggleLyrics();
                  }}
                  className="inline-block pt-2 text-xs text-sky-400 hover:text-sky-300 font-medium underline"
                >
                  Open full lyrics & liner notes
                </span>
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
