/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { audioEngine } from '../services/audioEngine';
import type { VisualizerPalette } from '../utils/visualizerVibe';
import { applySpectrumBarBeatPulse } from '../utils/beatPulse';

export type { VisualizerPalette };
export type VisualizerMode = 'bars' | 'wave' | 'radial' | 'particles';
export type VisualizerTheme = 'emerald' | 'sunset' | 'cyber' | 'amber';

export interface D3AudioVisualizerProps {
  isPlaying: boolean;
  variant?: 'compact' | 'expanded';
  mode?: VisualizerMode;
  theme?: VisualizerTheme;
  customPalette?: VisualizerPalette;
  speedMultiplier?: number; // 0.45 to 2.1
  sensitivity?: number; // 0.5 to 2.5
  bpm?: number;
  beatPulseEnabled?: boolean;
  energy?: number;
  melancholy?: number;
  beatOriginRef?: React.RefObject<number>;
  className?: string;
  onClick?: () => void;
  width?: number;
  height?: number;
}

export const THEME_CONFIGS: Record<
  VisualizerTheme,
  VisualizerPalette & {
    accentClass: string;
  }
> = {
  emerald: {
    name: 'Indie Emerald',
    primary: '#1ed760',
    secondary: '#10b981',
    tertiary: '#059669',
    glow: 'rgba(30, 215, 96, 0.45)',
    accentClass: 'text-[#1ed760] border-[#1ed760]/30 bg-[#1ed760]/10',
    gradientId: 'emerald-gradient',
  },
  sunset: {
    name: 'Neon Sunset',
    primary: '#f43f5e',
    secondary: '#fb923c',
    tertiary: '#f59e0b',
    glow: 'rgba(244, 63, 94, 0.45)',
    accentClass: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
    gradientId: 'sunset-gradient',
  },
  cyber: {
    name: 'Cyber Aurora',
    primary: '#06b6d4',
    secondary: '#6366f1',
    tertiary: '#a855f7',
    glow: 'rgba(99, 102, 241, 0.45)',
    accentClass: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
    gradientId: 'cyber-gradient',
  },
  amber: {
    name: 'Vintage Vinyl',
    primary: '#f59e0b',
    secondary: '#d97706',
    tertiary: '#b45309',
    glow: 'rgba(245, 158, 11, 0.45)',
    accentClass: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    gradientId: 'amber-gradient',
  },
};

function upsertPaletteGradients(
  defs: d3.Selection<SVGDefsElement, unknown, null, undefined>,
  palette: VisualizerPalette
) {
  let grad = defs.select<SVGLinearGradientElement>(`#${palette.gradientId}`);
  if (grad.empty()) {
    grad = defs
      .append('linearGradient')
      .attr('id', palette.gradientId)
      .attr('x1', '0%')
      .attr('y1', '100%')
      .attr('x2', '0%')
      .attr('y2', '0%');
  }
  const linearStops = [
    { offset: '0%', color: palette.tertiary, opacity: 0.85 },
    { offset: '50%', color: palette.secondary, opacity: 0.95 },
    { offset: '100%', color: palette.primary, opacity: 1 },
  ];
  const stops = grad.selectAll<SVGStopElement, (typeof linearStops)[number]>('stop').data(linearStops);
  stops
    .enter()
    .append('stop')
    .merge(stops)
    .attr('offset', (d) => d.offset)
    .attr('stop-color', (d) => d.color)
    .attr('stop-opacity', (d) => d.opacity);
  stops.exit().remove();

  const radialId = `${palette.gradientId}-radial`;
  let radialGrad = defs.select<SVGRadialGradientElement>(`#${radialId}`);
  if (radialGrad.empty()) {
    radialGrad = defs
      .append('radialGradient')
      .attr('id', radialId)
      .attr('cx', '50%')
      .attr('cy', '50%')
      .attr('r', '50%');
  }
  const radialStops = [
    { offset: '0%', color: palette.primary, opacity: 1 },
    { offset: '70%', color: palette.secondary, opacity: 0.8 },
    { offset: '100%', color: palette.tertiary, opacity: 0.2 },
  ];
  const rStops = radialGrad
    .selectAll<SVGStopElement, (typeof radialStops)[number]>('stop')
    .data(radialStops);
  rStops
    .enter()
    .append('stop')
    .merge(rStops)
    .attr('offset', (d) => d.offset)
    .attr('stop-color', (d) => d.color)
    .attr('stop-opacity', (d) => d.opacity);
  rStops.exit().remove();
}

