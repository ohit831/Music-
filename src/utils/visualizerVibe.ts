/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IndieTrack } from './musicDiscovery';
import { computeSonicProfile, describeSonicVibe, type SonicProfile } from './vibeMatch';

export interface VisualizerPalette {
  name: string;
  primary: string;
  secondary: string;
  tertiary: string;
  glow: string;
  gradientId: string;
}

export interface VisualizerVibeConfig {
  profile: SonicProfile;
  vibeLabel: string;
  paceLabel: string;
  speedMultiplier: number; // 0.45 to 2.1
  peakDecayMultiplier: number; // 0.65 to 1.85
  palette: VisualizerPalette;
}

const DYNAMIC_GRADIENT_ID = 'vibe-dynamic-gradient';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeHue(deg: number): number {
  const mod = deg % 360;
  return mod < 0 ? mod + 360 : mod;
}

/**
 * Converts HSL (h: 0..360, s: 0..100, l: 0..100) into an uppercase-free #rrggbb hex string.
 */
export function hslToHex(h: number, s: number, l: number): string {
  const hue = normalizeHue(h) / 360;
  const sat = clamp(s, 0, 100) / 100;
  const light = clamp(l, 0, 100) / 100;

  let r: number;
  let g: number;
  let b: number;

  if (sat === 0) {
    r = light;
    g = light;
    b = light;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      let tt = t;
      if (tt < 0) tt += 1;
      if (tt > 1) tt -= 1;
      if (tt < 1 / 6) return p + (q - p) * 6 * tt;
      if (tt < 1 / 2) return q;
      if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
      return p;
    };
    const q = light < 0.5 ? light * (1 + sat) : light + sat - light * sat;
    const p = 2 * light - q;
    r = hue2rgb(p, q, hue + 1 / 3);
    g = hue2rgb(p, q, hue);
    b = hue2rgb(p, q, hue - 1 / 3);
  }

  const toHex = (channel: number) =>
    Math.round(clamp(channel * 255, 0, 255))
      .toString(16)
      .padStart(2, '0');

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) {
    return `rgba(30, 215, 96, ${clamp(alpha, 0, 1).toFixed(2)})`;
  }
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1).toFixed(2)})`;
}

/**
 * Smoothly computes a vibrant primary hue from (energy, melancholy) in [0,1]^2:
 * - High Energy + Low Melancholy (Euphoric): Warm Solar Gold / Coral (~38°)
 * - High Energy + High Melancholy (Cathartic): Electric Crimson / Violet (~338°)
 * - Low Energy + High Melancholy (Deep Melancholy): Nocturnal Cobalt / Indigo (~224°)
 * - Low Energy + Low Melancholy (Warm & Mellow): Organic Emerald / Teal (~154°)
 * - Center (0.5, 0.5): Smoothly anchored toward brand emerald-teal (~162°) with zero discontinuity.
 */
function computeVibeHue(energy: number, melancholy: number): number {
  const anchors: Array<{ deg: number; weight: number }> = [
    { deg: 38, weight: energy * (1 - melancholy) }, // Euphoric gold-amber
    { deg: 338, weight: energy * melancholy }, // Cathartic rose-crimson
    { deg: 224, weight: (1 - energy) * melancholy }, // Melancholic cobalt-indigo
    { deg: 154, weight: (1 - energy) * (1 - melancholy) }, // Mellow emerald-sage
  ];

  // Center pull peaks at (0.5, 0.5) and drops to 0 on the outer border, preventing vector cancellation.
  const centerProximity = Math.max(
    0,
    1 - 2 * Math.max(Math.abs(energy - 0.5), Math.abs(melancholy - 0.5))
  );
  anchors.push({ deg: 162, weight: centerProximity * 0.28 });

  let sumCos = 0;
  let sumSin = 0;
  for (const { deg, weight } of anchors) {
    const rad = (deg * Math.PI) / 180;
    sumCos += Math.cos(rad) * weight;
    sumSin += Math.sin(rad) * weight;
  }

  if (Math.hypot(sumCos, sumSin) < 1e-5) {
    return 162;
  }

  return normalizeHue((Math.atan2(sumSin, sumCos) * 180) / Math.PI);
}

function getPaletteName(vibeLabel: string): string {
  switch (vibeLabel) {
    case 'High-Energy Euphoria':
      return 'Solar Surge';
    case 'Cathartic Drive':
      return 'Crimson Pulse';
    case 'Deep Melancholy':
      return 'Midnight Rain';
    case 'Warm & Mellow':
      return 'Emerald Drift';
    case 'Upbeat Pulse':
      return 'Amber Kinetic';
    default:
      return 'Velvet Aura';
  }
}

export function describeVisualizerPace(speedMultiplier: number): string {
  if (speedMultiplier >= 1.55) return 'Kinetic Surge';
  if (speedMultiplier >= 1.25) return 'Upbeat Pulse';
  if (speedMultiplier >= 0.92) return 'Steady Flow';
  if (speedMultiplier >= 0.68) return 'Calm Drift';
  return 'Slow Reverie';
}

/**
 * Derives a track-aware visualizer palette and motion speed from sonic profile metadata
 * (energy, melancholy, and optional bpm).
 */
export function deriveVisualizerVibe(
  track: Pick<IndieTrack, 'energy' | 'melancholy' | 'bpm'> | null | undefined
): VisualizerVibeConfig {
  const profile: SonicProfile = track
    ? computeSonicProfile(track)
    : { energy: 0.5, melancholy: 0.5 };

  const { energy, melancholy } = profile;
  const vibeLabel = describeSonicVibe(profile);

  // Speed increases strongly with energy, slows smoothly with melancholy, and nods gently to BPM.
  const validBpm =
    typeof track?.bpm === 'number' && Number.isFinite(track.bpm) && track.bpm > 0
      ? track.bpm
      : null;
  const bpmFactor = validBpm !== null ? clamp((validBpm - 60) / 120, 0, 1) : energy;

  const rawSpeed = 0.48 + energy * 1.12 - melancholy * 0.28 + bpmFactor * 0.24;
  const speedMultiplier = Number(clamp(rawSpeed, 0.45, 2.1).toFixed(2));
  const peakDecayMultiplier = Number(clamp(0.65 + speedMultiplier * 0.55, 0.65, 1.85).toFixed(2));
  const paceLabel = describeVisualizerPace(speedMultiplier);

  // Continuous HSL palette tuned for high legibility on deep dark obsidian canvases.
  const baseHue = computeVibeHue(energy, melancholy);
  const saturation = clamp(68 + energy * 24 - melancholy * 4, 62, 94);
  const lightness = clamp(54 + energy * 8 - melancholy * 3, 50, 66);

  // Melancholy shifts harmonics cooler (+deg), euphoria shifts harmonics warmer (-deg).
  const secondaryShift = melancholy >= 0.5 ? 24 : -20;
  const tertiaryShift = melancholy >= 0.5 ? 44 : -38;

  const primary = hslToHex(baseHue, saturation, lightness);
  const secondary = hslToHex(
    baseHue + secondaryShift,
    clamp(saturation - 4, 55, 92),
    clamp(lightness - 6, 42, 60)
  );
  const tertiary = hslToHex(
    baseHue + tertiaryShift,
    clamp(saturation - 10, 48, 86),
    clamp(lightness - 18, 28, 46)
  );

  const glowAlpha = 0.32 + energy * 0.24;
  const glow = hexToRgba(primary, glowAlpha);

  return {
    profile,
    vibeLabel,
    paceLabel,
    speedMultiplier,
    peakDecayMultiplier,
    palette: {
      name: getPaletteName(vibeLabel),
      primary,
      secondary,
      tertiary,
      glow,
      gradientId: DYNAMIC_GRADIENT_ID,
    },
  };
}
