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
  Tv,
  Sparkles,
  Zap,
  Layers,
  ListPlus,
  Share2,
  History,
  Trash2,
} from 'lucide-react';
import {
  IndieTrack,
  IndieArtist,
  Playlist,
  filterIndieCatalog,
  searchFullMusicAnywhere,
  formatListenersCount,
} from '../utils/musicDiscovery';
import { TrackRow } from '../components/TrackRow';
import {
  clearSearchHistory,
  getSearchShortcuts,
  recordSearchHistory,
  removeSearchShortcut,
  SearchHistoryEntry,
  subscribeSearchHistory,
} from '../utils/searchHistory';

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
  onEditMetadata?: (track: IndieTrack) => void;
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
  'kannada',
  'kannada all songs',
  'kannada jukebox album',
  'KGF 2',
  'Varaha Roopam',
  'hindi all songs',
  'Arijit Singh album',
  'Kesariya',
  'Sapta Sagaradaache Ello',
  'Tum Hi Ho',
  'Chaleya',
  'Ra Ra Rakkamma',
  'Anisuthide',
  'Mungaru Male',
  'Tauba Tauba',
  'Sonu Nigam Kannada Hits',
  'Belageddu',
  'Dr Rajkumar All Songs',
  '90s Kannada Golden Hits',
  '90s Bollywood Evergreen',
  'Gym Motivation Workout Beats',
  'Lady Gaga',
  'The Weeknd',
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
  onEditMetadata,
}) => {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'youtube' | 'kannada' | 'hindi' | '90s' | 'spotify' | 'indie'>('all');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  // Online YouTube global search state with unlimited pagination
  const [onlineResults, setOnlineResults] = useState<IndieTrack[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [currentSearchTerm, setCurrentSearchTerm] = useState('');
  const [searchShortcuts, setSearchShortcuts] = useState<SearchHistoryEntry[]>(() => getSearchShortcuts(10));
  const searchTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const sync = () => setSearchShortcuts(getSearchShortcuts(10));
    sync();
    return subscribeSearchHistory(sync);
  }, []);

  // Execute YouTube search with deduplication & pagination
  const executeYouTubeSearch = async (term: string, pageNum = 1, append = false, recordShortcut = false) => {
    const q = term.trim();
    if (!q) {
      setOnlineResults([]);
      setIsSearchingOnline(false);
      return;
    }

    if (recordShortcut) {
      recordSearchHistory(q, 'search_view');
    }

    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsSearchingOnline(true);
      setPage(1);
    }
    setCurrentSearchTerm(q);

    try {
      const results = await searchFullMusicAnywhere(q, 35, pageNum);
      if (append) {
        setOnlineResults((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newItems = results.filter((r) => !existingIds.has(r.id));
          return [...prev, ...newItems];
        });
        setPage(pageNum);
      } else {
        setOnlineResults(results);
        setPage(1);
      }
      setHasMore(results.length >= 15);
    } catch (err) {
      console.warn('YouTube search notice:', err);
    } finally {
      setIsSearchingOnline(false);
      setIsLoadingMore(false);
    }
  };

  const handleLoadMoreYouTube = () => {
    if (isLoadingMore) return;
    const term = currentSearchTerm || query || (activeTab === 'kannada' ? 'kannada' : activeTab === 'hindi' ? 'hindi' : 'kannada all songs album jukebox');
    executeYouTubeSearch(term, page + 1, true);
  };

  // Filter catalog tracks
  const catalogFiltered = filterIndieCatalog(query, selectedGenre, tracks);

  const filteredTracks = catalogFiltered.filter((track) => {
    if (activeTab === '90s') {
      return (
        track.id.includes('90s') ||
        (track.tags && track.tags.includes('90s')) ||
        (track.releaseYear >= 1985 && track.releaseYear <= 2001)
      );
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

  // Trigger online YouTube search when typing
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      if (activeTab === 'youtube' && onlineResults.length === 0) {
        executeYouTubeSearch('kannada all songs album jukebox', 1, false);
      } else if (activeTab === 'kannada' && onlineResults.length === 0) {
        executeYouTubeSearch('kannada all songs album jukebox', 1, false);
      } else if (activeTab === 'hindi' && onlineResults.length === 0) {
        executeYouTubeSearch('hindi all songs album jukebox', 1, false);
      }
      return;
    }

    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = window.setTimeout(() => {
      executeYouTubeSearch(query, 1, false, true);
    }, 450);

    return () => {
      if (searchTimeoutRef.current) {
        window.clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, activeTab]);

  const handleManualSearchOnline = () => {
    if (!query.trim()) return;
    executeYouTubeSearch(query, 1, false, true);
    setActiveTab('youtube');
  };

  const formatLength = (sec: number) => {
    if (!sec || isNaN(sec)) return '3:45';
    if (sec >= 3600) {
      const hrs = Math.floor(sec / 3600);
      const mins = Math.floor((sec % 3600) / 60);
      return `${hrs}h ${mins}m`;
    }
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-8 pb-16 animate-fade-in">
      {/* Search Input Bar & Add Music Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-4xl">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-400">
            <Search className="w-5 h-5 text-[#1ed760]" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search all songs, albums, Kannada, Hindi, Arijit, Dr. Rajkumar, gym beats..."
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
            className="flex items-center gap-2 px-4 py-3.5 rounded-full bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-rose-300 hover:text-white text-xs font-bold transition-all disabled:opacity-40 cursor-pointer shadow-sm"
            title="Search unlimited full songs and albums from YouTube"
          >
            {isSearchingOnline ? (
              <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
            ) : (
              <Zap className="w-4 h-4 fill-red-400 text-red-400" />
            )}
            <span>Search YouTube ⚡</span>
          </button>

          {onOpenAddMusic && (
            <button
              onClick={onOpenAddMusic}
              className="flex items-center gap-2 px-4 py-3.5 rounded-full bg-gradient-to-r from-emerald-500 to-[#1ed760] text-black text-xs font-extrabold shadow-lg hover:brightness-110 transition-all active:scale-95 shrink-0 cursor-pointer"
              title="Add any song from YouTube or direct audio link"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Add Song Link</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-1.5 rounded-full text-xs md:text-sm font-semibold transition-colors shrink-0 cursor-pointer ${
            activeTab === 'all'
              ? 'bg-white text-black font-extrabold shadow-sm'
              : 'bg-white/10 text-neutral-300 hover:bg-white/15'
          }`}
        >
          All Songs ({tracks.length})
        </button>

        <button
          onClick={() => {
            setActiveTab('youtube');
            if (onlineResults.length === 0) {
              executeYouTubeSearch(query || 'kannada all songs album jukebox', 1, false);
            }
          }}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs md:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
            activeTab === 'youtube'
              ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-500 text-white font-extrabold shadow-lg shadow-red-600/30 ring-2 ring-red-400'
              : 'bg-red-500/15 text-rose-300 hover:bg-red-500/25 border border-red-500/30'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          <span>YouTube Songs & Albums 🔴</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('kannada');
            executeYouTubeSearch('kannada all songs album jukebox', 1, false);
          }}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs md:text-sm font-semibold transition-colors shrink-0 cursor-pointer ${
            activeTab === 'kannada'
              ? 'bg-amber-400 text-black font-extrabold shadow-md'
              : 'bg-white/10 text-neutral-300 hover:bg-white/15'
          }`}
        >
          <span>🐘</span>
          Kannada (ಕನ್ನಡ)
        </button>

        <button
          onClick={() => {
            setActiveTab('hindi');
            executeYouTubeSearch('hindi all songs album jukebox', 1, false);
          }}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs md:text-sm font-semibold transition-colors shrink-0 cursor-pointer ${
            activeTab === 'hindi'
              ? 'bg-rose-500 text-white font-extrabold shadow-md'
              : 'bg-white/10 text-neutral-300 hover:bg-white/15'
          }`}
        >
          <span>🪕</span>
          Hindi (हिन्दी)
        </button>

        <button
          onClick={() => setActiveTab('90s')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs md:text-sm font-semibold transition-colors shrink-0 cursor-pointer ${
            activeTab === '90s'
              ? 'bg-gradient-to-r from-amber-400 to-rose-400 text-black font-extrabold shadow-md'
              : 'bg-white/10 text-neutral-300 hover:bg-white/15'
          }`}
        >
          <span>📻</span>
          90s Nostalgia
        </button>

        <button
          onClick={() => setActiveTab('spotify')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs md:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
            activeTab === 'spotify'
              ? 'bg-gradient-to-r from-emerald-500 to-[#1ed760] text-black font-extrabold shadow-lg shadow-emerald-500/25 ring-2 ring-[#1ed760]'
              : 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          Spotify Hits & Charts 🟢
        </button>

        <button
          onClick={() => setActiveTab('indie')}
          className={`px-4 py-1.5 rounded-full text-xs md:text-sm font-semibold transition-colors shrink-0 cursor-pointer ${
            activeTab === 'indie'
              ? 'bg-purple-600 text-white font-bold'
              : 'bg-white/10 text-neutral-300 hover:bg-white/15'
          }`}
        >
          Indie Gems
        </button>
      </div>

      {/* Search History Shortcuts Bar */}
      {searchShortcuts.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#1ed760] flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" />
              <span>Your Search Shortcuts (Quick Jump)</span>
            </span>
            <button
              type="button"
              onClick={() => clearSearchHistory()}
              className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear History</span>
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {searchShortcuts.map((entry) => (
              <div
                key={`sv-sc-${entry.normalized}`}
                className="inline-flex items-center rounded-full bg-[#1ed760]/10 hover:bg-[#1ed760]/20 border border-[#1ed760]/30 text-xs text-white transition-all"
              >
                <button
                  type="button"
                  onClick={() => {
                    setQuery(entry.query);
                    executeYouTubeSearch(entry.query, 1, false, true);
                  }}
                  className="flex items-center gap-1.5 pl-3 pr-1.5 py-1 font-semibold cursor-pointer"
                >
                  <span>{entry.query}</span>
                  {entry.count > 1 && (
                    <span className="text-[10px] font-mono text-[#1ed760]">{entry.count}×</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => removeSearchShortcut(entry.query)}
                  className="pr-2.5 pl-0.5 py-1 text-neutral-400 hover:text-rose-400 cursor-pointer"
                  aria-label={`Remove ${entry.query} from search shortcuts`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trending Search Suggestions */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-neutral-400 mr-1 flex items-center gap-1">
          <TrendingUp className="w-3.5 h-3.5 text-[#1ed760]" />
          Trending:
        </span>
        {TRENDING_SEARCHES.map((term) => (
          <button
            key={term}
            onClick={() => {
              setQuery(term);
              executeYouTubeSearch(term, 1, false, true);
            }}
            className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-xs rounded-full text-neutral-300 hover:text-white transition-colors cursor-pointer active:scale-95"
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
                    if (item.tag === 'kannada') {
                      setActiveTab('kannada');
                      executeYouTubeSearch('kannada all songs album jukebox', 1, false);
                    } else if (item.tag === 'hindi') {
                      setActiveTab('hindi');
                      executeYouTubeSearch('hindi all songs album jukebox', 1, false);
                    } else if (item.name === "Today's Top Hits") {
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
      {query && filteredArtists.length > 0 && activeTab !== 'youtube' && (
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

      {/* YouTube Full Songs & Unlimited Albums Section */}
      {(activeTab === 'youtube' || activeTab === 'kannada' || activeTab === 'hindi' || onlineResults.length > 0) && (
        <div className="space-y-4 bg-gradient-to-b from-red-950/20 via-black/40 to-transparent p-4 sm:p-6 rounded-3xl border border-red-500/20 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-md shadow-red-600/40 shrink-0">
                <Play className="w-4 h-4 fill-white ml-0.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-extrabold text-white">
                    YouTube Full Songs & Albums
                  </h2>
                  <span className="text-[10px] font-mono bg-red-500/20 text-rose-300 px-2 py-0.5 rounded-full border border-red-500/30 font-bold">
                    UNLIMITED
                  </span>
                </div>
                <p className="text-xs text-neutral-400">
                  Full audio tracks & complete albums directly from YouTube without cuts
                </p>
              </div>
              {isSearchingOnline && (
                <Loader2 className="w-4 h-4 animate-spin text-red-400 shrink-0" />
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-300 bg-white/5 px-3 py-1 rounded-full border border-white/10 font-mono">
                {onlineResults.length} tracks & albums loaded
              </span>
            </div>
          </div>

          {/* YouTube Tracks & Albums Grid */}
          {onlineResults.length === 0 && isSearchingOnline ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-neutral-400">
              <Loader2 className="w-8 h-8 animate-spin text-red-500" />
              <p className="text-sm font-semibold text-white">
                Discovering full songs and albums from YouTube...
              </p>
            </div>
          ) : onlineResults.length === 0 ? (
            <div className="py-10 text-center text-neutral-400 space-y-3">
              <p className="text-sm text-neutral-300">
                Ready to stream unlimited Kannada, Bollywood & Global music from YouTube.
              </p>
              <button
                onClick={() => executeYouTubeSearch('kannada all songs album jukebox', 1, false)}
                className="px-5 py-2.5 rounded-full bg-red-600 text-white font-bold text-xs shadow-lg hover:bg-red-500 transition-all cursor-pointer"
              >
                Load Kannada Hits & Albums 🐘
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {onlineResults.map((onlineTrk) => {
                const isThisPlaying = currentTrack?.id === onlineTrk.id && isPlaying;
                const isAlbumOrJukebox =
                  onlineTrk.isAlbum ||
                  onlineTrk.duration >= 600 ||
                  /album|jukebox|collection|all songs|vol\.|soundtrack/i.test(onlineTrk.title);

                return (
                  <div
                    key={onlineTrk.id}
                    onClick={() => onPlayTrack(onlineTrk)}
                    className={`group relative flex flex-col justify-between p-3 rounded-2xl border transition-all cursor-pointer backdrop-blur-sm ${
                      isThisPlaying
                        ? 'bg-red-950/40 border-red-500/60 shadow-lg shadow-red-900/30'
                        : 'bg-white/[0.04] hover:bg-white/[0.09] border-white/10 hover:border-red-500/40'
                    }`}
                  >
                    <div className="relative aspect-video w-full rounded-xl overflow-hidden mb-2.5 bg-black/60 shadow-md">
                      <img
                        src={onlineTrk.coverUrl}
                        alt={onlineTrk.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />

                      {/* Badges on Thumbnail */}
                      <div className="absolute top-2 left-2 flex items-center gap-1 z-10">
                        {isAlbumOrJukebox ? (
                          <span className="text-[10px] bg-amber-500 text-black font-extrabold px-2 py-0.5 rounded shadow flex items-center gap-1">
                            <Layers className="w-3 h-3 stroke-[3]" /> ALBUM
                          </span>
                        ) : (
                          <span className="text-[9px] bg-black/75 text-[#1ed760] font-mono font-bold px-1.5 py-0.5 rounded backdrop-blur">
                            FULL SONG
                          </span>
                        )}
                        {onlineTrk.language === 'kannada' && (
                          <span className="text-[9px] bg-amber-400 text-black font-bold px-1.5 py-0.5 rounded">
                            ಕನ್ನಡ
                          </span>
                        )}
                        {onlineTrk.language === 'hindi' && (
                          <span className="text-[9px] bg-rose-500 text-white font-bold px-1.5 py-0.5 rounded">
                            हिन्दी
                          </span>
                        )}
                      </div>

                      {/* Duration pill */}
                      <div className="absolute bottom-2 right-2 bg-black/85 text-white text-[10px] font-mono px-1.5 py-0.5 rounded backdrop-blur font-bold z-10">
                        {formatLength(onlineTrk.duration)}
                      </div>

                      {/* Play Overlay */}
                      <div
                        className={`absolute inset-0 bg-black/45 flex items-center justify-center transition-opacity ${
                          isThisPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        <div className="w-11 h-11 rounded-full bg-red-600 group-hover:scale-110 flex items-center justify-center text-white shadow-xl transition-transform">
                          {isThisPlaying ? (
                            <Pause className="w-5 h-5 fill-white" />
                          ) : (
                            <Play className="w-5 h-5 fill-white ml-0.5" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white line-clamp-2 leading-snug group-hover:text-rose-200 transition-colors">
                        {onlineTrk.title}
                      </p>
                      <p className="text-xs text-neutral-400 truncate mt-1">
                        {onlineTrk.artist}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-neutral-400 mt-2 pt-2 border-t border-white/5">
                        <span className="text-neutral-400 truncate max-w-[130px]">
                          {onlineTrk.viewsText || (isAlbumOrJukebox ? 'Full Jukebox' : 'Official Audio')}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddToQueue(onlineTrk);
                            }}
                            className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                            title="Add to Play Queue"
                            aria-label="Add to Queue"
                          >
                            <ListPlus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onAddTrackToLibrary) {
                                onAddTrackToLibrary(onlineTrk);
                              } else {
                                onPlayTrack(onlineTrk);
                              }
                            }}
                            className="p-1.5 text-neutral-400 hover:text-[#1ed760] hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                            title="Add to My Library"
                            aria-label="Add to My Library"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onShareTrack(onlineTrk);
                            }}
                            className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                            title="Share Song"
                            aria-label="Share Song"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Load More Button for UNLIMITED Results */}
          {onlineResults.length > 0 && (
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={handleLoadMoreYouTube}
                disabled={isLoadingMore}
                className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-[#1ed760] text-white font-extrabold text-xs sm:text-sm shadow-xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoadingMore ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Zap className="w-4 h-4 fill-white text-white" />
                )}
                <span>
                  {isLoadingMore
                    ? 'Loading More Songs from YouTube...'
                    : `Load More YouTube Songs & Albums (Page ${page + 1}) ⚡`}
                </span>
              </button>
              <span className="text-[11px] text-neutral-400 font-mono">
                Unlimited YouTube tracks with no loss
              </span>
            </div>
          )}
        </div>
      )}

      {/* Main Track Results */}
      {activeTab !== 'youtube' && (
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
                  onEditMetadata={onEditMetadata}
                  onSelectTag={(tag) => setQuery(tag)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
