/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  Lock,
  Sparkles,
} from 'lucide-react';
import { IndieTrack, formatDuration } from '../utils/musicDiscovery';
import {
  getPlayerBarAnimationClasses,
  TrackTransitionDirection,
} from '../utils/playerTransition';
import { AudioVisualizer } from './AudioVisualizer';
import { D3AudioVisualizer } from './D3AudioVisualizer';
import { MobileVisualizerModal } from './MobileVisualizerModal';
import { NowPlayingOverlay } from './NowPlayingOverlay';

export interface CrossfadeTransitionState {
  isCrossfading: boolean;
  fadeType: 'in' | 'out' | null;
  fadeProgress: number; // 0 to 1
  remainingTime: number;
  fadeInWindow: number;
  isFadeOutZone: boolean;
  isFadeInZone: boolean;
}

export function calculateCrossfadeTransitionState(
  isPlaying: boolean,
  currentTime: number,
  duration: number,
  crossfadeDuration: number
): CrossfadeTransitionState {
  const remainingTime = Math.max(0, duration - currentTime);
  const isFadeOutZone =
    isPlaying &&
    crossfadeDuration > 0 &&
    duration > 5 &&
    remainingTime <= crossfadeDuration &&
    remainingTime > 0;

  const fadeInWindow = Math.min(crossfadeDuration, 3);
  const isFadeInZone =
    isPlaying &&
    crossfadeDuration > 0 &&
    duration > 5 &&
    currentTime < fadeInWindow &&
    currentTime >= 0;

  const isCrossfading = isFadeOutZone || isFadeInZone;
  const fadeType: 'in' | 'out' | null = isFadeOutZone ? 'out' : isFadeInZone ? 'in' : null;

  const fadeProgress = isFadeOutZone
    ? Math.min(1, Math.max(0, (crossfadeDuration - remainingTime) / crossfadeDuration))
    : isFadeInZone
    ? Math.min(1, Math.max(0, currentTime / fadeInWindow))
    : 0;

  return {
    isCrossfading,
    fadeType,
    fadeProgress,
    remainingTime,
    fadeInWindow,
    isFadeOutZone,
    isFadeInZone,
  };
}

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
  onToggleLike: (trackId: string, track?: IndieTrack) => void;
  onShare: (track: IndieTrack) => void;
  onToggleLyrics: () => void;
  onToggleQueue: () => void;
  onSelectArtist: (artistId: string) => void;
  isVideoVisible?: boolean;
  onToggleVideo?: () => void;
  onOpenSettings?: () => void;
  crossfadeDuration?: number;
  isFading?: boolean;
  isVisualizerOpen?: boolean;
  onToggleVisualizer?: (open: boolean) => void;
  isDownloaded?: boolean;
  isDownloading?: boolean;
  onDownloadTrack?: (track: IndieTrack) => void;
  lockScreenPlayback?: boolean;
  onEditMetadata?: (track: IndieTrack) => void;
  isVibeMatchActive?: boolean;
  onToggleVibeMatch?: () => void;
  queueCount?: number;
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
  isFading: externalIsFading,
  isVisualizerOpen: externalVisualizerOpen,
  onToggleVisualizer,
  isDownloaded = false,
  isDownloading = false,
  onDownloadTrack,
  lockScreenPlayback = true,
  onEditMetadata,
  isVibeMatchActive = false,
  onToggleVibeMatch,
  queueCount = 0,
}) => {
  const [isSeeking, setIsSeeking] = useState(false);
  const [tempSeekTime, setTempSeekTime] = useState(0);
  const [internalVisualizerOpen, setInternalVisualizerOpen] = useState(false);
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState(false);
  const [hoverSeekTime, setHoverSeekTime] = useState<number | null>(null);
  const [hoverSeekPos, setHoverSeekPos] = useState<number>(0);
  const [showVolumeTooltip, setShowVolumeTooltip] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<TrackTransitionDirection>('jump');
  const [transitionCount, setTransitionCount] = useState(0);
  const [artworkErrorId, setArtworkErrorId] = useState<string | null>(null);
  const [exitingTrack, setExitingTrack] = useState<{
    id: string;
    coverUrl: string;
    title: string;
    hasError: boolean;
  } | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  const prevTrackSnapshotRef = useRef<{
    id: string;
    coverUrl: string;
    title: string;
  } | null>(
    currentTrack
      ? { id: currentTrack.id, coverUrl: currentTrack.coverUrl, title: currentTrack.title }
      : null
  );
  const pendingDirectionRef = useRef<TrackTransitionDirection>('jump');
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
    setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener?.('change', handleChange);
    return () => mediaQuery.removeEventListener?.('change', handleChange);
  }, []);

  useIsomorphicLayoutEffect(() => {
    const prevSnapshot = prevTrackSnapshotRef.current;
    if (currentTrack && prevSnapshot && currentTrack.id !== prevSnapshot.id) {
      setTransitionDirection(pendingDirectionRef.current);
      setTransitionCount((c) => c + 1);
      pendingDirectionRef.current = 'jump';

      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
      }

      if (!prefersReducedMotion) {
        setExitingTrack({
          ...prevSnapshot,
          hasError: artworkErrorId === prevSnapshot.id,
        });
        exitTimerRef.current = setTimeout(() => {
          setExitingTrack(null);
          exitTimerRef.current = null;
        }, 250);
      } else {
        setExitingTrack(null);
      }
    }

    prevTrackSnapshotRef.current = currentTrack
      ? { id: currentTrack.id, coverUrl: currentTrack.coverUrl, title: currentTrack.title }
      : null;
  }, [currentTrack?.id, prefersReducedMotion]);

  useEffect(() => {
    return () => {
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
      }
    };
  }, []);

  const handleNextClick = () => {
    pendingDirectionRef.current = 'next';
    onNext();
  };

  const handlePreviousClick = () => {
    pendingDirectionRef.current = 'previous';
    onPrevious();
  };

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

  // Crossfade transition calculations
  const crossfadeState = calculateCrossfadeTransitionState(
    isPlaying,
    displayCurrentTime,
    effectiveDuration,
    crossfadeDuration
  );

  const isCrossfading =
    externalIsFading !== undefined ? externalIsFading : crossfadeState.isCrossfading;
  const fadeType = crossfadeState.fadeType;
  const fadeProgress = crossfadeState.fadeProgress;
  const remainingTime = crossfadeState.remainingTime;
  const fadeInWindow = crossfadeState.fadeInWindow;
  const isFadeOutZone = crossfadeState.isFadeOutZone;

  const handleJumpToCrossfade = () => {
    if (crossfadeDuration > 0 && effectiveDuration > crossfadeDuration + 2) {
      onSeek(Math.max(0, effectiveDuration - crossfadeDuration - 1.5));
    }
  };

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

  const animClasses = getPlayerBarAnimationClasses(
    transitionDirection,
    transitionCount > 0,
    prefersReducedMotion
  );
  const hasArtworkError = artworkErrorId === currentTrack.id;

  return (
    <footer
      data-track-id={currentTrack.id}
      data-transition-direction={transitionDirection}
      className={`h-20 sm:h-24 bg-[#10111a]/95 backdrop-blur-xl border-t px-3 sm:px-4 lg:px-6 flex items-center justify-between select-none z-30 shadow-2xl relative shrink-0 transition-all duration-300 ${
        isCrossfading
          ? 'border-t-sky-400/60 shadow-[0_-10px_30px_rgba(56,189,248,0.18)]'
          : 'border-t-white/[0.08]'
      }`}
    >
      {/* Subtle Top Highlight Sweep When a New Song Starts */}
      {transitionCount > 0 && !prefersReducedMotion && !isCrossfading && (
        <div
          key={`sweep-${transitionCount}`}
          className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden z-40 pointer-events-none"
          aria-hidden="true"
        >
          <div
            className={`w-2/3 h-full bg-gradient-to-r from-transparent via-sky-400 to-transparent shadow-[0_0_12px_rgba(56,189,248,0.8)] ${animClasses.sweepClass}`}
          />
        </div>
      )}

      {/* Luminous Top Crossfade Laser Shimmer Bar */}
      {isCrossfading && (
        <div className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden z-40 pointer-events-none">
          <div className="w-full h-full bg-gradient-to-r from-transparent via-sky-400 to-transparent shadow-[0_0_12px_#38bdf8] animate-pulse" />
        </div>
      )}

      {/* Left: Track Information */}
      <div className="flex items-center gap-2 sm:gap-3 flex-1 md:flex-initial md:w-[26%] lg:w-[27%] md:min-w-[190px] min-w-0">
        <button
          type="button"
          onClick={() => setIsNowPlayingOpen(true)}
          className="relative shrink-0 group/art cursor-pointer text-left"
          aria-label="Open Now Playing view"
          title="Open Now Playing screen"
        >
          {/* Subtle ambient glow pulse on track swap */}
          {transitionCount > 0 && !prefersReducedMotion && (
            <div
              key={`glow-${transitionCount}`}
              className={`absolute inset-0 rounded-xl bg-sky-400/35 blur-md pointer-events-none ${animClasses.glowClass}`}
              aria-hidden="true"
            />
          )}
          <div
            className={`relative w-10 h-10 sm:w-13 sm:h-13 rounded-xl overflow-hidden shadow-md border bg-[#1a1a22] transition-all duration-300 group-hover/art:scale-[1.03] ${
              isCrossfading
                ? 'ring-2 ring-sky-400 ring-offset-2 ring-offset-[#10111a] border-sky-400/60'
                : 'border-white/10'
            }`}
          >
            {exitingTrack && !prefersReducedMotion && (
              <div
                key={`exit-${exitingTrack.id}-${transitionCount}`}
                aria-hidden="true"
                className={`absolute inset-0 pointer-events-none ${animClasses.artworkExitClass}`}
              >
                {exitingTrack.hasError ? (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-900/70 via-[#181820] to-neutral-900 text-[#1ed760]">
                    <Radio className="w-5 h-5" />
                  </div>
                ) : (
                  <img
                    src={exitingTrack.coverUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            )}
            {hasArtworkError ? (
              <div
                key={`${currentTrack.id}-fallback`}
                className={`relative w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-900/70 via-[#181820] to-neutral-900 text-[#1ed760] ${animClasses.artworkEnterClass}`}
              >
                <Radio className="w-5 h-5" />
              </div>
            ) : (
              <img
                key={currentTrack.id}
                src={currentTrack.coverUrl}
                alt={currentTrack.title}
                referrerPolicy="no-referrer"
                onError={() => setArtworkErrorId(currentTrack.id)}
                style={
                  isFadeOutZone
                    ? { opacity: Math.max(0.65, 1 - fadeProgress * 0.35) }
                    : undefined
                }
                className={`relative w-full h-full object-cover will-change-transform ${animClasses.artworkEnterClass}`}
              />
            )}
          </div>
        </button>
        <div className="min-w-0 flex-1 overflow-hidden">
          <div
            key={currentTrack.id}
            className={`min-w-0 will-change-transform ${animClasses.metaEnterClass}`}
          >
            <div className="flex items-center gap-1.5">
              <p
                onClick={() => setIsNowPlayingOpen(true)}
                className="text-xs sm:text-sm font-semibold text-white truncate hover:underline cursor-pointer"
              >
                {currentTrack.title}
              </p>
              {isCrossfading && (
                <span
                  onClick={handleJumpToCrossfade}
                  className="text-[10px] font-mono font-semibold text-sky-400 cursor-pointer shrink-0"
                  title="Crossfade actively blending tracks • Click to audition"
                >
                  · Fading
                </span>
              )}
            </div>
            <button
              onClick={() => onSelectArtist(currentTrack.artistId)}
              className="w-full max-w-full text-[11px] sm:text-xs text-neutral-400 hover:text-white truncate block text-left transition-colors cursor-pointer"
            >
              {currentTrack.artist}
            </button>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-neutral-500 overflow-hidden whitespace-nowrap">
            {currentTrack.language === 'kannada' && <span className="text-amber-300/90">ಕನ್ನಡ</span>}
            {currentTrack.language === 'hindi' && <span className="text-rose-300/90">हिन्दी</span>}
            {(currentTrack.language === 'kannada' || currentTrack.language === 'hindi') && (
              <span aria-hidden="true">·</span>
            )}
            <span className="text-neutral-400 truncate">
              {currentTrack.fullSongAvailable || currentTrack.youtubeId ? 'Hi-Fi Full Audio' : currentTrack.genre}
            </span>
            {lockScreenPlayback && (
              <span
                className="hidden md:inline-flex items-center gap-0.5 text-neutral-400 shrink-0"
                title="Lock-Screen & Background Audio Play active"
              >
                <span aria-hidden="true">·</span>
                <Lock className="w-2.5 h-2.5" />
                <span>BG</span>
              </span>
            )}
          </div>
        </div>

        {/* Mobile Quick Tap Vibe Match & D3 Visualizer Pills */}
        {onToggleVibeMatch && (
          <button
            type="button"
            onClick={onToggleVibeMatch}
            aria-pressed={isVibeMatchActive}
            aria-label="Vibe Match"
            title={`Vibe Match · Energy ${Math.round((currentTrack.energy ?? 0.5) * 100)}% · Melancholy ${Math.round((currentTrack.melancholy ?? 0.5) * 100)}%`}
            className={`md:hidden flex items-center justify-center p-1.5 rounded-full border active:scale-95 transition-all shrink-0 cursor-pointer ${
              isVibeMatchActive
                ? 'bg-[#1ed760] text-black border-[#1ed760] font-bold'
                : 'bg-white/[0.07] hover:bg-white/15 border-white/10 text-neutral-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          onClick={() => setIsVisualizerOpen(true)}
          className="md:hidden flex items-center gap-1 p-1.5 sm:px-2 sm:py-1 rounded-full bg-white/[0.07] hover:bg-white/15 border border-white/10 active:scale-95 transition-all shrink-0"
          title="Open D3 Audio Visualizer"
          aria-label="Open D3 Audio Visualizer on phone"
        >
          <Waves className="w-3.5 h-3.5 text-[#1ed760] animate-pulse" />
          <span className="hidden sm:inline text-[10px] font-mono font-bold text-neutral-200">D3</span>
        </button>

        {/* Mobile synced Like button on mini-player */}
        <button
          type="button"
          onClick={() => onToggleLike(currentTrack.id, currentTrack)}
          data-testid="playerbar-like-mobile"
          className="sm:hidden flex items-center justify-center w-9 h-9 rounded-full text-neutral-400 hover:text-rose-500 active:scale-95 transition-colors shrink-0 cursor-pointer"
          aria-label={isLiked ? 'Unlike track' : 'Like track'}
          title={isLiked ? 'Unlike track' : 'Save to Liked Songs'}
        >
          <Heart
            className={`w-4 h-4 ${
              isLiked ? 'text-rose-500 fill-rose-500' : 'text-neutral-400'
            }`}
          />
        </button>

        {/* Like, Download & Share */}
        <div className="hidden sm:flex items-center gap-1 ml-1">
          <button
            onClick={() => onToggleLike(currentTrack.id, currentTrack)}
            data-testid="playerbar-like-desktop"
            className="p-1.5 text-neutral-400 hover:text-rose-500 rounded-full transition-colors cursor-pointer"
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
      <div className="flex flex-col items-center justify-center flex-none md:flex-1 md:max-w-md md:min-w-[260px] px-1 sm:px-3 relative">
        {/* Active Crossfade Fading Indicator (hidden on narrow phones so track title stays legible) */}
        {isCrossfading ? (
          <div
            onClick={handleJumpToCrossfade}
            className="hidden sm:inline-flex mb-1 items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-400/15 border border-sky-400/40 text-sky-300 shadow-md animate-fade-in text-[10px] font-mono font-semibold tracking-wider cursor-pointer group transition-all hover:scale-105 active:scale-95"
            title="Crossfade is actively blending tracks • Click to audition fade transition"
            role="status"
            aria-live="polite"
          >
            {/* Animated 3-bar sound wave / equalizer */}
            <span className="flex items-center gap-0.5 h-3">
              <span className="w-0.5 h-full bg-sky-400 rounded-full animate-bounce [animation-duration:500ms]" />
              <span className="w-0.5 h-2/3 bg-sky-400 rounded-full animate-bounce [animation-duration:750ms]" />
              <span className="w-0.5 h-full bg-sky-400 rounded-full animate-bounce [animation-duration:600ms]" />
            </span>
            <span className="uppercase text-[9px] font-bold tracking-widest text-white">
              {fadeType === 'out' ? 'Fading Out' : 'Fading In'}
            </span>
            <span className="text-sky-200 font-medium text-[9px]">
              {fadeType === 'out'
                ? `${remainingTime.toFixed(1)}s left`
                : `${(fadeInWindow - displayCurrentTime).toFixed(1)}s`}
            </span>
            <span className="px-1 py-0.2 rounded bg-black/50 text-[9px] text-sky-300 font-bold border border-sky-400/30 tabular-nums">
              {Math.round(fadeProgress * 100)}%
            </span>
          </div>
        ) : crossfadeDuration > 0 && effectiveDuration > 15 ? (
          <div
            onClick={handleJumpToCrossfade}
            className="hidden sm:inline-flex items-center gap-1 mb-1 text-[9px] font-mono text-slate-400 hover:text-sky-400 cursor-pointer transition-colors opacity-75 hover:opacity-100"
            title={`Crossfade active (${crossfadeDuration}s) • Click to audition transition`}
          >
            <span className="w-1 h-1 rounded-full bg-sky-400" />
            <span>{crossfadeDuration}s crossfade armed</span>
            <span className="text-[8px] text-slate-400 group-hover:text-white underline">
              (Audition)
            </span>
          </div>
        ) : null}

        {/* Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-5 mb-0 sm:mb-1.5">
          {/* Shuffle */}
          <button
            onClick={onToggleShuffle}
            className={`hidden sm:inline-flex p-1.5 rounded-full transition-all active:scale-90 cursor-pointer ${
              isShuffle ? 'text-sky-400' : 'text-neutral-400 hover:text-white'
            }`}
            aria-label={isShuffle ? 'Disable shuffle' : 'Enable shuffle'}
            title={isShuffle ? 'Shuffle enabled' : 'Enable shuffle'}
          >
            <Shuffle className="w-4 h-4" />
          </button>

          {/* Previous */}
          <button
            onClick={handlePreviousClick}
            className="p-1.5 text-neutral-300 hover:text-white active:scale-90 transition-all"
            aria-label="Previous track"
            title="Previous track"
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </button>

          {/* Play/Pause */}
          <button
            onClick={isPlaying ? onPause : onPlay}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white hover:bg-neutral-200 hover:scale-105 active:scale-95 text-black flex items-center justify-center transition-all shadow-lg shadow-white/15 cursor-pointer"
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
            onClick={handleNextClick}
            className="p-1.5 text-neutral-300 hover:text-white active:scale-90 transition-all"
            aria-label="Next track"
            title="Next track"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>

          {/* Repeat */}
          <button
            onClick={onToggleRepeat}
            className={`hidden sm:inline-flex p-1.5 rounded-full transition-all active:scale-90 ${
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
        <div className="hidden sm:flex w-full items-center gap-2.5 text-[11px] font-mono text-neutral-400 select-none">
          <span className="w-10 text-right tabular-nums text-neutral-300">
            {formatDuration(displayCurrentTime)}
          </span>
          <div
            className="relative flex-1 flex items-center group py-2"
            onMouseMove={handleScrubberMouseMove}
            onMouseLeave={() => setHoverSeekTime(null)}
          >
            {/* Crossfade Transition Zone Marker on Scrubber */}
            {crossfadeDuration > 0 && effectiveDuration > 10 && (
              <div
                className={`absolute right-0 top-1/2 -translate-y-1/2 h-1.5 rounded-r-full pointer-events-none transition-all duration-300 z-10 ${
                  isFadeOutZone
                    ? 'bg-gradient-to-l from-[#1ed760] via-emerald-400 to-[#1ed760]/40 shadow-[0_0_14px_rgba(30,215,96,0.95)] border-l-2 border-[#1ed760] animate-pulse'
                    : 'bg-gradient-to-l from-[#1ed760]/30 to-transparent border-l border-dashed border-[#1ed760]/50'
                }`}
                style={{
                  width: `${Math.min(45, (crossfadeDuration / effectiveDuration) * 100)}%`,
                }}
                title={`Crossfade Zone: ${crossfadeDuration}s smooth overlap`}
              />
            )}

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
                background: `linear-gradient(to right, #ffffff 0%, #ffffff ${progressPercent}%, rgba(255, 255, 255, 0.18) ${progressPercent}%, rgba(255, 255, 255, 0.18) 100%)`,
              }}
              className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer focus:outline-none accent-white"
              aria-label="Seek track position"
            />
          </div>
          <span className="w-10 text-left tabular-nums text-neutral-400">
            {formatDuration(effectiveDuration)}
          </span>
        </div>
      </div>

      {/* Right: Vibe Match, Visualizer, Lyrics, Queue, Volume */}
      <div className="hidden md:flex items-center justify-end gap-1.5 lg:gap-2 shrink-0">
        {/* Interactive D3 Real-Time Spectrum Visualizer (Wide Desktop) */}
        <div
          onClick={() => setIsVisualizerOpen(true)}
          className="hidden 2xl:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 cursor-pointer group transition-all shrink-0"
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
        {onToggleVideo && (
          <button
            onClick={onToggleVideo}
            className={`flex items-center gap-1.5 px-2 xl:px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
              isVideoVisible
                ? 'bg-[#1ed760] text-black shadow-md shadow-[#1ed760]/30 font-extrabold'
                : 'bg-white/10 hover:bg-white/15 text-neutral-300 hover:text-white'
            }`}
            title={isVideoVisible ? 'Hide Video (Audio keeps playing)' : 'Watch Video'}
            aria-label={isVideoVisible ? 'Hide video window' : 'Show video window'}
          >
            <Tv className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden xl:inline text-[11px] font-bold whitespace-nowrap">
              {isVideoVisible ? 'Hide Video' : 'Video'}
            </span>
          </button>
        )}

        {/* Dynamic Vibe Match Button (Energy + Melancholy Sonic Queue) */}
        {onToggleVibeMatch && (
          <button
            type="button"
            onClick={onToggleVibeMatch}
            aria-pressed={isVibeMatchActive}
            aria-label="Vibe Match"
            title={`Vibe Match (${isVibeMatchActive ? 'Active' : 'Off'}) · Energy ${Math.round(
              (currentTrack.energy ?? 0.5) * 100
            )}% · Melancholy ${Math.round((currentTrack.melancholy ?? 0.5) * 100)}%`}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer shrink-0 border ${
              isVibeMatchActive
                ? 'bg-[#1ed760] text-black border-[#1ed760] font-bold shadow-sm'
                : 'bg-white/[0.08] hover:bg-white/15 text-neutral-200 border-white/10 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden lg:inline text-[11px] whitespace-nowrap">Vibe Match</span>
          </button>
        )}

        {/* Lyrics */}
        <button
          onClick={onToggleLyrics}
          className="p-1.5 text-neutral-400 hover:text-white rounded-full transition-colors relative shrink-0"
          aria-label="Toggle lyrics and liner notes"
          title="Lyrics & Liner Notes"
        >
          <Mic2 className="w-4 h-4" />
        </button>

        {/* Queue */}
        <button
          onClick={onToggleQueue}
          className="p-1.5 text-neutral-400 hover:text-white rounded-full transition-colors relative shrink-0"
          aria-label="Toggle play queue"
          title={queueCount > 0 ? `Play Queue (${queueCount} up next)` : 'Play Queue'}
        >
          <ListMusic className="w-4 h-4" />
          {queueCount > 0 && (
            <span
              className={`absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 rounded-full text-[9px] font-bold flex items-center justify-center leading-none ${
                isVibeMatchActive ? 'bg-[#1ed760] text-black' : 'bg-white/85 text-black'
              }`}
            >
              {queueCount > 99 ? '99' : queueCount}
            </span>
          )}
        </button>

        {/* Playback Settings & Crossfade */}
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className={`p-1.5 rounded-full transition-all relative group flex items-center gap-1 ${
              isCrossfading
                ? 'text-[#1ed760] bg-[#1ed760]/15 ring-2 ring-[#1ed760]/50 shadow-md shadow-[#1ed760]/30'
                : 'text-neutral-400 hover:text-white hover:bg-white/10'
            }`}
            aria-label="Open playback settings"
            title={`Playback Settings • Crossfade: ${
              crossfadeDuration === 0 ? 'Off' : `${crossfadeDuration}s`
            }${isCrossfading ? ' (Actively Fading)' : ''}`}
          >
            <Sliders className="w-4 h-4 group-hover:text-[#1ed760] transition-colors" />
            {crossfadeDuration > 0 && (
              <span
                className={`hidden 2xl:inline text-[9px] font-mono font-bold px-1 rounded-sm border ${
                  isCrossfading
                    ? 'bg-[#1ed760] text-black border-transparent animate-pulse font-black'
                    : 'bg-[#1ed760]/20 text-[#1ed760] border-[#1ed760]/30'
                }`}
              >
                {isCrossfading ? 'Fading' : `${crossfadeDuration}s`}
              </span>
            )}
          </button>
        )}

        {/* Volume */}
        <div
          className="flex items-center gap-1.5 w-20 lg:w-24 relative group/vol shrink-0"
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
              background: `linear-gradient(to right, #ffffff 0%, #ffffff ${volumePercent}%, rgba(255, 255, 255, 0.18) ${volumePercent}%, rgba(255, 255, 255, 0.18) 100%)`,
            }}
            className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer focus:outline-none accent-white"
            aria-label="Volume slider"
            title={`Volume: ${volumePercent}%`}
          />
        </div>

        {/* Expand Full Now Playing Overlay */}
        <button
          onClick={() => setIsNowPlayingOpen(true)}
          className="p-1.5 text-neutral-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Expand Now Playing view"
          title="Expand Now Playing"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Full-Screen Clean Hi-Fi Now Playing Screen (Portaled to escape backdrop-blur containing block) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <>
            <NowPlayingOverlay
              isOpen={isNowPlayingOpen}
              onClose={() => setIsNowPlayingOpen(false)}
              track={currentTrack}
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              volume={volume}
              isMuted={isMuted}
              isShuffle={isShuffle}
              repeatMode={repeatMode}
              isLiked={isLiked}
              isVideoVisible={isVideoVisible}
              isDownloaded={isDownloaded}
              isDownloading={isDownloading}
              transitionDirection={transitionDirection}
              transitionCount={transitionCount}
              onPlay={onPlay}
              onPause={onPause}
              onNext={handleNextClick}
              onPrevious={handlePreviousClick}
              onSeek={onSeek}
              onVolumeChange={onVolumeChange}
              onToggleMute={onToggleMute}
              onToggleShuffle={onToggleShuffle}
              onToggleRepeat={onToggleRepeat}
              onToggleLike={onToggleLike}
              onToggleLyrics={onToggleLyrics}
              onToggleQueue={onToggleQueue}
              onToggleVideo={onToggleVideo}
              onShare={onShare}
              onDownloadTrack={onDownloadTrack}
              onSelectArtist={onSelectArtist}
              onEditMetadata={onEditMetadata}
            />

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
          </>,
          document.body
        )}
    </footer>
  );
};
