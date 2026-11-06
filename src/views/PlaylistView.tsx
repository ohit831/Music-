/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Play,
  Pause,
  Shuffle,
  Share2,
  Users,
  Sparkles,
  Clock,
  Plus,
  Trash2,
  Check,
  Download,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { IndieTrack, Playlist, calculatePlaylistDuration } from '../utils/musicDiscovery';
import { TrackRow } from '../components/TrackRow';

interface PlaylistViewProps {
  playlist: Playlist;
  allTracks: IndieTrack[];
  currentTrack: IndieTrack | null;
  isPlaying: boolean;
  likedTrackIds: Set<string>;
  onPlayPlaylist: (playlist: Playlist, shuffle?: boolean) => void;
  onPlayTrack: (track: IndieTrack) => void;
  onPauseTrack: () => void;
  onToggleLike: (trackId: string) => void;
  onSharePlaylist: (playlist: Playlist) => void;
  onShareTrack: (track: IndieTrack) => void;
  onAddToQueue: (track: IndieTrack) => void;
  onSelectArtist: (artistId: string) => void;
  onRemoveTrackFromPlaylist?: (playlistId: string, trackId: string) => void;
  onAddTrackToPlaylist: (playlistId: string, trackId: string) => void;
  onDeletePlaylist?: (playlistId: string) => void;
  userPlaylists: Playlist[];
  downloadedTrackIds?: Set<string>;
  downloadingTrackIds?: Set<string>;
  onDownloadTrack?: (track: IndieTrack) => void;
  onDownloadPlaylist?: (tracks: IndieTrack[]) => void;
}

