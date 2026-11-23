/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Heart,
  Search,
  X,
  Music,
  Tv,
  Loader2,
  Globe,
} from 'lucide-react';
import {
  IndieTrack,
  formatDuration,
  filterIndieCatalog,
  searchFullMusicAnywhere,
} from '../utils/musicDiscovery';

interface HomeViewProps {
  tracks: IndieTrack[];
  likedTracks: IndieTrack[];
  likedTrackIds: Set<string>;
  currentTrack: IndieTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isLiked: boolean;
  isVideoVisible: boolean;
  onPlayTrack: (track: IndieTrack) => void;
  onPauseTrack: () => void;
  onResumeTrack: () => void;
  onNextTrack: () => void;
  onPreviousTrack: () => void;
  onSeek: (seconds: number) => void;
  onToggleLike: (trackId: string, track?: IndieTrack) => void;
  onToggleVideo: () => void;
  onPlayYouTubeTrack?: (track: IndieTrack) => void;
  onPlayLikedAll?: () => void;
  onGoToDiscover?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  tracks,
  likedTracks,
  likedTrackIds,
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  isLiked,
  isVideoVisible,
  onPlayTrack,
  onPauseTrack,
  onResumeTrack,
  onNextTrack,
  onPreviousTrack,
  onSeek,
  onToggleLike,
  onToggleVideo,
  onPlayYouTubeTrack,
  onPlayLikedAll,
  onGoToDiscover,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [onlineResults, setOnlineResults] = useState<IndieTrack[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [onlineSearchError, setOnlineSearchError] = useState<string | null>(null);
  const [failedArtworkIds, setFailedArtworkIds] = useState<Record<string, boolean>>({});

  const trimmedQuery = searchQuery.trim();

  const localMatches = useMemo(() => {
    if (!trimmedQuery) return [];
    const seen = new Set<string>();
    const combined: IndieTrack[] = [];
    for (const t of [...likedTracks, ...tracks]) {
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      combined.push(t);
    }
    return filterIndieCatalog(trimmedQuery, null, combined).slice(0, 12);
  }, [trimmedQuery, tracks, likedTracks]);

  const combinedSearchResults = useMemo(() => {
    if (!trimmedQuery) return [];
    const seen = new Set<string>();
    const list: IndieTrack[] = [];
    for (const t of [...localMatches, ...onlineResults]) {
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      list.push(t);
    }
    return list;
  }, [trimmedQuery, localMatches, onlineResults]);

  const handleQueryChange = (value: string) => {
    setSearchQuery(value);
    if (!value.trim()) {
      setOnlineResults([]);
      setOnlineSearchError(null);
      setIsSearchingOnline(false);
    }
  };

  const handleOnlineSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!trimmedQuery || isSearchingOnline) return;
    setIsSearchingOnline(true);
    setOnlineSearchError(null);
    try {
      const results = await searchFullMusicAnywhere(trimmedQuery, 8, 1);
      setOnlineResults(results);
      if (results.length === 0 && localMatches.length === 0) {
        setOnlineSearchError('No matching songs found.');
      }
    } catch {
      setOnlineSearchError('Could not fetch online results right now.');
    } finally {
      setIsSearchingOnline(false);
    }
  };

  const markArtworkFailed = (id: string) => {
    setFailedArtworkIds((prev) => (prev[id] ? prev : { ...prev, [id]: true }));
  };

  const activeDuration = Math.max(1, duration || currentTrack?.duration || 210);
  const clampedCurrentTime = Math.min(activeDuration, Math.max(0, currentTime));
  const progressPct = Math.min(100, Math.max(0, (clampedCurrentTime / activeDuration) * 100));

  const renderTrackArtwork = (track: IndieTrack, sizeClass: string, radiusClass: string) => {
    const failed = failedArtworkIds[track.id] || !track.coverUrl;
    if (failed) {
      return (
        <div
          className={`${sizeClass} ${radiusClass} shrink-0 bg-white/[0.08] border border-white/10 flex items-center justify-center text-neutral-400`}
        >
          <Music className="w-4 h-4" />
        </div>
      );
    }
    return (
      <img
        src={track.coverUrl}
        alt={track.title}
        referrerPolicy="no-referrer"
        loading="lazy"
        onError={() => markArtworkFailed(track.id)}
        className={`${sizeClass} ${radiusClass} object-cover shrink-0 bg-white/[0.06] border border-white/[0.08]`}
      />
    );
  };

  return (
    <div
      data-testid="home-view"
      className="w-full max-w-3xl mx-auto overflow-x-hidden space-y-3 sm:space-y-5 pb-4 md:pb-6"
    >
      {/* 1. Compact Now Playing Card */}
      <section
        data-testid="home-now-playing"
        aria-label="Now Playing"
        className="w-full rounded-2xl bg-white/[0.04] border border-white/[0.08] p-3 sm:p-4 backdrop-blur-md"
      >
        {currentTrack ? (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              {renderTrackArtwork(currentTrack, 'w-11 h-11 sm:w-12 sm:h-12', 'rounded-xl')}

              <div className="min-w-0 flex-1">
                <p
                  data-testid="home-now-playing-title"
                  className="text-sm sm:text-base font-semibold text-white truncate leading-tight"
                >
                  {currentTrack.title}
                </p>
                <p className="text-xs text-neutral-400 truncate mt-0.5">{currentTrack.artist}</p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onToggleLike(currentTrack.id, currentTrack)}
                  data-testid="home-now-playing-like"
                  aria-pressed={isLiked}
                  aria-label={isLiked ? `Unlike ${currentTrack.title}` : `Like ${currentTrack.title}`}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-colors active:scale-95 cursor-pointer shrink-0 ${
                    isLiked
                      ? 'text-rose-500 bg-rose-500/10 hover:bg-rose-500/20'
                      : 'text-neutral-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                </button>

                <button
                  type="button"
                  onClick={isPlaying ? onPauseTrack : onResumeTrack}
                  data-testid="home-now-playing-toggle"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white text-black hover:bg-neutral-200 flex items-center justify-center transition-transform active:scale-95 shadow-md cursor-pointer shrink-0"
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-black" />
                  ) : (
                    <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-black ml-0.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Compact Seek & Quick Transport Controls */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={onPreviousTrack}
                  aria-label="Previous track"
                  className="w-9 h-9 rounded-full flex items-center justify-center text-neutral-300 hover:text-white hover:bg-white/10 active:scale-95 transition-colors cursor-pointer shrink-0"
                >
                  <SkipBack className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onNextTrack}
                  aria-label="Next track"
                  className="w-9 h-9 rounded-full flex items-center justify-center text-neutral-300 hover:text-white hover:bg-white/10 active:scale-95 transition-colors cursor-pointer shrink-0"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className="text-[11px] text-neutral-400 tabular-nums shrink-0">
                  {formatDuration(Math.floor(clampedCurrentTime))}
                </span>
                <div className="relative flex-1 min-w-0 h-5 flex items-center">
                  <div className="w-full h-1 rounded-full bg-white/15 overflow-hidden">
                    <div
                      className="h-full bg-[#1ed760] rounded-full transition-[width] duration-150"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={activeDuration}
                    step={1}
                    value={Math.floor(clampedCurrentTime)}
                    onChange={(e) => onSeek(Number(e.target.value))}
                    aria-label="Seek playback position"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                <span className="text-[11px] text-neutral-400 tabular-nums shrink-0">
                  {formatDuration(Math.floor(activeDuration))}
                </span>
              </div>

              <button
                type="button"
                onClick={onToggleVideo}
                aria-pressed={isVideoVisible}
                aria-label={isVideoVisible ? 'Hide music video' : 'Show music video'}
                title={isVideoVisible ? 'Hide video' : 'Toggle music video'}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors active:scale-95 cursor-pointer shrink-0 ${
                  isVideoVisible
                    ? 'bg-[#1ed760]/20 text-[#1ed760]'
                    : 'text-neutral-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Tv className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 py-1">
            <p className="text-sm text-neutral-400 truncate">Select a song to start listening</p>
            {likedTracks[0] && (
              <button
                type="button"
                onClick={() => onPlayTrack(likedTracks[0])}
                className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shrink-0 cursor-pointer"
                aria-label="Play first liked song"
              >
                <Play className="w-4 h-4 fill-black ml-0.5" />
              </button>
            )}
          </div>
        )}
      </section>

      {/* 2. Clean Search Bar (zero recent search lists, shortcut chips, or filter pills) */}
      <section data-testid="home-search-section" aria-label="Search music" className="w-full">
        <form onSubmit={handleOnlineSearch} className="relative flex items-center w-full">
          <Search
            className="w-4 h-4 text-neutral-400 absolute left-3.5 pointer-events-none shrink-0"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search songs or artists..."
            data-testid="home-search-input"
            aria-label="Search songs or artists"
            className="w-full h-11 pl-10 pr-10 rounded-xl bg-white/[0.05] hover:bg-white/[0.07] focus:bg-white/[0.08] border border-white/[0.09] focus:border-white/25 text-sm text-white placeholder:text-neutral-400 outline-none transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => handleQueryChange('')}
              aria-label="Clear search"
              className="absolute right-1.5 w-9 h-9 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>

        {/* Live Inline Search Results (shown ONLY while user is actively searching) */}
        {trimmedQuery.length > 0 && (
          <div
            data-testid="home-search-results"
            className="mt-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] p-2 sm:p-2.5 space-y-1"
          >
            {combinedSearchResults.length > 0 ? (
              <div className="space-y-1">
                {combinedSearchResults.map((track) => {
                  const isRowCurrent = currentTrack?.id === track.id;
                  const isRowPlaying = isRowCurrent && isPlaying;
                  const isRowLiked = likedTrackIds.has(track.id);
                  const isOnline = track.id.startsWith('yt-') || Boolean(track.youtubeId && !tracks.some((t) => t.id === track.id));

                  return (
                    <div
                      key={track.id}
                      data-testid="home-search-result-row"
                      className={`flex items-center gap-2 sm:gap-3 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl transition-colors min-w-0 ${
                        isRowCurrent ? 'bg-white/10' : 'hover:bg-white/[0.06]'
                      }`}
                    >
                      {renderTrackArtwork(track, 'w-8 h-8 sm:w-9 sm:h-9', 'rounded-md sm:rounded-lg')}

                      <button
                        type="button"
                        onClick={() => {
                          if (isRowPlaying) {
                            onPauseTrack();
                          } else if (isOnline && onPlayYouTubeTrack) {
                            onPlayYouTubeTrack(track);
                          } else {
                            onPlayTrack(track);
                          }
                        }}
                        className="min-w-0 flex-1 text-left cursor-pointer"
                      >
                        <p
                          className={`text-[13px] sm:text-sm font-medium truncate ${
                            isRowCurrent ? 'text-[#1ed760]' : 'text-white'
                          }`}
                        >
                          {track.title}
                        </p>
                        <p className="hidden sm:block text-xs text-neutral-400 truncate">
                          {track.artist}
                        </p>
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onToggleLike(track.id, track)}
                          data-testid={`search-result-like-${track.id}`}
                          aria-pressed={isRowLiked}
                          aria-label={isRowLiked ? `Unlike ${track.title}` : `Like ${track.title}`}
                          className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors active:scale-95 cursor-pointer shrink-0 ${
                            isRowLiked
                              ? 'text-rose-500 hover:bg-rose-500/15'
                              : 'text-neutral-400 hover:text-rose-400 hover:bg-white/10'
                          }`}
                        >
                          <Heart
                            className={`w-4 h-4 ${isRowLiked ? 'fill-rose-500 text-rose-500' : ''}`}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (isRowPlaying) {
                              onPauseTrack();
                            } else if (isOnline && onPlayYouTubeTrack) {
                              onPlayYouTubeTrack(track);
                            } else {
                              onPlayTrack(track);
                            }
                          }}
                          aria-label={isRowPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
                          className="w-9 h-9 rounded-full bg-white/[0.08] hover:bg-white/15 text-white flex items-center justify-center transition-colors active:scale-95 cursor-pointer shrink-0"
                        >
                          {isRowPlaying ? (
                            <Pause className="w-3.5 h-3.5 fill-white" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : !isSearchingOnline ? (
              <p className="text-xs text-neutral-400 px-2 py-2">
                {onlineSearchError || `No local tracks match "${trimmedQuery}".`}
              </p>
            ) : null}

            <div className="pt-1 border-t border-white/[0.06] flex items-center justify-between gap-2 px-1">
              <button
                type="button"
                onClick={() => handleOnlineSearch()}
                disabled={isSearchingOnline}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-300 hover:text-white py-1.5 px-2 rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSearchingOnline ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1ed760]" />
                ) : (
                  <Globe className="w-3.5 h-3.5 text-[#1ed760]" />
                )}
                <span>
                  {isSearchingOnline
                    ? 'Searching online...'
                    : `Search online for "${trimmedQuery}"`}
                </span>
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 3. Liked Songs (Slim Single-Line Rows on Mobile, Clean Rows on Desktop) */}
      <section data-testid="home-liked-songs" aria-label="Liked Songs" className="w-full space-y-2">
        <div className="flex items-center justify-between gap-2 px-0.5">
          <div className="flex items-baseline gap-2 min-w-0">
            <h1 className="text-base sm:text-lg font-semibold tracking-tight text-white truncate">
              Liked Songs
            </h1>
            <span
              data-testid="home-liked-count"
              className="text-xs text-neutral-400 tabular-nums shrink-0"
            >
              · {likedTracks.length} {likedTracks.length === 1 ? 'track' : 'tracks'}
            </span>
          </div>

          {likedTracks.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (onPlayLikedAll) {
                  onPlayLikedAll();
                } else if (likedTracks[0]) {
                  onPlayTrack(likedTracks[0]);
                }
              }}
              className="h-9 px-3 rounded-full bg-white/[0.07] hover:bg-white/[0.13] text-xs font-medium text-white inline-flex items-center gap-1.5 transition-colors active:scale-95 cursor-pointer shrink-0"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Play all</span>
            </button>
          )}
        </div>

        {likedTracks.length === 0 ? (
          <div
            data-testid="home-liked-empty"
            className="rounded-2xl bg-white/[0.03] border border-white/[0.08] px-4 py-8 text-center space-y-2.5"
          >
            <p className="text-sm font-medium text-white">No liked songs yet</p>
            <p className="text-xs text-neutral-400">
              Tap the heart on any song while listening or searching to keep it here.
            </p>
            {onGoToDiscover && (
              <button
                type="button"
                onClick={onGoToDiscover}
                className="mt-1 h-10 px-4 rounded-full bg-white text-black text-xs font-semibold hover:bg-neutral-200 transition-colors cursor-pointer"
              >
                Browse Discover
              </button>
            )}
          </div>
        ) : (
          <div
            data-testid="home-liked-list"
            className="space-y-1 sm:space-y-1.5"
          >
            {likedTracks.map((track) => {
              const isRowCurrent = currentTrack?.id === track.id;
              const isRowPlaying = isRowCurrent && isPlaying;

              return (
                <div
                  key={track.id}
                  data-testid="liked-song-row"
                  data-track-id={track.id}
                  className={`flex items-center gap-1.5 sm:gap-3 px-2 py-1 sm:px-3 sm:py-2 rounded-xl transition-colors min-w-0 ${
                    isRowCurrent
                      ? 'bg-white/[0.1] border border-white/[0.1]'
                      : 'bg-white/[0.025] hover:bg-white/[0.06] border border-transparent'
                  }`}
                >
                  {/* Small Square Album Thumbnail */}
                  {renderTrackArtwork(track, 'w-8 h-8 sm:w-9 sm:h-9', 'rounded-md sm:rounded-lg')}

                  {/* Title Container: Single-line title ONLY on mobile; subtitle appears on sm+ */}
                  <button
                    type="button"
                    onClick={() => (isRowPlaying ? onPauseTrack() : onPlayTrack(track))}
                    className="min-w-0 flex-1 text-left py-1 cursor-pointer"
                  >
                    <p
                      data-testid="liked-song-title"
                      className={`text-[13px] sm:text-sm font-medium truncate leading-snug ${
                        isRowCurrent ? 'text-[#1ed760]' : 'text-white'
                      }`}
                    >
                      {track.title}
                    </p>
                    <p
                      data-testid="liked-song-artist"
                      className="hidden sm:block text-xs text-neutral-400 truncate mt-0.5"
                    >
                      {track.artist}
                    </p>
                  </button>

                  {/* Duration (desktop only) */}
                  <span className="hidden sm:inline-block text-xs text-neutral-500 tabular-nums shrink-0 mr-1">
                    {formatDuration(track.duration)}
                  </span>

                  {/* Compact Action Controls (36px touch targets, shrink-0) */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onToggleLike(track.id, track)}
                      data-testid="liked-song-heart"
                      aria-label={`Remove ${track.title} from Liked Songs`}
                      className="w-9 h-9 rounded-full flex items-center justify-center text-rose-500 hover:bg-rose-500/15 active:scale-95 transition-colors cursor-pointer shrink-0"
                    >
                      <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                    </button>

                    <button
                      type="button"
                      onClick={() => (isRowPlaying ? onPauseTrack() : onPlayTrack(track))}
                      data-testid="liked-song-play"
                      aria-label={isRowPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
                      className={`w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition-colors cursor-pointer shrink-0 ${
                        isRowCurrent
                          ? 'bg-[#1ed760] text-black hover:bg-[#1ed760]/90'
                          : 'bg-white/[0.08] text-white hover:bg-white/15'
                      }`}
                    >
                      {isRowPlaying ? (
                        <Pause className="w-3.5 h-3.5 fill-current" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
