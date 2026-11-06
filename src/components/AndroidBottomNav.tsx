/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Home,
  Compass,
  ListMusic,
  Waves,
  Smartphone,
  Sliders,
} from 'lucide-react';

interface AndroidBottomNavProps {
  activeTab: 'home' | 'discover' | 'playlists' | 'radar';
  onSelectTab: (tab: 'home' | 'discover' | 'playlists' | 'radar') => void;
  onOpenVisualizer: () => void;
  onOpenAndroidModal: () => void;
  onOpenSettings: () => void;
  isVisualizerActive?: boolean;
}

export const AndroidBottomNav: React.FC<AndroidBottomNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenVisualizer,
  onOpenAndroidModal,
  onOpenSettings,
  isVisualizerActive = false,
}) => {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0d0d10]/95 backdrop-blur-lg border-t border-white/10 px-2 py-1.5 flex items-center justify-around select-none shadow-[0_-8px_25px_rgba(0,0,0,0.6)]"
      aria-label="Android Bottom Navigation"
    >
      {/* Home */}
      <button
        onClick={() => onSelectTab('home')}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition-all active:scale-90 ${
          activeTab === 'home' ? 'text-[#1ed760]' : 'text-neutral-400 hover:text-white'
        }`}
      >
        <Home className="w-5 h-5 mb-0.5" />
        <span className="text-[10px] font-semibold tracking-tight">Home</span>
      </button>

      {/* Discover */}
      <button
        onClick={() => onSelectTab('discover')}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition-all active:scale-90 ${
          activeTab === 'discover' ? 'text-[#1ed760]' : 'text-neutral-400 hover:text-white'
        }`}
      >
        <Compass className="w-5 h-5 mb-0.5" />
        <span className="text-[10px] font-semibold tracking-tight">Discover</span>
      </button>

      {/* D3 Visualizer button - Center spotlight for phone */}
      <button
        onClick={onOpenVisualizer}
        className="flex flex-col items-center justify-center flex-1 py-1 text-neutral-300 hover:text-white active:scale-90 transition-all group"
      >
        <div className="relative">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#1ed760]/20 to-emerald-400/30 border border-[#1ed760]/40 flex items-center justify-center text-[#1ed760] group-hover:scale-105 transition-transform shadow-sm">
            <Waves className="w-4 h-4 animate-pulse" />
          </div>
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#1ed760] animate-ping" />
        </div>
        <span className="text-[9px] font-bold text-[#1ed760] mt-0.5">D3 Visual</span>
      </button>

      {/* Playlists */}
      <button
        onClick={() => onSelectTab('playlists')}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition-all active:scale-90 ${
          activeTab === 'playlists' ? 'text-[#1ed760]' : 'text-neutral-400 hover:text-white'
        }`}
      >
        <ListMusic className="w-5 h-5 mb-0.5" />
        <span className="text-[10px] font-semibold tracking-tight">Library</span>
      </button>

      {/* Android App Button */}
      <button
        onClick={onOpenAndroidModal}
        className="flex flex-col items-center justify-center flex-1 py-1 text-emerald-400 hover:text-white active:scale-90 transition-all"
        title="Get Android App"
      >
        <Smartphone className="w-5 h-5 mb-0.5" />
        <span className="text-[10px] font-semibold tracking-tight">App</span>
      </button>
    </nav>
  );
};