export const D3AudioVisualizer: React.FC<D3AudioVisualizerProps> = ({
  isPlaying,
  variant = 'compact',
  mode = 'bars',
  theme = 'emerald',
  customPalette,
  speedMultiplier = 1.0,
  sensitivity = 1.0,
  bpm,
  beatPulseEnabled = false,
  energy = 0.5,
  melancholy = 0.5,
  beatOriginRef,
  className = '',
  onClick,
  width: customWidth,
  height: customHeight,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const peaksRef = useRef<number[]>([]);
  const phaseRef = useRef<number>(0);
  const sizeRef = useRef<{ w: number; h: number }>({
    w: customWidth || (variant === 'compact' ? 100 : 600),
    h: customHeight || (variant === 'compact' ? 28 : 280),
  });

  const isCompact = variant === 'compact';
  const defaultHeight = isCompact ? 28 : 280;
  const defaultWidth = isCompact ? 100 : 600;

  const activePalette: VisualizerPalette = customPalette || THEME_CONFIGS[theme] || THEME_CONFIGS.emerald;
  const clampedSpeed = Math.max(0.35, Math.min(2.4, Number.isFinite(speedMultiplier) ? speedMultiplier : 1.0));

  // Track container dimensions cleanly via ResizeObserver instead of per-frame layout reads
  useEffect(() => {
    const updateDimensions = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      const w = customWidth || (rect?.width && rect.width > 20 ? rect.width : defaultWidth);
      const h = customHeight || (rect?.height && rect.height > 10 ? rect.height : defaultHeight);
      sizeRef.current = { w, h };
      if (svgRef.current) {
        d3.select(svgRef.current)
          .attr('width', w)
          .attr('height', h)
          .attr('viewBox', `0 0 ${w} ${h}`);
      }
    };

    updateDimensions();

    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      const observer = new ResizeObserver(updateDimensions);
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }
    return undefined;
  }, [customWidth, customHeight, defaultWidth, defaultHeight]);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);
    svg
      .attr('width', sizeRef.current.w)
      .attr('height', sizeRef.current.h)
      .attr('viewBox', `0 0 ${sizeRef.current.w} ${sizeRef.current.h}`);

    // Build or update SVG defs for glow filter and gradients
    let defs = svg.select<SVGDefsElement>('defs');
    if (defs.empty()) {
      defs = svg.append('defs');

      // Glow filter
      const filter = defs
        .append('filter')
        .attr('id', 'd3-glow')
        .attr('x', '-30%')
        .attr('y', '-30%')
        .attr('width', '160%')
        .attr('height', '160%');
      filter
        .append('feGaussianBlur')
        .attr('stdDeviation', isCompact ? '1.5' : '3.5')
        .attr('result', 'coloredBlur');
      const feMerge = filter.append('feMerge');
      feMerge.append('feMergeNode').attr('in', 'coloredBlur');
      feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

      // Static preset gradients
      Object.values(THEME_CONFIGS).forEach((cfg) => {
        upsertPaletteGradients(defs, cfg);
      });
    }

    // Always sync active palette stops (crucial for dynamic track vibe palettes)
    upsertPaletteGradients(defs, activePalette);

    // Main content group
    let mainGroup = svg.select<SVGGElement>('g.visualizer-content');
    if (mainGroup.empty()) {
      mainGroup = svg.append('g').attr('class', 'visualizer-content');
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const motionFactor = prefersReducedMotion ? 0.25 : 1.0;
    const peakDecayBase = (isCompact ? 3.5 : 2.5) * Math.max(0.55, 0.55 + clampedSpeed * 0.5);

    let lastRenderTs = 0;

    const renderFrame = (ts: number) => {
      // Cap SVG DOM mutations to ~30fps so mobile & headless CPU compositors stay responsive
      if (lastRenderTs !== 0 && ts - lastRenderTs < 32) {
        animFrameRef.current = requestAnimationFrame(renderFrame);
        return;
      }

      const deltaFrames = lastRenderTs === 0 ? 1 : Math.min(4, (ts - lastRenderTs) / 16.67);
      lastRenderTs = ts;

      phaseRef.current += clampedSpeed * motionFactor * deltaFrames;
      const phase = phaseRef.current;

      const { w, h } = sizeRef.current;

      // Fetch live frequency data from Web Audio Engine
      const rawData = audioEngine.getByteFrequencyData();
      const numBins = isCompact ? 16 : mode === 'radial' ? 48 : 40;
      const binStep = Math.max(1, Math.floor(rawData.length / numBins));

      const freqData: number[] = [];
      const barPulseEnvelopes: number[] = [];
      const useBarBeatSync = Boolean(
        mode === 'bars' && beatPulseEnabled && typeof bpm === 'number' && bpm > 0 && isPlaying
      );
      const originMs = beatOriginRef?.current ?? 0;
      const elapsedBeatMs = Math.max(0, ts - originMs);

      for (let i = 0; i < numBins; i++) {
        const rawVal = rawData[i * binStep] || 0;
        let scaledVal = rawVal * sensitivity;

        if (!isPlaying) {
          // Subtle resting breathing wave scaled by the track's sonic speed
          const wavePrimary = Math.sin(phase * 0.055 + i * 0.3) * (6 + clampedSpeed * 4);
          const waveHarmonic = Math.cos(phase * 0.032 - i * 0.18) * 4;
          scaledVal = 14 + wavePrimary + waveHarmonic;
          barPulseEnvelopes.push(0);
        } else if (useBarBeatSync && bpm) {
          const synced = applySpectrumBarBeatPulse({
            baseValue: scaledVal,
            barIndex: i,
            totalBars: numBins,
            elapsedMs: elapsedBeatMs,
            bpm,
            energy,
            melancholy,
            sensitivity,
            isPlaying,
            enabled: beatPulseEnabled,
            prefersReducedMotion,
          });
          scaledVal = synced.value;
          barPulseEnvelopes.push(synced.secondaryEnvelope);
        } else {
          barPulseEnvelopes.push(0);
        }

        freqData.push(Math.min(255, Math.max(0, scaledVal)));
      }

      // Maintain peak tracking for bars (decay speed adapts to track vibe)
      if (peaksRef.current.length !== freqData.length) {
        peaksRef.current = new Array(freqData.length).fill(0);
      }
      const peakDecayStep = peakDecayBase * deltaFrames;
      for (let i = 0; i < freqData.length; i++) {
        if (freqData[i] > peaksRef.current[i]) {
          peaksRef.current[i] = freqData[i];
        } else {
          peaksRef.current[i] = Math.max(0, peaksRef.current[i] - peakDecayStep);
        }
      }

      // Render based on chosen mode using D3
      if (mode === 'bars') {
        renderBars(
          mainGroup,
          freqData,
          peaksRef.current,
          barPulseEnvelopes,
          w,
          h,
          activePalette,
          isCompact
        );
      } else if (mode === 'wave') {
        renderWave(mainGroup, freqData, w, h, activePalette, isCompact, phase, clampedSpeed);
      } else if (mode === 'radial') {
        renderRadial(mainGroup, freqData, w, h, activePalette, isCompact, phase);
      } else if (mode === 'particles') {
        renderParticles(mainGroup, freqData, w, h, activePalette, isCompact, phase);
      }

      animFrameRef.current = requestAnimationFrame(renderFrame);
    };

    animFrameRef.current = requestAnimationFrame(renderFrame);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [
    isPlaying,
    variant,
    mode,
    activePalette.gradientId,
    activePalette.primary,
    activePalette.secondary,
    activePalette.tertiary,
    clampedSpeed,
    sensitivity,
    bpm,
    beatPulseEnabled,
    energy,
    melancholy,
    beatOriginRef,
    customWidth,
    customHeight,
  ]);

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      data-testid="d3-audio-visualizer"
      data-palette-primary={activePalette.primary}
      data-palette-secondary={activePalette.secondary}
      data-speed={clampedSpeed.toFixed(2)}
      data-bpm={typeof bpm === 'number' && bpm > 0 ? Math.round(bpm) : undefined}
      data-bar-beat-sync={String(Boolean(mode === 'bars' && beatPulseEnabled && bpm))}
      className={`relative select-none overflow-hidden flex items-center justify-center ${
        onClick ? 'cursor-pointer group' : ''
      } ${className}`}
      style={{
        width: customWidth ? `${customWidth}px` : isCompact ? '110px' : '100%',
        height: customHeight ? `${customHeight}px` : `${defaultHeight}px`,
      }}
      role="img"
      aria-label={`Real-time D3 Audio Visualizer (${activePalette.name}, ${clampedSpeed.toFixed(2)}x speed)`}
    >
      <svg
        ref={svgRef}
        className="w-full h-full overflow-visible transition-transform duration-200"
      />
    </div>
  );
};

