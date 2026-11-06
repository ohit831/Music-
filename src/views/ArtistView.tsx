/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Play,
  Heart,
  Check,
  Disc3,
  ExternalLink,
  MapPin,
  Sparkles,
  Sliders,
  Volume2,
} from 'lucide-react';
import { IndieArtist, IndieTrack, Playlist } from '../utils/musicDiscovery';
import { TrackRow } from '../components/TrackRow';

interface ArtistViewProps {
  artist: IndieArtist;
  allTracks: IndieTrack[];
  allArtists: IndieArtist[];
  currentTrack: IndieTrack | null;
  isPlaying: boolean;
  likedTrackIds: Set<string>;
  onPlayTrack: (track: IndieTrack) => void;
  onPauseTrack: () => void;
  onToggleLike: (trackId: string) => void;
  onShareTrack: (track: IndieTrack) => void;
  onAddToQueue: (track: IndieTrack) => void;
  onSelectArtist: (artistId: string) => void;
  userPlaylists: Playlist[];
  onAddToPlaylist: (playlistId: string, trackId: string) => void;
  downloadedTrackIds?: Set<string>;
  downloadingTrackIds?: Set<string>;
  onDownloadTrack?: (track: IndieTrack) => void;
}

export const ArtistView: React.FC<ArtistViewProps> = ({
  artist,
  allTracks,
  allArtists,
  currentTrack,
  isPlaying,
  likedTrackIds,
  onPlayTrack,
  onPauseTrack,
  onToggleLike,
  onShareTrack,
  onAddToQueue,
  onSelectArtist,
  userPlaylists,
  onAddToPlaylist,
  downloadedTrackIds,
  downloadingTrackIds,
  onDownloadTrack,
}) => {
  const [isFollowing, setIsFollowing] = useState(false);

  const artistTracks = allTracks.filter((t) => t.artistId === artist.id || t.artist === artist.name);
  const relatedArtists = allArtists
    .filter(
      (a) =>
        a.id !== artist.id &&
        a.genres.some((g) => artist.genres.includes(g))
    )
    .slice(0, 4);

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      {/* Artist Hero Header */}
      <div className="relative rounded-3xl overflow-hidden min-h-[260px] md:min-h-[320px] flex items-end p-6 md:p-8 bg-neutral-900 border border-white/10 shadow-2xl">
        {/* Cover Background with gradient overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src={artist.coverUrl}
            alt={artist.name}
            className="w-full h-full object-cover opacity-40 scale-105 filter blur-xs"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#101014] via-[#101014]/60 to-transparent" />
        </div>

        {/* Content */}
        <div className="relative z-10 space-y-3 max-w-3xl">
          <div className="flex items-center gap-2">
            {artist.verified && (
              <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider bg-[#1ed760] text-black px-2.5 py-0.5 rounded-full">
                <Check className="w-3 h-3 stroke-[3]" />
                Verified Indie Artist
              </span>
            )}
            <span className="text-xs text-neutral-300 flex items-center gap-1 font-medium bg-black/40 px-2.5 py-0.5 rounded-full border border-white/10">
              <MapPin className="w-3 h-3 text-rose-400" />
              {artist.location}
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight drop-shadow-lg">
            {artist.name}
          </h1>

          <div className="flex items-center gap-4 text-xs md:text-sm text-neutral-300 font-medium">
            <span className="text-white font-bold font-mono">
              {artist.monthlyListeners.toLocaleString()} monthly listeners
            </span>
            <span>•</span>
            <div className="flex gap-1.5">
              {artist.genres.map((g) => (
                <span key={g} className="text-neutral-400">
                  {g}
                </span>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-2">
            {artistTracks.length > 0 && (
              <button
                onClick={() => onPlayTrack(artistTracks[0])}
                className="w-12 h-12 rounded-full bg-[#1ed760] hover:bg-[#1db954] hover:scale-105 active:scale-95 text-black flex items-center justify-center transition-all shadow-xl shadow-[#1ed760]/30"
                aria-label={`Play top track by ${artist.name}`}
              >
                <Play className="w-6 h-6 fill-black ml-0.5" />
              </button>
            )}

            <button
              onClick={() => setIsFollowing(!isFollowing)}
              className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all border ${
                isFollowing
                  ? 'border-[#1ed760] bg-[#1ed760]/20 text-[#1ed760]'
                  : 'border-white/20 bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>

            {artist.bandcampUrl && (
              <a
                href={artist.bandcampUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-semibold bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/10 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Bandcamp
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Top Tracks */}
      <div className="space-y-3">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span>Popular Releases</span>
          <span className="text-xs text-neutral-400 font-normal">({artistTracks.length})</span>
        </h2>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-3 divide-y divide-white/5">
          {artistTracks.map((track, idx) => (
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
              userPlaylists={userPlaylists}
              onAddToPlaylist={onAddToPlaylist}
            />
          ))}
        </div>
      </div>

      {/* Studio Gear & Liner Specs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-[#1ed760]">
            <Disc3 className="w-5 h-5" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Studio Gear & Recording Setup
            </h2>
          </div>
          <p className="text-sm text-neutral-300 leading-relaxed font-mono bg-black/40 p-4 rounded-2xl border border-white/5">
            {artist.recordingGear}
          </p>
          <p className="text-xs text-neutral-400 leading-relaxed">
            All tracks mastered for authentic warmth, harmonic tape flutter, and dynamic response.
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-[#1ed760]">
            <Sparkles className="w-5 h-5" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Artist Story & Aesthetic
            </h2>
          </div>
          <p className="text-sm text-neutral-300 leading-relaxed">
            {artist.bio}
          </p>
        </div>
      </div>

      {/* Related Artists */}
      {relatedArtists.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">Fans Also Like</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {relatedArtists.map((rel) => (
              <div
                key={rel.id}
                onClick={() => onSelectArtist(rel.id)}
                className="group p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl cursor-pointer text-center flex flex-col items-center transition-colors"
              >
                <img
                  src={rel.coverUrl}
                  alt={rel.name}
                  className="w-24 h-24 rounded-full object-cover mb-3 group-hover:border-2 group-hover:border-[#1ed760] transition-all"
                />
                <h3 className="text-sm font-bold text-white truncate w-full">{rel.name}</h3>
                <p className="text-xs text-neutral-400 truncate w-full">{rel.location}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
