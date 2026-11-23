/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sliders,
  Volume2,
  Sparkles,
  Zap,
  Play,
  Square,
  RotateCcw,
  Check,
  Radio,
  Layers,
  Palette,
  HardDrive,
  Globe,
  User,
  ShieldCheck,
  Wifi,
  Smartphone,
  Trash2,
  Award,
  Music,
} from 'lucide-react';
import {
  PlaybackSettings,
  DEFAULT_PLAYBACK_SETTINGS,
  EQUALIZER_CONFIGS,
  EqualizerPreset,
  AppTheme,
  AudioStreamingQuality,
  VolumeLevel,
  estimateCacheSize,
  clearAppCache,
} from '../utils/playbackSettings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: PlaybackSettings;
  onUpdateSettings: (newSettings: PlaybackSettings) => void;
  currentUser?: {
    name: string;
    email?: string;
    avatarUrl: string;
    workoutStreak: number;
  } | null;
  onShowToast?: (msg: string) => void;
}

type SettingsTab =
  | 'playback'
  | 'quality'
  | 'appearance'
  | 'storage'
  | 'languages'
  | 'account';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  currentUser,
  onShowToast,
}) => {
  const [localSettings, setLocalSettings] = useState<PlaybackSettings>(settings);
  const [activeTab, setActiveTab] = useState<SettingsTab>('playback');
  const [isAuditioning, setIsAuditioning] = useState(false);
  const [auditionProgress, setAuditionProgress] = useState(0);
  const auditionAudioRef = useRef<{ stop: () => void } | null>(null);
  const [cacheInfo, setCacheInfo] = useState(estimateCacheSize());
  const [cacheCleared, setCacheCleared] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
    setCacheInfo(estimateCacheSize());
  }, [settings, isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Clean up any ongoing audition audio when modal closes or unmounts
  useEffect(() => {
    return () => {
      if (auditionAudioRef.current) {
        auditionAudioRef.current.stop();
        auditionAudioRef.current = null;
      }
    };
  }, []);

  if (!isOpen) return null;

  const handleClose = () => {
    if (auditionAudioRef.current) {
      auditionAudioRef.current.stop();
      auditionAudioRef.current = null;
      setIsAuditioning(false);
    }
    onClose();
  };

  const updateSetting = <K extends keyof PlaybackSettings>(
    key: K,
    val: PlaybackSettings[K]
  ) => {
    const next = { ...localSettings, [key]: val };
    setLocalSettings(next);
    onUpdateSettings(next);
  };

  const handleReset = () => {
    setLocalSettings(DEFAULT_PLAYBACK_SETTINGS);
    onUpdateSettings(DEFAULT_PLAYBACK_SETTINGS);
    if (onShowToast) onShowToast('Settings reset to Spotify defaults 🔄');
  };

  const handleClearCache = () => {
    clearAppCache();
    setCacheInfo({ cachedMb: 0.1, totalMb: 48.6 });
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 3000);
    if (onShowToast) onShowToast('Temporary audio cache cleared! 🧹');
  };

  const toggleLanguage = (lang: string) => {
    const current = localSettings.preferredLanguages || [];
    let next: string[];
    if (current.includes(lang)) {
      if (current.length === 1) return; // Keep at least one
      next = current.filter((l) => l !== lang);
    } else {
      next = [...current, lang];
    }
    updateSetting('preferredLanguages', next);
    if (onShowToast) onShowToast(`Music preference updated: ${lang.toUpperCase()}`);
  };

  // Audition interactive crossfade simulation using Web Audio API
  const handleToggleAudition = () => {
    if (isAuditioning) {
      if (auditionAudioRef.current) {
        auditionAudioRef.current.stop();
        auditionAudioRef.current = null;
      }
      setIsAuditioning(false);
      setAuditionProgress(0);
      return;
    }

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') ctx.resume();

      const durationSec = Math.max(3, Math.min(localSettings.crossfadeDuration * 1.5, 6));
      const crossSec = Math.min(localSettings.crossfadeDuration, durationSec * 0.8);

      const oscA = ctx.createOscillator();
      const gainA = ctx.createGain();
      oscA.type = 'sine';
      oscA.frequency.setValueAtTime(261.63, ctx.currentTime); // C4

      const oscB = ctx.createOscillator();
      const gainB = ctx.createGain();
      oscB.type = 'triangle';
      oscB.frequency.setValueAtTime(392.0, ctx.currentTime); // G4

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2200, ctx.currentTime);

      gainA.connect(filter);
      gainB.connect(filter);
      filter.connect(ctx.destination);

      const now = ctx.currentTime;
      const fadeOutStart = Math.max(0.5, durationSec - crossSec);

      gainA.gain.setValueAtTime(0.2, now);
      if (crossSec > 0) {
        gainA.gain.setValueAtTime(0.2, now + fadeOutStart);
        gainA.gain.linearRampToValueAtTime(0.0001, now + durationSec);
      } else {
        gainA.gain.setValueAtTime(0.2, now + durationSec - 0.05);
        gainA.gain.setValueAtTime(0.0001, now + durationSec);
      }

      gainB.gain.setValueAtTime(0.0001, now);
      if (crossSec > 0) {
        gainB.gain.setValueAtTime(0.0001, now + fadeOutStart);
        gainB.gain.linearRampToValueAtTime(0.2, now + durationSec);
      } else {
        gainB.gain.setValueAtTime(0.0001, now + durationSec - 0.01);
        gainB.gain.setValueAtTime(0.2, now + durationSec);
      }

      oscA.start(now);
      oscB.start(now);
      oscA.stop(now + durationSec + 0.5);
      oscB.stop(now + durationSec + 0.5);

      setIsAuditioning(true);
      setAuditionProgress(0);

      const startMs = Date.now();
      const totalMs = durationSec * 1000;
      const timer = window.setInterval(() => {
        const elapsed = Date.now() - startMs;
        const p = Math.min(100, (elapsed / totalMs) * 100);
        setAuditionProgress(p);
        if (elapsed >= totalMs) {
          window.clearInterval(timer);
          setIsAuditioning(false);
          setAuditionProgress(0);
        }
      }, 50);

      auditionAudioRef.current = {
        stop: () => {
          window.clearInterval(timer);
          try {
            oscA.stop();
            oscB.stop();
            ctx.close();
          } catch {}
        },
      };
    } catch (err) {
      console.warn('Web Audio audition error:', err);
      setIsAuditioning(false);
    }
  };

  const crossfadeSec = localSettings.crossfadeDuration;
  const isOff = crossfadeSec === 0;
  const currentEq = EQUALIZER_CONFIGS[localSettings.equalizer] || EQUALIZER_CONFIGS['bass-boost'];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="spotify-settings-title"
    >
      <div
        className="relative w-full max-w-2xl max-h-[92vh] bg-[#121216] border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col text-neutral-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-white/10 bg-[#16161c]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#1ed760]/20 to-emerald-500/20 border border-[#1ed760]/30 flex items-center justify-center text-[#1ed760] shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="spotify-settings-title" className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                  Settings
                </h2>
                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-[#1ed760] text-black font-mono">
                  SPOTIFY PRO
                </span>
              </div>
              <p className="text-xs text-neutral-400">Audio playback, equalizer, app themes & downloads</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleReset}
              className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors text-xs flex items-center gap-1 cursor-pointer"
              title="Reset all settings to default"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
            <button
              onClick={handleClose}
              className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close settings"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation (Horizontal Scrollable Pills) */}
        <div className="flex items-center gap-1 px-4 sm:px-6 py-2.5 bg-black/40 border-b border-white/5 overflow-x-auto no-scrollbar text-xs">
          <button
            onClick={() => setActiveTab('playback')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'playback'
                ? 'bg-[#1ed760] text-black shadow-md'
                : 'text-neutral-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Playback & EQ</span>
          </button>
          <button
            onClick={() => setActiveTab('quality')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'quality'
                ? 'bg-[#1ed760] text-black shadow-md'
                : 'text-neutral-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Audio Quality</span>
          </button>
          <button
            onClick={() => setActiveTab('appearance')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'appearance'
                ? 'bg-[#1ed760] text-black shadow-md'
                : 'text-neutral-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Theme & Look</span>
          </button>
          <button
            onClick={() => setActiveTab('storage')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'storage'
                ? 'bg-[#1ed760] text-black shadow-md'
                : 'text-neutral-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Storage & Cache</span>
          </button>
          <button
            onClick={() => setActiveTab('languages')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'languages'
                ? 'bg-[#1ed760] text-black shadow-md'
                : 'text-neutral-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Languages</span>
          </button>
          <button
            onClick={() => setActiveTab('account')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'account'
                ? 'bg-[#1ed760] text-black shadow-md'
                : 'text-neutral-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Account</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          {/* TAB 1: Playback & Equalizer */}
          {activeTab === 'playback' && (
            <div className="space-y-5">
              {/* Equalizer (Spotify Signature) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#1ed760]" />
                    <span className="font-extrabold text-white text-sm sm:text-base">Studio Equalizer</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#1ed760]/20 text-[#1ed760] border border-[#1ed760]/30">
                    Active: {currentEq.label.split(' ')[0]}
                  </span>
                </div>
                <p className="text-xs text-neutral-400">
                  Select sound profile calibrated for workout energy, deep sub-bass, or vocal acoustics.
                </p>

                {/* 5-Band Frequency Graphic Visualizer */}
                <div className="p-3 rounded-xl bg-black/60 border border-white/5 space-y-2">
                  <div className="flex items-end justify-between h-20 px-4 pt-2">
                    {currentEq.bands.map((b) => {
                      const heightPercent = Math.max(15, Math.min(100, 50 + (b.gain / 6) * 45));
                      const isBoosted = b.gain > 0;
                      return (
                        <div key={b.freq} className="flex flex-col items-center gap-1 h-full justify-end">
                          <span className="text-[9px] font-mono text-[#1ed760]">
                            {b.gain > 0 ? `+${b.gain}` : b.gain}dB
                          </span>
                          <div className="w-7 sm:w-10 bg-neutral-800 rounded-t-md overflow-hidden flex items-end h-14">
                            <div
                              style={{ height: `${heightPercent}%` }}
                              className={`w-full rounded-t-md transition-all duration-300 ${
                                isBoosted
                                  ? 'bg-gradient-to-t from-emerald-600 to-[#1ed760]'
                                  : 'bg-neutral-600'
                              }`}
                            />
                          </div>
                          <span className="text-[9px] font-mono text-neutral-400">{b.freq}</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-center text-neutral-300 italic pt-1">
                    "{currentEq.description}"
                  </p>
                </div>

                {/* Equalizer Preset Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {(Object.keys(EQUALIZER_CONFIGS) as EqualizerPreset[]).map((presetKey) => {
                    const preset = EQUALIZER_CONFIGS[presetKey];
                    const isSelected = localSettings.equalizer === presetKey;
                    return (
                      <button
                        key={presetKey}
                        onClick={() => updateSetting('equalizer', presetKey)}
                        className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#1ed760]/15 border-[#1ed760] text-white shadow-sm'
                            : 'bg-white/5 border-white/5 text-neutral-300 hover:bg-white/10'
                        }`}
                      >
                        <p className="text-xs font-bold truncate">{preset.label}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Crossfade Songs */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3.5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm sm:text-base">Crossfade Songs</span>
                      <span
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border transition-all ${
                          isOff
                            ? 'bg-neutral-800 text-neutral-400 border-neutral-700'
                            : 'bg-[#1ed760]/20 text-[#1ed760] border-[#1ed760]/40'
                        }`}
                      >
                        {isOff ? 'Off (0s)' : `${crossfadeSec}s`}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Smoothly blends the ending of the current track into the next song without pauses.
                    </p>
                  </div>

                  <button
                    onClick={handleToggleAudition}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all border cursor-pointer ${
                      isAuditioning
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 animate-pulse'
                        : 'bg-white/10 hover:bg-white/15 border-white/10 text-neutral-200'
                    }`}
                  >
                    {isAuditioning ? (
                      <>
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span>Stop ({Math.round(auditionProgress)}%)</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current text-[#1ed760]" />
                        <span>Audition</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="space-y-2 pt-1">
                  <input
                    type="range"
                    min={0}
                    max={12}
                    step={1}
                    value={crossfadeSec}
                    onChange={(e) => updateSetting('crossfadeDuration', parseInt(e.target.value, 10))}
                    className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer focus:outline-none accent-[#1ed760]"
                    aria-label="Crossfade duration in seconds"
                  />
                  <div className="flex justify-between items-center text-[10px] font-mono text-neutral-500 px-1">
                    {[0, 2, 4, 6, 8, 10, 12].map((s) => (
                      <span key={s}>{s === 0 ? 'Off' : `${s}s`}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Gapless Playback Toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="space-y-0.5 pr-4">
                  <span className="font-bold text-white text-sm">Gapless Playback</span>
                  <p className="text-xs text-neutral-400">
                    Eliminates awkward pauses between continuous live tracks and DJ sets.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => updateSetting('gaplessPlayback', !localSettings.gaplessPlayback)}
                  className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    localSettings.gaplessPlayback ? 'bg-[#1ed760]' : 'bg-neutral-800'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                      localSettings.gaplessPlayback ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Automix Toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="space-y-0.5 pr-4">
                  <span className="font-bold text-white text-sm">Spotify Automix</span>
                  <p className="text-xs text-neutral-400">
                    Allows seamless, beat-matched transitions between songs in Spotify workout playlists.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => updateSetting('automix', !localSettings.automix)}
                  className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    localSettings.automix ? 'bg-[#1ed760]' : 'bg-neutral-800'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                      localSettings.automix ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Normalize Volume & Volume Level */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 pr-4">
                    <span className="font-bold text-white text-sm">Normalize Volume</span>
                    <p className="text-xs text-neutral-400">
                      Plays all songs at an even volume so you don't have to adjust between songs.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateSetting('volumeNormalization', !localSettings.volumeNormalization)}
                    className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      localSettings.volumeNormalization ? 'bg-[#1ed760]' : 'bg-neutral-800'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                        localSettings.volumeNormalization ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {localSettings.volumeNormalization && (
                  <div className="pt-2 border-t border-white/5 space-y-2">
                    <span className="text-xs font-semibold text-neutral-300">Volume Level:</span>
                    <div className="grid grid-cols-3 gap-2">
                      {(['quiet', 'normal', 'loud'] as VolumeLevel[]).map((level) => {
                        const isSelected = localSettings.volumeLevel === level;
                        return (
                          <button
                            key={level}
                            onClick={() => updateSetting('volumeLevel', level)}
                            className={`p-2 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#1ed760] text-black shadow-md'
                                : 'bg-white/5 hover:bg-white/10 text-neutral-300'
                            }`}
                          >
                            {level === 'loud' ? '🔊 Loud (Gym)' : level === 'normal' ? '🔉 Normal' : '🔈 Quiet'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Mono Audio Toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="space-y-0.5 pr-4">
                  <span className="font-bold text-white text-sm">Mono Audio</span>
                  <p className="text-xs text-neutral-400">
                    Makes left and right speakers play the same audio. Perfect for 1-earbud workout sessions.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => updateSetting('monoAudio', !localSettings.monoAudio)}
                  className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    localSettings.monoAudio ? 'bg-[#1ed760]' : 'bg-neutral-800'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                      localSettings.monoAudio ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Background & Lock Screen Playback Toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-[#1ed760]/5 border border-[#1ed760]/30">
                <div className="space-y-0.5 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">Background & Lock Screen Play</span>
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-[#1ed760] text-black font-mono">
                      LOCK SCREEN ON
                    </span>
                  </div>
                  <p className="text-xs text-neutral-300">
                    Keeps songs playing when your phone screen locks or browser is minimized, with lock-screen & Bluetooth controls.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={localSettings.lockScreenPlayback}
                  aria-label="Toggle Background and Lock Screen Playback"
                  onClick={() => updateSetting('lockScreenPlayback', !localSettings.lockScreenPlayback)}
                  className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    localSettings.lockScreenPlayback ? 'bg-[#1ed760]' : 'bg-neutral-800'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                      localSettings.lockScreenPlayback ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Smart Taste Auto-Next Toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="space-y-0.5 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">Smart Auto-Next Suggestions</span>
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-[#1ed760] border border-[#1ed760]/30 font-mono">
                      FOR YOU
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400">
                    Automatically queues and plays the next song matching what you’ve played, liked, and finished.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={localSettings.smartAutoNext}
                  aria-label="Toggle Smart Auto-Next Suggestions"
                  onClick={() => updateSetting('smartAutoNext', !localSettings.smartAutoNext)}
                  className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    localSettings.smartAutoNext ? 'bg-[#1ed760]' : 'bg-neutral-800'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                      localSettings.smartAutoNext ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Audio Quality & Streaming */}
          {activeTab === 'quality' && (
            <div className="space-y-5">
              {/* Streaming Quality */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3.5">
                <div>
                  <span className="font-bold text-white text-sm sm:text-base">Streaming Audio Quality</span>
                  <p className="text-xs text-neutral-400">
                    Controls bitrate and fidelity when streaming over WiFi and cellular data.
                  </p>
                </div>

                <div className="space-y-2">
                  {[
                    { id: 'low', label: 'Low', kbps: '24 kbit/s', desc: 'Minimal data usage' },
                    { id: 'normal', label: 'Normal', kbps: '96 kbit/s', desc: 'Balanced for slow networks' },
                    { id: 'high', label: 'High (Recommended)', kbps: '160 kbit/s', desc: 'Rich dynamic range' },
                    { id: 'lossless', label: 'Very High / Lossless', kbps: '320 kbit/s', desc: 'Studio master quality' },
                  ].map((q) => {
                    const isSelected = localSettings.audioQuality === q.id;
                    return (
                      <div
                        key={q.id}
                        onClick={() => updateSetting('audioQuality', q.id as AudioStreamingQuality)}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#1ed760]/15 border-[#1ed760] text-white shadow-sm'
                            : 'bg-white/5 border-white/5 text-neutral-300 hover:bg-white/10'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs sm:text-sm">{q.label}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-[#1ed760]">
                              {q.kbps}
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-400">{q.desc}</p>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected ? 'border-[#1ed760] bg-[#1ed760]' : 'border-neutral-500'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-black stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Auto Adjust Quality */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="space-y-0.5 pr-4">
                  <span className="font-bold text-white text-sm">Auto-Adjust Quality</span>
                  <p className="text-xs text-neutral-400">
                    Adjusts streaming quality automatically when your internet connection is unstable.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => updateSetting('autoAdjustQuality', !localSettings.autoAdjustQuality)}
                  className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    localSettings.autoAdjustQuality ? 'bg-[#1ed760]' : 'bg-neutral-800'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                      localSettings.autoAdjustQuality ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Data Saver Mode */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="space-y-0.5 pr-4">
                  <span className="font-bold text-white text-sm">Data Saver Mode</span>
                  <p className="text-xs text-neutral-400">
                    Reduces cellular data by lowering stream bitrate and disabling background animations.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => updateSetting('dataSaver', !localSettings.dataSaver)}
                  className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    localSettings.dataSaver ? 'bg-[#1ed760]' : 'bg-neutral-800'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                      localSettings.dataSaver ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Appearance & Theme (Make Changes in App) */}
          {activeTab === 'appearance' && (
            <div className="space-y-5">
              {/* App Theme Picker */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3.5">
                <div>
                  <span className="font-bold text-white text-sm sm:text-base">App Color Theme</span>
                  <p className="text-xs text-neutral-400">
                    Change the look and visual style of the application.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      id: 'spotify-dark',
                      name: 'Spotify Dark',
                      desc: 'Classic obsidian dark #0f0f12',
                      previewBg: 'bg-[#0f0f12]',
                      accent: '#1ed760',
                    },
                    {
                      id: 'amoled-black',
                      name: 'AMOLED Pitch Black',
                      desc: '100% Pure Black (Battery Saver)',
                      previewBg: 'bg-black',
                      accent: '#1ed760',
                    },
                    {
                      id: 'gym-neon',
                      name: 'Gym Beast Neon',
                      desc: 'High-energy glowing neon accents',
                      previewBg: 'bg-[#0a0f0d]',
                      accent: '#00ff66',
                    },
                  ].map((themeOpt) => {
                    const isSelected = localSettings.theme === themeOpt.id;
                    return (
                      <div
                        key={themeOpt.id}
                        onClick={() => {
                          updateSetting('theme', themeOpt.id as AppTheme);
                          if (onShowToast) onShowToast(`Theme changed to ${themeOpt.name} 🎨`);
                        }}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${
                          isSelected
                            ? 'bg-emerald-500/15 border-[#1ed760] shadow-lg shadow-emerald-500/10'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <div className={`h-12 rounded-xl ${themeOpt.previewBg} border border-white/10 p-2 flex items-center justify-between`}>
                          <div className="w-5 h-5 rounded-full" style={{ backgroundColor: themeOpt.accent }} />
                          <div className="space-y-1 w-16">
                            <div className="h-1.5 rounded-full bg-white/30" />
                            <div className="h-1.5 rounded-full bg-white/20 w-10" />
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-extrabold text-white">{themeOpt.name}</p>
                          <p className="text-[10px] text-neutral-400">{themeOpt.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Animated Focus Mode */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="space-y-0.5 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">Animated Focus Mode</span>
                    <span className="text-[10px] font-mono font-semibold text-sky-300">
                      Energy · Melancholy
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400">
                    Transforms the app background into a subtle, slow-moving CSS gradient tuned to the current track’s energy and melancholy levels.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={localSettings.animatedFocusMode}
                  aria-label="Toggle Animated Focus Mode"
                  data-testid="settings-animated-focus-switch"
                  onClick={() => {
                    const next = !localSettings.animatedFocusMode;
                    updateSetting('animatedFocusMode', next);
                    if (onShowToast) {
                      onShowToast(
                        next
                          ? 'Animated Focus mode enabled'
                          : 'Animated Focus mode disabled'
                      );
                    }
                  }}
                  className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    localSettings.animatedFocusMode ? 'bg-[#1ed760]' : 'bg-neutral-800'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                      localSettings.animatedFocusMode ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Compact Mode */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="space-y-0.5 pr-4">
                  <span className="font-bold text-white text-sm">Compact View</span>
                  <p className="text-xs text-neutral-400">
                    Reduces row spacing and image size to display more songs on screen at once.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => updateSetting('compactMode', !localSettings.compactMode)}
                  className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    localSettings.compactMode ? 'bg-[#1ed760]' : 'bg-neutral-800'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                      localSettings.compactMode ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Canvas Animated Video */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="space-y-0.5 pr-4">
                  <span className="font-bold text-white text-sm">Canvas Animated Visuals</span>
                  <p className="text-xs text-neutral-400">
                    Show dynamic short looping video graphics on full song player screen.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => updateSetting('canvasVideo', !localSettings.canvasVideo)}
                  className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    localSettings.canvasVideo ? 'bg-[#1ed760]' : 'bg-neutral-800'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                      localSettings.canvasVideo ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Explicit Content Filter */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="space-y-0.5 pr-4">
                  <span className="font-bold text-white text-sm">Explicit Content Filter</span>
                  <p className="text-xs text-neutral-400">
                    Filter out tracks labeled with explicit lyrics for family listening.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => updateSetting('explicitFilter', !localSettings.explicitFilter)}
                  className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    localSettings.explicitFilter ? 'bg-[#1ed760]' : 'bg-neutral-800'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                      localSettings.explicitFilter ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: Storage & Cache */}
          {activeTab === 'storage' && (
            <div className="space-y-5">
              {/* Storage Meter */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm sm:text-base">Device Storage Overview</span>
                  <span className="text-xs font-mono text-neutral-400">~{cacheInfo.totalMb} MB total used</span>
                </div>

                {/* Multi-segment progress bar */}
                <div className="h-3 w-full bg-neutral-800 rounded-full overflow-hidden flex">
                  <div className="bg-[#1ed760] h-full" style={{ width: '38%' }} title="Downloaded Songs" />
                  <div className="bg-amber-400 h-full" style={{ width: '22%' }} title="Audio Cache" />
                  <div className="bg-neutral-700 h-full" style={{ width: '40%' }} title="Free Space" />
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#1ed760]" />
                    <span className="text-neutral-300">Downloads (18.2 MB)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span className="text-neutral-300">Cache ({cacheInfo.cachedMb} MB)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-neutral-700" />
                    <span className="text-neutral-400">Free (~16 GB)</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-white/5">
                  <div>
                    <p className="text-xs font-bold text-white">Clear Audio Cache</p>
                    <p className="text-[11px] text-neutral-400">
                      Frees up temporary streaming buffer without deleting downloaded offline songs.
                    </p>
                  </div>
                  <button
                    onClick={handleClearCache}
                    className="py-2 px-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {cacheCleared ? <Check className="w-3.5 h-3.5 text-[#1ed760]" /> : <Trash2 className="w-3.5 h-3.5" />}
                    <span>{cacheCleared ? 'Cleared!' : 'Clear Cache'}</span>
                  </button>
                </div>
              </div>

              {/* Download Over Cellular Toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="space-y-0.5 pr-4">
                  <span className="font-bold text-white text-sm">Download Using Cellular Data</span>
                  <p className="text-xs text-neutral-400">
                    Allow downloading songs to offline storage when mobile data is active.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => updateSetting('downloadOverCellular', !localSettings.downloadOverCellular)}
                  className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    localSettings.downloadOverCellular ? 'bg-[#1ed760]' : 'bg-neutral-800'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                      localSettings.downloadOverCellular ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: Languages & Regional Preferences */}
          {activeTab === 'languages' && (
            <div className="space-y-5">
              <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3.5">
                <div>
                  <span className="font-bold text-white text-sm sm:text-base">Music Languages</span>
                  <p className="text-xs text-neutral-400">
                    Select your favorite music languages for radar recommendations and home screen playlists.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: 'kannada', name: 'ಕನ್ನಡ (Kannada)', flag: '🐘' },
                    { id: 'hindi', name: 'हिन्दी (Hindi / Bollywood)', flag: '🪕' },
                    { id: 'english', name: 'English (Global Pop/Rock)', flag: '🌎' },
                    { id: 'punjabi', name: 'ਪੰਜਾਬੀ (Punjabi)', flag: '🥁' },
                    { id: 'tamil', name: 'தமிழ் (Tamil)', flag: '🔥' },
                    { id: 'telugu', name: 'తెలుగు (Telugu)', flag: '⚡' },
                  ].map((l) => {
                    const isSelected = (localSettings.preferredLanguages || []).includes(l.id);
                    return (
                      <div
                        key={l.id}
                        onClick={() => toggleLanguage(l.id)}
                        className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#1ed760]/15 border-[#1ed760] text-white shadow-sm'
                            : 'bg-white/5 border-white/5 text-neutral-400 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm shrink-0">{l.flag}</span>
                          <span className="text-xs font-bold truncate">{l.name}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#1ed760] shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: Account & VIP Status */}
          {activeTab === 'account' && (
            <div className="space-y-5">
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-950/60 to-black border border-emerald-500/30 space-y-4">
                <div className="flex items-center gap-3.5">
                  <img
                    src={currentUser?.avatarUrl || '/assets/apna_music_logo.jpg'}
                    alt={currentUser?.name || 'User Profile'}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-[#1ed760] shadow-md shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-white text-base truncate">
                        {currentUser?.name || 'Gym Beast Warrior'}
                      </h3>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#1ed760] text-black font-mono">
                        VIP ACTIVE
                      </span>
                    </div>
                    <p className="text-xs text-neutral-300 font-mono truncate">
                      {currentUser?.email || 'rohitrrathod1958@gmail.com'}
                    </p>
                    <p className="text-[11px] text-amber-400 font-bold mt-0.5">
                      🔥 {currentUser?.workoutStreak || 7} Day Workout Motivation Streak
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-black/40 border border-white/5 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-neutral-400">Subscription:</span>
                    <p className="font-bold text-white">Warrior VIP (Free Forever)</p>
                  </div>
                  <div>
                    <span className="text-neutral-400">Audio Quality:</span>
                    <p className="font-bold text-[#1ed760] uppercase">{localSettings.audioQuality}</p>
                  </div>
                  <div>
                    <span className="text-neutral-400">Crossfade:</span>
                    <p className="font-bold text-white">{localSettings.crossfadeDuration}s</p>
                  </div>
                  <div>
                    <span className="text-neutral-400">Equalizer:</span>
                    <p className="font-bold text-[#1ed760] capitalize">{localSettings.equalizer}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-white/10 bg-[#16161c] flex items-center justify-between">
          <span className="text-xs font-mono text-neutral-400">
            Apna Music v3.4 • Gym & Spotify Edition
          </span>
          <button
            onClick={handleClose}
            className="px-5 py-2 rounded-xl bg-[#1ed760] hover:bg-[#1db954] text-black font-extrabold text-xs shadow-md shadow-[#1ed760]/20 active:scale-95 transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