// -----------------------------------------------------------------------------
// D3 Rendering Sub-routines
// -----------------------------------------------------------------------------

/** 1. Equalizer Bars with peak markers and secondary BPM beat-pulse emphasis */
function renderBars(
  group: d3.Selection<SVGGElement, unknown, null, undefined>,
  data: number[],
  peaks: number[],
  pulseEnvelopes: number[],
  width: number,
  height: number,
  theme: VisualizerPalette,
  isCompact: boolean
) {
  const margin = isCompact ? 1 : 2;
  const barWidth = Math.max(2, (width - (data.length - 1) * margin) / data.length);

  const yScale = d3.scaleLinear().domain([0, 255]).range([0, height - (isCompact ? 2 : 8)]);

  // Clean elements from other modes if switched
  group.selectAll('path').remove();
  group.selectAll('circle.particle').remove();
  group.selectAll('line.radial-ray').remove();
  group.selectAll('circle.radial-core').remove();

  // Bind frequency data to rectangles
  const bars = group.selectAll<SVGRectElement, number>('rect.bar').data(data);

  bars
    .enter()
    .append('rect')
    .attr('class', 'bar')
    .attr('rx', isCompact ? 1.5 : 3)
    .attr('ry', isCompact ? 1.5 : 3)
    .merge(bars)
    .attr('x', (_d, i) => i * (barWidth + margin))
    .attr('width', barWidth)
    .attr('y', (d) => height - Math.max(isCompact ? 2 : 4, yScale(d)))
    .attr('height', (d) => Math.max(isCompact ? 2 : 4, yScale(d)))
    .attr('fill', `url(#${theme.gradientId})`)
    .attr('opacity', (_d, i) => {
      const env = pulseEnvelopes[i] || 0;
      return isCompact ? 0.95 : Number(Math.min(1, 0.78 + env * 0.22).toFixed(2));
    })
    .attr('filter', isCompact ? null : 'url(#d3-glow)');

  bars.exit().remove();

  // Peak caps (decay indicators) for expanded view
  if (!isCompact) {
    const peakCaps = group.selectAll<SVGRectElement, number>('rect.peak').data(peaks);

    peakCaps
      .enter()
      .append('rect')
      .attr('class', 'peak')
      .attr('rx', 1)
      .merge(peakCaps)
      .attr('x', (_d, i) => i * (barWidth + margin))
      .attr('width', barWidth)
      .attr('height', (_p, i) => ((pulseEnvelopes[i] || 0) > 0.5 ? 2.8 : 2))
      .attr('y', (p) => Math.max(2, height - yScale(p) - 4))
      .attr('fill', theme.primary)
      .attr('opacity', (_p, i) => Number(Math.min(1, 0.75 + (pulseEnvelopes[i] || 0) * 0.25).toFixed(2)));

    peakCaps.exit().remove();
  } else {
    group.selectAll('rect.peak').remove();
  }
}

