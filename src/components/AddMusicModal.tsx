/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Link as LinkIcon,
  Search,
  Music,
  Play,
  Plus,
  Check,
  Loader2,
  Globe,
  Sparkles,
  ExternalLink,
  Radio,
} from 'lucide-react';
import {
  IndieTrack,
  Playlist,
  parseMusicUrl,
  searchFullMusicAnywhere,
} from '../utils/musicDiscovery';

interface AddMusicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTrack: (track: IndieTrack, autoPlay?: boolean) => void;
  playlists: Playlist[];
  onAddToPlaylist: (playlistId: string, trackId: string) => void;
}

export const AddMusicModal: React.FC<AddMusicModalProps> = ({
  isOpen,
  onClose,
  onAddTrack,
  playlists,
  onAddToPlaylist,
}) => {
  const [activeTab, setActiveTab] = useState<'link' | 'search'>('link');

  // Link import state
  const [urlInput, setUrlInput] = useState('');
  const [isFetchingInfo, setIsFetchingInfo] = useState(false);
  const [detectedType, setDetectedType] = useState<'youtube' | 'audio' | null>(null);
  const [parsedTrack, setParsedTrack] = useState<{
    youtubeId?: string;
    audioUrl?: string;
    title: string;
    artist: string;
    album: string;
    genre: string;
    language: string;
    coverUrl: string;
    duration: number;
  } | null>(null);

  // Search anywhere state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<IndieTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [targetPlaylistId, setTargetPlaylistId] = useState<string>('');

  if (!isOpen) return null;

  const handleInspectUrl = async (inputStr: string) => {
    const parsed = parseMusicUrl(inputStr);
    if (parsed.type === 'query' || !parsed.value) {
      setParsedTrack(null);
      setDetectedType(null);
      return;
    }

    setIsFetchingInfo(true);
    if (parsed.type === 'youtube') {
      setDetectedType('youtube');
      try {
        const res = await fetch(`/api/oembed-info?id=${parsed.value}`);
        if (res.ok) {
          const data = await res.json();
          let title = data.title || 'Imported Song';
          let artist = data.author_name || 'YouTube Music';

          if (title.includes(' - ')) {
            const parts = title.split(' - ');
            artist = parts[0].trim();
            title = parts.slice(1).join(' - ').trim();
          }

          title = title
            .replace(/\(Official.*?\)/gi, '')
            .replace(/\[Official.*?\]/gi, '')
            .replace(/\(Audio.*?\)/gi, '')
            .replace(/\[Audio.*?\]/gi, '')
            .replace(/\(Video.*?\)/gi, '')
            .replace(/\[Video.*?\]/gi, '')
            .replace(/HD|4K|Full Song|Lyrical/gi, '')
            .trim();

          const lowerText = `${title} ${artist}`.toLowerCase();
          let lang = 'english';
          if (/kannada|sandalwood|kantara|kgf|chandan|sanjith|vijay prakash|charan raj|ajaneesh/i.test(lowerText)) {
            lang = 'kannada';
          } else if (/hindi|bollywood|arijit|shreya|anuv jain|pritam|bad newz|animal|jawan|sufi|punjabi/i.test(lowerText)) {
            lang = 'hindi';
          }

          setParsedTrack({
            youtubeId: parsed.value,
            title: title || 'Imported Track',
            artist: artist,
            album: 'Web Import',
            genre: lang === 'kannada' ? 'Kannada Hits' : lang === 'hindi' ? 'Hindi Bollywood' : 'Pop / Global',
            language: lang,
            coverUrl: data.thumbnail_url || `https://i.ytimg.com/vi/${parsed.value}/hqdefault.jpg`,
            duration: 210,
          });
        } else {
          // Fallback if oEmbed request failed
          setParsedTrack({
            youtubeId: parsed.value,
            title: 'YouTube Track (' + parsed.value + ')',
            artist: 'YouTube',
            album: 'Web Import',
            genre: 'Full Song',
            language: 'english',
            coverUrl: `https://i.ytimg.com/vi/${parsed.value}/hqdefault.jpg`,
            duration: 210,
          });
        }
      } catch {
        setParsedTrack({
          youtubeId: parsed.value,
          title: 'YouTube Track',
          artist: 'Web Stream',
          album: 'Web Import',
          genre: 'Full Song',
          language: 'english',
          coverUrl: `https://i.ytimg.com/vi/${parsed.value}/hqdefault.jpg`,
          duration: 210,
        });
      }
    } else if (parsed.type === 'audio') {
      setDetectedType('audio');
      // Direct audio URL
      const filename = parsed.value.split('/').pop()?.split('?')[0] || 'Direct Stream';
      setParsedTrack({
        audioUrl: parsed.value,
        title: decodeURIComponent(filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')),
        artist: 'Audio Stream',
        album: 'Direct Stream',
        genre: 'Web Audio',
        language: 'english',
        coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
        duration: 240,
      });
    }
    setIsFetchingInfo(false);
  };

  const handleConfirmAddLink = (autoPlay = false) => {
    if (!parsedTrack) return;

    const newTrack: IndieTrack = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      youtubeId: parsedTrack.youtubeId,
      audioUrl: parsedTrack.audioUrl,
      fullSongAvailable: true,
      title: parsedTrack.title || 'Imported Song',
      artist: parsedTrack.artist || 'Unknown Artist',
      artistId: `art-custom-${Date.now()}`,
      album: parsedTrack.album || 'Web Import',
      genre: parsedTrack.genre || 'Full Song',
      coverUrl: parsedTrack.coverUrl,
      duration: parsedTrack.duration || 215,
      releaseYear: new Date().getFullYear(),
      monthlyListeners: 12000000,
      energy: 0.8,
      acousticness: 0.2,
      melancholy: 0.35,
      obscurity: 0.05,
      tags: ['full song', parsedTrack.language, 'custom import'],
      isSpotifyHit: true,
      popularity: 95,
      language: parsedTrack.language,
    };

    onAddTrack(newTrack, autoPlay);

    if (targetPlaylistId) {
      onAddToPlaylist(targetPlaylistId, newTrack.id);
    }

    onClose();
  };

  const handleSearchAnywhere = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = await searchFullMusicAnywhere(searchQuery, 16);
      setSearchResults(results);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-music-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div className="relative w-full max-w-2xl bg-[#141419] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#18181f]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1ed760] to-emerald-700 flex items-center justify-center text-black shadow-lg">
              <Globe className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 id="add-music-title" className="text-base md:text-lg font-bold text-white flex items-center gap-2">
                Add Full Music from Anywhere
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-[#1ed760]/20 text-[#1ed760] border border-[#1ed760]/30">
                  Full Length
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Paste YouTube / audio links, or search any song in Kannada, Hindi, and Global charts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-white/10 bg-[#121216] px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('link')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs md:text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'link'
                ? 'border-[#1ed760] text-[#1ed760]'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <LinkIcon className="w-4 h-4" />
            <span>Paste Link or URL</span>
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs md:text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'search'
                ? 'border-[#1ed760] text-[#1ed760]'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Search Worldwide Cloud</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'link' ? (
            <div className="space-y-5">
              {/* URL Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-300">
                  Enter YouTube Video URL, Video ID, or Direct Audio Stream Link:
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={urlInput}
                      onChange={(e) => {
                        setUrlInput(e.target.value);
                        handleInspectUrl(e.target.value);
                      }}
                      placeholder="e.g. https://www.youtube.com/watch?v=... or https://youtu.be/... or .mp3 link"
                      className="w-full bg-[#1e1e24] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#1ed760] focus:ring-1 focus:ring-[#1ed760] transition-all font-mono"
                    />
                    {isFetchingInfo && (
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#1ed760] animate-spin">
                        <Loader2 className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        const clip = await navigator.clipboard.readText();
                        if (clip) {
                          setUrlInput(clip);
                          handleInspectUrl(clip);
                        }
                      } catch {
                        // ignore clipboard permissions
                      }
                    }}
                    className="px-4 py-3 bg-white/10 hover:bg-white/15 text-white text-xs font-bold rounded-xl transition-colors shrink-0"
                  >
                    Paste
                  </button>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Tip: Supports official music videos, Kannada songs, Hindi Bollywood, live concerts, or audio stream links.
                </p>
              </div>

              {/* Inspected Song Card Preview */}
              {parsedTrack && (
                <div className="bg-[#1c1c24] border border-white/15 rounded-xl p-4 space-y-4 animate-scale-in">
                  <div className="flex items-center justify-between text-xs text-[#1ed760] font-semibold pb-2 border-b border-white/10">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Detected {detectedType === 'youtube' ? 'YouTube Full Song' : 'Direct Audio Stream'}
                    </span>
                    <span className="text-neutral-400 font-mono text-[11px]">Ready to Play</span>
                  </div>

                  <div className="flex gap-4 items-start">
                    <img
                      src={parsedTrack.coverUrl}
                      alt={parsedTrack.title}
                      className="w-24 h-24 rounded-lg object-cover bg-neutral-800 border border-white/10 shrink-0 shadow-md"
                    />
                    <div className="flex-1 space-y-2 min-w-0">
                      <div>
                        <label className="text-[10px] text-neutral-400 uppercase font-semibold">Track Title</label>
                        <input
                          type="text"
                          value={parsedTrack.title}
                          onChange={(e) => setParsedTrack({ ...parsedTrack, title: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#1ed760]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-neutral-400 uppercase font-semibold">Artist / Channel</label>
                          <input
                            type="text"
                            value={parsedTrack.artist}
                            onChange={(e) => setParsedTrack({ ...parsedTrack, artist: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#1ed760]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-neutral-400 uppercase font-semibold">Language / Region</label>
                          <select
                            value={parsedTrack.language}
                            onChange={(e) => setParsedTrack({ ...parsedTrack, language: e.target.value })}
                            className="w-full bg-[#1c1c24] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#1ed760]"
                          >
                            <option value="english">Global / English</option>
                            <option value="kannada">Kannada (ಕನ್ನಡ)</option>
                            <option value="hindi">Hindi / Bollywood (हिन्दी)</option>
                            <option value="punjabi">Punjabi</option>
                            <option value="telugu">Telugu</option>
                            <option value="tamil">Tamil</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Add to playlist option */}
                  <div className="flex items-center gap-3 pt-2">
                    <span className="text-xs text-neutral-400 shrink-0">Also add to playlist:</span>
                    <select
                      value={targetPlaylistId}
                      onChange={(e) => setTargetPlaylistId(e.target.value)}
                      className="bg-[#121216] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#1ed760] flex-1"
                    >
                      <option value="">None (Library Only)</option>
                      {playlists.map((pl) => (
                        <option key={pl.id} value={pl.id}>
                          {pl.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={() => handleConfirmAddLink(false)}
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors"
                    >
                      Save to Library
                    </button>
                    <button
                      onClick={() => handleConfirmAddLink(true)}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1ed760] hover:bg-[#1db954] text-black font-extrabold text-xs shadow-lg transition-transform active:scale-95"
                    >
                      <Play className="w-4 h-4 fill-black" />
                      Play Full Song Now
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Universal Search bar */}
              <form onSubmit={handleSearchAnywhere} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search any song, artist, film name, Kannada or Hindi tracks..."
                    className="w-full bg-[#1e1e24] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#1ed760] transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching || !searchQuery.trim()}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#1ed760] hover:bg-[#1db954] text-black text-xs font-bold transition-all disabled:opacity-50 shrink-0"
                >
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  <span>Search</span>
                </button>
              </form>

              {/* Quick suggestions */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-neutral-500 font-medium">Quick find:</span>
                {['Singara Siriye', 'Kesariya', 'Die With A Smile', 'Belageddu', 'Arijit Singh', 'Espresso'].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      setSearchQuery(tag);
                      searchFullMusicAnywhere(tag, 14).then(setSearchResults);
                    }}
                    className="text-[11px] bg-white/5 hover:bg-white/10 text-neutral-300 px-2.5 py-1 rounded-full border border-white/5 transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {/* Results List */}
              <div className="space-y-2 mt-4 max-h-80 overflow-y-auto pr-1">
                {searchResults.length > 0 ? (
                  searchResults.map((track) => {
                    const isAdded = addedIds.has(track.id);
                    return (
                      <div
                        key={track.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 group"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                          <img
                            src={track.coverUrl}
                            alt={track.title}
                            className="w-11 h-11 rounded-lg object-cover bg-neutral-800 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-white truncate group-hover:text-[#1ed760] transition-colors">
                              {track.title}
                            </p>
                            <p className="text-[11px] text-neutral-400 truncate">
                              {track.artist} • {track.genre}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => {
                              onAddTrack(track, false);
                              setAddedIds((prev) => new Set(prev).add(track.id));
                            }}
                            className={`p-2 rounded-lg text-xs font-bold transition-colors ${
                              isAdded
                                ? 'bg-[#1ed760]/20 text-[#1ed760]'
                                : 'bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white'
                            }`}
                            title={isAdded ? 'Added to library' : 'Add to Library'}
                          >
                            {isAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => {
                              onAddTrack(track, true);
                              onClose();
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1ed760] hover:bg-[#1db954] text-black text-xs font-extrabold shadow-md transition-transform active:scale-95"
                          >
                            <Play className="w-3.5 h-3.5 fill-black" />
                            <span>Play</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center text-neutral-500 text-xs">
                    Type any song name, movie soundtrack, or artist to search full music from anywhere.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-[#121216] border-t border-white/10 flex items-center justify-between text-[11px] text-neutral-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#1ed760]" />
            100% Full Audio & Video Master Streaming
          </span>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
