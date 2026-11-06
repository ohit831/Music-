/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  Volume2,
  VolumeX,
  Sliders,
  Sparkles,
  BarChart3,
  Waves,
  SunMedium,
  CircleDot,
  Radio,
} from 'lucide-react';
import { IndieTrack, formatDuration } from '../utils/musicDiscovery';
import {
  D3AudioVisualizer,
  VisualizerMode,
  VisualizerTheme,
  THEME_CONFIGS,
} from './D3AudioVisualizer';
import { audioEngine } from '../services/audioEngine';

interface MobileVisualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: IndieTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  isLiked: boolean;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onToggleLike: (trackId: string) => void;
}

export const MobileVisualizerModal: React.FC<MobileVisualizerModalProps> = ({
  isOpen,
  onClose,
  track,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  isShuffle,
  repeatMode,
  isLiked,
  onPlay,
  onPause,
  onNext,
  onPrevious,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleShuffle,
  onToggleRepeat,
  onToggleLike,
}) => {
  const [mode, setMode] = useState<VisualizerMode>('wave');
  const [theme, setTheme] = useState<VisualizerTheme>('emerald');
  const [sensitivity, setSensitivity] = useState<number>(1.2);
  const [isSeeking, setIsSeeking] = useState(false);
  const [tempSeek, setTempSeek] = useState(0);

  // Frequency statistics for real-time live readout
  const [freqStats, setFreqStats] = useState({ bass: 0, mid: 0, treble: 0 });

  useEffect(() => {
    if (!isOpen) return;

    let animId: number;
    const updateStats = () => {
      const data = audioEngine.getByteFrequencyData();
      if (data && data.length > 0) {
        const third = Math.floor(data.length / 3);
        let b = 0;
        let m = 0;
        let t = 0;

        for (let i = 0; i < third; i++) b += data[i] || 0;
        for (let i = third; i < third * 2; i++) m += data[i] || 0;
        for (let i = third * 2; i < data.length; i++) t += data[i] || 0;

        setFreqStats({
          bass: Math.round((b / third / 255) * 100),
          mid: Math.round((m / third / 255) * 100),
          treble: Math.round((t / (data.length - third * 2) / 255) * 100),
        });
      }
      animId = requestAnimationFrame(updateStats);
    };

    animId = requestAnimationFrame(updateStats);
    return () => cancelAnimationFrame(animId);
  }, [isOpen]);

  if (!isOpen || !track) return null;

  const currentTheme = THEME_CONFIGS[theme];
  const effectiveDuration = duration || track.duration;
  const displayTime = isSeeking ? tempSeek : currentTime;

  const modeButtons: Array<{ id: VisualizerMode; label: string; icon: React.ReactNode }> = [
    { id: 'wave', label: 'Wave', icon: <Waves className="w-4 h-4" /> },
    { id: 'bars', label: 'Bars', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'radial', label: 'Radial', icon: <SunMedium className="w-4 h-4" /> },
    { id: 'particles', label: 'Orbs', icon: <Sparkles className="w-4 h-4" /> },
  ];

  const themesList: Array<{ id: VisualizerTheme; name: string; color: string }> = [
    { id: 'emerald', name: 'Emerald', color: '#1ed760' },
    { id: 'sunset', name: 'Sunset', color: '#f43f5e' },
    { id: 'cyber', name: 'Cyber', color: '#06b6d4' },
    { id: 'amber', name: 'Vinyl', color: '#f59e0b' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-neutral-950/95 backdrop-blur-xl animate-fade-in text-white overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="D3 Real-time Audio Visualizer"
    >
      {/* Top Header bar with swipe-friendly grip and close button */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-neutral-950/80 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full animate-ping"
            style={{ backgroundColor: currentTheme.primary }}
          />
          <span className="text-xs font-mono font-bold tracking-wider uppercase text-neutral-300">
            D3 Audio Spectrum
          </span>
          <span
            className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
            style={{
              borderColor: `${currentTheme.primary}40`,
              backgroundColor: `${currentTheme.primary}15`,
              color: currentTheme.primary,
            }}
          >
            Live 60 FPS
          </span>
        </div>

        <button
          onClick={onClose}
          className="p-2 text-neutral-400 hover:text-white rounded-full bg-white/5 active:scale-95 transition-all"
          aria-label="Close visualizer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Visualizer Content Area */}
      <div className="flex-1 flex flex-col max-w-xl mx-auto w-full px-4 py-4 space-y-4">
        {/* Track Info Card */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.04] border border-white/10 shadow-lg">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={track.coverUrl}
              alt={track.title}
              className="w-13 h-13 rounded-xl object-cover shadow-md border border-white/10 shrink-0"
            />
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white truncate">{track.title}</h2>
              <p className="text-xs text-neutral-400 truncate">{track.artist}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-mono text-neutral-500">
                  {track.bpm || 110} BPM • {track.genre}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onToggleLike(track.id)}
            className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 active:scale-90 transition-all shrink-0 ml-2"
            aria-label={isLiked ? 'Unlike track' : 'Like track'}
          >
            <Heart
              className={`w-5 h-5 ${
                isLiked ? 'text-rose-500 fill-rose-500' : 'text-neutral-400'
              }`}
            />
          </button>
        </div>

        {/* D3 Real-Time Visualizer Stage */}
        <div className="relative w-full rounded-2xl bg-black/60 border border-white/10 p-3 sm:p-4 shadow-2xl flex flex-col items-center justify-center overflow-hidden min-h-[260px] sm:min-h-[300px]">
          {/* Subtle Background Radial Aura */}
          <div
            className="absolute inset-0 pointer-events-none opacity-20 blur-3xl transition-colors duration-500"
            style={{
              background: `radial-gradient(circle at 50% 50%, ${currentTheme.primary}, transparent 70%)`,
            }}
          />

          <D3AudioVisualizer
            isPlaying={isPlaying}
            variant="expanded"
            mode={mode}
            theme={theme}
            sensitivity={sensitivity}
            height={260}
            className="w-full"
          />

          {/* Real-time Frequency EQ Meters */}
          <div className="w-full grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-white/10 z-10">
            <div className="flex flex-col items-center bg-white/[0.03] py-1.5 px-2 rounded-xl">
              <span className="text-[10px] uppercase font-mono text-neutral-400">Low / Bass</span>
              <div className="w-full bg-white/10 h-1.5 rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-75"
                  style={{
                    width: `${freqStats.bass}%`,
                    backgroundColor: currentTheme.primary,
                  }}
                />
              </div>
              <span className="text-[10px] font-mono text-neutral-300 mt-0.5">{freqStats.bass}%</span>
            </div>

            <div className="flex flex-col items-center bg-white/[0.03] py-1.5 px-2 rounded-xl">
              <span className="text-[10px] uppercase font-mono text-neutral-400">Mid / Voice</span>
              <div className="w-full bg-white/10 h-1.5 rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-75"
                  style={{
                    width: `${freqStats.mid}%`,
                    backgroundColor: currentTheme.secondary,
                  }}
                />
              </div>
              <span className="text-[10px] font-mono text-neutral-300 mt-0.5">{freqStats.mid}%</span>
            </div>

            <div className="flex flex-col items-center bg-white/[0.03] py-1.5 px-2 rounded-xl">
              <span className="text-[10px] uppercase font-mono text-neutral-400">High / Air</span>
              <div className="w-full bg-white/10 h-1.5 rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-75"
                  style={{
                    width: `${freqStats.treble}%`,
                    backgroundColor: currentTheme.tertiary,
                  }}
                />
              </div>
              <span className="text-[10px] font-mono text-neutral-300 mt-0.5">{freqStats.treble}%</span>
            </div>
          </div>
        </div>

        {/* Touch-Friendly Mode & Theme Controls */}
        <div className="space-y-3 bg-white/[0.03] border border-white/10 p-3.5 rounded-2xl">
          {/* Mode Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-300">Visualizer Style</span>
              <span className="text-[11px] font-mono text-neutral-400 uppercase">
                {mode}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {modeButtons.map((btn) => {
                const isActive = mode === btn.id;
                return (
                  <button
                    key={btn.id}
                    onClick={() => setMode(btn.id)}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-medium transition-all active:scale-95 ${
                      isActive
                        ? 'bg-white text-black font-bold shadow-md shadow-white/20'
                        : 'bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {btn.icon}
                    <span>{btn.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Theme Palette & Sensitivity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/5">
            {/* Palette */}
            <div>
              <span className="text-xs font-semibold text-neutral-300 block mb-1.5">Color Palette</span>
              <div className="flex items-center gap-2">
                {themesList.map((th) => {
                  const isActive = theme === th.id;
                  return (
                    <button
                      key={th.id}
                      onClick={() => setTheme(th.id)}
                      className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-medium flex items-center justify-center gap-1.5 border transition-all active:scale-95 ${
                        isActive
                          ? 'border-white bg-white/15 text-white font-bold'
                          : 'border-white/10 bg-white/5 text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: th.color }}
                      />
                      <span>{th.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sensitivity Slider */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-neutral-300">Beat Sensitivity</span>
                <span className="text-[11px] font-mono text-neutral-400">{sensitivity.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={2.2}
                step={0.1}
                value={sensitivity}
                onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-white/15 rounded-full appearance-none cursor-pointer focus:outline-none accent-white"
                aria-label="Visualizer sensitivity"
              />
            </div>
          </div>
        </div>

        {/* Mobile Scrubber Timeline */}
        <div className="space-y-1.5 pt-1">
          <div className="relative flex items-center group py-2">
            <input
              type="range"
              min={0}
              max={effectiveDuration}
              step={0.1}
              value={displayTime}
              onMouseDown={() => setIsSeeking(true)}
              onTouchStart={() => setIsSeeking(true)}
              onChange={(e) => setTempSeek(parseFloat(e.target.value))}
              onMouseUp={(e) => {
                const val = parseFloat(e.currentTarget.value);
                setIsSeeking(false);
                onSeek(val);
              }}
              onTouchEnd={(e) => {
                const val = parseFloat(e.currentTarget.value);
                setIsSeeking(false);
                onSeek(val);
              }}
              className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer focus:outline-none accent-white"
              aria-label="Seek music position"
            />
          </div>
          <div className="flex justify-between text-xs font-mono text-neutral-400 px-0.5">
            <span>{formatDuration(displayTime)}</span>
            <span>{formatDuration(effectiveDuration)}</span>
          </div>
        </div>

        {/* Big Touch Transport Controls for Phone Screen */}
        <div className="flex items-center justify-between py-2 px-3 bg-white/[0.04] rounded-2xl border border-white/10">
          {/* Shuffle */}
          <button
            onClick={onToggleShuffle}
            className={`p-3 rounded-full transition-colors active:scale-90 ${
              isShuffle ? 'text-[#1ed760]' : 'text-neutral-400 hover:text-white'
            }`}
            aria-label="Toggle shuffle"
          >
            <Shuffle className="w-5 h-5" />
          </button>

          {/* Previous */}
          <button
            onClick={onPrevious}
            className="p-3 text-neutral-200 hover:text-white active:scale-90 transition-all"
            aria-label="Previous track"
          >
            <SkipBack className="w-6 h-6 fill-current" />
          </button>

          {/* Main Play / Pause */}
          <button
            onClick={isPlaying ? onPause : onPlay}
            className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/20"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-7 h-7 fill-black" />
            ) : (
              <Play className="w-7 h-7 fill-black ml-1" />
            )}
          </button>

          {/* Next */}
          <button
            onClick={onNext}
            className="p-3 text-neutral-200 hover:text-white active:scale-90 transition-all"
            aria-label="Next track"
          >
            <SkipForward className="w-6 h-6 fill-current" />
          </button>

          {/* Repeat */}
          <button
            onClick={onToggleRepeat}
            className={`p-3 rounded-full transition-colors active:scale-90 ${
              repeatMode !== 'off' ? 'text-[#1ed760]' : 'text-neutral-400 hover:text-white'
            }`}
            aria-label={`Repeat: ${repeatMode}`}
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="w-5 h-5" />
            ) : (
              <Repeat className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Volume Bar */}
        <div className="flex items-center gap-3 px-2 py-1">
          <button
            onClick={onToggleMute}
            className="p-2 text-neutral-400 hover:text-white rounded-full transition-colors"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-5 h-5 text-rose-400" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-white/15 rounded-full appearance-none cursor-pointer focus:outline-none accent-white"
            aria-label="Volume slider"
          />
        </div>
      </div>
    </div>
  );
};