export const PlaylistView: React.FC<PlaylistViewProps> = ({
  playlist,
  allTracks,
  currentTrack,
  isPlaying,
  likedTrackIds,
  onPlayPlaylist,
  onPlayTrack,
  onPauseTrack,
  onToggleLike,
  onSharePlaylist,
  onShareTrack,
  onAddToQueue,
  onSelectArtist,
  onRemoveTrackFromPlaylist,
  onAddTrackToPlaylist,
  onDeletePlaylist,
  userPlaylists,
  downloadedTrackIds,
  downloadingTrackIds,
  onDownloadTrack,
  onDownloadPlaylist,
}) => {
  const [filterQuery, setFilterQuery] = useState('');

  // Resolve tracks in playlist
  const playlistTracks = playlist.trackIds
    .map((id) => allTracks.find((t) => t.id === id))
    .filter((t): t is IndieTrack => !!t);

  const allDownloaded =
    playlistTracks.length > 0 &&
    playlistTracks.every((t) => downloadedTrackIds?.has(t.id));

  const isAnyDownloading =
    playlistTracks.some((t) => downloadingTrackIds?.has(t.id));

  const displayedTracks = filterQuery
    ? playlistTracks.filter(
        (t) =>
          t.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
          t.artist.toLowerCase().includes(filterQuery.toLowerCase())
      )
    : playlistTracks;

  // Recommended tracks not yet in this playlist
  const recommendedTracks = allTracks
    .filter((t) => !playlist.trackIds.includes(t.id))
    .slice(0, 4);

  const totalDuration = calculatePlaylistDuration(playlistTracks);

  const isPlaylistActive =
    playlistTracks.some((t) => t.id === currentTrack?.id) && isPlaying;

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Playlist Hero Banner */}
      <div
        className={`relative rounded-3xl p-6 md:p-8 bg-gradient-to-tr ${playlist.coverGradient} border border-white/10 shadow-2xl overflow-hidden flex flex-col md:flex-row items-start md:items-end gap-6`}
      >
        {/* Cover Artwork */}
        <div className="w-36 h-36 md:w-48 md:h-48 rounded-2xl bg-black/40 backdrop-blur-md flex items-center justify-center text-6xl md:text-7xl shadow-2xl border border-white/20 shrink-0">
          <span>{playlist.coverEmoji}</span>
        </div>

        {/* Info */}
        <div className="space-y-3 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-white/80 bg-white/10 px-2.5 py-0.5 rounded-full">
              {playlist.isPersonalized ? 'Personalized Mix' : 'Playlist'}
            </span>
            {playlist.isCollaborative && (
              <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-[#1ed760] bg-[#1ed760]/20 px-2.5 py-0.5 rounded-full border border-[#1ed760]/30">
                <Users className="w-3 h-3" />
                Collaborative
              </span>
            )}
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-none drop-shadow-md">
            {playlist.title}
          </h1>

          <p className="text-sm md:text-base text-neutral-200 line-clamp-2 max-w-2xl leading-relaxed">
            {playlist.description}
          </p>

          <div className="flex items-center gap-2 text-xs md:text-sm text-neutral-300 font-medium">
            <span className="text-white font-bold">{playlist.owner}</span>
            <span>•</span>
            <span>{playlistTracks.length} tracks</span>
            <span>•</span>
            <span className="flex items-center gap-1 font-mono">
              <Clock className="w-3.5 h-3.5" />
              {totalDuration}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons Bar */}
      <div className="flex items-center justify-between gap-4 py-2">
        <div className="flex items-center gap-3">
          {/* Big Play Button */}
          <button
            onClick={() => onPlayPlaylist(playlist, false)}
            className="w-12 h-12 rounded-full bg-[#1ed760] hover:bg-[#1db954] hover:scale-105 active:scale-95 text-black flex items-center justify-center transition-all shadow-xl shadow-[#1ed760]/30"
            aria-label={isPlaylistActive ? 'Pause playlist' : 'Play playlist'}
          >
            {isPlaylistActive ? (
              <Pause className="w-6 h-6 fill-black" />
            ) : (
              <Play className="w-6 h-6 fill-black ml-0.5" />
            )}
          </button>

          {/* Shuffle Play */}
          <button
            onClick={() => onPlayPlaylist(playlist, true)}
            className="p-3 text-neutral-300 hover:text-white rounded-full hover:bg-white/10 transition-colors"
            title="Shuffle play"
            aria-label="Shuffle play"
          >
            <Shuffle className="w-5 h-5" />
          </button>

          {/* Share Playlist */}
          <button
            onClick={() => onSharePlaylist(playlist)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/10 transition-colors"
            aria-label="Share this playlist"
          >
            <Share2 className="w-4 h-4" />
            Share Soundwave
          </button>

          {/* Download Playlist Button */}
          {onDownloadPlaylist && playlistTracks.length > 0 && (
            <button
              onClick={() => onDownloadPlaylist(playlistTracks)}
              disabled={isAnyDownloading}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
                allDownloaded
                  ? 'bg-[#1ed760]/15 text-[#1ed760] border-[#1ed760]/40 hover:bg-[#1ed760]/25'
                  : isAnyDownloading
                  ? 'bg-white/10 text-neutral-300 border-white/10 cursor-wait'
                  : 'bg-white/10 hover:bg-white/15 text-white border-white/10'
              }`}
              title={
                allDownloaded
                  ? 'All songs in this playlist are downloaded offline'
                  : 'Download all songs in this playlist'
              }
              aria-label="Download all songs in this playlist"
            >
              {isAnyDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#1ed760]" />
                  <span>Downloading...</span>
                </>
              ) : allDownloaded ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#1ed760]" />
                  <span>Downloaded</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-[#1ed760]" />
                  <span>Download Playlist</span>
                </>
              )}
            </button>
          )}

          {/* Delete (if user created) */}
          {playlist.owner === 'You' && onDeletePlaylist && (
            <button
              onClick={() => onDeletePlaylist(playlist.id)}
              className="p-2.5 text-neutral-400 hover:text-rose-400 rounded-full hover:bg-white/10 transition-colors"
              title="Delete playlist"
              aria-label="Delete playlist"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter within playlist */}
        {playlistTracks.length > 3 && (
          <div className="relative w-48 hidden sm:block">
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Search in playlist..."
              className="w-full bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#1ed760]"
            />
          </div>
        )}
      </div>

      {/* Tracks Table */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-3">
        {/* Table Header */}
        <div className="flex items-center px-4 py-2 text-[11px] font-bold text-neutral-400 uppercase tracking-wider border-b border-white/10">
          <div className="w-8 text-center shrink-0">#</div>
          <div className="flex-1 sm:flex-[2]">Title</div>
          <div className="hidden md:block flex-1">Album</div>
          <div className="hidden lg:block flex-1">Genre & Rarity</div>
          <div className="w-20 text-right pr-2">
            <Clock className="w-3.5 h-3.5 inline" />
          </div>
        </div>

        {/* Track Rows */}
        {displayedTracks.length === 0 ? (
          <div className="text-center py-12 text-neutral-400 space-y-2">
            <p className="text-sm font-semibold text-white">No tracks in this playlist yet</p>
            <p className="text-xs text-neutral-400">
              Add some of the recommended indie tracks below!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5 mt-1">
            {displayedTracks.map((track, idx) => (
              <TrackRow
                key={track.id}
                track={track}
                index={idx}
                isPlaying={isPlaying}
                isCurrentTrack={currentTrack?.id === track.id}
                isLiked={likedTrackIds.has(track.id)}
                isDownloaded={downloadedTrackIds?.has(track.id)}
                isDownloading={downloadingTrackIds?.has(track.id)}
                onDownloadTrack={onDownloadTrack}
                onPlay={onPlayTrack}
                onPause={onPauseTrack}
                onToggleLike={onToggleLike}
                onShare={onShareTrack}
                onAddToQueue={onAddToQueue}
                onSelectArtist={onSelectArtist}
                userPlaylists={userPlaylists}
                onAddToPlaylist={onAddTrackToPlaylist}
              />
            ))}
          </div>
        )}
      </div>

      {/* Recommended Additions Section */}
      {recommendedTracks.length > 0 && (
        <div className="space-y-3 pt-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#1ed760]" />
            <h2 className="text-base font-bold text-white">Recommended for this Playlist</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recommendedTracks.map((rec) => (
              <div
                key={rec.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={rec.coverUrl}
                    alt={rec.title}
                    className="w-11 h-11 rounded-lg object-cover"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{rec.title}</p>
                    <p className="text-xs text-neutral-400 truncate">{rec.artist}</p>
                  </div>
                </div>

                <button
                  onClick={() => onAddTrackToPlaylist(playlist.id, rec.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/10 hover:bg-[#1ed760] hover:text-black text-white transition-all shrink-0"
                  aria-label={`Add ${rec.title} to playlist`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
