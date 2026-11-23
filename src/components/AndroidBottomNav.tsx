/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Home,
  Search,
  Dumbbell,
  ListMusic,
  Smartphone,
  Sparkles,
} from 'lucide-react';

interface AndroidBottomNavProps {
  activeTab: string;
  onSelectTab: (tab: any) => void;
  onOpenVisualizer: () => void;
  onOpenAndroidModal: () => void;
  onOpenSettings: () => void;
  isVisualizerActive?: boolean;
}

export const AndroidBottomNav: React.FC<AndroidBottomNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenAndroidModal,
}) => {
  return (
    <nav
      className="music-app-mobile-nav md:hidden shrink-0 z-40 bg-[#101220]/95 backdrop-blur-xl border-t border-white/[0.08] px-1 py-1.5 flex items-center justify-around select-none shadow-[0_-10px_30px_rgba(0,0,0,0.75)]"
      aria-label="Mobile Fast Access Navigation"
    >
      {/* 1. Home */}
      <button
        onClick={() => onSelectTab('home')}
        className={`flex flex-col items-center justify-center min-w-[56px] py-1 transition-all active:scale-95 cursor-pointer ${
          activeTab === 'home' ? 'text-sky-400 font-semibold' : 'text-slate-400 hover:text-white'
        }`}
      >
        <Home className={`w-5 h-5 mb-0.5 ${activeTab === 'home' ? 'stroke-[2.25]' : ''}`} />
        <span className="text-[10px] tracking-tight">Home</span>
      </button>

      {/* 2. Discover / Search */}
      <button
        onClick={() => onSelectTab('search')}
        className={`flex flex-col items-center justify-center min-w-[56px] py-1 transition-all active:scale-95 cursor-pointer ${
          activeTab === 'search' ? 'text-sky-400 font-semibold' : 'text-slate-400 hover:text-white'
        }`}
      >
        <Search className={`w-5 h-5 mb-0.5 ${activeTab === 'search' ? 'stroke-[2.25]' : ''}`} />
        <span className="text-[10px] tracking-tight">Discover</span>
      </button>

      {/* 3. AI Curator */}
      <button
        onClick={() => onSelectTab('curator')}
        className={`flex flex-col items-center justify-center min-w-[56px] py-1 transition-all active:scale-95 cursor-pointer ${
          activeTab === 'curator' ? 'text-sky-400 font-semibold' : 'text-slate-400 hover:text-white'
        }`}
      >
        <Sparkles className={`w-5 h-5 mb-0.5 ${activeTab === 'curator' ? 'stroke-[2.25]' : ''}`} />
        <span className="text-[10px] tracking-tight">Curator</span>
      </button>

      {/* 4. Library / Playlists */}
      <button
        onClick={() => onSelectTab('library')}
        className={`flex flex-col items-center justify-center min-w-[56px] py-1 transition-all active:scale-95 cursor-pointer ${
          activeTab === 'library' || activeTab === 'playlists'
            ? 'text-sky-400 font-semibold'
            : 'text-slate-400 hover:text-white'
        }`}
      >
        <ListMusic
          className={`w-5 h-5 mb-0.5 ${
            activeTab === 'library' || activeTab === 'playlists' ? 'stroke-[2.25]' : ''
          }`}
        />
        <span className="text-[10px] tracking-tight">Playlists</span>
      </button>

      {/* 5. Install App */}
      <button
        onClick={onOpenAndroidModal}
        className="flex flex-col items-center justify-center min-w-[56px] py-1 text-slate-300 hover:text-white transition-all active:scale-95 cursor-pointer"
        title="Install Mobile App"
      >
        <Smartphone className="w-5 h-5 mb-0.5" />
        <span className="text-[10px] font-medium tracking-tight">App</span>
      </button>
    </nav>
  );
};
