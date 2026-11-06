/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Layers,
  Heart,
  Plus,
  Search,
  Play,
  Pause,
  Shuffle,
  Users,
  Sparkles,
  Music2,
  Grid,
  List,
  ArrowUpDown,
  Share2,
  Globe,
  Radio,
  Download,
  CheckCircle2,
  Trash2,
  HardDrive,
} from 'lucide-react';
import { IndieTrack, Playlist, IndieArtist, calculatePlaylistDuration, formatDuration } from '../utils/musicDiscovery';
import {
  getDownloadedTracks,
  calculateTotalStorage,
  formatBytes,
} from '../utils/downloadManager';

interface LibraryViewProps {
  playlists: Playlist[];
  allTracks: IndieTrack[];
  artists: IndieArtist[];
  likedTrackIds: Set<string>;
  downloadedTrackIds?: Set<string>;
  downloadingTrackIds?: Set<string>;
  currentTrack: IndieTrack | null;
  isPlaying: boolean;
  onSelectPlaylist: (id: string) => void;
  onSelectArtist: (id: string) => void;
  onPlayPlaylist: (playlist: Playlist, shuffle?: boolean) => void;
  onPlayTrack: (track: IndieTrack) => void;
  onPauseTrack: () => void;
  onToggleLike: (trackId: string) => void;
  onSharePlaylist: (playlist: Playlist) => void;
  onOpenCreatePlaylist: () => void;
  onOpenAddMusic: () => void;
  onGoToLikedSongs: () => void;
  onGoToDownloads?: () => void;
  onDownloadTrack?: (track: IndieTrack) => void;
  onRemoveDownload?: (trackId: string) => void;
  onClearAllDownloads?: () => void;
  initialFilter?: LibraryFilter;
}

type LibraryFilter = 'all' | 'playlists' | 'liked' | 'artists' | 'full' | 'downloads';
type SortOption = 'recent' | 'alphabetical' | 'tracks';

