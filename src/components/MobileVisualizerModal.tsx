/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Sparkles,
  BarChart3,
  Waves,
  SunMedium,
  Gauge,
  Activity,
} from 'lucide-react';
import { IndieTrack, formatDuration } from '../utils/musicDiscovery';
import {
  D3AudioVisualizer,
  VisualizerMode,
  VisualizerTheme,
  VisualizerPalette,
  THEME_CONFIGS,
} from './D3AudioVisualizer';
import { audioEngine } from '../services/audioEngine';
import { deriveVisualizerVibe, describeVisualizerPace } from '../utils/visualizerVibe';
import {
  computeBeatCounterState,
  computeBeatPulseFrame,
  estimateBeatIntensityFromBins,
  resolveTrackBpm,
} from '../utils/beatPulse';
import { BeatBurstBackground } from './BeatBurstBackground';

type PaletteSelection = 'vibe' | VisualizerTheme;

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
  const [mode, setMode] = useState<VisualizerMode>('bars');
  const [paletteSelection, setPaletteSelection] = useState<PaletteSelection>('vibe');
  const [speedOverride, setSpeedOverride] = useState<number | null>(null);
  const [sensitivity, setSensitivity] = useState<number>(1.2);
  const [beatPulseEnabled, setBeatPulseEnabled] = useState<boolean>(true);
  const [particlesEnabled, setParticlesEnabled] = useState<boolean>(true);
  const [isSeeking, setIsSeeking] = useState(false);
  const [tempSeek, setTempSeek] = useState(0);

  // Refs for zero-re-render GPU-composited beat-pulse transforms & live 4-beat BPM counter
  const beatStageRef = useRef<HTMLDivElement | null>(null);
  const beatAuraRef = useRef<HTMLDivElement | null>(null);
  const beatRingRef = useRef<HTMLDivElement | null>(null);
  const beatDotRef = useRef<HTMLSpanElement | null>(null);
  const bpmCounterRef = useRef<HTMLDivElement | null>(null);
  const beatStepRefs = useRef<Array<HTMLSpanElement | null>>([null, null, null, null]);
  const beatOriginRef = useRef<number>(0);

  // Frequency statistics for real-time live readout
  const [freqStats, setFreqStats] = useState({ bass: 0, mid: 0, treble: 0 });

  // Derive live color palette, animation speed, and tempo from active track metadata
  const vibeConfig = useMemo(() => deriveVisualizerVibe(track), [track]);
  const resolvedBpm = useMemo(() => resolveTrackBpm(track), [track]);

  // Anchor beat clock cleanly when the active track changes
  useEffect(() => {
    beatOriginRef.current = typeof performance !== 'undefined' ? performance.now() : 0;
  }, [track?.id]);

  // GPU-composited BPM + bass beat-pulse scaling loop (no React setState per frame)
  useEffect(() => {
    if (!isOpen || !track) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let rafId = 0;
    let lastFrameTs = 0;
    let lastAttrTs = 0;
    let smoothedBass = 0;

    const applyFrame = (ts: number, forceAttrs = false) => {
      const freqData = audioEngine.getByteFrequencyData();
      const instantBass = estimateBeatIntensityFromBins(freqData);
      smoothedBass = smoothedBass * 0.62 + instantBass * 0.38;

      const elapsedMs = Math.max(0, ts - beatOriginRef.current);
      const frame = computeBeatPulseFrame({
        elapsedMs,
        bpm: resolvedBpm.bpm,
        energy: vibeConfig.profile.energy,
        melancholy: vibeConfig.profile.melancholy,
        bassIntensity: smoothedBass,
        sensitivity,
        isPlaying,
        enabled: beatPulseEnabled,
        prefersReducedMotion,
      });

      const counter = computeBeatCounterState(elapsedMs, resolvedBpm.bpm, isPlaying);

      const stageEl = beatStageRef.current;
      if (stageEl) {
        stageEl.style.transform = `scale3d(${frame.scale}, ${frame.scale}, 1)`;
        if (forceAttrs || ts - lastAttrTs >= 100) {
          lastAttrTs = ts;
          stageEl.dataset.beatScale = frame.scale.toFixed(4);
          stageEl.dataset.beatStrength = frame.pulseStrength.toFixed(3);
          stageEl.dataset.beatDownbeat = String(frame.isDownbeat);
        }
      }

      const counterEl = bpmCounterRef.current;
      if (counterEl && counterEl.dataset.beatNumber !== String(counter.beatNumber)) {
        counterEl.dataset.beatNumber = String(counter.beatNumber);
      }

      const accentColor =
        paletteSelection === 'vibe'
          ? vibeConfig.palette.primary
          : THEME_CONFIGS[paletteSelection].primary;

      for (let i = 0; i < 4; i++) {
        const stepEl = beatStepRefs.current[i];
        if (!stepEl) continue;
        const stepNum = i + 1;
        const isActiveBeat = beatPulseEnabled && isPlaying && counter.beatNumber === stepNum;
        if (isActiveBeat) {
          stepEl.style.backgroundColor = accentColor;
          stepEl.style.opacity = counter.isDownbeat ? '1' : '0.82';
          stepEl.style.transform = `scaleY(${stepNum === 1 ? 1.35 : 1.15})`;
        } else {
          stepEl.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
          stepEl.style.opacity = beatPulseEnabled ? '0.55' : '0.25';
          stepEl.style.transform = 'scaleY(0.72)';
        }
      }

      const auraEl = beatAuraRef.current;
      if (auraEl) {
        auraEl.style.opacity = String(frame.auraOpacity);
      }

      const ringEl = beatRingRef.current;
      if (ringEl) {
        ringEl.style.transform = `scale3d(${frame.ringScale}, ${frame.ringScale}, 1)`;
        ringEl.style.opacity = String(frame.ringOpacity);
      }

      const dotEl = beatDotRef.current;
      if (dotEl) {
        if (!beatPulseEnabled) {
          dotEl.style.opacity = '0.28';
          dotEl.style.transform = 'scale(1)';
        } else {
          dotEl.style.opacity = String(
            frame.isDownbeat ? 1 : Number((0.35 + frame.pulseStrength * 0.45).toFixed(2))
          );
          dotEl.style.transform = `scale(${frame.isDownbeat ? 1.32 : 1})`;
        }
      }
    };

    // Apply initial frame synchronously so toggle/track changes reflect immediately
    applyFrame(typeof performance !== 'undefined' ? performance.now() : 0, true);

    if (!beatPulseEnabled) {
      return undefined;
    }

    const tick = (ts: number) => {
      if (lastFrameTs === 0 || ts - lastFrameTs >= 30) {
        lastFrameTs = ts;
        applyFrame(ts);
      }
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [
    isOpen,
    track,
    isPlaying,
    beatPulseEnabled,
    paletteSelection,
    resolvedBpm.bpm,
    vibeConfig.palette.primary,
    vibeConfig.profile.energy,
    vibeConfig.profile.melancholy,
    sensitivity,
  ]);

  useEffect(() => {
    if (!isOpen) return;

    let lastBass = -1;
    let lastMid = -1;
    let lastTreble = -1;

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

        const nextBass = Math.round((b / third / 255) * 100);
        const nextMid = Math.round((m / third / 255) * 100);
        const nextTreble = Math.round((t / (data.length - third * 2) / 255) * 100);

        if (nextBass !== lastBass || nextMid !== lastMid || nextTreble !== lastTreble) {
          lastBass = nextBass;
          lastMid = nextMid;
          lastTreble = nextTreble;
          setFreqStats({ bass: nextBass, mid: nextMid, treble: nextTreble });
        }
      }
    };

    updateStats();
    const intervalId = window.setInterval(updateStats, 100);
    return () => window.clearInterval(intervalId);
  }, [isOpen]);

  if (!isOpen || !track) return null;

  const isAutoPalette = paletteSelection === 'vibe';
  const activePalette: VisualizerPalette = isAutoPalette
    ? vibeConfig.palette
    : THEME_CONFIGS[paletteSelection];
  const activeSpeed = speedOverride ?? vibeConfig.speedMultiplier;
  const activePaceLabel = describeVisualizerPace(activeSpeed);
  const energyPercent = Math.round(vibeConfig.profile.energy * 100);
  const melancholyPercent = Math.round(vibeConfig.profile.melancholy * 100);

  const effectiveDuration = duration || track.duration;
  const displayTime = isSeeking ? tempSeek : currentTime;

  const modeButtons: Array<{ id: VisualizerMode; label: string; icon: React.ReactNode }> = [
    { id: 'bars', label: 'Bars', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'wave', label: 'Wave', icon: <Waves className="w-4 h-4" /> },
    { id: 'radial', label: 'Radial', icon: <SunMedium className="w-4 h-4" /> },
    { id: 'particles', label: 'Orbs', icon: <Sparkles className="w-4 h-4" /> },
  ];

  const themesList: Array<{ id: PaletteSelection; name: string; color: string; secondary?: string }> = [
    {
      id: 'vibe',
      name: 'Auto Vibe',
      color: vibeConfig.palette.primary,
      secondary: vibeConfig.palette.secondary,
    },
    { id: 'emerald', name: 'Emerald', color: '#1ed760' },
    { id: 'sunset', name: 'Sunset', color: '#f43f5e' },
    { id: 'cyber', name: 'Cyber', color: '#06b6d4' },
    { id: 'amber', name: 'Vinyl', color: '#f59e0b' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-neutral-950/92 backdrop-blur-xl animate-fade-in text-white overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="D3 Real-time Audio Visualizer"
    >
      {/* Beat-Intensity Synchronized Light-Burst Particle Background */}
      <BeatBurstBackground
        enabled={particlesEnabled}
        isPlaying={isPlaying}
        bpm={resolvedBpm.bpm}
        energy={vibeConfig.profile.energy}
        speedMultiplier={activeSpeed}
        sensitivity={sensitivity}
        beatPulseEnabled={beatPulseEnabled}
        palette={activePalette}
        beatOriginRef={beatOriginRef}
      />

      {/* Top Header bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-neutral-950/80 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="w-3 h-3 rounded-sm shrink-0 transition-colors duration-500"
            style={{
              background: `linear-gradient(135deg, ${activePalette.primary}, ${activePalette.secondary})`,
            }}
            aria-hidden="true"
          />
          <div className="flex items-center gap-2 min-w-0 text-xs">
            <span className="font-semibold tracking-tight text-white whitespace-nowrap">
              Audio Spectrum
            </span>
            <span className="text-neutral-600" aria-hidden="true">
              ·
            </span>
            <span
              data-testid="visualizer-vibe-label"
              className="font-medium truncate transition-colors duration-500"
              style={{ color: activePalette.primary }}
            >
              {vibeConfig.vibeLabel}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="min-h-[40px] min-w-[40px] flex items-center justify-center text-neutral-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
          aria-label="Close visualizer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Visualizer Content Area */}
      <div className="relative z-10 flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 py-4 space-y-4">
        {/* Track Info + Live Sonic Profile Card */}
        <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 shadow-lg space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={track.coverUrl}
                alt={track.title}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-xl object-cover shadow-md border border-white/10 shrink-0"
              />
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-bold text-white truncate">{track.title}</h2>
                <p className="text-xs text-neutral-400 truncate">{track.artist}</p>
                <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-neutral-400 font-mono tabular-nums truncate">
                  <span data-testid="visualizer-bpm-readout">
                    {resolvedBpm.isEstimated ? `~${resolvedBpm.bpm}` : resolvedBpm.bpm} BPM
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">{track.genre}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onToggleLike(track.id)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 active:scale-90 transition-all shrink-0 cursor-pointer"
              aria-label={isLiked ? 'Unlike track' : 'Like track'}
            >
              <Heart
                className={`w-5 h-5 ${
                  isLiked ? 'text-rose-500 fill-rose-500' : 'text-neutral-400'
                }`}
              />
            </button>
          </div>

          {/* Track Sonic Profile Readout (Energy / Melancholy -> Palette & Speed) */}
          <div
            data-testid="visualizer-vibe-summary"
            className="pt-2.5 border-t border-white/[0.08] space-y-2"
          >
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-neutral-300 font-medium truncate">
                {activePalette.name}
                <span className="text-neutral-500 mx-1.5" aria-hidden="true">
                  ·
                </span>
                <span className="text-neutral-400">
                  {isAutoPalette ? 'Synced to track vibe' : 'Manual palette'}
                </span>
              </span>
              <span
                data-testid="visualizer-sonic-speed"
                className="font-mono text-neutral-200 tabular-nums whitespace-nowrap shrink-0"
              >
                {activeSpeed.toFixed(2)}x · {activePaceLabel}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-neutral-400">Energy</span>
                  <span
                    data-testid="visualizer-sonic-energy"
                    className="font-mono font-semibold text-neutral-200 tabular-nums"
                  >
                    {energyPercent}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${energyPercent}%`,
                      backgroundColor: activePalette.primary,
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-neutral-400">Melancholy</span>
                  <span
                    data-testid="visualizer-sonic-melancholy"
                    className="font-mono font-semibold text-neutral-200 tabular-nums"
                  >
                    {melancholyPercent}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${melancholyPercent}%`,
                      backgroundColor: activePalette.secondary,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* D3 Real-Time Visualizer Stage */}
        <div
          className="relative w-full rounded-2xl bg-black/60 border p-3 sm:p-4 shadow-2xl flex flex-col items-center justify-center overflow-hidden min-h-[260px] sm:min-h-[300px] transition-colors duration-500"
          style={{ borderColor: `${activePalette.primary}33` }}
        >
          {/* Subtle Background Radial Aura synced to active sonic palette & beat pulse */}
          <div
            ref={beatAuraRef}
            className="absolute inset-0 pointer-events-none blur-3xl will-change-[opacity]"
            style={{
              opacity: 0.22,
              background: `radial-gradient(circle at 50% 45%, ${activePalette.primary}, ${activePalette.tertiary} 55%, transparent 78%)`,
            }}
          />

          {/* Stage Top Bar: Mode Sync Status & Live 4-Beat BPM Counter */}
          <div className="relative z-10 w-full flex items-center justify-between gap-2 pb-2 mb-1 border-b border-white/[0.08]">
            <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 min-w-0">
              <span className="font-medium text-neutral-200 capitalize whitespace-nowrap">
                {mode === 'bars' ? 'Spectrum Bars' : mode}
              </span>
              <span className="text-neutral-600" aria-hidden="true">
                ·
              </span>
              <span className="truncate">
                {beatPulseEnabled
                  ? mode === 'bars'
                    ? 'Secondary BPM Sync'
                    : 'BPM Beat Pulse'
                  : 'Beat Sync Off'}
              </span>
            </div>

            <div
              ref={bpmCounterRef}
              data-testid="visualizer-bpm-counter"
              data-bpm={resolvedBpm.bpm}
              data-bpm-estimated={String(resolvedBpm.isEstimated)}
              data-beat-number="1"
              className="flex items-center gap-2.5 shrink-0"
              aria-label={`Tempo ${resolvedBpm.bpm} BPM${resolvedBpm.isEstimated ? ' estimated' : ''}`}
            >
              <div className="flex items-baseline gap-1 font-mono tabular-nums leading-none">
                <span className="text-sm sm:text-base font-bold text-white">
                  {resolvedBpm.isEstimated ? `~${resolvedBpm.bpm}` : resolvedBpm.bpm}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                  BPM
                </span>
              </div>

              {/* 4-beat cadence meter synced via direct refs */}
              <div className="flex items-center gap-1 h-4" aria-hidden="true">
                {[0, 1, 2, 3].map((idx) => (
                  <span
                    key={idx}
                    ref={(el) => {
                      beatStepRefs.current[idx] = el;
                    }}
                    className="w-1 h-3 rounded-full origin-bottom transition-transform duration-75"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      opacity: 0.5,
                      transform: 'scaleY(0.72)',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Centered Beat-Pulse Stage: scales central visualizer + emits subtle downbeat ring */}
          <div className="relative w-full flex items-center justify-center py-2">
            <div
              ref={beatRingRef}
              aria-hidden="true"
              className="pointer-events-none absolute w-44 h-44 sm:w-52 sm:h-52 rounded-full border will-change-transform"
              style={{
                opacity: 0,
                borderColor: `${activePalette.primary}88`,
                boxShadow: `0 0 28px ${activePalette.glow}, inset 0 0 18px ${activePalette.glow}`,
              }}
            />

            <div
              ref={beatStageRef}
              data-testid="visualizer-beat-stage"
              data-bpm={resolvedBpm.bpm}
              data-bpm-estimated={String(resolvedBpm.isEstimated)}
              data-beat-pulse-enabled={String(beatPulseEnabled)}
              data-beat-scale="1.0000"
              data-beat-strength="0.000"
              data-beat-downbeat="false"
              className="relative z-10 w-full flex items-center justify-center origin-center will-change-transform"
            >
              <D3AudioVisualizer
                isPlaying={isPlaying}
                variant="expanded"
                mode={mode}
                theme={isAutoPalette ? 'emerald' : paletteSelection}
                customPalette={activePalette}
                speedMultiplier={activeSpeed}
                sensitivity={sensitivity}
                bpm={resolvedBpm.bpm}
                beatPulseEnabled={beatPulseEnabled}
                energy={vibeConfig.profile.energy}
                melancholy={vibeConfig.profile.melancholy}
                beatOriginRef={beatOriginRef}
                height={240}
                className="w-full"
              />
            </div>
          </div>

          {/* Real-time Frequency EQ Meters */}
          <div className="w-full grid grid-cols-3 gap-2 mt-2 pt-2.5 border-t border-white/10 z-10">
            <div className="flex flex-col items-center bg-white/[0.03] py-1.5 px-2 rounded-xl">
              <span className="text-[11px] font-medium text-neutral-400">Low / Bass</span>
              <div className="w-full bg-white/10 h-1.5 rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-75"
                  style={{
                    width: `${freqStats.bass}%`,
                    backgroundColor: activePalette.primary,
                  }}
                />
              </div>
              <span className="text-[11px] font-mono text-neutral-300 tabular-nums mt-0.5">
                {freqStats.bass}%
              </span>
            </div>

            <div className="flex flex-col items-center bg-white/[0.03] py-1.5 px-2 rounded-xl">
              <span className="text-[11px] font-medium text-neutral-400">Mid / Voice</span>
              <div className="w-full bg-white/10 h-1.5 rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-75"
                  style={{
                    width: `${freqStats.mid}%`,
                    backgroundColor: activePalette.secondary,
                  }}
                />
              </div>
              <span className="text-[11px] font-mono text-neutral-300 tabular-nums mt-0.5">
                {freqStats.mid}%
              </span>
            </div>

            <div className="flex flex-col items-center bg-white/[0.03] py-1.5 px-2 rounded-xl">
              <span className="text-[11px] font-medium text-neutral-400">High / Air</span>
              <div className="w-full bg-white/10 h-1.5 rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-75"
                  style={{
                    width: `${freqStats.treble}%`,
                    backgroundColor: activePalette.tertiary,
                  }}
                />
              </div>
              <span className="text-[11px] font-mono text-neutral-300 tabular-nums mt-0.5">
                {freqStats.treble}%
              </span>
            </div>
          </div>
        </div>

        {/* Touch-Friendly Mode, Dynamic Palette & Speed Controls */}
        <div className="space-y-3.5 bg-white/[0.03] border border-white/10 p-4 rounded-2xl">
          {/* Mode Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-300">Visualizer Style</span>
              <span className="text-[11px] font-mono text-neutral-400 capitalize">{mode}</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {modeButtons.map((btn) => {
                const isActive = mode === btn.id;
                return (
                  <button
                    key={btn.id}
                    type="button"
                    onClick={() => setMode(btn.id)}
                    aria-pressed={isActive}
                    className={`min-h-[40px] flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-medium transition-all active:scale-95 whitespace-nowrap cursor-pointer ${
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

          {/* Color Palette Selector (Auto Vibe + Manual Presets) */}
          <div className="pt-2.5 border-t border-white/[0.08]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-300">Color Palette</span>
              <span className="text-[11px] text-neutral-400">
                {isAutoPalette ? `Auto · ${vibeConfig.palette.name}` : activePalette.name}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {themesList.map((th) => {
                const isActive = paletteSelection === th.id;
                return (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => setPaletteSelection(th.id)}
                    aria-pressed={isActive}
                    className={`min-h-[40px] py-2 px-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 border transition-all active:scale-95 whitespace-nowrap cursor-pointer ${
                      th.id === 'vibe' ? 'col-span-2 sm:col-span-1' : ''
                    } ${
                      isActive
                        ? 'border-white bg-white/15 text-white font-semibold'
                        : 'border-white/10 bg-white/5 text-neutral-400 hover:text-neutral-200 hover:bg-white/10'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{
                        background: th.secondary
                          ? `linear-gradient(135deg, ${th.color}, ${th.secondary})`
                          : th.color,
                      }}
                    />
                    <span>{th.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Motion Speed (Auto-Synced to Track Vibe) & Beat Sensitivity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2.5 border-t border-white/[0.08]">
            {/* Speed */}
            <div>
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-neutral-400" />
                  Motion Speed
                </span>
                <div className="flex items-center gap-2">
                  {speedOverride !== null && (
                    <button
                      type="button"
                      onClick={() => setSpeedOverride(null)}
                      className="text-[11px] font-semibold hover:underline cursor-pointer"
                      style={{ color: activePalette.primary }}
                    >
                      Sync Auto
                    </button>
                  )}
                  <span className="text-[11px] font-mono text-neutral-300 tabular-nums">
                    {speedOverride === null ? `Auto ${activeSpeed.toFixed(2)}x` : `${activeSpeed.toFixed(2)}x`}
                  </span>
                </div>
              </div>
              <input
                type="range"
                min={0.45}
                max={2.1}
                step={0.05}
                value={activeSpeed}
                onChange={(e) => setSpeedOverride(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-white/15 rounded-full appearance-none cursor-pointer focus:outline-none accent-white"
                aria-label="Visualizer motion speed"
              />
            </div>

            {/* Sensitivity Slider */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-neutral-300">Beat Sensitivity</span>
                <span className="text-[11px] font-mono text-neutral-300 tabular-nums">
                  {sensitivity.toFixed(1)}x
                </span>
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

          {/* BPM Beat-Pulse & Light-Burst Background Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2.5 border-t border-white/[0.08]">
            {/* Beat Pulse Switch */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <Activity className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <span className="text-xs font-semibold text-neutral-300 whitespace-nowrap">
                  Beat Pulse
                </span>
                <span
                  ref={beatDotRef}
                  aria-hidden="true"
                  className="w-2 h-2 rounded-full shrink-0 transition-transform duration-75"
                  style={{ backgroundColor: activePalette.primary, opacity: 0.45 }}
                />
                <span className="text-[11px] font-mono text-neutral-400 tabular-nums whitespace-nowrap">
                  {resolvedBpm.isEstimated ? `~${resolvedBpm.bpm}` : resolvedBpm.bpm} BPM
                </span>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={beatPulseEnabled}
                aria-label="Toggle beat pulse"
                onClick={() => setBeatPulseEnabled((prev) => !prev)}
                className={`min-h-[32px] px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-2 border transition-colors cursor-pointer shrink-0 ${
                  beatPulseEnabled
                    ? 'border-white/25 bg-white/10 text-white'
                    : 'border-white/10 bg-white/[0.03] text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <span
                  className="relative inline-flex h-4 w-7 items-center rounded-full transition-colors"
                  style={{
                    backgroundColor: beatPulseEnabled
                      ? activePalette.primary
                      : 'rgba(255,255,255,0.16)',
                  }}
                >
                  <span
                    className={`inline-block h-3 w-3 rounded-full bg-neutral-950 transition-transform ${
                      beatPulseEnabled ? 'translate-x-3.5' : 'translate-x-0.5'
                    }`}
                  />
                </span>
                <span>{beatPulseEnabled ? 'On' : 'Off'}</span>
              </button>
            </div>

            {/* Light Bursts Switch */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <Sparkles className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <span className="text-xs font-semibold text-neutral-300 whitespace-nowrap">
                  Light Bursts
                </span>
                <span className="text-[11px] text-neutral-500 truncate">Beat reactive</span>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={particlesEnabled}
                aria-label="Toggle light burst particles"
                onClick={() => setParticlesEnabled((prev) => !prev)}
                className={`min-h-[32px] px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-2 border transition-colors cursor-pointer shrink-0 ${
                  particlesEnabled
                    ? 'border-white/25 bg-white/10 text-white'
                    : 'border-white/10 bg-white/[0.03] text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <span
                  className="relative inline-flex h-4 w-7 items-center rounded-full transition-colors"
                  style={{
                    backgroundColor: particlesEnabled
                      ? activePalette.primary
                      : 'rgba(255,255,255,0.16)',
                  }}
                >
                  <span
                    className={`inline-block h-3 w-3 rounded-full bg-neutral-950 transition-transform ${
                      particlesEnabled ? 'translate-x-3.5' : 'translate-x-0.5'
                    }`}
                  />
                </span>
                <span>{particlesEnabled ? 'On' : 'Off'}</span>
              </button>
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