/** 2. Smooth Liquid Waveform using D3 line & area curves */
function renderWave(
  group: d3.Selection<SVGGElement, unknown, null, undefined>,
  data: number[],
  width: number,
  height: number,
  theme: VisualizerPalette,
  isCompact: boolean,
  phase: number,
  speedMultiplier: number
) {
  group.selectAll('rect').remove();
  group.selectAll('circle.particle').remove();
  group.selectAll('line.radial-ray').remove();
  group.selectAll('circle.radial-core').remove();

  const xScale = d3.scaleLinear().domain([0, data.length - 1]).range([0, width]);
  const centerY = height * 0.6;
  const maxAmp = isCompact ? height * 0.45 : height * 0.55;
  const rippleDepth = isCompact ? 1.5 : 5 + speedMultiplier * 3.5;

  const waveY = (d: number, i: number) => {
    const amp = (d / 255) * maxAmp;
    const ripple = Math.sin(phase * 0.065 + i * 0.28) * rippleDepth;
    return Math.max(4, Math.min(height - 6, centerY - amp + ripple));
  };

  // D3 Area & Line Generators
  const areaGen = d3
    .area<number>()
    .x((_d, i) => xScale(i))
    .y0(height)
    .y1((d, i) => waveY(d, i))
    .curve(d3.curveCatmullRom.alpha(0.5));

  const lineGen = d3
    .line<number>()
    .x((_d, i) => xScale(i))
    .y((d, i) => waveY(d, i))
    .curve(d3.curveCatmullRom.alpha(0.5));

  // Mirror line generator for audio symmetry
  const mirrorLineGen = d3
    .line<number>()
    .x((_d, i) => xScale(i))
    .y((d, i) => {
      const amp = (d / 255) * maxAmp * 0.45;
      const counterRipple = Math.cos(phase * 0.055 + i * 0.25) * (rippleDepth * 0.5);
      return Math.min(height - 2, centerY + amp + counterRipple);
    })
    .curve(d3.curveCatmullRom.alpha(0.5));

  // Area glow fill
  let areaPath = group.select<SVGPathElement>('path.wave-area');
  if (areaPath.empty()) {
    areaPath = group.append('path').attr('class', 'wave-area');
  }
  areaPath
    .attr('d', areaGen(data) || '')
    .attr('fill', `url(#${theme.gradientId})`)
    .attr('opacity', isCompact ? 0.45 : 0.28);

  // Top spine line
  let spinePath = group.select<SVGPathElement>('path.wave-spine');
  if (spinePath.empty()) {
    spinePath = group.append('path').attr('class', 'wave-spine');
  }
  spinePath
    .attr('d', lineGen(data) || '')
    .attr('fill', 'none')
    .attr('stroke', theme.primary)
    .attr('stroke-width', isCompact ? 2 : 3)
    .attr('stroke-linecap', 'round')
    .attr('filter', isCompact ? null : 'url(#d3-glow)');

  // Mirror reflection spine
  if (!isCompact) {
    let mirrorPath = group.select<SVGPathElement>('path.wave-mirror');
    if (mirrorPath.empty()) {
      mirrorPath = group.append('path').attr('class', 'wave-mirror');
    }
    mirrorPath
      .attr('d', mirrorLineGen(data) || '')
      .attr('fill', 'none')
      .attr('stroke', theme.secondary)
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '3,3')
      .attr('opacity', 0.6);
  } else {
    group.select('path.wave-mirror').remove();
  }
}

