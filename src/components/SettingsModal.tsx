/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sliders,
  SlidersHorizontal,
  Volume2,
  Sparkles,
  Zap,
  Play,
  Square,
  RotateCcw,
  Check,
  Radio,
  Layers,
  Info,
} from 'lucide-react';
import { PlaybackSettings, DEFAULT_PLAYBACK_SETTINGS } from '../utils/playbackSettings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: PlaybackSettings;
  onUpdateSettings: (newSettings: PlaybackSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  const [localSettings, setLocalSettings] = useState<PlaybackSettings>(settings);
  const [isAuditioning, setIsAuditioning] = useState(false);
  const [auditionProgress, setAuditionProgress] = useState(0); // 0 to 100
  const auditionAudioRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    setLocalSettings(settings);
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

      // Filter for warm indie tone
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2200, ctx.currentTime);

      gainA.connect(filter);
      gainB.connect(filter);
      filter.connect(ctx.destination);

      const now = ctx.currentTime;
      const fadeOutStart = Math.max(0.5, durationSec - crossSec);

      // Track A (C chord note) starts full, fades out
      gainA.gain.setValueAtTime(0.2, now);
      if (crossSec > 0) {
        gainA.gain.setValueAtTime(0.2, now + fadeOutStart);
        gainA.gain.linearRampToValueAtTime(0.0001, now + durationSec);
      } else {
        gainA.gain.setValueAtTime(0.2, now + durationSec - 0.05);
        gainA.gain.setValueAtTime(0.0001, now + durationSec);
      }

      // Track B (G chord note) fades in during crossfade window
      gainB.gain.setValueAtTime(0.0001, now);
      if (crossSec > 0) {
        gainB.gain.setValueAtTime(0.0001, now + fadeOutStart);
        gainB.gain.linearRampToValueAtTime(0.2, now + durationSec);
      } else {
        gainB.gain.setValueAtTime(0.2, now + durationSec);
      }

      oscA.start(now);
      oscB.start(now);

      const endTime = now + durationSec + 1;
      oscA.stop(endTime);
      oscB.stop(endTime);

      setIsAuditioning(true);

      const startTime = performance.now();
      const totalMs = (durationSec + 1) * 1000;

      const progressInterval = window.setInterval(() => {
        const elapsed = performance.now() - startTime;
        const pct = Math.min(100, (elapsed / totalMs) * 100);
        setAuditionProgress(pct);

        if (pct >= 100) {
          window.clearInterval(progressInterval);
          setIsAuditioning(false);
          setAuditionProgress(0);
          try {
            ctx.close();
          } catch {}
        }
      }, 50);

      auditionAudioRef.current = {
        stop: () => {
          window.clearInterval(progressInterval);
          try {
            oscA.stop();
            oscB.stop();
            ctx.close();
          } catch {}
        },
      };
    } catch (e) {
      console.warn('Audition error:', e);
      setIsAuditioning(false);
    }
  };

  const crossfadeSec = localSettings.crossfadeDuration;
  const isOff = crossfadeSec === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="playback-settings-title"
    >
      <div
        className="relative w-full max-w-xl max-h-[90vh] bg-[#121216] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-neutral-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-[#16161c]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#1ed760]/20 to-emerald-500/20 border border-[#1ed760]/30 flex items-center justify-center text-[#1ed760]">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 id="playback-settings-title" className="text-lg font-bold text-white tracking-tight">
                Playback Settings
              </h2>
              <p className="text-xs text-neutral-400">Audio transitions & stream quality</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 space-y-7 overflow-y-auto custom-scrollbar">
          {/* SECTION 1: Crossfade Songs */}
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-base">Crossfade Songs</span>
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
                  Allows seamless, gapless transitions between indie songs in your playlist by smoothly
                  fading out the outgoing song while fading in the next.
                </p>
              </div>

              {/* Audition Demo Button */}
              <button
                onClick={handleToggleAudition}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all border ${
                  isAuditioning
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 animate-pulse'
                    : 'bg-white/10 hover:bg-white/15 border-white/10 text-neutral-200'
                }`}
                title="Audition live crossfade transition"
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

            {/* Slider Track with Interactive Marks */}
            <div className="space-y-2 pt-2">
              <div className="relative flex items-center">
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
              </div>

              {/* Step Marks: 0s to 12s */}
              <div className="flex justify-between items-center text-[11px] font-mono text-neutral-500 px-1">
                {[0, 2, 4, 6, 8, 10, 12].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => updateSetting('crossfadeDuration', s)}
                    className={`transition-colors cursor-pointer hover:text-white ${
                      crossfadeSec === s ? 'text-[#1ed760] font-bold scale-110' : ''
                    }`}
                  >
                    {s === 0 ? '0s' : `${s}s`}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {[
                { label: 'Off', val: 0 },
                { label: 'Quick (3s)', val: 3 },
                { label: 'Standard (5s)', val: 5 },
                { label: 'Long Blend (8s)', val: 8 },
                { label: 'Max (12s)', val: 12 },
              ].map((preset) => {
                const isActive = crossfadeSec === preset.val;
                return (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => updateSetting('crossfadeDuration', preset.val)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-[#1ed760] text-black font-bold shadow-md shadow-[#1ed760]/20'
                        : 'bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/5'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {/* Visual Crossfade Curve Diagram */}
            <div className="mt-4 p-3.5 rounded-xl bg-black/40 border border-white/5 relative overflow-hidden">
              <div className="flex items-center justify-between text-[11px] mb-2 font-mono">
                <span className="text-cyan-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
                  Track A (Fade Out)
                </span>
                <span className="text-neutral-400 font-sans text-[11px]">
                  {isOff ? 'Hard Cut (0s overlap)' : `${crossfadeSec}s Smooth Transition`}
                </span>
                <span className="text-[#1ed760] flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#1ed760] inline-block" />
                  Track B (Fade In)
                </span>
              </div>

              {/* Graphic curve SVG */}
              <div className="h-16 w-full relative flex items-center">
                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 300 60">
                  <defs>
                    <linearGradient id="curveA" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.05" />
                    </linearGradient>
                    <linearGradient id="curveB" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#1ed760" stopOpacity="0.05" />
                      <stop offset="100%" stopColor="#1ed760" stopOpacity="0.8" />
                    </linearGradient>
                    <linearGradient id="overlapGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#1ed760" stopOpacity="0.25" />
                    </linearGradient>
                  </defs>

                  {/* Overlap region highlight */}
                  {!isOff && (
                    <rect
                      x={150 - (crossfadeSec / 12) * 110}
                      y="4"
                      width={(crossfadeSec / 12) * 220}
                      height="52"
                      fill="url(#overlapGlow)"
                      rx="6"
                      className="transition-all duration-300"
                    />
                  )}

                  {/* Track A Line: stays high then slopes down */}
                  {isOff ? (
                    <path
                      d="M 10 10 L 149 10 L 149 55 L 290 55"
                      fill="none"
                      stroke="#22d3ee"
                      strokeWidth="2.5"
                    />
                  ) : (
                    <path
                      d={`M 10 10 L ${150 - (crossfadeSec / 12) * 110} 10 C 150 10, ${
                        150 + (crossfadeSec / 12) * 110
                      } 55, 290 55`}
                      fill="none"
                      stroke="#22d3ee"
                      strokeWidth="2.5"
                      className="transition-all duration-300"
                    />
                  )}

                  {/* Track B Line: stays low then slopes up */}
                  {isOff ? (
                    <path
                      d="M 10 55 L 151 55 L 151 10 L 290 10"
                      fill="none"
                      stroke="#1ed760"
                      strokeWidth="2.5"
                    />
                  ) : (
                    <path
                      d={`M 10 55 L ${150 - (crossfadeSec / 12) * 110} 55 C 150 55, ${
                        150 + (crossfadeSec / 12) * 110
                      } 10, 290 10`}
                      fill="none"
                      stroke="#1ed760"
                      strokeWidth="2.5"
                      className="transition-all duration-300"
                    />
                  )}
                </svg>

                {/* Live progress indicator during audition */}
                {isAuditioning && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_white] z-10 transition-all"
                    style={{ left: `${auditionProgress}%` }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* SECTION 2: Flow & Transition Features */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Flow & Continuity
            </h3>

            {/* Gapless Playback */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
              <div className="space-y-0.5 pr-4">
                <p className="text-sm font-semibold text-white">Gapless Playback</p>
                <p className="text-xs text-neutral-400">
                  Eliminates silence between songs for live concerts and continuous concept albums.
                </p>
              </div>
              <button
                type="button"
                onClick={() => updateSetting('gaplessPlayback', !localSettings.gaplessPlayback)}
                className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                  localSettings.gaplessPlayback ? 'bg-[#1ed760]' : 'bg-neutral-800'
                }`}
                role="switch"
                aria-checked={localSettings.gaplessPlayback}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                    localSettings.gaplessPlayback ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Automix / Smart Key-Matching */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
              <div className="space-y-0.5 pr-4">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-white">Automix & Key Matching</p>
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <p className="text-xs text-neutral-400">
                  Dynamically balances BPM and harmonizes transitions between indie genres.
                </p>
              </div>
              <button
                type="button"
                onClick={() => updateSetting('automix', !localSettings.automix)}
                className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                  localSettings.automix ? 'bg-[#1ed760]' : 'bg-neutral-800'
                }`}
                role="switch"
                aria-checked={localSettings.automix}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                    localSettings.automix ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* SECTION 3: Audio Normalization & Streaming Quality */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Audio Fidelity & Normalization
            </h3>

            {/* Volume Normalization */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
              <div className="space-y-0.5 pr-4">
                <p className="text-sm font-semibold text-white">Normalize Volume</p>
                <p className="text-xs text-neutral-400">
                  Sets the same loudness level for all tracks so bedroom lo-fi and studio hits blend evenly.
                </p>
              </div>
              <button
                type="button"
                onClick={() => updateSetting('volumeNormalization', !localSettings.volumeNormalization)}
                className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                  localSettings.volumeNormalization ? 'bg-[#1ed760]' : 'bg-neutral-800'
                }`}
                role="switch"
                aria-checked={localSettings.volumeNormalization}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                    localSettings.volumeNormalization ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Audio Quality Selection */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
              <div>
                <p className="text-sm font-semibold text-white">Audio Streaming Quality</p>
                <p className="text-xs text-neutral-400">
                  Select preferred master audio bitrate for indie stream decoding.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'normal', name: 'Normal', bitrate: '96 kbps' },
                  { id: 'high', name: 'High', bitrate: '160 kbps' },
                  { id: 'lossless', name: 'Lossless Hi-Fi', bitrate: '320 kbps' },
                ].map((q) => {
                  const isSelected = localSettings.audioQuality === q.id;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => updateSetting('audioQuality', q.id as any)}
                      className={`p-2.5 rounded-xl text-left border transition-all ${
                        isSelected
                          ? 'bg-[#1ed760]/15 border-[#1ed760] text-white shadow-sm'
                          : 'bg-white/5 border-white/5 hover:border-white/10 text-neutral-400 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{q.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#1ed760]" />}
                      </div>
                      <span className="text-[10px] text-neutral-500 font-mono block mt-0.5">
                        {q.bitrate}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-[#16161c] flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Default</span>
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="px-5 py-2 rounded-xl bg-[#1ed760] text-black font-bold text-sm hover:brightness-110 active:scale-95 transition-all shadow-md shadow-[#1ed760]/20"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
