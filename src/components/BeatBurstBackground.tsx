/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { audioEngine } from '../services/audioEngine';
import type { VisualizerPalette } from '../utils/visualizerVibe';
import { hexToRgba } from '../utils/visualizerVibe';
import { estimateBeatIntensityFromBins } from '../utils/beatPulse';
import {
  BeatParticle,
  createInitialBurstTriggerState,
  detectBeatBurstTrigger,
  ParticleColorSlot,
  spawnAmbientParticles,
  spawnLightBurstParticles,
  stepBeatParticles,
} from '../utils/beatParticles';

export interface BeatBurstBackgroundProps {
  enabled: boolean;
  isPlaying: boolean;
  bpm: number;
  energy: number;
  speedMultiplier: number;
  sensitivity: number;
  beatPulseEnabled: boolean;
  palette: VisualizerPalette;
  beatOriginRef: React.RefObject<number>;
}

function resolveSlotHex(palette: VisualizerPalette, slot: ParticleColorSlot): string {
  switch (slot) {
    case 'primary':
      return palette.primary;
    case 'secondary':
      return palette.secondary;
    case 'tertiary':
      return palette.tertiary;
    case 'core':
    default:
      return '#fff8e7';
  }
}

export const BeatBurstBackground: React.FC<BeatBurstBackgroundProps> = ({
  enabled,
  isPlaying,
  bpm,
  energy,
  speedMultiplier,
  sensitivity,
  beatPulseEnabled,
  palette,
  beatOriginRef,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<BeatParticle[]>([]);
  const triggerStateRef = useRef(createInitialBurstTriggerState());
  const burstCountRef = useRef(0);
  const lastIntensityRef = useRef(0);
  const sizeRef = useRef({ w: 1200, h: 800, dpr: 1 });

  // Keep live props accessible in the rAF loop without resetting existing particles on track tweaks
  const configRef = useRef({
    enabled,
    isPlaying,
    bpm,
    energy,
    speedMultiplier,
    sensitivity,
    beatPulseEnabled,
    palette,
  });
  configRef.current = {
    enabled,
    isPlaying,
    bpm,
    energy,
    speedMultiplier,
    sensitivity,
    beatPulseEnabled,
    palette,
  };

  // Reset beat-index tracker cleanly when BPM changes substantially (e.g. track switch)
  useEffect(() => {
    triggerStateRef.current = createInitialBurstTriggerState();
  }, [bpm]);

  // Size canvas cleanly with ResizeObserver
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const parent = canvas.parentElement;
      const w = Math.max(300, Math.round(parent?.clientWidth || window.innerWidth || 1200));
      const h = Math.max(300, Math.round(parent?.clientHeight || window.innerHeight || 800));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      sizeRef.current = { w, h, dpr };
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    };

    resize();

    if (typeof ResizeObserver !== 'undefined' && canvas.parentElement) {
      const observer = new ResizeObserver(resize);
      observer.observe(canvas.parentElement);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Main GPU-light 2D canvas particle & light-burst loop (~30fps cap, zero React state updates)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const syncDataset = () => {
      canvas.dataset.active = String(configRef.current.enabled);
      canvas.dataset.particleCount = String(particlesRef.current.length);
      canvas.dataset.burstCount = String(burstCountRef.current);
      canvas.dataset.lastIntensity = lastIntensityRef.current.toFixed(2);
      canvas.dataset.palettePrimary = configRef.current.palette.primary;
    };

    if (!enabled) {
      particlesRef.current = [];
      lastIntensityRef.current = 0;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      syncDataset();
      return;
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Seed ambient floating light motes once if empty
    if (particlesRef.current.length === 0) {
      particlesRef.current = spawnAmbientParticles(
        sizeRef.current.w,
        sizeRef.current.h,
        prefersReducedMotion ? 8 : 18
      );
    }

    let rafId = 0;
    let lastFrameTs = 0;
    let lastAttrTs = 0;

    const render = (ts: number) => {
      if (lastFrameTs !== 0 && ts - lastFrameTs < 30) {
        rafId = window.requestAnimationFrame(render);
        return;
      }

      const dtSeconds = lastFrameTs === 0 ? 0.032 : Math.min(0.08, (ts - lastFrameTs) / 1000);
      lastFrameTs = ts;

      const cfg = configRef.current;
      const { w, h, dpr } = sizeRef.current;
      const elapsedMs = Math.max(0, ts - (beatOriginRef.current || 0));

      const rawBins = audioEngine.getByteFrequencyData();
      const bassIntensity = estimateBeatIntensityFromBins(rawBins);

      const decision = detectBeatBurstTrigger({
        elapsedMs,
        bpm: cfg.bpm,
        bassIntensity,
        energy: cfg.energy,
        sensitivity: cfg.sensitivity,
        isPlaying: cfg.isPlaying,
        beatPulseEnabled: cfg.beatPulseEnabled,
        state: triggerStateRef.current,
      });
      triggerStateRef.current = decision.nextState;

      if (decision.shouldBurst) {
        burstCountRef.current += 1;
        lastIntensityRef.current = decision.intensity;
        const burst = spawnLightBurstParticles({
          width: w,
          height: h,
          intensity: decision.intensity,
          energy: cfg.energy,
          prefersReducedMotion,
        });
        particlesRef.current = [...particlesRef.current, ...burst];
      }

      particlesRef.current = stepBeatParticles(
        particlesRef.current,
        dtSeconds,
        w,
        h,
        cfg.speedMultiplier,
        prefersReducedMotion ? 45 : 110
      );

      // Draw soft additive light bursts and ambient motes
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      const list = particlesRef.current;
      for (let i = 0; i < list.length; i++) {
        const p = list[i];
        if (p.alpha <= 0.005) continue;

        const hex = resolveSlotHex(cfg.palette, p.colorSlot);

        if (p.kind === 'flare') {
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
          grad.addColorStop(0, hexToRgba(hex, p.alpha * 0.85));
          grad.addColorStop(0.45, hexToRgba(cfg.palette.primary, p.alpha * 0.38));
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
          continue;
        }

        if (p.kind === 'spark') {
          // Soft outer light halo
          const haloR = p.radius * 3.4;
          const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, haloR);
          halo.addColorStop(0, hexToRgba(hex, p.alpha * 0.9));
          halo.addColorStop(0.4, hexToRgba(hex, p.alpha * 0.32));
          halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(p.x, p.y, haloR, 0, Math.PI * 2);
          ctx.fill();

          // Crisp luminous center dot
          ctx.fillStyle = hexToRgba('#ffffff', p.alpha * 0.82);
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(0.7, p.radius * 0.55), 0, Math.PI * 2);
          ctx.fill();
          continue;
        }

        // Ambient mote
        const moteR = p.radius * 2.2;
        const moteGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, moteR);
        moteGrad.addColorStop(0, hexToRgba(hex, p.alpha));
        moteGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = moteGrad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, moteR, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      if (lastAttrTs === 0 || ts - lastAttrTs >= 120) {
        lastAttrTs = ts;
        syncDataset();
      }

      rafId = window.requestAnimationFrame(render);
    };

    syncDataset();
    rafId = window.requestAnimationFrame(render);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [enabled, beatOriginRef]);

  return (
    <canvas
      ref={canvasRef}
      data-testid="visualizer-particle-canvas"
      data-active={String(enabled)}
      data-particle-count="0"
      data-burst-count="0"
      data-last-intensity="0.00"
      data-palette-primary={palette.primary}
      aria-hidden="true"
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
    />
  );
};
