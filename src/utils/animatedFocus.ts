/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IndieTrack } from './musicDiscovery';
import type { AppTheme } from './playbackSettings';
import { deriveVisualizerVibe, hexToRgba } from './visualizerVibe';

export interface AnimatedFocusGradientConfig {
  energy: number;
  melancholy: number;
  vibeLabel: string;
  paletteName: string;
  animationDurationSec: number;
  orbDurationSec: number;
  baseColor: string;
  accentPrimary: string;
  accentSecondary: string;
  accentTertiary: string;
  surfaceGradientCss: string;
  orbPrimaryCss: string;
  orbSecondaryCss: string;
  ambientOpacity: number;
  cssVariables: Record<string, string>;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function getBaseCanvasColor(theme: AppTheme): string {
  switch (theme) {
    case 'amoled-black':
      return '#020204';
    case 'gym-neon':
      return '#060c09';
    default:
      return '#090c16';
  }
}

function getThemeOpacityScale(theme: AppTheme): number {
  switch (theme) {
    case 'amoled-black':
      return 0.72;
    case 'gym-neon':
      return 1.08;
    default:
      return 1.0;
  }
}

/**
 * Derives a subtle, slow-moving CSS ambient gradient palette and timing profile
 * from the active track's sonic energy and melancholy levels.
 *
 * Restraint rules:
 * - Colors remain low-luminance and atmospheric so foreground typography stays legible.
 * - Higher energy gently quickens the gradient drift; higher melancholy slows it down.
 * - Durations always remain meditative (14s–36s) so motion never distracts from listening.
 */
export function deriveAnimatedFocusGradient(
  track: Pick<IndieTrack, 'energy' | 'melancholy' | 'bpm'> | null | undefined,
  theme: AppTheme = 'spotify-dark'
): AnimatedFocusGradientConfig {
  const vibe = deriveVisualizerVibe(track);
  const energy = clamp(vibe.profile.energy, 0, 1);
  const melancholy = clamp(vibe.profile.melancholy, 0, 1);

  // Slow meditative drift: high energy -> ~15s, low energy + high melancholy -> ~34s
  const rawDuration = 24 - energy * 9 + melancholy * 10;
  const animationDurationSec = Math.round(clamp(rawDuration, 14, 36));
  const orbDurationSec = Math.round(clamp(animationDurationSec * 1.35, 18, 46));

  const baseColor = getBaseCanvasColor(theme);
  const opacityScale = getThemeOpacityScale(theme);

  // Restrained atmospheric alpha values so cards, lyrics, and controls stay crisp
  const stopAlpha1 = clamp((0.2 + energy * 0.08) * opacityScale, 0.12, 0.3);
  const stopAlpha2 = clamp((0.15 + melancholy * 0.07) * opacityScale, 0.1, 0.25);
  const stopAlpha3 = clamp((0.16 + (energy + melancholy) * 0.04) * opacityScale, 0.1, 0.24);

  const stop1 = hexToRgba(vibe.palette.primary, stopAlpha1);
  const stop2 = hexToRgba(vibe.palette.secondary, stopAlpha2);
  const stop3 = hexToRgba(vibe.palette.tertiary, stopAlpha3);

  // Angle responds gently to melancholy (warmer diagonal vs deeper vertical mood)
  const angleDeg = Math.round(126 + melancholy * 24 - energy * 10);
  const surfaceGradientCss = `linear-gradient(${angleDeg}deg, ${baseColor} 0%, ${stop1} 28%, ${stop2} 54%, ${stop3} 78%, ${baseColor} 100%)`;

  const orbPrimaryCss = `radial-gradient(circle at 50% 50%, ${hexToRgba(
    vibe.palette.primary,
    clamp((0.22 + energy * 0.08) * opacityScale, 0.12, 0.32)
  )} 0%, ${hexToRgba(vibe.palette.secondary, 0.06 * opacityScale)} 44%, transparent 72%)`;

  const orbSecondaryCss = `radial-gradient(circle at 50% 50%, ${hexToRgba(
    vibe.palette.tertiary,
    clamp((0.2 + melancholy * 0.08) * opacityScale, 0.12, 0.3)
  )} 0%, ${hexToRgba(vibe.palette.secondary, 0.05 * opacityScale)} 48%, transparent 74%)`;

  const ambientOpacity = Number(clamp((0.86 + energy * 0.1) * opacityScale, 0.62, 1).toFixed(2));

  const cssVariables: Record<string, string> = {
    '--focus-base': baseColor,
    '--focus-gradient': surfaceGradientCss,
    '--focus-orb-primary': orbPrimaryCss,
    '--focus-orb-secondary': orbSecondaryCss,
    '--focus-duration': `${animationDurationSec}s`,
    '--focus-orb-duration': `${orbDurationSec}s`,
    '--focus-accent': vibe.palette.primary,
  };

  return {
    energy,
    melancholy,
    vibeLabel: vibe.vibeLabel,
    paletteName: vibe.palette.name,
    animationDurationSec,
    orbDurationSec,
    baseColor,
    accentPrimary: vibe.palette.primary,
    accentSecondary: vibe.palette.secondary,
    accentTertiary: vibe.palette.tertiary,
    surfaceGradientCss,
    orbPrimaryCss,
    orbSecondaryCss,
    ambientOpacity,
    cssVariables,
  };
}
