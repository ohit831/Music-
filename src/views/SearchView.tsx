/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Music,
  User,
  Disc3,
  Globe,
  Loader2,
  TrendingUp,
  Flame,
  Plus,
  Play,
  Pause,
} from 'lucide-react';
import {
  IndieTrack,
  IndieArtist,
  Playlist,
  filterIndieCatalog,
  searchOnlineSpotifyTracks,
  searchFullMusicAnywhere,
  formatListenersCount,
} from '../utils/musicDiscovery';
import { TrackRow } from '../components/TrackRow';

interface SearchViewProps {
  tracks: IndieTrack[];
  artists: IndieArtist[];
  playlists: Playlist[];
  currentTrack: IndieTrack | null;
  isPlaying: boolean;
  likedTrackIds: Set<string>;
  onPlayTrack: (track: IndieTrack) => void;
  onPauseTrack: () => void;
  onToggleLike: (trackId: string) => void;
  onShareTrack: (track: IndieTrack) => void;
  onAddToQueue: (track: IndieTrack) => void;
  onSelectArtist: (artistId: string) => void;
  onSelectPlaylist: (playlistId: string) => void;
  userPlaylists: Playlist[];
  onAddToPlaylist: (playlistId: string, trackId: string) => void;
  onAddTrackToLibrary?: (track: IndieTrack) => void;
  onOpenAddMusic?: () => void;
  downloadedTrackIds?: Set<string>;
  downloadingTrackIds?: Set<string>;
  onDownloadTrack?: (track: IndieTrack) => void;
}

const GENRE_CARDS = [
  { name: '90s Golden Era (90s ಗೀತೆಗಳು & Bollywood)', gradient: 'from-amber-600 via-rose-700 to-indigo-950', emoji: '📻', tag: '90s' },
  { name: 'Kannada Hits (ಕನ್ನಡ)', gradient: 'from-amber-600 via-yellow-700 to-stone-950', emoji: '🐘', tag: 'kannada' },
  { name: 'Bollywood & Hindi (हिन्दी)', gradient: 'from-orange-600 via-rose-700 to-indigo-950', emoji: '🪕', tag: 'hindi' },
  { name: 'Today\'s Top Hits', gradient: 'from-emerald-600 to-teal-900', emoji: '🔥', tag: 'hit' },
  { name: 'New Releases 2026', gradient: 'from-amber-500 to-orange-800', emoji: '✨', tag: 'new' },
  { name: 'Pop & Viral', gradient: 'from-pink-600 to-rose-900', emoji: '🍭', tag: 'pop' },
  { name: 'Indie Rock', gradient: 'from-red-600 to-stone-900', emoji: '⚡', tag: 'rock' },
  { name: 'Hip-Hop', gradient: 'from-amber-600 to-yellow-900', emoji: '🎤', tag: 'hip-hop' },
  { name: 'R&B & Soul', gradient: 'from-purple-600 to-indigo-950', emoji: '🌙', tag: 'r&b' },
  { name: 'Bedroom Lo-Fi', gradient: 'from-orange-600 to-rose-900', emoji: '📼', tag: 'lo-fi' },
  { name: 'Dream Pop', gradient: 'from-blue-600 to-indigo-900', emoji: '🌫️', tag: 'dream pop' },
  { name: 'Electronic & Hyperpop', gradient: 'from-cyan-600 to-blue-900', emoji: '🎛️', tag: 'electronic' },
];

const TRENDING_SEARCHES = [
  'Singara Siriye',
  'Kesariya',
  'Arijit Singh',
  'KGF 2',
  'Varaha Roopam',
  'Sapta Sagaradaache Ello',
  'Tum Hi Ho',
  'Chaleya',
  'Ra Ra Rakkamma',
  'Anisuthide',
  'Tauba Tauba',
  'Anuv Jain',
  'Belageddu',
  'Sonu Nigam',
  'Lady Gaga',
  'Sabrina Carpenter',
  'Billie Eilish',
  'Charli xcx',
  'The Weeknd',
  'Taylor Swift',
];

