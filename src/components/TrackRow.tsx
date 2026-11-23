/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Heart,
  Share2,
  MoreHorizontal,
  Plus,
  ListPlus,
  User,
  Sparkles,
  Download,
  CheckCircle2,
  Loader2,
  Pencil,
} from 'lucide-react';
import { IndieTrack, formatDuration, Playlist } from '../utils/musicDiscovery';

interface TrackRowProps {
  track: IndieTrack;
  index: number;
  isPlaying: boolean;
  isCurrentTrack: boolean;
  isLiked: boolean;
  onPlay: (track: IndieTrack) => void;
  onPause: () => void;
  onToggleLike: (trackId: string, track?: IndieTrack) => void;
  onShare: (track: IndieTrack) => void;
  onAddToQueue: (track: IndieTrack) => void;
  onSelectArtist?: (artistId: string) => void;
  userPlaylists: Playlist[];
  onAddToPlaylist: (playlistId: string, trackId: string) => void;
  isDownloaded?: boolean;
  isDownloading?: boolean;
  onDownloadTrack?: (track: IndieTrack) => void;
  onEditMetadata?: (track: IndieTrack) => void;
  onSelectTag?: (tag: string) => void;
}

export const TrackRow: React.FC<TrackRowProps> = ({
  track,
  index,
  isPlaying,
  isCurrentTrack,
  isLiked,
  onPlay,
  onPause,
  onToggleLike,
  onShare,
  onAddToQueue,
  onSelectArtist,
  userPlaylists,
  onAddToPlaylist,
  isDownloaded = false,
  isDownloading = false,
  onDownloadTrack,
  onEditMetadata,
  onSelectTag,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const handlePlayClick = () => {
    if (isCurrentTrack && isPlaying) {
      onPause();
    } else {
      onPlay(track);
    }
  };

  return (
    <div
      className={`group relative flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
        isCurrentTrack
          ? 'bg-white/10 text-white'
          : 'hover:bg-white/5 text-neutral-300 hover:text-white'
      }`}
    >
      {/* Index or Play/Pause Button */}
      <div className="w-8 flex items-center justify-center shrink-0">
        <button
          onClick={handlePlayClick}
          className="flex items-center justify-center w-7 h-7 rounded-full text-white transition-transform active:scale-95"
          aria-label={
            isCurrentTrack && isPlaying
              ? `Pause ${track.title}`
              : `Play ${track.title}`
          }
        >
          {isCurrentTrack && isPlaying ? (
            <div className="flex items-end gap-0.5 h-3.5">
              <span className="w-1 bg-[#1ed760] h-3.5 animate-pulse rounded-full" />
              <span className="w-1 bg-[#1ed760] h-2 animate-pulse delay-75 rounded-full" />
              <span className="w-1 bg-[#1ed760] h-3 animate-pulse delay-150 rounded-full" />
            </div>
          ) : (
            <>
              <span className={`text-xs font-mono group-hover:hidden ${isCurrentTrack ? 'text-[#1ed760] font-bold' : 'text-neutral-400'}`}>
                {index + 1}
              </span>
              <Play className="w-4 h-4 fill-white hidden group-hover:block" />
            </>
          )}
        </button>
      </div>

      {/* Album Artwork & Title */}
      <div className="flex items-center gap-3 min-w-0 flex-1 sm:flex-[2]">
        <img
          src={track.coverUrl}
          alt={track.title}
          className="w-10 h-10 rounded-lg object-cover shadow-sm shrink-0 border border-white/5"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p
              className={`text-sm font-semibold truncate ${
                isCurrentTrack ? 'text-[#1ed760]' : 'text-white'
              }`}
            >
              {track.title}
            </p>
            {track.language === 'kannada' ? (
              <span className="text-[9px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.2 rounded-full shrink-0 border border-amber-500/30">
                ಕನ್ನಡ
              </span>
            ) : track.language === 'hindi' ? (
              <span className="text-[9px] bg-rose-500/20 text-rose-300 font-bold px-1.5 py-0.2 rounded-full shrink-0 border border-rose-500/30">
                हिन्दी
              </span>
            ) : null}
            {track.youtubeId || track.fullSongAvailable ? (
              <span className="text-[9px] bg-[#1ed760]/20 text-[#1ed760] font-bold px-1.5 py-0.2 rounded-full shrink-0 border border-[#1ed760]/30" title="Full Length Song Available">
                FULL SONG
              </span>
            ) : track.isSpotifyHit ? (
              <span className="text-[9px] bg-[#1ed760]/20 text-[#1ed760] font-bold px-1.5 py-0.2 rounded-full shrink-0 border border-[#1ed760]/30">
                SPOTIFY
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-400 truncate">
            <button
              onClick={() => onSelectArtist && onSelectArtist(track.artistId)}
              className="hover:underline hover:text-white transition-colors truncate"
            >
              {track.artist}
            </button>
            {track.addedBy && (
              <span className="text-[10px] bg-white/10 px-1.5 py-0.2 rounded text-neutral-300">
                Added by {track.addedBy}
              </span>
            )}
            {track.tags && track.tags.length > 0 && (
              <div className="hidden sm:inline-flex items-center gap-1 truncate">
                {track.tags.slice(0, 3).map((tag) => (
                  <button
                    key={`${track.id}-tag-${tag}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSelectTag) onSelectTag(tag);
                    }}
                    className={`text-[10px] px-1.5 py-0.2 rounded bg-sky-400/10 text-sky-300 border border-sky-400/20 truncate max-w-[95px] ${
                      onSelectTag ? 'hover:bg-sky-400/20 cursor-pointer' : 'cursor-default'
                    }`}
                    title={`#${tag}`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Album Name (hidden on small screens) */}
      <div className="hidden md:block flex-1 min-w-0 text-xs text-neutral-400 truncate">
        {track.album}
      </div>

      {/* Genre pill & Tag/Rarity meter */}
      <div className="hidden lg:flex items-center gap-2 flex-1 min-w-0">
        <span className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-white/5 border border-white/10 text-neutral-300 truncate max-w-[120px]">
          {track.genre}
        </span>
        {track.isSpotifyHit ? (
          <span
            className="text-[10px] font-bold text-[#1ed760] bg-[#1ed760]/15 border border-[#1ed760]/30 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0"
            title="Spotify Top Hit"
          >
            🔥 Top Hit
          </span>
        ) : (
          <span
            className="text-[10px] font-mono text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0"
            title="Underground rarity score"
          >
            <Sparkles className="w-2.5 h-2.5 text-purple-300" />
            {(track.obscurity * 100).toFixed(0)}% Indie
          </span>
        )}
      </div>

      {/* Actions: Like, Share, Duration, More Menu */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Like Button */}
        <button
          onClick={() => onToggleLike(track.id, track)}
          className={`p-1.5 rounded-full transition-colors ${
            isLiked
              ? 'text-rose-500 hover:text-rose-400'
              : 'text-neutral-400 opacity-75 sm:opacity-0 sm:group-hover:opacity-100 hover:text-white'
          }`}
          aria-label={isLiked ? `Unlike ${track.title}` : `Like ${track.title}`}
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-500' : ''}`} />
        </button>

        {/* Download Button */}
        {onDownloadTrack && (
          <button
            onClick={() => onDownloadTrack(track)}
            disabled={isDownloading}
            className={`p-1.5 rounded-full transition-colors ${
              isDownloaded
                ? 'text-[#1ed760] hover:text-[#1ed760]/80 opacity-100'
                : isDownloading
                ? 'text-neutral-400 opacity-100 cursor-wait'
                : 'text-neutral-400 opacity-0 group-hover:opacity-100 hover:text-white'
            }`}
            aria-label={isDownloaded ? `Downloaded ${track.title}` : `Download ${track.title}`}
            title={
              isDownloaded
                ? 'Downloaded to device & offline library'
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

        {/* Share Button */}
        <button
          onClick={() => onShare(track)}
          className="p-1.5 text-neutral-400 opacity-0 group-hover:opacity-100 hover:text-white rounded-full transition-colors"
          aria-label={`Share ${track.title}`}
        >
          <Share2 className="w-4 h-4" />
        </button>

        {/* Duration */}
        <span className="text-xs text-neutral-400 w-10 text-right font-mono">
          {formatDuration(track.duration)}
        </span>

        {/* Context Menu Button */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 text-neutral-400 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 hover:text-white rounded-full transition-colors cursor-pointer"
            aria-label={`More options for ${track.title}`}
            title={`Track options for ${track.title}`}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-8 z-30 w-56 bg-[#181a26] border border-white/15 rounded-xl shadow-2xl p-1.5 space-y-1 animate-fade-in text-xs">
              {onEditMetadata && (
                <button
                  type="button"
                  onClick={() => {
                    onEditMetadata(track);
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-white hover:bg-white/10 text-left transition-colors cursor-pointer font-medium"
                >
                  <Pencil className="w-4 h-4 text-sky-400" />
                  <span>Edit Metadata</span>
                </button>
              )}

              {onDownloadTrack && (
                <button
                  onClick={() => {
                    onDownloadTrack(track);
                    setMenuOpen(false);
                  }}
                  disabled={isDownloading}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-neutral-200 hover:text-white hover:bg-white/10 text-left transition-colors cursor-pointer"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#1ed760]" />
                      <span>Downloading audio...</span>
                    </>
                  ) : isDownloaded ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-[#1ed760]" />
                      <span>Downloaded (Ready Offline)</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 text-[#1ed760]" />
                      <span>Download Song (.wav)</span>
                    </>
                  )}
                </button>
              )}

              <button
                onClick={() => {
                  onAddToQueue(track);
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-neutral-200 hover:text-white hover:bg-white/10 text-left transition-colors"
              >
                <ListPlus className="w-4 h-4 text-neutral-400" />
                Add to Up Next Queue
              </button>

              {onSelectArtist && (
                <button
                  onClick={() => {
                    onSelectArtist(track.artistId);
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-neutral-200 hover:text-white hover:bg-white/10 text-left transition-colors"
                >
                  <User className="w-4 h-4 text-neutral-400" />
                  Go to Artist Profile
                </button>
              )}

              {userPlaylists.length > 0 && (
                <div className="border-t border-white/10 pt-1 mt-1">
                  <p className="px-3 py-1 text-[10px] uppercase font-bold text-neutral-400">
                    Add to Playlist
                  </p>
                  <div className="max-h-32 overflow-y-auto">
                    {userPlaylists.map((pl) => (
                      <button
                        key={pl.id}
                        onClick={() => {
                          onAddToPlaylist(pl.id, track.id);
                          setMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-white/10 text-left truncate"
                      >
                        <Plus className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span className="truncate">{pl.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
