/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Play,
  Pause,
  ChevronRight,
  Heart,
  ListMusic,
  Plus,
  Radio,
} from 'lucide-react';
import { IndieTrack, Playlist, IndieArtist, formatListenersCount } from '../utils/musicDiscovery';
import { TrackReview } from '../data/indieCatalog';
import { FastAccessBar } from '../components/FastAccessBar';
import { FrontMusicController } from '../components/FrontMusicController';
import { fastSearchTracks, getTracksByVibe, getInstantAccessTracks } from '../utils/fastAccess';
import type { RecommendedTrackItem } from '../utils/smartRecommendations';

interface HomeViewProps {
  tracks: IndieTrack[];
  playlists: Playlist[];
  artists: IndieArtist[];
  reviews: TrackReview[];
  currentTrack: IndieTrack | null;
  isPlaying: boolean;
  currentTime?: number;
  duration?: number;
  volume?: number;
  isMuted?: boolean;
  isShuffle?: boolean;
  repeatMode?: 'off' | 'all' | 'one';
  isLiked?: boolean;
  isVideoVisible?: boolean;
  onPlayTrack: (track: IndieTrack) => void;
  onPauseTrack?: () => void;
  onResumeTrack?: () => void;
  onNextTrack?: () => void;
  onPreviousTrack?: () => void;
  onSeek?: (seconds: number) => void;
  onVolumeChange?: (volume: number) => void;
  onToggleMute?: () => void;
  onToggleShuffle?: () => void;
  onToggleRepeat?: () => void;
  onToggleLike?: (trackId: string) => void;
  onToggleVideo?: () => void;
  onPlayYouTubeTrack?: (track: IndieTrack) => void;
  onSelectPlaylist: (playlistId: string) => void;
  onSelectArtist: (artistId: string) => void;
  onGoToDiscover: () => void;
  onOpenAndroidApp?: () => void;
  recommendedNextTracks?: RecommendedTrackItem[];
  onAddToQueue?: (track: IndieTrack) => void;
  onDismissRecommendation?: (track: IndieTrack) => void;
  listingPlaylists?: Playlist[];
  activeHomePlaylist?: Playlist | null;
  activeHomePlaylistTracks?: IndieTrack[];
  onSelectActiveHomePlaylist?: (playlistId: string) => void;
  onPlayPlaylist?: (playlist: Playlist, shuffle?: boolean) => void;
  onOpenCreatePlaylist?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  tracks,
  playlists,
  artists,
  reviews,
  currentTrack,
  isPlaying,
  currentTime = 0,
  duration = 240,
  volume = 0.75,
  isMuted = false,
  isShuffle = false,
  repeatMode = 'off',
  isLiked = false,
  isVideoVisible = false,
  onPlayTrack,
  onPauseTrack = () => {},
  onResumeTrack = () => {},
  onNextTrack = () => {},
  onPreviousTrack = () => {},
  onSeek = () => {},
  onVolumeChange = () => {},
  onToggleMute = () => {},
  onToggleShuffle = () => {},
  onToggleRepeat = () => {},
  onToggleLike = () => {},
  onToggleVideo = () => {},
  onPlayYouTubeTrack,
  onSelectPlaylist,
  onSelectArtist,
  onGoToDiscover,
  recommendedNextTracks = [],
  onAddToQueue,
  onDismissRecommendation,
  listingPlaylists = [],
  activeHomePlaylist = null,
  activeHomePlaylistTracks = [],
  onSelectActiveHomePlaylist = () => {},
  onPlayPlaylist,
  onOpenCreatePlaylist,
}) => {
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [fastSearchQuery, setFastSearchQuery] = useState<string>('');
  const [selectedFastVibe, setSelectedFastVibe] = useState<string>('all');
  const [showAllTopTracks, setShowAllTopTracks] = useState(false);
  const [showAllTopArtists, setShowAllTopArtists] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const markImageFailed = (key: string) => {
    setFailedImages((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  };

  // Fast access filtered tracks
  const fastFilteredTracks = fastSearchQuery.trim()
    ? fastSearchTracks(tracks, fastSearchQuery)
    : selectedFastVibe !== 'all'
    ? getTracksByVibe(tracks, selectedFastVibe)
    : null;

  const handleQuickPlay = () => {
    if (fastFilteredTracks && fastFilteredTracks.length > 0) {
      onPlayTrack(fastFilteredTracks[0]);
    } else {
      const instant = getInstantAccessTracks(tracks);
      if (instant.length > 0) {
        onPlayTrack(instant[0]);
      } else if (tracks.length > 0) {
        onPlayTrack(tracks[0]);
      }
    }
  };

  // Categorized shelves
  const nonDefaultTracks = tracks.filter((t) => t.id !== 'kn-trk-1');
  const topTracksList = [
    ...tracks.filter((t) => t.isSpotifyHit || (t.popularity && t.popularity > 80)),
    ...nonDefaultTracks,
  ].filter((t, idx, arr) => arr.findIndex((x) => x.id === t.id) === idx);

  const kannadaTracks = tracks.filter(
    (t) => t.language === 'kannada' || t.id.startsWith('kn-') || (t.tags && t.tags.includes('kannada'))
  );
  const hindiTracks = tracks.filter(
    (t) =>
      t.language === 'hindi' ||
      t.id.startsWith('hn-') ||
      (t.tags && (t.tags.includes('hindi') || t.tags.includes('bollywood')))
  );
  const retro90sTracks = tracks.filter(
    (t) => t.id.includes('90s') || (t.tags && t.tags.includes('90s')) || (t.releaseYear >= 1985 && t.releaseYear <= 2001)
  );
  const playlistTracksForHome =
    activeHomePlaylistTracks.length > 0
      ? activeHomePlaylistTracks
      : nonDefaultTracks.slice(0, 6);

  // Filtered tracks when a genre/category filter is active
  const displayedTracks = tracks.filter((track) => {
    if (activeFilter === 'All') return true;
    if (activeFilter === '90s Golden Era') {
      return (
        track.id.includes('90s') ||
        (track.tags && track.tags.includes('90s')) ||
        (track.releaseYear >= 1985 && track.releaseYear <= 2001)
      );
    }
    if (activeFilter === 'Kannada Hits') {
      return track.language === 'kannada' || track.id.startsWith('kn-') || (track.tags && track.tags.includes('kannada'));
    }
    if (activeFilter === 'Hindi & Bollywood') {
      return (
        track.language === 'hindi' ||
        track.id.startsWith('hn-') ||
        (track.tags && (track.tags.includes('hindi') || track.tags.includes('bollywood')))
      );
    }
    if (activeFilter === 'New Releases') return track.id.startsWith('new-trk-') || track.releaseYear >= 2024;
    if (activeFilter === 'Spotify Hits') return Boolean(track.isSpotifyHit || (track.popularity && track.popularity > 80));
    if (activeFilter === 'Indie Underground') return track.obscurity > 0.6;
    if (activeFilter === 'Rock & Alt') {
      return ['Rock', 'Indie Rock', 'Alternative', '90s Grunge Rock', '90s Britpop / Rock'].includes(track.genre);
    }
    if (activeFilter === 'Pop & Dance') {
      return ['Pop', 'Dance', 'Electronic', '90s Pop Classic', '90s Teen Pop'].includes(track.genre);
    }
    return true;
  });

  // Top genres cards (Screenshot 1 bottom section with real track cover art + clean scrim)
  const topGenreCards = [
    {
      id: 'Kannada Hits',
      label: 'Kannada Hits',
      subtitle: `${kannadaTracks.length} songs`,
      coverUrl: kannadaTracks[0]?.coverUrl || tracks[0]?.coverUrl,
    },
    {
      id: 'Hindi & Bollywood',
      label: 'Bollywood & Hindi',
      subtitle: `${hindiTracks.length} songs`,
      coverUrl: hindiTracks[0]?.coverUrl || tracks[1]?.coverUrl,
    },
    {
      id: '90s Golden Era',
      label: '90s Golden Era',
      subtitle: `${retro90sTracks.length} classics`,
      coverUrl: retro90sTracks[0]?.coverUrl || tracks[2]?.coverUrl,
    },
    {
      id: 'Spotify Hits',
      label: 'Global Top Hits',
      subtitle: `${topTracksList.length} chart toppers`,
      coverUrl: topTracksList[0]?.coverUrl || tracks[3]?.coverUrl,
    },
    {
      id: 'Indie Underground',
      label: 'Indie Underground',
      subtitle: 'Hidden basement gems',
      coverUrl: tracks.find((t) => t.obscurity > 0.6)?.coverUrl || tracks[4]?.coverUrl,
    },
    {
      id: 'Pop & Dance',
      label: 'Pop & High Energy',
      subtitle: 'Workout & club anthems',
      coverUrl: tracks.find((t) => t.energy > 0.75)?.coverUrl || tracks[5]?.coverUrl,
    },
  ];

  const featuredMixCover =
    playlistTracksForHome[0]?.coverUrl || currentTrack?.coverUrl || tracks[0]?.coverUrl;

  return (
    <div className="space-y-8 sm:space-y-10 pb-12 animate-fade-in">
      {/* 1. Matte Obsidian Hi-Fi Front Controller (Screenshot 2) */}
      <FrontMusicController
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        isMuted={isMuted}
        isShuffle={isShuffle}
        repeatMode={repeatMode}
        isLiked={isLiked}
        isVideoVisible={isVideoVisible}
        allTracks={tracks}
        onPlayTrack={onPlayTrack}
        onPauseTrack={onPauseTrack}
        onResumeTrack={onResumeTrack}
        onNextTrack={onNextTrack}
        onPreviousTrack={onPreviousTrack}
        onSeek={onSeek}
        onVolumeChange={onVolumeChange}
        onToggleMute={onToggleMute}
        onToggleShuffle={onToggleShuffle}
        onToggleRepeat={onToggleRepeat}
        onToggleLike={onToggleLike}
        onToggleVideo={onToggleVideo}
        onPlayYouTubeTrack={onPlayYouTubeTrack}
        recommendedNextTracks={recommendedNextTracks}
        onAddToQueue={onAddToQueue}
        activeHomePlaylist={activeHomePlaylist}
        activeHomePlaylistTracks={playlistTracksForHome}
      />

      {/* 2. "Discover music" Headline + Full-Width Search & Shortcuts (Screenshot 1) */}
      <FastAccessBar
        searchQuery={fastSearchQuery}
        onSearchChange={setFastSearchQuery}
        selectedVibe={selectedFastVibe}
        onSelectVibe={setSelectedFastVibe}
        onQuickPlay={handleQuickPlay}
        totalMatches={fastFilteredTracks ? fastFilteredTracks.length : tracks.length}
      />

      {/* Live Fast Filter Results */}
      {fastFilteredTracks && (
        <section className="p-4 rounded-2xl bg-[#151724] border border-white/10 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-semibold text-white">
              {fastSearchQuery ? `Results for "${fastSearchQuery}"` : 'Filtered Tracks'}
              <span className="ml-2 text-xs font-mono tabular-nums text-sky-400">
                {fastFilteredTracks.length} songs
              </span>
            </h2>
            <button
              onClick={() => {
                setFastSearchQuery('');
                setSelectedFastVibe('all');
              }}
              className="text-xs text-sky-400 hover:text-sky-300 font-medium cursor-pointer"
            >
              Reset
            </button>
          </div>

          {fastFilteredTracks.length === 0 ? (
            <p className="text-xs text-neutral-400 py-4 text-center">
              No matching songs found. Try "Kesariya", "KGF", "Kannada", or "Gym".
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {fastFilteredTracks.slice(0, 9).map((track) => {
                const isThisPlaying = currentTrack?.id === track.id && isPlaying;
                return (
                  <div
                    key={track.id}
                    onClick={() => onPlayTrack(track)}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-colors cursor-pointer group"
                  >
                    <img
                      src={track.coverUrl}
                      alt={track.title}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-lg object-cover shrink-0 bg-[#1a1d2c]"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{track.title}</p>
                      <p className="text-xs text-neutral-400 truncate">{track.artist}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlayTrack(track);
                      }}
                      className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shrink-0 active:scale-95 transition-transform"
                      aria-label={`Play ${track.title}`}
                    >
                      {isThisPlaying ? (
                        <Pause className="w-3.5 h-3.5 fill-black" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-black ml-0.5" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* 3. "Your top tracks" — Clean Numbered Square Cards (Screenshot 1) */}
      <section aria-label="Your top tracks" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            Your top tracks
          </h2>
          <button
            onClick={() => setShowAllTopTracks((prev) => !prev)}
            className="inline-flex items-center gap-0.5 text-xs sm:text-sm font-medium text-sky-400 hover:text-sky-300 transition-colors cursor-pointer whitespace-nowrap"
          >
            <span>{showAllTopTracks ? 'Show less' : 'View all'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {(showAllTopTracks ? topTracksList.slice(0, 18) : topTracksList.slice(0, 6)).map(
            (track, index) => {
              const isThisPlaying = currentTrack?.id === track.id && isPlaying;
              const imgKey = `top-trk-${track.id}`;
              return (
                <div
                  key={imgKey}
                  onClick={() => onPlayTrack(track)}
                  className="group cursor-pointer flex flex-col"
                >
                  <div className="w-full aspect-square rounded-xl overflow-hidden relative mb-2 bg-[#181b28] border border-white/[0.06] shadow-md">
                    {failedImages[imgKey] ? (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-neutral-950 text-sky-400">
                        <Radio className="w-7 h-7" />
                      </div>
                    ) : (
                      <img
                        src={track.coverUrl}
                        alt={track.title}
                        referrerPolicy="no-referrer"
                        onError={() => markImageFailed(imgKey)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlayTrack(track);
                      }}
                      className={`absolute bottom-2.5 right-2.5 w-10 h-10 rounded-full bg-white text-black flex items-center justify-center transition-all shadow-xl hover:scale-105 cursor-pointer ${
                        isThisPlaying
                          ? 'opacity-100 scale-100'
                          : 'opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0'
                      }`}
                      aria-label={`Play ${track.title}`}
                    >
                      {isThisPlaying ? (
                        <Pause className="w-4 h-4 fill-black" />
                      ) : (
                        <Play className="w-4 h-4 fill-black ml-0.5" />
                      )}
                    </button>
                  </div>
                  <h3 className="text-sm font-semibold text-white truncate">
                    <span className="tabular-nums text-neutral-300">{index + 1}.</span>{' '}
                    {track.title}
                  </h3>
                  <p className="text-xs text-neutral-400 truncate mt-0.5">{track.artist}</p>
                </div>
              );
            }
          )}
        </div>
      </section>

      {/* 4. "Your top artists" — Clean Numbered Square Portrait Cards (Screenshot 1) */}
      <section aria-label="Your top artists" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            Your top artists
          </h2>
          <button
            onClick={() => setShowAllTopArtists((prev) => !prev)}
            className="inline-flex items-center gap-0.5 text-xs sm:text-sm font-medium text-sky-400 hover:text-sky-300 transition-colors cursor-pointer whitespace-nowrap"
          >
            <span>{showAllTopArtists ? 'Show less' : 'View all'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {(showAllTopArtists ? artists.slice(0, 12) : artists.slice(0, 6)).map((artist, index) => {
            const imgKey = `top-art-${artist.id}`;
            return (
              <div
                key={imgKey}
                onClick={() => onSelectArtist(artist.id)}
                className="group cursor-pointer flex flex-col"
              >
                <div className="w-full aspect-square rounded-xl overflow-hidden relative mb-2 bg-[#181b28] border border-white/[0.06] shadow-md">
                  {failedImages[imgKey] ? (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-neutral-950 text-neutral-400 text-lg font-bold">
                      {artist.name.slice(0, 2).toUpperCase()}
                    </div>
                  ) : (
                    <img
                      src={artist.coverUrl}
                      alt={artist.name}
                      referrerPolicy="no-referrer"
                      onError={() => markImageFailed(imgKey)}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
                </div>
                <h3 className="text-sm font-semibold text-white truncate">
                  <span className="tabular-nums text-neutral-300">{index + 1}.</span>{' '}
                  {artist.name}
                </h3>
                <p className="text-xs text-neutral-400 truncate mt-0.5">
                  {artist.genres[0]} · {formatListenersCount(artist.monthlyListeners)}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. "Top genres" — Wide Editorial Tiles (Screenshot 1 Bottom Shelf) */}
      <section aria-label="Top genres" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            Top genres
          </h2>
          <button
            onClick={() => setActiveFilter('All')}
            className="inline-flex items-center gap-0.5 text-xs sm:text-sm font-medium text-sky-400 hover:text-sky-300 transition-colors cursor-pointer whitespace-nowrap"
          >
            <span>{activeFilter === 'All' ? 'View all' : 'Show all'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {topGenreCards.map((genreCard) => {
            const isActive = activeFilter === genreCard.id;
            return (
              <button
                key={genreCard.id}
                onClick={() => setActiveFilter(isActive ? 'All' : genreCard.id)}
                className={`group relative h-24 sm:h-28 rounded-xl overflow-hidden text-left border transition-all cursor-pointer ${
                  isActive
                    ? 'border-sky-400 ring-2 ring-sky-400/40'
                    : 'border-white/10 hover:border-white/25'
                }`}
              >
                {genreCard.coverUrl && (
                  <img
                    src={genreCard.coverUrl}
                    alt={genreCard.label}
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/25" />
                <div className="relative z-10 h-full flex flex-col justify-end p-3">
                  <p className="text-sm font-bold text-white leading-tight truncate">
                    {genreCard.label}
                  </p>
                  <p className="text-[11px] text-neutral-300 truncate mt-0.5">
                    {genreCard.subtitle}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Active Category Filter Results when a Genre is Selected */}
      {activeFilter !== 'All' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">{activeFilter}</h2>
              <p className="text-xs text-neutral-400">
                {displayedTracks.length} songs · Stream full Hi-Fi audio and video
              </p>
            </div>
            <button
              onClick={() => setActiveFilter('All')}
              className="text-xs sm:text-sm text-sky-400 hover:text-sky-300 font-medium cursor-pointer"
            >
              Clear filter
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {displayedTracks.slice(0, 18).map((track) => {
              const isThisPlaying = currentTrack?.id === track.id && isPlaying;
              return (
                <div
                  key={`cat-${track.id}`}
                  onClick={() => onPlayTrack(track)}
                  className="group cursor-pointer flex flex-col"
                >
                  <div className="w-full aspect-square rounded-xl overflow-hidden relative mb-2 bg-[#181b28] border border-white/[0.06] shadow-md">
                    <img
                      src={track.coverUrl}
                      alt={track.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlayTrack(track);
                      }}
                      className={`absolute bottom-2.5 right-2.5 w-10 h-10 rounded-full bg-white text-black flex items-center justify-center transition-all shadow-xl hover:scale-105 cursor-pointer ${
                        isThisPlaying
                          ? 'opacity-100 scale-100'
                          : 'opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0'
                      }`}
                      aria-label={`Play ${track.title}`}
                    >
                      {isThisPlaying ? (
                        <Pause className="w-4 h-4 fill-black" />
                      ) : (
                        <Play className="w-4 h-4 fill-black ml-0.5" />
                      )}
                    </button>
                  </div>
                  <h3 className="text-sm font-semibold text-white truncate">{track.title}</h3>
                  <p className="text-xs text-neutral-400 truncate mt-0.5">
                    {track.artist} · {track.releaseYear}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 6. Your Playlist Listings + Featured Mix Card (Screenshot 2 Left Screen) */}
      <section aria-label="Your Playlist Listings" className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <ListMusic className="w-5 h-5 text-sky-400" />
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Your Playlist Listings
              </h2>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              {activeHomePlaylist
                ? `${activeHomePlaylist.title} · ${playlistTracksForHome.length} songs`
                : 'Switch playlists or create your own mix anytime.'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {activeHomePlaylist && onPlayPlaylist && playlistTracksForHome.length > 0 && (
              <button
                onClick={() => onPlayPlaylist(activeHomePlaylist, false)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-neutral-200 text-black font-semibold text-xs active:scale-95 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-black ml-0.5" />
                <span>Play Playlist</span>
              </button>
            )}
            {activeHomePlaylist &&
              activeHomePlaylist.id !== 'pl-liked' &&
              activeHomePlaylist.id !== 'pl-downloaded' && (
                <button
                  onClick={() => onSelectPlaylist(activeHomePlaylist.id)}
                  className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-white border border-white/10 transition-colors cursor-pointer"
                >
                  Open Playlist
                </button>
              )}
            {onOpenCreatePlaylist && (
              <button
                onClick={onOpenCreatePlaylist}
                className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-sky-400 border border-white/10 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Playlist</span>
              </button>
            )}
          </div>
        </div>

        {/* Playlist Switcher Tabs */}
        {listingPlaylists.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {listingPlaylists.slice(0, 12).map((pl) => {
              const isSelected = activeHomePlaylist?.id === pl.id;
              return (
                <button
                  key={`home-pl-chip-${pl.id}`}
                  type="button"
                  onClick={() => onSelectActiveHomePlaylist(pl.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer border ${
                    isSelected
                      ? 'bg-white text-black border-white font-semibold'
                      : 'bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 border-white/[0.08]'
                  }`}
                >
                  <span>{pl.title}</span>
                  <span
                    className={`text-[10px] font-mono tabular-nums ${
                      isSelected ? 'text-black/70' : 'text-neutral-500'
                    }`}
                  >
                    {pl.trackIds.length}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Featured Editorial Playlist Spotlight + Song Grid (Screenshot 2 Left Phone) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {activeHomePlaylist && (
            <div
              onClick={() =>
                onPlayPlaylist ? onPlayPlaylist(activeHomePlaylist, false) : undefined
              }
              className="lg:col-span-4 relative min-h-[200px] rounded-2xl overflow-hidden border border-white/10 cursor-pointer group shadow-xl"
            >
              {featuredMixCover && (
                <img
                  src={featuredMixCover}
                  alt={activeHomePlaylist.title}
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/25" />
              <div className="relative z-10 h-full flex flex-col justify-between p-5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-300">
                  Featured · Your Personalized
                </span>
                <div>
                  <h3 className="text-xl font-bold text-white leading-snug">
                    {activeHomePlaylist.title}
                  </h3>
                  <p className="text-xs text-neutral-300 line-clamp-2 mt-1">
                    {activeHomePlaylist.description || `${playlistTracksForHome.length} curated tracks`}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div
            className={`${
              activeHomePlaylist ? 'lg:col-span-8' : 'lg:col-span-12'
            } grid grid-cols-1 sm:grid-cols-2 gap-3`}
          >
            {playlistTracksForHome.slice(0, 6).map((track) => {
              const isThisPlaying = currentTrack?.id === track.id && isPlaying;
              return (
                <div
                  key={`home-pl-trk-${track.id}`}
                  onClick={() => onPlayTrack(track)}
                  className={`group flex items-center bg-[#151724] hover:bg-[#1b1e2e] border rounded-xl overflow-hidden cursor-pointer transition-colors ${
                    currentTrack?.id === track.id
                      ? 'border-sky-400/60 bg-[#1a1e2e]'
                      : 'border-white/[0.06] hover:border-white/15'
                  }`}
                >
                  <img
                    src={track.coverUrl}
                    alt={track.title}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 object-cover shrink-0"
                  />
                  <div className="flex-1 px-3.5 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{track.title}</p>
                    <p className="text-xs text-neutral-400 truncate">{track.artist}</p>
                  </div>
                  <div className="pr-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlayTrack(track);
                      }}
                      className={`w-9 h-9 rounded-full bg-white text-black flex items-center justify-center transition-all shadow active:scale-90 cursor-pointer ${
                        isThisPlaying
                          ? 'opacity-100 scale-100'
                          : 'opacity-90 sm:opacity-0 sm:group-hover:opacity-100'
                      }`}
                      aria-label={`Play ${track.title}`}
                    >
                      {isThisPlaying ? (
                        <Pause className="w-4 h-4 fill-black" />
                      ) : (
                        <Play className="w-4 h-4 fill-black ml-0.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. Suggested Next For You (Smart Recommendations) */}
      {recommendedNextTracks.length > 0 && (
        <section aria-label="Suggested Next For You" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Suggested Next For You
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                {currentTrack
                  ? `Tailored around "${currentTrack.title}" and your listening taste`
                  : 'Curated from your listening history and liked tracks'}
              </p>
            </div>
            <button
              onClick={onGoToDiscover}
              className="inline-flex items-center gap-0.5 text-xs sm:text-sm font-medium text-sky-400 hover:text-sky-300 cursor-pointer"
            >
              <span>Tune Discovery</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {recommendedNextTracks.slice(0, 6).map((item, idx) => {
              const { track, reason } = item;
              const isThisPlaying = currentTrack?.id === track.id && isPlaying;
              return (
                <div
                  key={`rec-${track.id}`}
                  onClick={() => onPlayTrack(track)}
                  className={`group flex flex-col justify-between gap-3 p-3.5 rounded-2xl border transition-colors cursor-pointer ${
                    idx === 0
                      ? 'bg-[#171a2b] border-sky-400/35 hover:border-sky-400/60'
                      : 'bg-[#141622] border-white/[0.06] hover:bg-[#1a1d2d]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={track.coverUrl}
                      alt={track.title}
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 rounded-xl object-cover shrink-0 shadow-md"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{track.title}</p>
                      <p className="text-xs text-neutral-400 truncate">{track.artist}</p>
                      <p className="text-[11px] text-sky-400 truncate mt-0.5">
                        {idx === 0 ? `Up next · ${reason}` : reason}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-white/[0.06]">
                    <div className="flex items-center gap-1.5">
                      {onAddToQueue && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddToQueue(track);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-white/[0.07] hover:bg-white/[0.14] text-[11px] font-medium text-neutral-200 transition-colors cursor-pointer"
                          title={`Add ${track.title} to Queue`}
                          aria-label={`Queue ${track.title}`}
                        >
                          + Queue
                        </button>
                      )}
                      {onDismissRecommendation && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDismissRecommendation(track);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-rose-500/20 text-[11px] text-neutral-400 hover:text-rose-300 transition-colors cursor-pointer"
                          title={`Not interested in ${track.title}`}
                          aria-label={`Hide recommendation ${track.title}`}
                        >
                          Skip
                        </button>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlayTrack(track);
                      }}
                      className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shadow active:scale-90 transition-transform cursor-pointer"
                      aria-label={`Play ${track.title}`}
                    >
                      {isThisPlaying ? (
                        <Pause className="w-4 h-4 fill-black" />
                      ) : (
                        <Play className="w-4 h-4 fill-black ml-0.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 8. Featured Playlists & Curated Collections */}
      <section aria-label="Featured Playlists" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Curated Playlists
            </h2>
            <p className="text-xs text-neutral-400">
              Kannada cinema anthems, Bollywood hits, 90s nostalgia, and indie mixes
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {playlists.slice(0, 10).map((pl) => (
            <div
              key={pl.id}
              onClick={() => onSelectPlaylist(pl.id)}
              className="group p-3 rounded-2xl bg-[#141622] hover:bg-[#1a1d2d] border border-white/[0.06] transition-colors cursor-pointer"
            >
              <div
                className={`w-full aspect-square rounded-xl bg-gradient-to-tr ${pl.coverGradient} flex items-center justify-center text-3xl shadow-md border border-white/10 relative overflow-hidden mb-3`}
              >
                <span>{pl.coverEmoji}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectPlaylist(pl.id);
                  }}
                  className="absolute bottom-2.5 right-2.5 w-10 h-10 rounded-full bg-white text-black flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all shadow-xl hover:scale-105 cursor-pointer"
                  aria-label={`Play ${pl.title}`}
                >
                  <Play className="w-4 h-4 fill-black ml-0.5" />
                </button>
              </div>
              <h3 className="text-sm font-semibold text-white truncate">{pl.title}</h3>
              <p className="text-xs text-neutral-400 line-clamp-2 mt-1 leading-snug">
                {pl.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 9. Listener Notes */}
      {reviews.length > 0 && (
        <section aria-label="Community Notes" className="space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            Listener Notes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {reviews.map((rev) => (
              <div
                key={rev.id}
                className="p-4 rounded-2xl bg-[#141622] border border-white/[0.06] space-y-3"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={rev.avatar}
                    alt={rev.author}
                    referrerPolicy="no-referrer"
                    className="w-9 h-9 rounded-full object-cover"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white">{rev.author}</p>
                    <p className="text-[11px] text-neutral-500">{rev.timeAgo}</p>
                  </div>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">"{rev.comment}"</p>
                <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1">
                  <span className="inline-flex items-center gap-1 text-sky-400 tabular-nums">
                    <Heart className="w-3 h-3 fill-current" /> {rev.likes} likes
                  </span>
                  <span className="text-neutral-500">Verified listener</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