/** 3. Radial Circular Pulse / Rayburst (spectacular on phones) */
function renderRadial(
  group: d3.Selection<SVGGElement, unknown, null, undefined>,
  data: number[],
  width: number,
  height: number,
  theme: VisualizerPalette,
  isCompact: boolean,
  phase: number
) {
  group.selectAll('rect').remove();
  group.selectAll('path.wave-area').remove();
  group.selectAll('path.wave-spine').remove();
  group.selectAll('path.wave-mirror').remove();
  group.selectAll('circle.particle').remove();

  const cx = width / 2;
  const cy = height / 2;
  const baseRadius = Math.min(width, height) * (isCompact ? 0.22 : 0.24);
  const maxRayLen = Math.min(width, height) * (isCompact ? 0.24 : 0.26);

  // Rotation velocity driven by sonic phase
  const rotationOffset = (phase * 0.45) * (Math.PI / 180);
  const angleStep = (Math.PI * 2) / data.length;

  // Center core circle
  let core = group.select<SVGCircleElement>('circle.radial-core');
  if (core.empty()) {
    core = group.append('circle').attr('class', 'radial-core');
  }
  const avgIntensity = d3.mean(data) || 0;
  const corePulse = (avgIntensity / 255) * (isCompact ? 3 : 10);
  core
    .attr('cx', cx)
    .attr('cy', cy)
    .attr('r', Math.max(4, baseRadius * 0.7 + corePulse))
    .attr('fill', `url(#${theme.gradientId}-radial)`)
    .attr('opacity', 0.85);

  // Ray lines
  const rays = group.selectAll<SVGLineElement, number>('line.radial-ray').data(data);

  rays
    .enter()
    .append('line')
    .attr('class', 'radial-ray')
    .attr('stroke-linecap', 'round')
    .merge(rays)
    .attr('x1', (_d, i) => {
      const angle = i * angleStep + rotationOffset;
      return cx + Math.cos(angle) * (baseRadius + 2);
    })
    .attr('y1', (_d, i) => {
      const angle = i * angleStep + rotationOffset;
      return cy + Math.sin(angle) * (baseRadius + 2);
    })
    .attr('x2', (d, i) => {
      const angle = i * angleStep + rotationOffset;
      const rayLen = (d / 255) * maxRayLen;
      return cx + Math.cos(angle) * (baseRadius + 2 + Math.max(2, rayLen));
    })
    .attr('y2', (d, i) => {
      const angle = i * angleStep + rotationOffset;
      const rayLen = (d / 255) * maxRayLen;
      return cy + Math.sin(angle) * (baseRadius + 2 + Math.max(2, rayLen));
    })
    .attr('stroke', (_d, i) => (i % 2 === 0 ? theme.primary : theme.secondary))
    .attr('stroke-width', isCompact ? 1.5 : 2.5)
    .attr('opacity', (d) => Math.min(1, Math.max(0.35, d / 200)));

  rays.exit().remove();
}