export const LibraryView: React.FC<LibraryViewProps> = ({
  playlists,
  allTracks,
  artists,
  likedTrackIds,
  downloadedTrackIds = new Set(),
  downloadingTrackIds = new Set(),
  currentTrack,
  isPlaying,
  onSelectPlaylist,
  onSelectArtist,
  onPlayPlaylist,
  onPlayTrack,
  onPauseTrack,
  onToggleLike,
  onSharePlaylist,
  onOpenCreatePlaylist,
  onOpenAddMusic,
  onGoToLikedSongs,
  onGoToDownloads,
  onDownloadTrack,
  onRemoveDownload,
  onClearAllDownloads,
  initialFilter = 'all',
}) => {
  const [filter, setFilter] = useState<LibraryFilter>(initialFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [viewLayout, setViewLayout] = useState<'grid' | 'list'>('grid');

  // Filtered and sorted playlists
  const filteredPlaylists = useMemo(() => {
    let result = [...playlists];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.owner.toLowerCase().includes(q)
      );
    }

    if (sortBy === 'alphabetical') {
      result.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'tracks') {
      result.sort((a, b) => b.trackIds.length - a.trackIds.length);
    }

    return result;
  }, [playlists, searchQuery, sortBy]);

  // Liked tracks objects
  const likedTracks = useMemo(() => {
    return allTracks.filter((t) => likedTrackIds.has(t.id));
  }, [allTracks, likedTrackIds]);

  // Liked tracks virtual playlist for play-all
  const likedVirtualPlaylist: Playlist = {
    id: 'pl-liked',
    title: 'Liked Songs',
    description: 'Your private collection of discovered treasures',
    coverGradient: 'from-indigo-600 via-purple-700 to-rose-600',
    coverEmoji: '❤️',
    trackIds: Array.from(likedTrackIds),
    createdAt: '2026',
    owner: 'You',
  };

  // Downloaded tracks objects
  const downloadedTracks = useMemo(() => {
    return allTracks.filter((t) => downloadedTrackIds.has(t.id));
  }, [allTracks, downloadedTrackIds]);

  // Storage calculation for downloaded tracks
  const storageSummary = useMemo(() => {
    const records = getDownloadedTracks();
    return calculateTotalStorage(records);
  }, [downloadedTrackIds]);

  // Downloaded tracks virtual playlist for play-all
  const downloadedVirtualPlaylist: Playlist = useMemo(
    () => ({
      id: 'pl-downloaded-virtual',
      title: 'Downloaded Songs',
      description: 'Offline-ready tracks stored on your device',
      coverGradient: 'from-blue-600 via-cyan-600 to-teal-500',
      coverEmoji: '⬇️',
      trackIds: downloadedTracks.map((t) => t.id),
      createdAt: '2026',
      owner: 'You',
    }),
    [downloadedTracks]
  );

  // Full songs (YouTube indexed)
  const fullSongs = useMemo(() => {
    return allTracks.filter((t) => t.youtubeId || t.fullSongAvailable);
  }, [allTracks]);

  // Filtered artists
  const filteredArtists = useMemo(() => {
    if (!searchQuery.trim()) return artists;
    const q = searchQuery.toLowerCase();
    return artists.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.genres.some((g) => g.toLowerCase().includes(q)) ||
        a.bio.toLowerCase().includes(q)
    );
  }, [artists, searchQuery]);

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-transparent border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-[#1ed760]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 z-10">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#1ed760]/20 text-[#1ed760] border border-[#1ed760]/30 shadow-sm">
              <Layers className="w-5 h-5" />
            </span>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#1ed760]">
              Personal Library
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Your Music Collection
          </h1>
          <p className="text-sm text-neutral-400 max-w-lg">
            Manage your playlists, explore your liked treasures, and jump straight into your favorite tracks with one tap.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2.5 z-10 shrink-0">
          <button
            onClick={onOpenCreatePlaylist}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#1ed760] hover:bg-[#1db954] text-black font-extrabold text-xs sm:text-sm shadow-lg shadow-[#1ed760]/20 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New Playlist</span>
          </button>

          <button
            onClick={onOpenAddMusic}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm border border-white/15 active:scale-95 transition-all"
            title="Import via song link or YouTube"
          >
            <Globe className="w-4 h-4 text-[#1ed760]" />
            <span>Add Music Link</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#111116] p-3 rounded-2xl border border-white/10">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          <button
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
              filter === 'all'
                ? 'bg-white text-black shadow-md'
                : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
            }`}
          >
            All Items ({playlists.length + (likedTracks.length > 0 ? 1 : 0)})
          </button>

          <button
            onClick={() => setFilter('playlists')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
              filter === 'playlists'
                ? 'bg-white text-black shadow-md'
                : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
            }`}
          >
            Playlists ({playlists.length})
          </button>

          <button
            onClick={() => setFilter('liked')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              filter === 'liked'
                ? 'bg-rose-500 text-white shadow-md'
                : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Heart className="w-3 h-3 fill-current" />
            <span>Liked ({likedTrackIds.size})</span>
          </button>

          <button
            onClick={() => setFilter('artists')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
              filter === 'artists'
                ? 'bg-white text-black shadow-md'
                : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
            }`}
          >
            Artists ({artists.length})
          </button>

          <button
            onClick={() => setFilter('full')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              filter === 'full'
                ? 'bg-[#1ed760] text-black shadow-md'
                : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Radio className="w-3 h-3" />
            <span>Full Streams ({fullSongs.length})</span>
          </button>

          <button
            onClick={() => setFilter('downloads')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              filter === 'downloads'
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md'
                : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Download className="w-3 h-3" />
            <span>Downloaded ({downloadedTracks.length})</span>
          </button>
        </div>

        {/* Right Controls: Search, Sort, View Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Search */}
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search library..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white/5 hover:bg-white/10 focus:bg-white/10 border border-white/10 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#1ed760]"
            />
          </div>

          {/* Sort Selector */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="appearance-none bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 text-xs font-semibold py-1.5 pl-3 pr-7 rounded-xl focus:outline-none focus:border-[#1ed760] cursor-pointer"
              aria-label="Sort library items"
            >
              <option value="recent" className="bg-[#181820] text-white">Recently Added</option>
              <option value="alphabetical" className="bg-[#181820] text-white">Alphabetical</option>
              <option value="tracks" className="bg-[#181820] text-white">Song Count</option>
            </select>
            <ArrowUpDown className="w-3 h-3 text-neutral-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Grid/List Layout Toggle */}
          <div className="flex items-center bg-white/5 p-0.5 rounded-xl border border-white/10">
            <button
              onClick={() => setViewLayout('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewLayout === 'grid' ? 'bg-white/20 text-white' : 'text-neutral-400 hover:text-white'
              }`}
              title="Grid View"
              aria-label="Grid layout"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewLayout('list')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewLayout === 'list' ? 'bg-white/20 text-white' : 'text-neutral-400 hover:text-white'
              }`}
              title="List View"
              aria-label="List layout"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Featured Liked Songs Hero Card (shown in All and Liked tabs) */}
      {(filter === 'all' || filter === 'liked') && !searchQuery && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Big Liked Songs Card */}
          <div
            onClick={onGoToLikedSongs}
            className="md:col-span-2 group relative overflow-hidden rounded-3xl p-6 sm:p-7 bg-gradient-to-tr from-indigo-700 via-purple-700 to-rose-600 border border-white/20 shadow-2xl cursor-pointer hover:shadow-rose-500/20 hover:scale-[1.01] transition-all"
          >
            <div className="relative z-10 flex flex-col justify-between h-full min-h-[160px]">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/30 backdrop-blur-md border border-white/20 text-xs font-bold text-white mb-3">
                  <Heart className="w-3.5 h-3.5 fill-rose-400 text-rose-400" />
                  <span>Your Favorites</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white">Liked Songs</h3>
                <p className="text-xs sm:text-sm text-white/80 mt-1 line-clamp-1">
                  {likedTracks.length > 0
                    ? `Featuring ${likedTracks.slice(0, 3).map((t) => t.title).join(', ')}...`
                    : 'Discover tracks and tap the heart icon to save them here'}
                </p>
              </div>

              <div className="flex items-center justify-between mt-4">
                <span className="text-xs sm:text-sm font-semibold text-white/90">
                  {likedTracks.length} tracks • {calculatePlaylistDuration(likedTracks)}
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (likedTracks.length > 0) {
                      onPlayPlaylist(likedVirtualPlaylist, false);
                    }
                  }}
                  className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 active:scale-95 transition-transform shadow-xl shadow-black/40 group-hover:bg-[#1ed760]"
                  title="Play all liked songs"
                  aria-label="Play all liked songs"
                >
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Create Card */}
          <div
            onClick={onOpenCreatePlaylist}
            className="group rounded-3xl p-6 bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-dashed border-white/20 hover:border-[#1ed760]/60 hover:bg-white/[0.08] transition-all cursor-pointer flex flex-col items-center justify-center text-center min-h-[160px]"
          >
            <div className="w-12 h-12 rounded-2xl bg-white/10 group-hover:bg-[#1ed760] text-white group-hover:text-black flex items-center justify-center mb-3 transition-colors shadow-lg">
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </div>
            <h4 className="text-base font-bold text-white group-hover:text-[#1ed760] transition-colors">
              Create New Playlist
            </h4>
            <p className="text-xs text-neutral-400 mt-1">
              Organize your indie gems by vibe, mood, or roadtrip
            </p>
          </div>
        </div>
      )}

      {/* Playlists Section */}
      {(filter === 'all' || filter === 'playlists') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span>Your Playlists</span>
              <span className="text-xs font-mono font-normal text-neutral-400">
                ({filteredPlaylists.length})
              </span>
            </h2>
          </div>

          {filteredPlaylists.length === 0 ? (
            <div className="text-center py-12 bg-white/[0.02] rounded-3xl border border-white/5 p-6">
              <Music2 className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-neutral-300">No playlists found</p>
              <p className="text-xs text-neutral-500 mt-1">
                {searchQuery ? `No matches for "${searchQuery}"` : 'Create your first custom playlist!'}
              </p>
              <button
                onClick={onOpenCreatePlaylist}
                className="mt-4 px-4 py-2 rounded-full bg-[#1ed760] text-black font-extrabold text-xs inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Create Playlist</span>
              </button>
            </div>
          ) : viewLayout === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-4">
              {filteredPlaylists.map((pl) => {
                const plTracks = pl.trackIds
                  .map((id) => allTracks.find((t) => t.id === id))
                  .filter((t): t is IndieTrack => !!t);

                return (
                  <div
                    key={pl.id}
                    onClick={() => onSelectPlaylist(pl.id)}
                    className="group relative p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-white/15 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      {/* Cover Art Box with Emoji & Gradient */}
                      <div
                        className={`aspect-square w-full rounded-xl bg-gradient-to-tr ${pl.coverGradient} flex items-center justify-center text-4xl sm:text-5xl shadow-lg relative overflow-hidden mb-3 border border-white/10`}
                      >
                        <span className="transform group-hover:scale-110 transition-transform">
                          {pl.coverEmoji}
                        </span>

                        {/* Floating Play Button on Hover */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPlayPlaylist(pl, false);
                          }}
                          className="absolute bottom-2.5 right-2.5 w-10 h-10 rounded-full bg-[#1ed760] hover:bg-[#1db954] text-black flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all shadow-xl hover:scale-105 active:scale-95"
                          title={`Play ${pl.title}`}
                          aria-label={`Play playlist ${pl.title}`}
                        >
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 mb-1">
                        <h3 className="font-bold text-sm text-white truncate group-hover:text-[#1ed760] transition-colors">
                          {pl.title}
                        </h3>
                        {pl.isCollaborative && (
                          <span title="Collaborative with friends">
                            <Users className="w-3.5 h-3.5 text-[#1ed760] shrink-0" />
                          </span>
                        )}
                        {pl.isPersonalized && (
                          <span title="Personalized discovery mix">
                            <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-neutral-400 line-clamp-1">
                        {pl.description || `Created by ${pl.owner}`}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px] text-neutral-500 font-mono">
                      <span>{pl.trackIds.length} songs</span>
                      <span>{calculatePlaylistDuration(plTracks)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List Layout */
            <div className="bg-[#121217] rounded-2xl border border-white/10 divide-y divide-white/5 overflow-hidden">
              {filteredPlaylists.map((pl) => {
                const plTracks = pl.trackIds
                  .map((id) => allTracks.find((t) => t.id === id))
                  .filter((t): t is IndieTrack => !!t);

                return (
                  <div
                    key={pl.id}
                    onClick={() => onSelectPlaylist(pl.id)}
                    className="flex items-center justify-between p-3 sm:p-4 hover:bg-white/[0.04] transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${pl.coverGradient} flex items-center justify-center text-xl shrink-0 shadow-sm border border-white/10`}
                      >
                        {pl.coverEmoji}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-white group-hover:text-[#1ed760] truncate transition-colors">
                            {pl.title}
                          </h4>
                          {pl.isCollaborative && (
                            <span className="text-[10px] font-mono text-[#1ed760] bg-[#1ed760]/10 px-1.5 py-0.5 rounded border border-[#1ed760]/20">
                              Shared
                            </span>
                          )}
                          {pl.isPersonalized && (
                            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-400/10 px-1.5 py-0.5 rounded border border-cyan-400/20">
                              AI Mix
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-400 truncate mt-0.5">
                          {pl.description || `By ${pl.owner}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-xs text-neutral-400 font-mono hidden sm:inline">
                        {pl.trackIds.length} tracks • {calculatePlaylistDuration(plTracks)}
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlayPlaylist(pl, false);
                        }}
                        className="p-2.5 rounded-full bg-white/10 hover:bg-[#1ed760] text-white hover:text-black transition-colors"
                        title={`Play ${pl.title}`}
                      >
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSharePlaylist(pl);
                        }}
                        className="p-2 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                        title="Share playlist"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Artists Section */}
      {(filter === 'all' || filter === 'artists') && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span>Artists in Your Rotation</span>
              <span className="text-xs font-mono font-normal text-neutral-400">
                ({filteredArtists.length})
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {filteredArtists.map((artist) => (
              <div
                key={artist.id}
                onClick={() => onSelectArtist(artist.id)}
                className="group p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-white/15 transition-all cursor-pointer flex flex-col items-center text-center"
              >
                <img
                  src={artist.coverUrl}
                  alt={artist.name}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover shadow-lg border border-white/10 group-hover:scale-105 transition-transform mb-3"
                />
                <h4 className="font-bold text-xs sm:text-sm text-white group-hover:text-[#1ed760] truncate max-w-full transition-colors">
                  {artist.name}
                </h4>
                <p className="text-[11px] text-neutral-400 truncate max-w-full mt-0.5">
                  {artist.genres[0] || 'Indie'}
                </p>
                <span className="text-[10px] font-mono text-[#1ed760]/90 mt-1">
                  {(artist.monthlyListeners / 1000).toFixed(0)}k listeners
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full Songs Section */}
      {filter === 'full' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#1ed760]/10 border border-[#1ed760]/20 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-white">Full Length Music Stream Catalog</h3>
              <p className="text-xs text-neutral-400">
                These tracks feature full-length audio playback via YouTube & online streams.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-[#1ed760] text-black font-extrabold text-xs">
              {fullSongs.length} Ready
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {fullSongs.map((track) => (
              <div
                key={track.id}
                onClick={() => onPlayTrack(track)}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 cursor-pointer group transition-all"
              >
                <img
                  src={track.coverUrl}
                  alt={track.title}
                  className="w-12 h-12 rounded-lg object-cover shadow-sm shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-xs text-white group-hover:text-[#1ed760] truncate transition-colors">
                    {track.title}
                  </p>
                  <p className="text-[11px] text-neutral-400 truncate">{track.artist}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (currentTrack?.id === track.id && isPlaying) {
                      onPauseTrack();
                    } else {
                      onPlayTrack(track);
                    }
                  }}
                  className="p-2 rounded-full bg-white/10 group-hover:bg-[#1ed760] text-white group-hover:text-black transition-colors"
                >
                  {currentTrack?.id === track.id && isPlaying ? (
                    <Pause className="w-3.5 h-3.5 fill-current" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Downloaded Songs Section */}
      {filter === 'downloads' && (
        <div className="space-y-4">
          <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-900/30 via-cyan-900/20 to-teal-900/20 border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
                  <Download className="w-4 h-4" />
                </span>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
                  Offline Music Storage
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-white">Downloaded Tracks</h3>
              <p className="text-xs sm:text-sm text-neutral-300">
                Play offline anytime or export .wav audio files directly to your device storage.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-neutral-300">
                <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                <span>{downloadedTracks.length} tracks • {storageSummary.formatted}</span>
              </div>

              {downloadedTracks.length > 0 && (
                <>
                  <button
                    onClick={() => onPlayPlaylist(downloadedVirtualPlaylist, false)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1ed760] hover:bg-[#1db954] text-black font-extrabold text-xs shadow-md transition-all active:scale-95"
                    title="Play all downloaded tracks"
                  >
                    <Play className="w-3.5 h-3.5 fill-black ml-0.5" />
                    <span>Play All Offline</span>
                  </button>

                  <button
                    onClick={() => onPlayPlaylist(downloadedVirtualPlaylist, true)}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                    title="Shuffle downloaded tracks"
                    aria-label="Shuffle downloaded tracks"
                  >
                    <Shuffle className="w-4 h-4" />
                  </button>

                  {onClearAllDownloads && (
                    <button
                      onClick={() => {
                        if (typeof window !== 'undefined' && window.confirm('Are you sure you want to remove all downloaded songs from offline storage?')) {
                          onClearAllDownloads();
                        }
                      }}
                      className="p-2 rounded-full bg-white/5 hover:bg-rose-500/20 text-neutral-400 hover:text-rose-400 border border-white/10 transition-colors"
                      title="Clear all downloads to free space"
                      aria-label="Clear all downloads"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {downloadedTracks.length === 0 ? (
            <div className="text-center py-16 bg-white/[0.02] rounded-3xl border border-white/5 p-6 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto mb-2 border border-cyan-500/20">
                <Download className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-white">No songs downloaded yet</h4>
              <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto">
                Download songs to listen offline without internet data, or export high-quality .wav audio files to keep on your phone or laptop.
              </p>
              <button
                onClick={() => setFilter('all')}
                className="mt-2 px-5 py-2 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs inline-flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
              >
                <span>Browse All Songs to Download</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-white/5 bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden p-2">
              {downloadedTracks.map((track, idx) => {
                const isCurrent = currentTrack?.id === track.id;
                return (
                  <div
                    key={track.id}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.04] transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="text-xs font-mono text-neutral-500 w-5 text-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="relative w-11 h-11 rounded-lg overflow-hidden shrink-0 shadow-sm border border-white/10">
                        <img
                          src={track.coverUrl}
                          alt={track.title}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => {
                            if (isCurrent && isPlaying) {
                              onPauseTrack();
                            } else {
                              onPlayTrack(track);
                            }
                          }}
                          className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label={`Play ${track.title}`}
                        >
                          {isCurrent && isPlaying ? (
                            <Pause className="w-5 h-5 fill-white text-white" />
                          ) : (
                            <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                          )}
                        </button>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className={`font-bold text-sm truncate ${isCurrent ? 'text-[#1ed760]' : 'text-white'}`}>
                          {track.title}
                        </p>
                        <p className="text-xs text-neutral-400 truncate flex items-center gap-2">
                          <span>{track.artist}</span>
                          <span>•</span>
                          <span className="text-cyan-400 text-[10px] font-mono flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-[#1ed760]" />
                            Offline Ready
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-mono text-neutral-400 hidden sm:inline">
                        {formatDuration(track.duration)}
                      </span>

                      {/* Re-download / Export file */}
                      {onDownloadTrack && (
                        <button
                          onClick={() => onDownloadTrack(track)}
                          className="p-1.5 text-neutral-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                          title="Export .wav audio file again"
                          aria-label={`Export ${track.title}`}
                        >
                          <Download className="w-4 h-4 text-cyan-400" />
                        </button>
                      )}

                      {/* Toggle Like */}
                      <button
                        onClick={() => onToggleLike(track.id)}
                        className="p-1.5 rounded-full transition-colors"
                        aria-label="Like track"
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            likedTrackIds.has(track.id)
                              ? 'text-rose-500 fill-rose-500'
                              : 'text-neutral-400 hover:text-white'
                          }`}
                        />
                      </button>

                      {/* Remove download */}
                      {onRemoveDownload && (
                        <button
                          onClick={() => onRemoveDownload(track.id)}
                          className="p-1.5 text-neutral-400 hover:text-rose-400 rounded-full hover:bg-rose-500/10 transition-colors"
                          title="Remove from downloaded offline storage"
                          aria-label={`Remove ${track.title} download`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
