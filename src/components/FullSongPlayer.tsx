/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { X, Tv, Sparkles, Music, AlertCircle } from 'lucide-react';
import { IndieTrack, resolveFullSong } from '../utils/musicDiscovery';
import { audioEngine } from '../services/audioEngine';

interface FullSongPlayerProps {
  currentTrack: IndieTrack | null;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  seekTime: number | null;
  crossfadeDuration?: number;
  onTimeUpdate: (currentTime: number, duration: number) => void;
  onTrackEnded: () => void;
  isVideoVisible: boolean;
  onToggleVideo: () => void;
  onTrackResolved?: (trackId: string, youtubeId: string) => void;
  onPlaybackFallback?: (track: IndieTrack) => void;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export const FullSongPlayer: React.FC<FullSongPlayerProps> = ({
  currentTrack,
  isPlaying,
  volume,
  isMuted,
  seekTime,
  crossfadeDuration = 4,
  onTimeUpdate,
  onTrackEnded,
  isVideoVisible,
  onToggleVideo,
  onTrackResolved,
  onPlaybackFallback,
}) => {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const currentVideoIdRef = useRef<string | null>(null);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const pollIntervalRef = useRef<number | null>(null);
  const hasTriggeredEndedRef = useRef(false);
  const isFadingInRef = useRef(false);
  const hasAttemptedReResolveRef = useRef<Record<string, boolean>>({});
  const isFallbackActiveRef = useRef(false);

  // Trigger smooth fallback to Web Audio engine so music NEVER goes silent
  const triggerAudioEngineFallback = (reason = 'YouTube playback notice') => {
    if (isFallbackActiveRef.current || !currentTrack) return;
    isFallbackActiveRef.current = true;
    setIsFallbackMode(true);
    console.log(`[FullSongPlayer] ${reason}. Activating resilient audio engine for "${currentTrack.title}"`);

    audioEngine.playTrack(currentTrack, 0);
    audioEngine.setVolume(isMuted ? 0 : volume);

    audioEngine.onTimeUpdate((curr, dur) => {
      if (isFallbackActiveRef.current) {
        onTimeUpdate(curr, dur);
      }
    });

    audioEngine.onTrackEnded(() => {
      if (isFallbackActiveRef.current) {
        onTrackEnded();
      }
    });

    if (onPlaybackFallback) {
      onPlaybackFallback(currentTrack);
    }
  };

  // Load YouTube IFrame API script if not present
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const checkYT = () => {
      if (window.YT && window.YT.Player) {
        initPlayer();
      } else {
        setTimeout(checkYT, 100);
      }
    };

    checkYT();

    return () => {
      if (pollIntervalRef.current) {
        window.clearInterval(pollIntervalRef.current);
      }
      if (playerRef.current && playerRef.current.destroy) {
        try {
          playerRef.current.destroy();
        } catch {}
      }
    };
  }, []);

  const initPlayer = () => {
    if (playerRef.current || !containerRef.current) return;

    try {
      playerRef.current = new window.YT.Player('youtube-full-song-iframe', {
        height: '100%',
        width: '100%',
        videoId: currentTrack?.youtubeId || '4NRXx6U8ABQ',
        playerVars: {
          autoplay: 0,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          fs: 1,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: any) => {
            setIsPlayerReady(true);
            const playerVol = isMuted ? 0 : Math.round(volume * 100);
            event.target.setVolume(playerVol);
            if (isMuted) {
              event.target.mute();
            } else {
              event.target.unMute();
            }
          },
          onStateChange: (event: any) => {
            // YT.PlayerState.PLAYING === 1
            if (event.data === 1) {
              if (isFallbackActiveRef.current) {
                isFallbackActiveRef.current = false;
                setIsFallbackMode(false);
                audioEngine.stop();
              }
            }
            // YT.PlayerState.ENDED === 0
            if (event.data === 0) {
              onTrackEnded();
            }
          },
          onError: async (e: any) => {
            console.warn(`[FullSongPlayer] YouTube notice (code ${e.data}) for "${currentTrack?.title}"`);
            if (!currentTrack) return;

            // Attempt dynamic healing via backend resolver
            if (!hasAttemptedReResolveRef.current[currentTrack.id]) {
              hasAttemptedReResolveRef.current[currentTrack.id] = true;
              try {
                const q = `${currentTrack.artist} ${currentTrack.title}`;
                const res = await fetch(`/api/resolve-youtube?q=${encodeURIComponent(q)}`);
                if (res.ok) {
                  const data = await res.json();
                  if (data && data.videoId && data.videoId !== currentVideoIdRef.current) {
                    console.log(`[FullSongPlayer] Auto-healed video ID to ${data.videoId} for "${currentTrack.title}"`);
                    currentVideoIdRef.current = data.videoId;
                    if (onTrackResolved) {
                      onTrackResolved(currentTrack.id, data.videoId);
                    }
                    playerRef.current?.loadVideoById({
                      videoId: data.videoId,
                      startSeconds: 0,
                    });
                    return;
                  }
                }
              } catch (err) {
                console.warn('Auto-heal resolver error:', err);
              }
            }

            // If error 101/150 (embedding disabled by copyright owner) or re-resolve fails, activate audio engine
            triggerAudioEngineFallback(`YouTube embed restricted or unavailable (code ${e.data})`);
          },
        },
      });
    } catch (err) {
      console.warn('Error creating YouTube player:', err);
      triggerAudioEngineFallback('Player initialization failed');
    }
  };

  // Load and play song when currentTrack changes, auto-resolving youtubeId if needed
  useEffect(() => {
    if (!currentTrack) return;

    // Reset fallback and transition state for new track
    isFallbackActiveRef.current = false;
    setIsFallbackMode(false);
    hasTriggeredEndedRef.current = false;
    isFadingInRef.current = crossfadeDuration > 0;

    if (!isPlayerReady || !playerRef.current) return;

    const playVideoId = (targetId: string) => {
      if (currentVideoIdRef.current !== targetId) {
        currentVideoIdRef.current = targetId;
        try {
          if (isPlaying) {
            playerRef.current.loadVideoById({
              videoId: targetId,
              startSeconds: 0,
            });
          } else {
            playerRef.current.cueVideoById({
              videoId: targetId,
              startSeconds: 0,
            });
          }
        } catch (e) {
          console.warn('Could not load video in YouTube player:', e);
          triggerAudioEngineFallback('loadVideoById failed');
        }
      } else {
        if (isPlaying) {
          try {
            playerRef.current.playVideo();
          } catch {
            triggerAudioEngineFallback('playVideo failed');
          }
        } else {
          try {
            playerRef.current.pauseVideo();
          } catch {}
        }
      }
    };

    // Always resolve track to ensure authentic canonical song playback
    resolveFullSong(currentTrack).then((resolvedId) => {
      const videoIdToPlay = resolvedId || currentTrack.youtubeId;
      if (videoIdToPlay) {
        if (resolvedId && onTrackResolved && resolvedId !== currentTrack.youtubeId) {
          onTrackResolved(currentTrack.id, resolvedId);
        }
        playVideoId(videoIdToPlay);
      } else {
        // If no video found, fallback immediately to audio engine
        triggerAudioEngineFallback('No YouTube video found');
      }
    });
  }, [currentTrack?.id, currentTrack?.youtubeId, isPlayerReady]);

  // Handle play / pause changes
  useEffect(() => {
    if (isFallbackActiveRef.current) {
      if (isPlaying) {
        audioEngine.resume();
      } else {
        audioEngine.pause();
      }
      return;
    }

    if (!isPlayerReady || !playerRef.current) return;

    try {
      if (isPlaying) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    } catch {}
  }, [isPlaying, isPlayerReady]);

  // Stall watchdog: If user pressed play, but YouTube player failed to progress after 4 seconds
  useEffect(() => {
    if (!isPlaying || !currentTrack) return;

    const stallTimer = window.setTimeout(() => {
      if (isFallbackActiveRef.current) return;
      if (!playerRef.current || typeof playerRef.current.getPlayerState !== 'function') return;

      const state = playerRef.current.getPlayerState();
      // state 1 = PLAYING, 3 = BUFFERING
      if (state !== 1 && state !== 3) {
        console.warn(`[FullSongPlayer] Player stalled (state ${state}) for "${currentTrack.title}", falling back`);
        triggerAudioEngineFallback('Playback stalled');
      }
    }, 4500);

    return () => window.clearTimeout(stallTimer);
  }, [currentTrack?.id, isPlaying]);

  // Handle volume & mute
  useEffect(() => {
    if (isFallbackActiveRef.current) {
      audioEngine.setVolume(isMuted ? 0 : volume);
      return;
    }

    if (!isPlayerReady || !playerRef.current) return;
    try {
      if (isMuted) {
        playerRef.current.mute();
      } else {
        playerRef.current.unMute();
        playerRef.current.setVolume(Math.round(volume * 100));
      }
    } catch {}
  }, [volume, isMuted, isPlayerReady]);

  // Handle seek
  useEffect(() => {
    if (seekTime === null) return;

    if (isFallbackActiveRef.current) {
      audioEngine.seek(seekTime);
      return;
    }

    if (!isPlayerReady || !playerRef.current) return;
    try {
      playerRef.current.seekTo(seekTime, true);
    } catch {}
  }, [seekTime]);

  // Ticker for current time, duration and smooth crossfading
  useEffect(() => {
    if (pollIntervalRef.current) {
      window.clearInterval(pollIntervalRef.current);
    }

    if (isPlaying) {
      pollIntervalRef.current = window.setInterval(() => {
        if (isFallbackActiveRef.current) return; // Audio engine ticker handles it

        if (!playerRef.current || typeof playerRef.current.getCurrentTime !== 'function') return;
        try {
          const curr = playerRef.current.getCurrentTime() || 0;
          const dur = playerRef.current.getDuration() || (currentTrack ? currentTrack.duration : 0);
          if (currentTrack) {
            onTimeUpdate(curr, dur > 0 ? dur : currentTrack.duration);
          }

          // Smooth Crossfade handling
          if (dur > 5 && crossfadeDuration > 0) {
            const remaining = dur - curr;
            const maxVol = isMuted ? 0 : Math.round(volume * 100);

            // Tail of song: Crossfade Fade-Out
            if (remaining <= crossfadeDuration && remaining > 0) {
              const fadeRatio = Math.max(0, remaining / crossfadeDuration);
              const targetVol = Math.round(maxVol * fadeRatio);
              playerRef.current.setVolume(targetVol);

              // Auto-advance slightly before hard stop for seamless overlap
              if (remaining <= 0.4 && !hasTriggeredEndedRef.current) {
                hasTriggeredEndedRef.current = true;
                onTrackEnded();
              }
            }
            // Head of song: Crossfade Fade-In
            else if (isFadingInRef.current && curr < Math.min(crossfadeDuration, 2.5)) {
              const inRatio = Math.min(1, curr / Math.min(crossfadeDuration, 2.5));
              const targetVol = Math.round(maxVol * inRatio);
              playerRef.current.setVolume(targetVol);
            } else {
              isFadingInRef.current = false;
              if (typeof playerRef.current.getVolume === 'function') {
                const currentVol = playerRef.current.getVolume();
                if (Math.abs(currentVol - maxVol) > 5) {
                  playerRef.current.setVolume(maxVol);
                }
              }
            }
          }
        } catch {}
      }, 200);
    }

    return () => {
      if (pollIntervalRef.current) {
        window.clearInterval(pollIntervalRef.current);
      }
    };
  }, [isPlaying, onTimeUpdate, currentTrack?.id, crossfadeDuration, volume, isMuted, onTrackEnded]);

  return (
    <div
      ref={containerRef}
      className={`transition-all duration-300 z-50 ${
        isVideoVisible && currentTrack
          ? 'fixed bottom-28 right-6 w-80 md:w-96 rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-black/95 backdrop-blur-xl animate-scale-in'
          : 'fixed -bottom-[9999px] left-0 w-1 h-1 opacity-0 pointer-events-none'
      }`}
    >
      {/* Video Header Controls when visible */}
      {isVideoVisible && currentTrack && (
        <div className="flex items-center justify-between px-3.5 py-2 bg-[#121216] border-b border-white/10">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-[#1ed760] animate-pulse" />
            <p className="text-xs font-bold text-white truncate">
              {currentTrack.title} • Full Music Video
            </p>
          </div>
          <button
            onClick={onToggleVideo}
            className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            title="Minimize to Audio Mode"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* YouTube Player Iframe Target */}
      <div className={`relative ${isVideoVisible ? 'w-full aspect-video' : 'w-1 h-1'}`}>
        <div id="youtube-full-song-iframe" className="w-full h-full" />
      </div>

      {/* Video Footer info */}
      {isVideoVisible && (
        <div className="px-3.5 py-2 bg-[#121216] flex items-center justify-between text-[11px] text-neutral-400">
          <span>{isFallbackMode ? 'Hi-Fi Audio Mode' : 'Official Full Master Audio'}</span>
          <span className="text-[#1ed760] font-mono">100% Full Length</span>
        </div>
      )}
    </div>
  );
};
