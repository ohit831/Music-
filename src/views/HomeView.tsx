/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Play,
  Pause,
  Sparkles,
  Compass,
  ArrowRight,
  Headphones,
  Flame,
  Globe2,
  Heart,
  MessageSquare,
  TrendingUp,
  Smartphone,
  QrCode,
} from 'lucide-react';
import { IndieTrack, Playlist, IndieArtist, formatListenersCount } from '../utils/musicDiscovery';
import { TrackReview } from '../data/indieCatalog';

interface HomeViewProps {
  tracks: IndieTrack[];
  playlists: Playlist[];
  artists: IndieArtist[];
  reviews: TrackReview[];
  currentTrack: IndieTrack | null;
  isPlaying: boolean;
  onPlayTrack: (track: IndieTrack) => void;
  onSelectPlaylist: (playlistId: string) => void;
  onSelectArtist: (artistId: string) => void;
  onGoToDiscover: () => void;
  onOpenAndroidApp?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  tracks,
  playlists,
  artists,
  reviews,
  currentTrack,
  isPlaying,
  onPlayTrack,
  onSelectPlaylist,
  onSelectArtist,
  onGoToDiscover,
  onOpenAndroidApp,
}) => {
  const [activeFilter, setActiveFilter] = useState<string>('All');

  // Categorize tracks
  const kannadaTracks = tracks.filter((t) => t.language === 'kannada' || t.id.startsWith('kn-') || (t.tags && t.tags.includes('kannada')));
  const hindiTracks = tracks.filter((t) => t.language === 'hindi' || t.id.startsWith('hn-') || (t.tags && (t.tags.includes('hindi') || t.tags.includes('bollywood'))));
  const retro90sTracks = tracks.filter((t) => t.id.includes('90s') || (t.tags && t.tags.includes('90s')) || (t.releaseYear >= 1985 && t.releaseYear <= 2001));
  const newReleases = tracks.filter((t) => t.id.startsWith('new-trk-') || t.releaseYear >= 2024);
  const spotifyHits = tracks.filter((t) => t.isSpotifyHit || (t.popularity && t.popularity > 80));
  const undergroundGems = tracks.filter((t) => t.obscurity > 0.6);
  
  // Quick jump cards
  const quickPicks = [
    ...(kannadaTracks.length > 0 ? [kannadaTracks[0]] : []),
    ...(hindiTracks.length > 0 ? [hindiTracks[0]] : []),
    ...(retro90sTracks.length > 0 ? [retro90sTracks[0]] : []),
    ...tracks.filter(t => !t.id.startsWith('kn-') && !t.id.startsWith('hn-') && !t.id.includes('90s')).slice(0, 3)
  ];

  // Filtered tracks for display
  const displayedTracks = tracks.filter((track) => {
    if (activeFilter === 'All') return true;
    if (activeFilter === '90s Golden Era (90s ಗೀತೆಗಳು & Bollywood) 📻') {
      return track.id.includes('90s') || (track.tags && track.tags.includes('90s')) || (track.releaseYear >= 1985 && track.releaseYear <= 2001);
    }
    if (activeFilter === 'Kannada Hits (ಕನ್ನಡ) 🐘') return track.language === 'kannada' || track.id.startsWith('kn-') || (track.tags && track.tags.includes('kannada'));
    if (activeFilter === 'Hindi & Bollywood (हिन्दी) 🪕') return track.language === 'hindi' || track.id.startsWith('hn-') || (track.tags && (track.tags.includes('hindi') || track.tags.includes('bollywood')));
    if (activeFilter === 'New Releases 🔥') return track.id.startsWith('new-trk-') || track.releaseYear >= 2024;
    if (activeFilter === 'Spotify Hits') return track.isSpotifyHit || (track.popularity && track.popularity > 80);
    if (activeFilter === 'Indie Underground') return track.obscurity > 0.6;
    if (activeFilter === 'Rock & Alt') return ['Rock', 'Indie Rock', 'Alternative', '90s Grunge Rock', '90s Britpop / Rock'].includes(track.genre);
    if (activeFilter === 'Pop & Dance') return ['Pop', 'Dance', 'Electronic', '90s Pop Classic', '90s Teen Pop'].includes(track.genre);
    if (activeFilter === 'Chill & R&B') return ['Bedroom Lo-Fi', 'Dream Pop', 'R&B', 'Neo-Folk'].includes(track.genre);
    return true;
  });

  const topHitsPlaylist = playlists.find((p) => p.id === 'pl-90s-kannada-classics') || playlists.find((p) => p.id === 'pl-kannada-hits') || playlists[0];

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      {/* Category Filter Chips Bar (Spotify Style) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {['All', '90s Golden Era (90s ಗೀತೆಗಳು & Bollywood) 📻', 'Kannada Hits (ಕನ್ನಡ) 🐘', 'Hindi & Bollywood (हिन्दी) 🪕', 'New Releases 🔥', 'Spotify Hits', 'Pop & Dance', 'Indie Underground', 'Rock & Alt'].map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-1.5 rounded-full text-xs md:text-sm font-semibold transition-all shrink-0 ${
              activeFilter === filter
                ? 'bg-white text-black shadow-md scale-105'
                : 'bg-white/10 text-neutral-300 hover:bg-white/15 hover:text-white'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Online Mobile App & Install Quick Banner */}
      {onOpenAndroidApp && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-[#1ed760]/10 to-transparent border border-[#1ed760]/30 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#1ed760] to-emerald-400 flex items-center justify-center text-black font-extrabold shrink-0 shadow-md">
              <Smartphone className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-sm">IndieWave Online & Mobile App</span>
                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-[#1ed760] text-black font-mono">
                  ZERO 403 ERROR
                </span>
              </div>
              <p className="text-xs text-neutral-300">
                Play online on mobile without login, scan QR code, and install to phone home screen.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenAndroidApp}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#1ed760] hover:bg-[#1db954] text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-[#1ed760]/20 active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            <Smartphone className="w-4 h-4 stroke-[2.5]" />
            <span>Install in Mobile App</span>
          </button>
        </div>
      )}

      {/* Top Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-emerald-950 via-teal-950 to-neutral-950 border border-emerald-500/20 p-6 md:p-8 shadow-2xl">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1ed760]/20 border border-[#1ed760]/40 text-[#1ed760] text-xs font-bold tracking-wide">
            <Flame className="w-3.5 h-3.5" />
            SPOTIFY GLOBAL TOP HITS & INDIE SOUNDS
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
            All the Music You Love, Streamed Live.
          </h1>
          <p className="text-sm md:text-base text-neutral-300 leading-relaxed">
            From billboard record-breakers like The Weeknd, Taylor Swift, and Billie Eilish to underground cassette gems and indie roadtrip anthems.
          </p>
          <div className="flex items-center gap-3 pt-2 flex-wrap">
            <button
              onClick={() => onSelectPlaylist(topHitsPlaylist.id)}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#1ed760] hover:bg-[#1db954] text-black font-bold text-sm transition-transform active:scale-95 shadow-lg shadow-[#1ed760]/25"
            >
              <Play className="w-4 h-4 fill-black" />
              Play Today's Top Hits
            </button>
            <button
              onClick={onGoToDiscover}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 hover:bg-white/15 text-white font-semibold text-sm border border-white/10 transition-colors"
            >
              <Compass className="w-4 h-4" />
              Tune Sound Capsule
            </button>
          </div>
        </div>
      </div>

      {/* Quick Jump 6-Grid (Spotify style) */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Quick Jump</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickPicks.map((track) => {
            const isThisPlaying = currentTrack?.id === track.id && isPlaying;
            return (
              <div
                key={track.id}
                onClick={() => onPlayTrack(track)}
                className="group flex items-center bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 rounded-xl overflow-hidden cursor-pointer transition-all shadow-sm"
              >
                <img
                  src={track.coverUrl}
                  alt={track.title}
                  className="w-16 h-16 object-cover shrink-0"
                />
                <div className="flex-1 px-3.5 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold text-white truncate">{track.title}</p>
                    {track.isSpotifyHit && (
                      <span className="text-[9px] bg-[#1ed760]/20 text-[#1ed760] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                        TOP
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 truncate">{track.artist}</p>
                </div>
                <div className="pr-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlayTrack(track);
                    }}
                    className={`w-9 h-9 rounded-full bg-[#1ed760] text-black flex items-center justify-center transition-all shadow-lg ${
                      isThisPlaying
                        ? 'opacity-100 scale-100'
                        : 'opacity-0 group-hover:opacity-100 group-hover:scale-100'
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

      {/* If a category filter is selected, show its full dedicated catalog */}
      {activeFilter !== 'All' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1ed760] animate-pulse" />
                <h2 className="text-xl font-bold text-white">{activeFilter}</h2>
                <span className="text-[10px] font-mono text-[#1ed760] bg-[#1ed760]/20 px-2 py-0.5 rounded-full">
                  {displayedTracks.length} Songs
                </span>
              </div>
              <p className="text-xs text-neutral-400">Stream all full songs with high-res audio and video</p>
            </div>
            <button
              onClick={() => setActiveFilter('All')}
              className="text-xs text-[#1ed760] hover:underline font-semibold"
            >
              View All Shelves
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
            {displayedTracks.map((track) => {
              const isThisPlaying = currentTrack?.id === track.id && isPlaying;
              return (
                <div
                  key={track.id}
                  onClick={() => onPlayTrack(track)}
                  className="group p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-[#1ed760]/30 transition-all cursor-pointer relative flex flex-col"
                >
                  <div className="w-full aspect-square rounded-xl overflow-hidden relative mb-2.5 shadow-md">
                    <img
                      src={track.coverUrl}
                      alt={track.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {track.fullSongAvailable && (
                      <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-emerald-500/90 text-black text-[9px] font-black uppercase tracking-wider">
                        FULL
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlayTrack(track);
                      }}
                      className={`absolute bottom-2 right-2 w-10 h-10 rounded-full bg-[#1ed760] text-black flex items-center justify-center transition-all shadow-xl hover:scale-105 ${
                        isThisPlaying
                          ? 'opacity-100 scale-100'
                          : 'opacity-0 group-hover:opacity-100 group-hover:scale-100 translate-y-2 group-hover:translate-y-0'
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
                  <h3 className="text-sm font-bold text-white truncate">{track.title}</h3>
                  <p className="text-xs text-neutral-400 truncate mt-0.5">{track.artist}</p>
                  <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-neutral-400">
                    <span className="text-[#1ed760] font-mono">{track.releaseYear}</span>
                    <span>•</span>
                    <span className="truncate">{track.genre}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Kannada Blockbusters & Hits Shelf */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🐘</span>
              <h2 className="text-xl font-bold text-white">Kannada Blockbusters & Sandalwood Hits (ಕನ್ನಡ ಸೂಪರ್ ಹಿಟ್ಸ್)</h2>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                ಕನ್ನಡ
              </span>
            </div>
            <p className="text-xs text-neutral-400">Singara Siriye, KGF Anthems, Sapta Sagaradaache Ello, Mungaru Male, and Kirik Party</p>
          </div>
          <button
            onClick={() => {
              const pl = playlists.find((p) => p.id === 'pl-kannada-hits');
              if (pl) onSelectPlaylist(pl.id);
            }}
            className="text-xs text-amber-400 hover:underline font-semibold flex items-center gap-1"
          >
            Kannada All-Time Hits <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
          {kannadaTracks.slice(0, 12).map((track) => {
            const isThisPlaying = currentTrack?.id === track.id && isPlaying;
            return (
              <div
                key={track.id}
                onClick={() => onPlayTrack(track)}
                className="group p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-amber-400/30 transition-all cursor-pointer relative flex flex-col"
              >
                <div className="w-full aspect-square rounded-xl overflow-hidden relative mb-2.5 shadow-md">
                  <img
                    src={track.coverUrl}
                    alt={track.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-amber-500 text-black text-[9px] font-black uppercase tracking-wider">
                    ಕನ್ನಡ
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlayTrack(track);
                    }}
                    className={`absolute bottom-2 right-2 w-10 h-10 rounded-full bg-amber-400 text-black flex items-center justify-center transition-all shadow-xl hover:scale-105 ${
                      isThisPlaying
                        ? 'opacity-100 scale-100'
                        : 'opacity-0 group-hover:opacity-100 group-hover:scale-100 translate-y-2 group-hover:translate-y-0'
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
                <h3 className="text-sm font-bold text-white truncate">{track.title}</h3>
                <p className="text-xs text-neutral-400 truncate mt-0.5">{track.artist}</p>
                <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-neutral-400">
                  <span className="text-amber-400 font-mono">{track.releaseYear}</span>
                  <span>•</span>
                  <span className="truncate">{track.genre}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bollywood & Hindi Chartbusters Shelf */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🪕</span>
              <h2 className="text-xl font-bold text-white">Bollywood & Hindi Chartbusters (बॉलीवुड और हिन्दी टॉप ट्रैक्स)</h2>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full border border-rose-500/30">
                हिन्दी
              </span>
            </div>
            <p className="text-xs text-neutral-400">Arijit Singh, Animal, Jawan, Dil Se, Rockstar, Anuv Jain, and timeless soulful hits</p>
          </div>
          <button
            onClick={() => {
              const pl = playlists.find((p) => p.id === 'pl-hindi-bollywood');
              if (pl) onSelectPlaylist(pl.id);
            }}
            className="text-xs text-rose-400 hover:underline font-semibold flex items-center gap-1"
          >
            Bollywood Top 50 <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
          {hindiTracks.slice(0, 12).map((track) => {
            const isThisPlaying = currentTrack?.id === track.id && isPlaying;
            return (
              <div
                key={track.id}
                onClick={() => onPlayTrack(track)}
                className="group p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-rose-400/30 transition-all cursor-pointer relative flex flex-col"
              >
                <div className="w-full aspect-square rounded-xl overflow-hidden relative mb-2.5 shadow-md">
                  <img
                    src={track.coverUrl}
                    alt={track.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-rose-500 text-white text-[9px] font-black uppercase tracking-wider">
                    हिन्दी
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlayTrack(track);
                    }}
                    className={`absolute bottom-2 right-2 w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center transition-all shadow-xl hover:scale-105 ${
                      isThisPlaying
                        ? 'opacity-100 scale-100'
                        : 'opacity-0 group-hover:opacity-100 group-hover:scale-100 translate-y-2 group-hover:translate-y-0'
                    }`}
                    aria-label={`Play ${track.title}`}
                  >
                    {isThisPlaying ? (
                      <Pause className="w-4 h-4 fill-white" />
                    ) : (
                      <Play className="w-4 h-4 fill-white ml-0.5" />
                    )}
                  </button>
                </div>
                <h3 className="text-sm font-bold text-white truncate">{track.title}</h3>
                <p className="text-xs text-neutral-400 truncate mt-0.5">{track.artist}</p>
                <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-neutral-400">
                  <span className="font-mono text-neutral-400">{track.releaseYear}</span>
                  <span>•</span>
                  <span className="truncate">{track.genre}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 90s Golden Era Nostalgia Shelf */}
      <div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">📻</span>
              <h2 className="text-xl font-bold text-white">90s Golden Era Nostalgia (90s ಸುವರ್ಣ ಯುಗ & Bollywood)</h2>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                90s RETRO CLASSICS
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Amruthavarshini, Premaloka, DDLJ, Aashiqui, Muttina Haara, Dil Se, Pehla Nasha, and iconic 90s pop
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const pl = playlists.find((p) => p.id === 'pl-90s-kannada-classics');
                if (pl) onSelectPlaylist(pl.id);
              }}
              className="text-xs text-amber-400 hover:underline font-semibold flex items-center gap-1 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20"
            >
              90s Sandalwood Hits <ArrowRight className="w-3 h-3" />
            </button>
            <button
              onClick={() => {
                const pl = playlists.find((p) => p.id === 'pl-90s-bollywood-romance');
                if (pl) onSelectPlaylist(pl.id);
              }}
              className="text-xs text-rose-400 hover:underline font-semibold flex items-center gap-1 bg-rose-500/10 px-3 py-1.5 rounded-full border border-rose-500/20"
            >
              90s Bollywood Romance <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
          {retro90sTracks.slice(0, 12).map((track) => {
            const isThisPlaying = currentTrack?.id === track.id && isPlaying;
            return (
              <div
                key={track.id}
                onClick={() => onPlayTrack(track)}
                className="group p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-amber-400/40 transition-all cursor-pointer relative flex flex-col"
              >
                <div className="w-full aspect-square rounded-xl overflow-hidden relative mb-2.5 shadow-md">
                  <img
                    src={track.coverUrl}
                    alt={track.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-md text-amber-300 border border-amber-500/30 text-[9px] font-black uppercase tracking-wider">
                    {track.language === 'kannada' ? 'ಕನ್ನಡ 90s' : track.language === 'hindi' ? '90s HINDI' : '90s RETRO'}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlayTrack(track);
                    }}
                    className={`absolute bottom-2 right-2 w-10 h-10 rounded-full bg-amber-400 text-black flex items-center justify-center transition-all shadow-xl hover:scale-105 ${
                      isThisPlaying
                        ? 'opacity-100 scale-100'
                        : 'opacity-0 group-hover:opacity-100 group-hover:scale-100 translate-y-2 group-hover:translate-y-0'
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
                <h3 className="text-sm font-bold text-white truncate">{track.title}</h3>
                <p className="text-xs text-neutral-400 truncate mt-0.5">{track.artist}</p>
                <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-neutral-400">
                  <span className="font-mono text-amber-400/90">{track.releaseYear}</span>
                  <span>•</span>
                  <span className="truncate">{track.genre}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Brand New Releases Shelf */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1ed760] animate-ping" />
              <h2 className="text-xl font-bold text-white">Brand New Releases & Hot Drops</h2>
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full border border-rose-500/30">
                NEW 2026
              </span>
            </div>
            <p className="text-xs text-neutral-400">The latest chart-dominating tracks from Lady Gaga, Sabrina, Billie, Charli, Kendrick & The Weeknd</p>
          </div>
          <button
            onClick={() => {
              const pl = playlists.find((p) => p.id === 'pl-new-music-friday');
              if (pl) onSelectPlaylist(pl.id);
            }}
            className="text-xs text-[#1ed760] hover:underline font-semibold flex items-center gap-1"
          >
            New Music Friday <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
          {newReleases.slice(0, 12).map((track) => {
            const isThisPlaying = currentTrack?.id === track.id && isPlaying;
            return (
              <div
                key={track.id}
                onClick={() => onPlayTrack(track)}
                className="group p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-[#1ed760]/30 transition-all cursor-pointer relative flex flex-col"
              >
                <div className="w-full aspect-square rounded-xl overflow-hidden relative mb-2.5 shadow-md">
                  <img
                    src={track.coverUrl}
                    alt={track.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[9px] font-extrabold text-[#1ed760] border border-white/10 flex items-center gap-1">
                    <span>✨</span>
                    <span>NEW</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlayTrack(track);
                    }}
                    className={`absolute bottom-2 right-2 w-10 h-10 rounded-full bg-[#1ed760] text-black flex items-center justify-center transition-all shadow-xl hover:scale-105 ${
                      isThisPlaying
                        ? 'opacity-100 scale-100'
                        : 'opacity-0 group-hover:opacity-100 group-hover:scale-100 translate-y-2 group-hover:translate-y-0'
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
                <h3 className="text-sm font-bold text-white truncate">{track.title}</h3>
                <p className="text-xs text-neutral-400 truncate mt-0.5">{track.artist}</p>
                <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-neutral-400">
                  <span className="text-[#1ed760] font-mono">{track.releaseYear}</span>
                  <span>•</span>
                  <span>{track.genre}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Spotify Top Global Hits Shelf */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#1ed760]" />
              <h2 className="text-xl font-bold text-white">Spotify Global Hits & Chart Toppers</h2>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-[#1ed760]/20 text-[#1ed760] px-2 py-0.5 rounded-full border border-[#1ed760]/30">
                BILLIONS OF STREAMS
              </span>
            </div>
            <p className="text-xs text-neutral-400">The most popular tracks streamed around the world</p>
          </div>
          <button
            onClick={() => {
              const pl = playlists.find((p) => p.id === 'pl-global-top-50');
              if (pl) onSelectPlaylist(pl.id);
            }}
            className="text-xs text-[#1ed760] hover:underline font-semibold flex items-center gap-1"
          >
            See Top 50 <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
          {spotifyHits.slice(0, 12).map((track, idx) => {
            const isThisPlaying = currentTrack?.id === track.id && isPlaying;
            return (
              <div
                key={track.id}
                onClick={() => onPlayTrack(track)}
                className="group p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all cursor-pointer relative flex flex-col"
              >
                <div className="w-full aspect-square rounded-xl overflow-hidden relative mb-2.5 shadow-md">
                  <img
                    src={track.coverUrl}
                    alt={track.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-extrabold text-[#1ed760] border border-white/10">
                    #{idx + 1}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlayTrack(track);
                    }}
                    className={`absolute bottom-2 right-2 w-10 h-10 rounded-full bg-[#1ed760] text-black flex items-center justify-center transition-all shadow-xl hover:scale-105 ${
                      isThisPlaying
                        ? 'opacity-100 scale-100'
                        : 'opacity-0 group-hover:opacity-100 group-hover:scale-100 translate-y-2 group-hover:translate-y-0'
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
                <h3 className="text-sm font-bold text-white truncate">{track.title}</h3>
                <p className="text-xs text-neutral-400 truncate mt-0.5">{track.artist}</p>
                <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-neutral-400">
                  <span className="text-[#1ed760] font-mono">{formatListenersCount(track.monthlyListeners)}</span>
                  <span>•</span>
                  <span>{track.genre}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Featured Spotify Playlists Shelf */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">Featured Playlists</h2>
            <p className="text-xs text-neutral-400">Curated collections for every vibe and moment</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {playlists.map((pl) => (
            <div
              key={pl.id}
              onClick={() => onSelectPlaylist(pl.id)}
              className="group p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all cursor-pointer relative"
            >
              <div
                className={`w-full aspect-square rounded-xl bg-gradient-to-tr ${pl.coverGradient} flex items-center justify-center text-4xl shadow-md border border-white/10 relative overflow-hidden mb-3`}
              >
                <span>{pl.coverEmoji}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectPlaylist(pl.id);
                  }}
                  className="absolute bottom-2.5 right-2.5 w-10 h-10 rounded-full bg-[#1ed760] text-black flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all shadow-xl hover:scale-105"
                  aria-label={`Play ${pl.title}`}
                >
                  <Play className="w-5 h-5 fill-black ml-0.5" />
                </button>
              </div>
              <h3 className="text-sm font-bold text-white truncate">{pl.title}</h3>
              <p className="text-xs text-neutral-400 line-clamp-2 mt-1 leading-snug">
                {pl.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Deep Underground & Indie Radar Shelf */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">Underground Radar: Secret Gems</h2>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">
                &lt; 5,000 LISTENERS
              </span>
            </div>
            <p className="text-xs text-neutral-400">Pure hidden gems discovered in basement studios and tape decks</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {undergroundGems.slice(0, 6).map((track) => {
            const isThisPlaying = currentTrack?.id === track.id && isPlaying;
            return (
              <div
                key={track.id}
                onClick={() => onPlayTrack(track)}
                className="group flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-2xl transition-all cursor-pointer"
              >
                <div className="relative shrink-0">
                  <img
                    src={track.coverUrl}
                    alt={track.title}
                    className="w-14 h-14 rounded-xl object-cover"
                  />
                  <button
                    className={`absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center transition-opacity ${
                      isThisPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                    aria-label={`Play ${track.title}`}
                  >
                    {isThisPlaying ? (
                      <Pause className="w-5 h-5 fill-[#1ed760] text-[#1ed760]" />
                    ) : (
                      <Play className="w-5 h-5 fill-white text-white" />
                    )}
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{track.title}</p>
                  <p className="text-xs text-neutral-400 truncate">{track.artist}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-[#1ed760] font-mono">
                      {formatListenersCount(track.monthlyListeners)} listeners
                    </span>
                    <span className="text-[10px] text-neutral-500">•</span>
                    <span className="text-[10px] text-neutral-400">{track.genre}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Popular Artists Shelf */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">Popular Artists</h2>
            <p className="text-xs text-neutral-400">Top streamed artists on Spotify & indie music visionaries</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {artists.slice(0, 12).map((artist) => (
            <div
              key={artist.id}
              onClick={() => onSelectArtist(artist.id)}
              className="group p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all cursor-pointer flex flex-col items-center text-center"
            >
              <div className="relative mb-3">
                <img
                  src={artist.coverUrl}
                  alt={artist.name}
                  className="w-24 h-24 rounded-full object-cover shadow-lg border-2 border-white/10 group-hover:border-[#1ed760] transition-colors"
                />
                {artist.verified && (
                  <span className="absolute bottom-0 right-1 w-5 h-5 rounded-full bg-[#1ed760] text-black flex items-center justify-center text-[10px] font-bold border-2 border-[#121216]">
                    ✓
                  </span>
                )}
              </div>
              <h3 className="text-sm font-bold text-white truncate w-full">{artist.name}</h3>
              <p className="text-[11px] text-[#1ed760] font-mono truncate w-full mt-0.5">
                {formatListenersCount(artist.monthlyListeners)} monthly
              </p>
              <span className="mt-2 text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/5 text-neutral-300">
                {artist.genres[0]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Community Notes & Reviews */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5 text-[#1ed760]" />
          <h2 className="text-xl font-bold text-white">Music Lovers Community Notes</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all space-y-3"
            >
              <div className="flex items-center gap-3">
                <img
                  src={rev.avatar}
                  alt={rev.author}
                  className="w-9 h-9 rounded-full object-cover"
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white">{rev.author}</p>
                  <p className="text-[10px] text-neutral-400">{rev.timeAgo}</p>
                </div>
              </div>
              <p className="text-xs text-neutral-300 italic leading-relaxed">
                "{rev.comment}"
              </p>
              <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1">
                <span className="flex items-center gap-1 text-[#1ed760]">
                  <Heart className="w-3 h-3 fill-current" /> {rev.likes} likes
                </span>
                <span className="text-[10px] font-mono text-neutral-500">Verified listener</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
