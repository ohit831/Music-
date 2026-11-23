/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Home,
  Compass,
  Search,
  Radio,
  Plus,
  Heart,
  Music,
  Users,
  Sparkles,
  Layers,
  Sliders,
  Smartphone,
  X,
  Download,
  Dumbbell,
  UserPlus,
  LogIn,
  Flame,
} from 'lucide-react';
import { Playlist } from '../utils/musicDiscovery';
import { UserProfile } from '../services/authService';
import { APP_BASE_URL } from '../utils/appUrl';

export type ActiveNavTab = 'home' | 'discover' | 'curator' | 'search' | 'jam' | 'liked' | 'library' | 'downloads';

interface SidebarProps {
  activeTab: ActiveNavTab;
  onSelectTab: (tab: ActiveNavTab) => void;
  selectedPlaylistId: string | null;
  onSelectPlaylist: (playlistId: string) => void;
  playlists: Playlist[];
  likedTrackCount: number;
  downloadedTrackCount?: number;
  onOpenCreatePlaylist: () => void;
  onOpenAddMusic?: () => void;
  onOpenSettings?: () => void;
  onOpenAndroidApp?: () => void;
  crossfadeDuration?: number;
  user?: UserProfile | null;
  onOpenAuth?: (mode: 'signup' | 'signin') => void;
  onOpenProfile?: () => void;
  isAnimatedFocusActive?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  selectedPlaylistId,
  onSelectPlaylist,
  playlists,
  likedTrackCount,
  downloadedTrackCount = 0,
  onOpenCreatePlaylist,
  onOpenAddMusic,
  onOpenSettings,
  onOpenAndroidApp,
  crossfadeDuration = 4,
  user,
  onOpenAuth,
  onOpenProfile,
  isAnimatedFocusActive = false,
}) => {
  const [libraryFilter, setLibraryFilter] = useState<'all' | 'playlists' | 'liked' | 'downloads'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Filter playlists by search query
  const visiblePlaylists = playlists.filter((pl) => {
    if (!searchQuery.trim()) return true;
    return (
      pl.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pl.owner.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <aside
      className={`music-app-sidebar hidden md:flex w-[280px] border-r border-white/[0.08] flex-col h-full select-none shrink-0 overflow-y-auto transition-colors duration-500 ${
        isAnimatedFocusActive ? 'bg-[#0b0d17]/72 backdrop-blur-xl' : 'bg-[#0b0d17]'
      }`}
    >
      {/* Brand Logo */}
      <div className="p-4 pb-3.5 flex items-center justify-between border-b border-white/[0.06]">
        <button
          onClick={() => onSelectTab('home')}
          className="flex items-center gap-3 text-left group cursor-pointer"
        >
          <img
            src={`${APP_BASE_URL}icon.svg`}
            alt="Aura Music logo"
            className="w-10 h-10 rounded-xl object-cover border border-white/15 shadow-lg group-hover:scale-105 transition-transform"
          />
          <div>
            <span className="font-bold text-base tracking-tight text-white group-hover:text-sky-400 transition-colors block">
              Aura Music
            </span>
            <p className="text-[11px] text-slate-400 font-medium">Hi-Fi Audio & Discovery</p>
          </div>
        </button>
      </div>

      {/* User Account / Sign Up Header Card */}
      <div className="px-3 pt-3">
        {user ? (
          <button
            onClick={onOpenProfile}
            className="w-full p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] flex items-center justify-between transition-all group text-left cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover border border-white/20 shrink-0"
              />
              <div className="min-w-0">
                <span className="font-semibold text-xs text-white truncate block group-hover:text-sky-400 transition-colors">
                  {user.name}
                </span>
                <p className="text-[10px] text-slate-400 truncate">
                  {user.gymVibe} · {user.workoutStreak}d streak
                </p>
              </div>
            </div>
          </button>
        ) : (
          <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08]">
            <p className="text-xs font-semibold text-white mb-1">Personalize Your Mix</p>
            <p className="text-[11px] text-slate-400 mb-2.5 leading-tight">
              Sync playlists, smart queue & offline tracks across devices.
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => onOpenAuth?.('signup')}
                className="py-1.5 px-2 rounded-lg bg-white hover:bg-slate-200 text-black font-bold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer"
              >
                <UserPlus className="w-3 h-3 stroke-[2.5]" />
                <span>Sign Up</span>
              </button>
              <button
                onClick={() => onOpenAuth?.('signin')}
                className="py-1.5 px-2 rounded-lg bg-white/10 hover:bg-white/15 text-white font-semibold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer"
              >
                <LogIn className="w-3 h-3" />
                <span>Log In</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="px-3 pt-3 space-y-0.5" aria-label="Main navigation">
        <button
          onClick={() => onSelectTab('home')}
          className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl font-semibold text-sm transition-colors cursor-pointer ${
            activeTab === 'home' && !selectedPlaylistId
              ? 'bg-white/[0.08] text-sky-400'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Home className="w-4 h-4" />
          Home
        </button>

        <button
          onClick={() => onSelectTab('search')}
          className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl font-semibold text-sm transition-colors cursor-pointer ${
            activeTab === 'search' && !selectedPlaylistId
              ? 'bg-white/[0.08] text-sky-400'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Search className="w-4 h-4" />
          Search & Vibes
        </button>
      </nav>

      {/* Add Music from Anywhere CTA */}
      {onOpenAddMusic && (
        <div className="px-3 pt-2.5">
          <button
            onClick={onOpenAddMusic}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-semibold text-xs bg-white/[0.05] hover:bg-white/[0.09] text-white border border-white/[0.08] transition-all group cursor-pointer"
          >
            <div className="w-6 h-6 rounded-lg bg-white text-black flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-white text-[12px] leading-tight">Add Music</p>
              <p className="text-[10px] text-slate-400">From Web / YouTube Link</p>
            </div>
          </button>
        </div>
      )}

      <div className="mx-4 my-2 h-px bg-white/10 shrink-0" />

      {/* Library Section */}
      <div className="flex items-center justify-between px-5 mb-2">
        <div
          onClick={() => onSelectTab('library')}
          className="flex items-center gap-2 text-neutral-400 hover:text-white cursor-pointer group transition-colors"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onSelectTab('library');
          }}
          title="Open full library view"
        >
          <Layers
            className={`w-4 h-4 transition-colors ${
              activeTab === 'library' && !selectedPlaylistId
                ? 'text-sky-400'
                : 'group-hover:text-white'
            }`}
          />
          <span
            className={`text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === 'library' && !selectedPlaylistId
                ? 'text-sky-400'
                : 'group-hover:text-white'
            }`}
          >
            Your Library
          </span>
          <span className="text-[10px] font-mono text-slate-400 group-hover:text-white transition-colors tabular-nums">
            ({playlists.length + (likedTrackCount > 0 ? 1 : 0)})
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSearch((v) => !v)}
            className={`p-1 rounded-lg transition-colors ${
              showSearch ? 'bg-white/20 text-white' : 'text-neutral-400 hover:text-white hover:bg-white/10'
            }`}
            aria-label="Search playlists"
            title="Search playlists"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onOpenCreatePlaylist}
            className="p-1 text-neutral-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Create new playlist"
            title="Create playlist"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Filter Pills & Search in Sidebar */}
      <div className="px-3 mb-2 space-y-1.5">
        {showSearch && (
          <div className="relative">
            <Search className="w-3 h-3 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search library..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-7 pr-6 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#1ed760]"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                aria-label="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        <div className="flex items-center flex-wrap gap-1">
          <button
            onClick={() => setLibraryFilter('all')}
            className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold transition-colors ${
              libraryFilter === 'all'
                ? 'bg-white/20 text-white'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setLibraryFilter('playlists')}
            className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold transition-colors ${
              libraryFilter === 'playlists'
                ? 'bg-white/20 text-white'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Playlists
          </button>
          <button
            onClick={() => setLibraryFilter('liked')}
            className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold transition-colors flex items-center gap-1 ${
              libraryFilter === 'liked'
                ? 'bg-rose-500/20 text-rose-300'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Heart className="w-2.5 h-2.5 fill-current" />
            <span>Liked</span>
          </button>
          <button
            onClick={() => setLibraryFilter('downloads')}
            className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold transition-colors flex items-center gap-1 ${
              libraryFilter === 'downloads'
                ? 'bg-blue-500/20 text-blue-300'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Download className="w-2.5 h-2.5" />
            <span>Downloads</span>
          </button>
        </div>
      </div>

      {/* Playlists List */}
      <div className="flex-1 min-h-[210px] overflow-y-auto px-2 space-y-1">
        {/* Liked Songs Entry */}
        {(libraryFilter === 'all' || libraryFilter === 'liked') && !searchQuery && (
          <button
            onClick={() => onSelectTab('liked')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors ${
              activeTab === 'liked' && !selectedPlaylistId
                ? 'bg-white/10 text-white ring-1 ring-white/15'
                : 'text-neutral-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-purple-700 to-rose-500 flex items-center justify-center text-white shrink-0 shadow-sm">
              <Heart className="w-4 h-4 fill-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">Liked Songs</p>
              <p className="text-[11px] text-neutral-400">{likedTrackCount} tracks</p>
            </div>
          </button>
        )}

        {/* Downloaded Songs Entry */}
        {(libraryFilter === 'all' || libraryFilter === 'downloads') && !searchQuery && (
          <button
            onClick={() => onSelectTab('downloads')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors ${
              activeTab === 'downloads' && !selectedPlaylistId
                ? 'bg-white/10 text-white ring-1 ring-white/15'
                : 'text-neutral-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 via-cyan-600 to-teal-500 flex items-center justify-center text-white shrink-0 shadow-sm">
              <Download className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">Downloaded Songs</p>
              <p className="text-[11px] text-neutral-400">
                {downloadedTrackCount > 0 ? `${downloadedTrackCount} offline tracks` : 'Offline ready'}
              </p>
            </div>
          </button>
        )}

        {/* User & Editorial Playlists */}
        {(libraryFilter === 'all' || libraryFilter === 'playlists') &&
          visiblePlaylists.map((pl) => {
            const isSelected = selectedPlaylistId === pl.id;
            return (
              <button
                key={pl.id}
                onClick={() => onSelectPlaylist(pl.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors ${
                  isSelected
                    ? 'bg-white/10 text-white ring-1 ring-white/15'
                    : 'text-neutral-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${pl.coverGradient} flex items-center justify-center text-sm shrink-0 shadow-sm border border-white/10`}
                >
                  {pl.coverEmoji}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold truncate">{pl.title}</p>
                    {pl.isCollaborative && (
                      <span title="Collaborative">
                        <Users className="w-3 h-3 text-[#1ed760] shrink-0" />
                      </span>
                    )}
                    {pl.isPersonalized && (
                      <span title="Personalized">
                        <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-400 truncate">
                    {pl.owner} • {pl.trackIds.length} songs
                  </p>
                </div>
              </button>
            );
          })}

        {visiblePlaylists.length === 0 && searchQuery && (
          <div className="text-center py-6 px-2 text-neutral-500 text-xs">
            No playlists matching "{searchQuery}"
          </div>
        )}
      </div>

      {/* Playback Settings Button */}
      {onOpenSettings && (
        <div className="px-3 pt-2">
          <button
            onClick={onOpenSettings}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm text-slate-300 hover:text-white bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Sliders className="w-4 h-4 text-slate-400 group-hover:text-sky-400 transition-colors" />
              <span>Playback Settings</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400 tabular-nums">
              {crossfadeDuration === 0 ? 'Off' : `${crossfadeDuration}s`}
            </span>
          </button>
        </div>
      )}

      {/* Android & Online Mobile App Install Button */}
      {onOpenAndroidApp && (
        <div className="px-3 pt-2 pb-4">
          <button
            onClick={onOpenAndroidApp}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-white bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Smartphone className="w-4 h-4 text-sky-400 group-hover:scale-105 transition-transform" />
              <span>Get Mobile App</span>
            </div>
            <span className="text-[11px] text-sky-400 font-medium">Install →</span>
          </button>
        </div>
      )}
    </aside>
  );
};