/** 4. Floating Sound Orbs / Frequency Particles */
function renderParticles(
  group: d3.Selection<SVGGElement, unknown, null, undefined>,
  data: number[],
  width: number,
  height: number,
  theme: VisualizerPalette,
  isCompact: boolean,
  phase: number
) {
  group.selectAll('rect').remove();
  group.selectAll('path').remove();
  group.selectAll('line.radial-ray').remove();
  group.selectAll('circle.radial-core').remove();

  const xScale = d3.scaleLinear().domain([0, data.length - 1]).range([10, width - 10]);
  const centerY = height * 0.5;

  const circles = group.selectAll<SVGCircleElement, number>('circle.particle').data(data);

  circles
    .enter()
    .append('circle')
    .attr('class', 'particle')
    .merge(circles)
    .attr('cx', (_d, i) => {
      const driftX = Math.cos(phase * 0.045 + i * 0.4) * (isCompact ? 1.5 : 6);
      return xScale(i) + driftX;
    })
    .attr('cy', (d, i) => {
      const floatOffset = Math.sin(phase * 0.08 + i * 0.5) * (isCompact ? 4 : 12);
      const yOffset = ((d / 255) * (height * 0.4) - (height * 0.2)) * (i % 2 === 0 ? 1 : -1);
      return centerY + yOffset + floatOffset;
    })
    .attr('r', (d) => {
      const baseR = isCompact ? 1.5 : 3;
      return baseR + (d / 255) * (isCompact ? 2 : 5);
    })
    .attr('fill', (_d, i) => (i % 3 === 0 ? theme.primary : i % 3 === 1 ? theme.secondary : theme.tertiary))
    .attr('opacity', (d) => Math.min(1, Math.max(0.4, d / 200)))
    .attr('filter', isCompact ? null : 'url(#d3-glow)');

  circles.exit().remove();
}