export const SearchView: React.FC<SearchViewProps> = ({
  tracks,
  artists,
  playlists,
  currentTrack,
  isPlaying,
  likedTrackIds,
  onPlayTrack,
  onPauseTrack,
  onToggleLike,
  onShareTrack,
  onAddToQueue,
  onSelectArtist,
  onSelectPlaylist,
  userPlaylists,
  onAddToPlaylist,
  onAddTrackToLibrary,
  onOpenAddMusic,
  downloadedTrackIds,
  downloadingTrackIds,
  onDownloadTrack,
}) => {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | '90s' | 'kannada' | 'hindi' | 'spotify' | 'indie' | 'online'>('all');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  // Online global search state
  const [onlineResults, setOnlineResults] = useState<IndieTrack[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const searchTimeoutRef = useRef<number | null>(null);

  // Filter catalog tracks
  const catalogFiltered = filterIndieCatalog(query, selectedGenre, tracks);

  const filteredTracks = catalogFiltered.filter((track) => {
    if (activeTab === '90s') {
      return track.id.includes('90s') || (track.tags && track.tags.includes('90s')) || (track.releaseYear >= 1985 && track.releaseYear <= 2001);
    }
    if (activeTab === 'kannada') return track.language === 'kannada' || track.id.startsWith('kn-');
    if (activeTab === 'hindi') return track.language === 'hindi' || track.id.startsWith('hn-');
    if (activeTab === 'spotify') return track.isSpotifyHit || (track.popularity && track.popularity > 80);
    if (activeTab === 'indie') return track.obscurity > 0.5;
    return true;
  });

  const filteredArtists = artists.filter(
    (a) =>
      !query ||
      a.name.toLowerCase().includes(query.toLowerCase()) ||
      a.genres.some((g) => g.toLowerCase().includes(query.toLowerCase()))
  );

  // Trigger online global search when typing or in online tab
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setOnlineResults([]);
      setIsSearchingOnline(false);
      return;
    }

    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = window.setTimeout(async () => {
      setIsSearchingOnline(true);
      const results = await searchFullMusicAnywhere(query, 16);
      setOnlineResults(results);
      setIsSearchingOnline(false);
    }, 450);

    return () => {
      if (searchTimeoutRef.current) {
        window.clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  const handleManualSearchOnline = async () => {
    if (!query.trim()) return;
    setIsSearchingOnline(true);
    const results = await searchFullMusicAnywhere(query, 20);
    setOnlineResults(results);
    setIsSearchingOnline(false);
    setActiveTab('online');
  };

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      {/* Search Input Bar & Add Music Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-3xl">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-400">
            <Search className="w-5 h-5 text-[#1ed760]" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search any song, artist, film, Kannada, Hindi, or global track..."
            className="w-full bg-[#1e1e24] border border-white/10 rounded-full pl-12 pr-10 py-3.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#1ed760] focus:ring-1 focus:ring-[#1ed760] transition-all shadow-lg"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setOnlineResults([]);
              }}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-neutral-400 hover:text-white"
              aria-label="Clear search input"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleManualSearchOnline}
            disabled={!query.trim() || isSearchingOnline}
            className="flex items-center gap-2 px-4 py-3.5 rounded-full bg-[#1ed760]/20 hover:bg-[#1ed760]/30 border border-[#1ed760]/40 text-[#1ed760] text-xs font-bold transition-all disabled:opacity-40"
            title="Search full songs from YouTube and worldwide cloud"
          >
            {isSearchingOnline ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Globe className="w-4 h-4" />
            )}
            <span>Search Worldwide</span>
          </button>

          {onOpenAddMusic && (
            <button
              onClick={onOpenAddMusic}
              className="flex items-center gap-2 px-4 py-3.5 rounded-full bg-gradient-to-r from-emerald-500 to-[#1ed760] text-black text-xs font-extrabold shadow-lg hover:brightness-110 transition-all active:scale-95 shrink-0"
              title="Add any song from YouTube or direct audio link"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Add from Link</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-1.5 rounded-full text-xs md:text-sm font-semibold transition-colors shrink-0 ${
            activeTab === 'all'
              ? 'bg-white text-black'
              : 'bg-white/10 text-neutral-300 hover:bg-white/15'
          }`}
        >
          All Songs ({tracks.length})
        </button>
        <button
          onClick={() => setActiveTab('90s')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs md:text-sm font-semibold transition-colors shrink-0 ${
            activeTab === '90s'
              ? 'bg-gradient-to-r from-amber-400 to-rose-400 text-black font-extrabold shadow-md'
              : 'bg-white/10 text-neutral-300 hover:bg-white/15'
          }`}
        >
          <span>📻</span>
          90s Nostalgia
        </button>
        <button
          onClick={() => setActiveTab('kannada')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs md:text-sm font-semibold transition-colors shrink-0 ${
            activeTab === 'kannada'
              ? 'bg-amber-400 text-black font-bold'
              : 'bg-white/10 text-neutral-300 hover:bg-white/15'
          }`}
        >
          <span>🐘</span>
          Kannada (ಕನ್ನಡ)
        </button>
        <button
          onClick={() => setActiveTab('hindi')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs md:text-sm font-semibold transition-colors shrink-0 ${
            activeTab === 'hindi'
              ? 'bg-rose-500 text-white font-bold'
              : 'bg-white/10 text-neutral-300 hover:bg-white/15'
          }`}
        >
          <span>🪕</span>
          Hindi (हिन्दी)
        </button>
        <button
          onClick={() => setActiveTab('spotify')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs md:text-sm font-semibold transition-colors shrink-0 ${
            activeTab === 'spotify'
              ? 'bg-[#1ed760] text-black font-bold'
              : 'bg-white/10 text-neutral-300 hover:bg-white/15'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          Spotify Top Hits
        </button>
        <button
          onClick={() => setActiveTab('indie')}
          className={`px-4 py-1.5 rounded-full text-xs md:text-sm font-semibold transition-colors shrink-0 ${
            activeTab === 'indie'
              ? 'bg-purple-600 text-white font-bold'
              : 'bg-white/10 text-neutral-300 hover:bg-white/15'
          }`}
        >
          Indie Gems
        </button>
        {onlineResults.length > 0 && (
          <button
            onClick={() => setActiveTab('online')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs md:text-sm font-semibold transition-colors shrink-0 ${
              activeTab === 'online'
                ? 'bg-cyan-500 text-black font-bold'
                : 'bg-white/10 text-neutral-300 hover:bg-white/15'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Global Cloud Results ({onlineResults.length})
          </button>
        )}
      </div>

      {/* Trending Search Suggestions */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-neutral-400 mr-1 flex items-center gap-1">
          <TrendingUp className="w-3.5 h-3.5 text-[#1ed760]" />
          Trending:
        </span>
        {TRENDING_SEARCHES.map((term) => (
          <button
            key={term}
            onClick={() => setQuery(term)}
            className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-xs rounded-full text-neutral-300 hover:text-white transition-colors"
          >
            {term}
          </button>
        ))}
      </div>

      {/* Genre Explorer Cards (when no query) */}
      {!query && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Browse Genres & Spotify Hits</h2>
            {selectedGenre && (
              <button
                onClick={() => setSelectedGenre(null)}
                className="text-xs text-[#1ed760] hover:underline"
              >
                Clear Filter ({selectedGenre})
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {GENRE_CARDS.map((item) => {
              const isSelected = selectedGenre === item.name;
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    setSelectedGenre(selectedGenre === item.name ? null : item.name);
                    if (item.name === "Today's Top Hits") {
                      setActiveTab('spotify');
                    }
                  }}
                  className={`p-3.5 rounded-2xl bg-gradient-to-br ${item.gradient} text-left flex flex-col justify-between h-28 shadow-lg transition-transform hover:scale-105 active:scale-95 border ${
                    isSelected ? 'ring-2 ring-white border-white' : 'border-white/10'
                  }`}
                >
                  <span className="text-2xl">{item.emoji}</span>
                  <span className="text-xs font-bold text-white leading-tight">
                    {item.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Matched Artists */}
      {query && filteredArtists.length > 0 && activeTab !== 'online' && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <User className="w-4 h-4 text-[#1ed760]" />
            Artists ({filteredArtists.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {filteredArtists.map((artist) => (
              <div
                key={artist.id}
                onClick={() => onSelectArtist(artist.id)}
                className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl cursor-pointer flex items-center gap-3 transition-colors"
              >
                <img
                  src={artist.coverUrl}
                  alt={artist.name}
                  className="w-11 h-11 rounded-full object-cover shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{artist.name}</p>
                  <p className="text-[11px] text-[#1ed760] font-mono truncate">
                    {formatListenersCount(artist.monthlyListeners)} monthly
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Online Global Search Results (if available or active) */}
      {(activeTab === 'online' || (query && onlineResults.length > 0)) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-400" />
              <h2 className="text-lg font-bold text-white">
                Global Online Songs (Live Stream Previews)
              </h2>
              {isSearchingOnline && (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              )}
            </div>
            <span className="text-xs text-neutral-400">
              {onlineResults.length} tracks found online
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {onlineResults.map((onlineTrk) => {
              const isThisPlaying = currentTrack?.id === onlineTrk.id && isPlaying;
              return (
                <div
                  key={onlineTrk.id}
                  onClick={() => onPlayTrack(onlineTrk)}
                  className="group flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-cyan-500/30 rounded-2xl transition-all cursor-pointer"
                >
                  <div className="relative shrink-0">
                    <img
                      src={onlineTrk.coverUrl}
                      alt={onlineTrk.title}
                      className="w-14 h-14 rounded-xl object-cover"
                    />
                    <button
                      className={`absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center transition-opacity ${
                        isThisPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                      aria-label={`Play ${onlineTrk.title}`}
                    >
                      {isThisPlaying ? (
                        <Pause className="w-5 h-5 fill-cyan-400 text-cyan-400" />
                      ) : (
                        <Play className="w-5 h-5 fill-white text-white" />
                      )}
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-white truncate">{onlineTrk.title}</p>
                      <span className="text-[9px] bg-cyan-500/20 text-cyan-300 font-bold px-1.5 py-0.5 rounded-full shrink-0">
                        CLOUD
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 truncate">{onlineTrk.artist}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-neutral-400">{onlineTrk.genre}</span>
                      <span className="text-[10px] text-neutral-500">•</span>
                      <span className="text-[10px] text-neutral-400">{onlineTrk.album}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onAddTrackToLibrary) {
                        onAddTrackToLibrary(onlineTrk);
                      } else {
                        onPlayTrack(onlineTrk);
                      }
                    }}
                    className="p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-colors shrink-0"
                    title="Add to My Library"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Track Results */}
      {activeTab !== 'online' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Music className="w-4 h-4 text-[#1ed760]" />
              Songs ({filteredTracks.length})
            </h2>
          </div>

          {filteredTracks.length === 0 ? (
            <div className="text-center py-12 bg-white/5 rounded-3xl border border-dashed border-white/10 text-neutral-400 space-y-3">
              <Disc3 className="w-10 h-10 mx-auto opacity-30 text-[#1ed760]" />
              <p className="text-sm font-semibold text-white">No local catalog tracks match "{query}"</p>
              <p className="text-xs text-neutral-400">
                You can search all songs worldwide in the global cloud library!
              </p>
              <button
                onClick={handleManualSearchOnline}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1ed760] text-black font-bold text-xs hover:bg-[#1db954] transition-all shadow-md"
              >
                <Globe className="w-4 h-4" />
                Search Online Music Cloud
              </button>
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-3 divide-y divide-white/5">
              {filteredTracks.map((track, idx) => (
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
                  onAddToPlaylist={onAddToPlaylist}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
