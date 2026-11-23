/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { X, Sparkles, Volume2, Lock } from 'lucide-react';
import { IndieTrack, resolveFullSong } from '../utils/musicDiscovery';
import {
  SILENT_KEEPALIVE_WAV_DATA_URI,
  ResolvedAudioStream,
  buildMediaMetadataInit,
  computeSafeSeekTarget,
  resolveTrackAudioStream,
} from '../utils/backgroundPlayback';

interface FullSongPlayerProps {
  currentTrack: IndieTrack | null;
  nextTrack?: IndieTrack | null;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  seekTime: number | null;
  crossfadeDuration?: number;
  lockScreenPlayback?: boolean;
  onTimeUpdate: (currentTime: number, duration: number) => void;
  onTrackEnded: () => void;
  onPlayRequest?: () => void;
  onPauseRequest?: () => void;
  onPreviousTrack?: () => void;
  onSeekRequest?: (seconds: number) => void;
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
  nextTrack,
  isPlaying,
  volume,
  isMuted,
  seekTime,
  crossfadeDuration = 4,
  lockScreenPlayback = true,
  onTimeUpdate,
  onTrackEnded,
  onPlayRequest,
  onPauseRequest,
  onPreviousTrack,
  onSeekRequest,
  isVideoVisible,
  onToggleVideo,
  onTrackResolved,
}) => {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const audioFallbackRef = useRef<HTMLAudioElement | null>(null);
  const keepAliveAudioRef = useRef<HTMLAudioElement | null>(null);

  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isUsingAudioFallback, setIsUsingAudioFallback] = useState(false);
  const isUsingAudioFallbackRef = useRef(false);
  isUsingAudioFallbackRef.current = isUsingAudioFallback;

  const currentVideoIdRef = useRef<string | null>(null);
  const currentTrackRef = useRef<IndieTrack | null>(currentTrack);
  currentTrackRef.current = currentTrack;

  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;
  const lockScreenPlaybackRef = useRef(lockScreenPlayback);
  lockScreenPlaybackRef.current = lockScreenPlayback;
  const isVideoVisibleRef = useRef(isVideoVisible);
  isVideoVisibleRef.current = isVideoVisible;

  const pollIntervalRef = useRef<number | null>(null);
  const hasTriggeredEndedRef = useRef(false);
  const isFadingInRef = useRef(false);
  const attemptedVideoIdsRef = useRef<Set<string>>(new Set());
  const bufferSafetyTimerRef = useRef<number | null>(null);
  const hiddenCheckTimerRef = useRef<number | null>(null);
  const lockScreenHandoffRef = useRef(false);
  const resolvedAudioRef = useRef<ResolvedAudioStream | null>(null);
  const lastKnownTimeRef = useRef(0);
  const lastMediaPosUpdateRef = useRef(0);
  const isFallbackUnlockedRef = useRef(false);
  const recoveryAttemptsRef = useRef(0);

  // Unlock top-level <audio> elements during user gesture so background/lock-screen play() never gets blocked
  const primeLockScreenAudioElements = () => {
    if (!lockScreenPlaybackRef.current) return;

    if (keepAliveAudioRef.current) {
      try {
        if (!keepAliveAudioRef.current.src) {
          keepAliveAudioRef.current.src = SILENT_KEEPALIVE_WAV_DATA_URI;
        }
        keepAliveAudioRef.current.volume = 0.005;
        keepAliveAudioRef.current.muted = false;
        if (keepAliveAudioRef.current.paused) {
          keepAliveAudioRef.current.play().catch(() => {});
        }
      } catch {}
    }

    if (audioFallbackRef.current && !isFallbackUnlockedRef.current && !isUsingAudioFallbackRef.current) {
      try {
        audioFallbackRef.current.src = SILENT_KEEPALIVE_WAV_DATA_URI;
        audioFallbackRef.current.volume = 0;
        const p = audioFallbackRef.current.play();
        if (p && typeof p.then === 'function') {
          p.then(() => {
            isFallbackUnlockedRef.current = true;
            if (!isUsingAudioFallbackRef.current && audioFallbackRef.current) {
              audioFallbackRef.current.pause();
            }
          }).catch(() => {});
        }
      } catch {}
    }
  };

  const stopKeepAliveAudio = () => {
    if (keepAliveAudioRef.current) {
      try {
        keepAliveAudioRef.current.pause();
      } catch {}
    }
  };

  // Start direct HTML5 <audio> playback (either as fallback or lock-screen background carrier)
  const startAudioFallback = (targetSeekTime?: number, isLockHandoff = false) => {
    const track = currentTrackRef.current;
    const streamUrl = resolvedAudioRef.current?.audioUrl || track?.audioUrl;
    if (!track || !streamUrl || !audioFallbackRef.current) return;

    try {
      const el = audioFallbackRef.current;
      if (isUsingAudioFallbackRef.current && el.src === streamUrl && !el.paused) {
        if (isLockHandoff) {
          lockScreenHandoffRef.current = true;
        }
        return;
      }

      const isFullLength = Boolean(resolvedAudioRef.current?.isFullLength);
      const estimatedDur =
        resolvedAudioRef.current?.duration ||
        (Number.isFinite(el.duration) && el.duration > 0 ? el.duration : isFullLength ? track.duration : 30);

      const safeSeek =
        typeof targetSeekTime === 'number'
          ? computeSafeSeekTarget(targetSeekTime, estimatedDur, isFullLength)
          : 0;

      if (el.src !== streamUrl) {
        el.src = streamUrl;
      }

      el.muted = isMutedRef.current;
      el.volume = isMutedRef.current ? 0 : volumeRef.current;

      const applySeekAndPlay = () => {
        if (safeSeek > 0.5) {
          try {
            const actualDur = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : estimatedDur;
            el.currentTime = computeSafeSeekTarget(safeSeek, actualDur, isFullLength);
          } catch {}
        }
        if (isPlayingRef.current) {
          el.play().catch((err) => {
            console.warn('[FullSongPlayer] Audio stream play notice:', err);
          });
        }
      };

      if (el.readyState >= 1) {
        applySeekAndPlay();
      } else {
        const onMeta = () => {
          el.removeEventListener('loadedmetadata', onMeta);
          applySeekAndPlay();
        };
        el.addEventListener('loadedmetadata', onMeta);
        el.load();
        if (isPlayingRef.current) {
          el.play().catch(() => {});
        }
      }

      lockScreenHandoffRef.current = isLockHandoff;
      setIsUsingAudioFallback(true);
      isUsingAudioFallbackRef.current = true;

      if (isLockHandoff && playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
        try {
          playerRef.current.pauseVideo();
        } catch {}
      }
    } catch (e) {
      console.warn('[FullSongPlayer] Audio fallback notice:', e);
    }
  };

  const stopAudioFallback = () => {
    if (audioFallbackRef.current && isUsingAudioFallbackRef.current) {
      try {
        audioFallbackRef.current.pause();
      } catch {}
    }
    lockScreenHandoffRef.current = false;
    setIsUsingAudioFallback(false);
    isUsingAudioFallbackRef.current = false;
  };

  // Safe auto-healing: resolves alternative official YouTube streams and preserves audio (capped at 3 retries/track)
  const triggerPlaybackRecovery = async (reason = 'YouTube stream update') => {
    const track = currentTrackRef.current;
    if (!track) return;
    if (recoveryAttemptsRef.current >= 3) {
      if (resolvedAudioRef.current?.audioUrl || track.audioUrl) {
        startAudioFallback(lastKnownTimeRef.current, false);
      }
      return;
    }
    recoveryAttemptsRef.current += 1;
    console.log(`[FullSongPlayer] ${reason} for "${track.title}" (attempt ${recoveryAttemptsRef.current}/3). Recovering audio stream...`);

    if (currentVideoIdRef.current) {
      attemptedVideoIdsRef.current.add(currentVideoIdRef.current);
    }

    // 1. Immediately engage HTML5 stream fallback so user never sits in silence
    if (resolvedAudioRef.current?.audioUrl || track.audioUrl) {
      startAudioFallback(lastKnownTimeRef.current, false);
    }

    // 2. Dynamically resolve alternative official YouTube video
    try {
      const queryCandidates = [
        `${track.title} ${track.artist} topic`,
        `${track.title} ${track.artist} official audio`,
        `${track.title} ${track.artist} song`,
      ];

      for (const q of queryCandidates) {
        const res = await fetch(`/api/resolve-youtube?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = await res.json();
          const candidates = Array.isArray(data.candidates) ? data.candidates : [];
          const allCands = [data.videoId, ...candidates].filter(Boolean);

          for (const candId of allCands) {
            if (candId && !attemptedVideoIdsRef.current.has(candId)) {
              attemptedVideoIdsRef.current.add(candId);
              currentVideoIdRef.current = candId;
              if (onTrackResolved) {
                onTrackResolved(track.id, candId);
              }
              if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
                playerRef.current.loadVideoById({
                  videoId: candId,
                  startSeconds: 0,
                });
                return;
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn('[FullSongPlayer] Auto-healing fetch notice:', err);
    }
  };

  // Register Lock-Screen & System Notification MediaSession Metadata & Controls
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator) || !currentTrack) {
      return;
    }

    try {
      const metaInit = buildMediaMetadataInit(currentTrack);
      if (typeof window.MediaMetadata !== 'undefined') {
        navigator.mediaSession.metadata = new window.MediaMetadata(metaInit);
      }
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    } catch {}
  }, [currentTrack?.id, currentTrack?.title, currentTrack?.artist, currentTrack?.coverUrl, isPlaying]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    const safeSetAction = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {}
    };

    safeSetAction('play', () => {
      primeLockScreenAudioElements();
      if (onPlayRequest) onPlayRequest();
    });
    safeSetAction('pause', () => {
      if (onPauseRequest) onPauseRequest();
    });
    safeSetAction('nexttrack', () => {
      onTrackEnded();
    });
    safeSetAction('previoustrack', () => {
      if (onPreviousTrack) onPreviousTrack();
    });
    safeSetAction('seekto', (details) => {
      if (typeof details.seekTime === 'number' && onSeekRequest) {
        onSeekRequest(details.seekTime);
      }
    });
    safeSetAction('seekbackward', (details) => {
      const offset = details.seekOffset || 10;
      const target = Math.max(0, lastKnownTimeRef.current - offset);
      if (onSeekRequest) onSeekRequest(target);
    });
    safeSetAction('seekforward', (details) => {
      const offset = details.seekOffset || 10;
      const dur = currentTrackRef.current?.duration || 300;
      const target = Math.min(dur, lastKnownTimeRef.current + offset);
      if (onSeekRequest) onSeekRequest(target);
    });

    return () => {
      safeSetAction('play', null);
      safeSetAction('pause', null);
      safeSetAction('nexttrack', null);
      safeSetAction('previoustrack', null);
      safeSetAction('seekto', null);
      safeSetAction('seekbackward', null);
      safeSetAction('seekforward', null);
    };
  }, [onPlayRequest, onPauseRequest, onTrackEnded, onPreviousTrack, onSeekRequest]);

  // Handle Phone Screen Lock / Tab Background (`visibilitychange` & `pagehide`)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!lockScreenPlaybackRef.current || !currentTrackRef.current) return;

      if (hiddenCheckTimerRef.current) {
        window.clearTimeout(hiddenCheckTimerRef.current);
        hiddenCheckTimerRef.current = null;
      }

      if (document.visibilityState === 'hidden') {
        if (!isPlayingRef.current) return;

        // Read exact current playback time before mobile OS freezes YouTube iframe
        let ytPos = lastKnownTimeRef.current;
        try {
          if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
            const t = playerRef.current.getCurrentTime();
            if (typeof t === 'number' && Number.isFinite(t) && t > 0) {
              ytPos = t;
              lastKnownTimeRef.current = t;
            }
          }
        } catch {}

        // If we already have a full-length 320kbps AAC stream, hand off IMMEDIATELY with zero cutout
        if (resolvedAudioRef.current?.isFullLength && !isUsingAudioFallbackRef.current) {
          startAudioFallback(ytPos, true);
          return;
        }

        // Otherwise monitor for 750ms: if YouTube freezes or gets paused by the OS on screen lock,
        // seamlessly engage the unlocked HTML5 <audio> carrier so playback keeps going
        const snapshotPos = ytPos;
        hiddenCheckTimerRef.current = window.setTimeout(() => {
          if (document.visibilityState !== 'hidden' || !isPlayingRef.current || isUsingAudioFallbackRef.current) {
            return;
          }
          let newPos = snapshotPos;
          let ytState = -1;
          try {
            if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
              newPos = playerRef.current.getCurrentTime() || 0;
            }
            if (playerRef.current && typeof playerRef.current.getPlayerState === 'function') {
              ytState = playerRef.current.getPlayerState();
            }
          } catch {}

          // If YouTube paused (2) or froze while hidden, take over on native <audio>
          if (ytState !== 1 || Math.abs(newPos - snapshotPos) < 0.15) {
            startAudioFallback(newPos, true);
          }
        }, 750);
      } else if (document.visibilityState === 'visible') {
        // User unlocked screen: if lock-screen handoff is active and Video Mode is on or using preview,
        // restore YouTube playback seamlessly at current position
        if (isPlayingRef.current && isUsingAudioFallbackRef.current && lockScreenHandoffRef.current) {
          const shouldRestoreYouTube =
            isVideoVisibleRef.current || !resolvedAudioRef.current?.isFullLength;
          if (shouldRestoreYouTube && playerRef.current && typeof playerRef.current.seekTo === 'function') {
            const resumePos = audioFallbackRef.current?.currentTime || lastKnownTimeRef.current || 0;
            try {
              playerRef.current.seekTo(resumePos, true);
              playerRef.current.playVideo();
            } catch {}
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (hiddenCheckTimerRef.current) {
        window.clearTimeout(hiddenCheckTimerRef.current);
      }
    };
  }, []);

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
      if (bufferSafetyTimerRef.current) {
        window.clearTimeout(bufferSafetyTimerRef.current);
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
        videoId: currentTrack?.youtubeId || 'Q-yJcnX0Qzg',
        playerVars: {
          autoplay: 1,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          fs: 1,
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: any) => {
            setIsPlayerReady(true);
            try {
              const iframeEl = event.target?.getIframe?.();
              if (iframeEl) {
                iframeEl.setAttribute('tabindex', '-1');
              }
              if (!isVideoVisibleRef.current && containerRef.current?.contains(document.activeElement)) {
                (document.activeElement as HTMLElement | null)?.blur?.();
                window.focus();
              }
            } catch {}
            const playerVol = isMutedRef.current ? 0 : Math.round(volumeRef.current * 100);
            event.target.setVolume(playerVol);
            if (isMutedRef.current) {
              event.target.mute();
            } else {
              event.target.unMute();
            }
            if (currentTrackRef.current) {
              resolveFullSong(currentTrackRef.current).then((resolvedId) => {
                const vid = resolvedId || currentTrackRef.current?.youtubeId;
                if (vid) {
                  currentVideoIdRef.current = vid;
                  if (isPlayingRef.current) {
                    event.target.loadVideoById({ videoId: vid, startSeconds: 0 });
                  } else {
                    event.target.cueVideoById({ videoId: vid, startSeconds: 0 });
                  }
                }
              });
            }
          },
          onStateChange: (event: any) => {
            // YT.PlayerState.PLAYING === 1
            if (event.data === 1) {
              // If screen is currently locked and we intentionally handed off to full-length audio,
              // keep the lock-screen audio carrier instead of letting YouTube hijack and die
              if (document.visibilityState === 'hidden' && lockScreenHandoffRef.current && isUsingAudioFallbackRef.current) {
                try {
                  event.target.pauseVideo();
                } catch {}
                return;
              }

              stopAudioFallback();
              if (bufferSafetyTimerRef.current) {
                window.clearTimeout(bufferSafetyTimerRef.current);
                bufferSafetyTimerRef.current = null;
              }
              try {
                if (typeof event.target.setPlaybackQuality === 'function') {
                  event.target.setPlaybackQuality('hd720');
                }
              } catch {}
            }

            // YT.PlayerState.PAUSED === 2 while screen locked -> mobile OS paused YouTube! Hand off immediately
            if (
              event.data === 2 &&
              document.visibilityState === 'hidden' &&
              isPlayingRef.current &&
              lockScreenPlaybackRef.current &&
              !isUsingAudioFallbackRef.current
            ) {
              let ytPos = lastKnownTimeRef.current;
              try {
                ytPos = event.target.getCurrentTime() || ytPos;
              } catch {}
              startAudioFallback(ytPos, true);
            }

            // YT.PlayerState.ENDED === 0
            if (event.data === 0 && !isUsingAudioFallbackRef.current) {
              onTrackEnded();
            }
          },
          onError: async (e: any) => {
            console.warn(
              `[FullSongPlayer] YouTube code ${e.data} for "${currentTrackRef.current?.title}". Engaging immediate stream recovery...`
            );
            await triggerPlaybackRecovery(`YouTube error code ${e.data}`);
          },
        },
      });
    } catch (err) {
      console.warn('Error creating YouTube player:', err);
      startAudioFallback(0, false);
    }
  };

  // Pre-resolve direct HTML5 audio stream for currentTrack & nextTrack (for lock-screen readiness)
  useEffect(() => {
    if (!currentTrack) return;

    let cancelled = false;
    resolvedAudioRef.current = currentTrack.audioUrl
      ? { audioUrl: currentTrack.audioUrl, isFullLength: false, duration: 30, source: 'track' }
      : null;

    resolveTrackAudioStream(currentTrack).then((stream) => {
      if (cancelled || !stream) return;
      resolvedAudioRef.current = stream;

      // If screen is already locked and playing the next track while locked, switch immediately to native audio
      if (document.visibilityState === 'hidden' && isPlayingRef.current && lockScreenPlaybackRef.current) {
        startAudioFallback(lastKnownTimeRef.current, true);
      }
    });

    // Pre-warm next track's audio stream in cache so auto-advance while screen is locked is instant
    if (nextTrack) {
      resolveTrackAudioStream(nextTrack).catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [currentTrack?.id, nextTrack?.id]);

  // Load and play song when currentTrack changes
  useEffect(() => {
    if (!currentTrack) return;

    hasTriggeredEndedRef.current = false;
    isFadingInRef.current = crossfadeDuration > 0;
    lastKnownTimeRef.current = 0;
    recoveryAttemptsRef.current = 0;
    attemptedVideoIdsRef.current.clear();

    if (bufferSafetyTimerRef.current) {
      window.clearTimeout(bufferSafetyTimerRef.current);
      bufferSafetyTimerRef.current = null;
    }

    if (isPlaying) {
      primeLockScreenAudioElements();
    }

    // If track changed while the phone screen is ALREADY locked (e.g., auto-next or lock-screen Next button),
    // immediately play via the unlocked native <audio> element instead of relying on suspended YouTube iframe!
    if (document.visibilityState === 'hidden' && isPlaying && lockScreenPlayback) {
      if (resolvedAudioRef.current?.audioUrl || currentTrack.audioUrl) {
        startAudioFallback(0, true);
        return;
      }
    }

    // Set buffer safety timer: if YouTube does not start playing within 3.5s, engage HTML5 audio fallback
    bufferSafetyTimerRef.current = window.setTimeout(() => {
      if (
        isPlayingRef.current &&
        (!playerRef.current ||
          (typeof playerRef.current.getPlayerState === 'function' && playerRef.current.getPlayerState() !== 1))
      ) {
        if (resolvedAudioRef.current?.audioUrl || currentTrackRef.current?.audioUrl) {
          startAudioFallback(lastKnownTimeRef.current, false);
        }
      }
    }, 3500);

    if (!isPlayerReady || !playerRef.current) {
      if ((resolvedAudioRef.current?.audioUrl || currentTrack.audioUrl) && isPlaying) {
        startAudioFallback(0, false);
      }
      return;
    }

    const playVideoId = (targetId: string) => {
      if (currentVideoIdRef.current !== targetId) {
        currentVideoIdRef.current = targetId;
        try {
          if (isPlaying) {
            playerRef.current.loadVideoById({
              videoId: targetId,
              startSeconds: 0,
            });
            playerRef.current.playVideo();
          } else {
            playerRef.current.cueVideoById({
              videoId: targetId,
              startSeconds: 0,
            });
          }
        } catch (e) {
          console.warn('Could not load video in YouTube player:', e);
          triggerPlaybackRecovery('loadVideoById failed');
        }
      } else {
        if (isPlaying) {
          try {
            playerRef.current.playVideo();
          } catch {
            triggerPlaybackRecovery('playVideo failed');
          }
        } else {
          try {
            playerRef.current.pauseVideo();
          } catch {}
        }
      }
    };

    resolveFullSong(currentTrack).then((resolvedId) => {
      const videoIdToPlay = resolvedId || currentTrack.youtubeId;
      if (videoIdToPlay) {
        if (resolvedId && onTrackResolved && resolvedId !== currentTrack.youtubeId) {
          onTrackResolved(currentTrack.id, resolvedId);
        }
        playVideoId(videoIdToPlay);
      } else {
        triggerPlaybackRecovery('No initial YouTube video ID found');
      }
    });
  }, [currentTrack?.id, currentTrack?.youtubeId, isPlayerReady]);

  // Handle play / pause changes across both engines + keep-alive audio
  useEffect(() => {
    if (isPlaying) {
      primeLockScreenAudioElements();

      if (isUsingAudioFallback && audioFallbackRef.current) {
        audioFallbackRef.current.play().catch(() => {});
      } else if (document.visibilityState === 'hidden' && lockScreenPlayback) {
        // Resumed directly from lock-screen Play button while screen is locked
        if (resolvedAudioRef.current?.audioUrl || currentTrack?.audioUrl) {
          startAudioFallback(lastKnownTimeRef.current, true);
        }
      }

      if (
        isPlayerReady &&
        playerRef.current &&
        !(document.visibilityState === 'hidden' && isUsingAudioFallbackRef.current)
      ) {
        try {
          playerRef.current.playVideo();
        } catch {}
      }
    } else {
      stopKeepAliveAudio();
      if (audioFallbackRef.current) {
        audioFallbackRef.current.pause();
      }
      if (isPlayerReady && playerRef.current) {
        try {
          playerRef.current.pauseVideo();
        } catch {}
      }
    }
  }, [isPlaying, isPlayerReady, isUsingAudioFallback, lockScreenPlayback]);

  // Handle volume & mute across both engines
  useEffect(() => {
    if (audioFallbackRef.current && isUsingAudioFallback) {
      audioFallbackRef.current.muted = isMuted;
      audioFallbackRef.current.volume = isMuted ? 0 : volume;
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
  }, [volume, isMuted, isPlayerReady, isUsingAudioFallback]);

  // Handle seek across both engines
  useEffect(() => {
    if (seekTime === null) return;
    lastKnownTimeRef.current = seekTime;
    if (audioFallbackRef.current && isUsingAudioFallback) {
      try {
        const dur = audioFallbackRef.current.duration || currentTrack?.duration || 0;
        const isFull = Boolean(resolvedAudioRef.current?.isFullLength);
        audioFallbackRef.current.currentTime = computeSafeSeekTarget(seekTime, dur, isFull);
      } catch {}
    }
    if (!isPlayerReady || !playerRef.current) return;
    try {
      playerRef.current.seekTo(seekTime, true);
    } catch {}
  }, [seekTime, isUsingAudioFallback, isPlayerReady]);

  // If user opens Video Mode while lock-screen audio carrier is active, sync YouTube seamlessly
  useEffect(() => {
    if (
      isVideoVisible &&
      isPlaying &&
      isUsingAudioFallback &&
      lockScreenHandoffRef.current &&
      isPlayerReady &&
      playerRef.current &&
      typeof playerRef.current.seekTo === 'function'
    ) {
      const resumePos = audioFallbackRef.current?.currentTime || lastKnownTimeRef.current || 0;
      try {
        playerRef.current.seekTo(resumePos, true);
        playerRef.current.playVideo();
      } catch {}
    }
  }, [isVideoVisible]);

  // Ticker for current time, duration, lock-screen MediaSession position state, and smooth crossfading
  useEffect(() => {
    if (pollIntervalRef.current) {
      window.clearInterval(pollIntervalRef.current);
    }

    const syncMediaPosition = (curr: number, dur: number) => {
      const now = Date.now();
      if (
        now - lastMediaPosUpdateRef.current >= 900 &&
        typeof navigator !== 'undefined' &&
        'mediaSession' in navigator &&
        typeof navigator.mediaSession.setPositionState === 'function'
      ) {
        lastMediaPosUpdateRef.current = now;
        try {
          if (dur > 0 && curr >= 0 && curr <= dur) {
            navigator.mediaSession.setPositionState({
              duration: dur,
              playbackRate: 1,
              position: curr,
            });
          }
        } catch {}
      }
    };

    if (isPlaying) {
      pollIntervalRef.current = window.setInterval(() => {
        if (isUsingAudioFallback && audioFallbackRef.current) {
          const curr = audioFallbackRef.current.currentTime || 0;
          const dur =
            (Number.isFinite(audioFallbackRef.current.duration) && audioFallbackRef.current.duration > 0
              ? audioFallbackRef.current.duration
              : 0) ||
            (currentTrack ? currentTrack.duration : 0);
          lastKnownTimeRef.current = curr;
          if (currentTrack) {
            onTimeUpdate(curr, dur > 0 ? dur : currentTrack.duration);
            syncMediaPosition(curr, dur > 0 ? dur : currentTrack.duration);
          }
          return;
        }

        if (!playerRef.current || typeof playerRef.current.getCurrentTime !== 'function') return;
        try {
          const curr = playerRef.current.getCurrentTime() || 0;
          const dur = playerRef.current.getDuration() || (currentTrack ? currentTrack.duration : 0);
          lastKnownTimeRef.current = curr;
          if (currentTrack) {
            const effectiveDur = dur > 0 ? dur : currentTrack.duration;
            onTimeUpdate(curr, effectiveDur);
            syncMediaPosition(curr, effectiveDur);
          }

          if (dur > 5 && crossfadeDuration > 0) {
            const remaining = dur - curr;
            const maxVol = isMuted ? 0 : Math.round(volume * 100);

            if (remaining <= crossfadeDuration && remaining > 0) {
              const fadeRatio = Math.max(0, remaining / crossfadeDuration);
              const targetVol = Math.round(maxVol * fadeRatio);
              playerRef.current.setVolume(targetVol);

              if (remaining <= 0.4 && !hasTriggeredEndedRef.current) {
                hasTriggeredEndedRef.current = true;
                onTrackEnded();
              }
            } else if (isFadingInRef.current && curr < Math.min(crossfadeDuration, 2.5)) {
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
  }, [isPlaying, onTimeUpdate, currentTrack?.id, crossfadeDuration, volume, isMuted, onTrackEnded, isUsingAudioFallback]);

  useEffect(() => {
    const reclaimHiddenIframeFocus = () => {
      if (isVideoVisibleRef.current || !containerRef.current || typeof document === 'undefined') return;
      if (containerRef.current.contains(document.activeElement)) {
        (document.activeElement as HTMLElement | null)?.blur?.();
        window.focus();
      }
    };

    reclaimHiddenIframeFocus();
    const handleWindowBlur = () => {
      window.setTimeout(reclaimHiddenIframeFocus, 0);
    };
    window.addEventListener('blur', handleWindowBlur);
    return () => window.removeEventListener('blur', handleWindowBlur);
  }, [isVideoVisible]);

  if (!currentTrack) return null;

  return (
    <>
      {/* Silent Loop Keep-Alive Audio: anchors OS MediaSession & prevents tab suspension when screen locks */}
      <audio
        ref={keepAliveAudioRef}
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
      />

      {/* Top-Level HTML5 Audio Engine for Lock-Screen Playback & Seamless Recovery */}
      <audio
        ref={audioFallbackRef}
        playsInline
        onEnded={() => {
          if (isUsingAudioFallbackRef.current) {
            onTrackEnded();
          }
        }}
        onError={() => {
          console.warn('[FullSongPlayer] HTML5 audio stream encountered error');
        }}
        preload="auto"
      />

      <div
        ref={containerRef}
        inert={!isVideoVisible}
        aria-hidden={!isVideoVisible}
        className={`transition-all duration-300 ${
          isVideoVisible
            ? 'fixed inset-x-3 bottom-24 sm:inset-x-auto sm:right-6 sm:w-[410px] rounded-2xl overflow-hidden shadow-2xl border-2 border-[#1ed760]/50 bg-black/98 backdrop-blur-2xl z-50 animate-scale-in'
            : 'fixed -top-[9999px] -left-[9999px] w-[320px] h-[180px] pointer-events-none z-[-100]'
        }`}
      >
        {/* Video Header Controls with Prominent Hide Button */}
        <div className="flex items-center justify-between px-3 py-2.5 bg-[#121216] border-b border-white/10">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1ed760] animate-pulse shrink-0" />
            <p className="text-xs font-bold text-white truncate">
              {currentTrack.title}
            </p>
            <span className="text-[10px] text-neutral-400 font-mono hidden sm:inline truncate">
              • {isUsingAudioFallback ? 'Background Audio' : 'Video Mode'}
            </span>
          </div>
          <button
            onClick={onToggleVideo}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-rose-200 hover:text-white border border-red-500/40 text-xs font-bold transition-all cursor-pointer shrink-0 shadow-sm"
            title="Hide Video (Audio keeps playing)"
            aria-label="Hide Video Window"
          >
            <X className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Hide Video</span>
          </button>
        </div>

        {/* YouTube Player Iframe Target - ALWAYS retains real viewport dimensions */}
        <div className="relative w-full aspect-video bg-black">
          <div id="youtube-full-song-iframe" className="w-full h-full" />
        </div>

        {/* Video Footer info */}
        <div className="px-3 py-2 bg-[#121216] flex items-center justify-between text-xs text-neutral-400">
          <span className="text-[#1ed760] font-mono flex items-center gap-1.5 text-[11px]">
            {isUsingAudioFallback ? (
              <Volume2 className="w-3.5 h-3.5 text-[#1ed760]" />
            ) : lockScreenPlayback ? (
              <Lock className="w-3.5 h-3.5 text-[#1ed760]" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {isUsingAudioFallback
              ? 'Lock-Screen Audio Stream'
              : lockScreenPlayback
              ? 'Lock-Screen Ready'
              : '100% Master Audio'}
          </span>
          <button
            onClick={onToggleVideo}
            className="flex items-center gap-1 text-[11px] font-bold text-neutral-300 hover:text-white bg-white/10 hover:bg-white/20 px-2.5 py-0.5 rounded-full border border-white/10 transition-colors cursor-pointer"
            title="Switch to Audio Only Mode"
          >
            <span>Audio Only Mode ✕</span>
          </button>
        </div>
      </div>
    </>
  );
};
