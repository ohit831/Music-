/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IndieTrack } from './musicDiscovery';
import { computeSonicProfile } from './vibeMatch';

export interface ResolvedTrackBpm {
  bpm: number;
  isEstimated: boolean;
  beatIntervalMs: number;
}

export interface BeatPulseInput {
  elapsedMs: number;
  bpm: number;
  energy: number;
  melancholy: number;
  bassIntensity: number; // 0..1 from live audio bins
  sensitivity: number; // 0.5..2.2
  isPlaying: boolean;
  enabled: boolean;
  prefersReducedMotion?: boolean;
}

export interface BeatPulseFrame {
  scale: number;
  auraOpacity: number;
  ringScale: number;
  ringOpacity: number;
  beatPhase: number;
  pulseStrength: number;
  isDownbeat: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getGenreTempoOffset(genre?: string): number {
  if (!genre) return 0;
  const g = genre.toLowerCase();
  if (
    g.includes('hyperpop') ||
    g.includes('club') ||
    g.includes('dance') ||
    g.includes('edm') ||
    g.includes('mass') ||
    g.includes('workout') ||
    g.includes('punk')
  ) {
    return 12;
  }
  if (g.includes('rock') || g.includes('pop') || g.includes('hip-hop') || g.includes('folk pop')) {
    return 6;
  }
  if (
    g.includes('lo-fi') ||
    g.includes('lofi') ||
    g.includes('ambient') ||
    g.includes('sufi') ||
    g.includes('acoustic') ||
    g.includes('dream pop') ||
    g.includes('ballad') ||
    g.includes('chill')
  ) {
    return -10;
  }
  return 0;
}

/**
 * Resolves a track's BPM directly from explicit metadata when valid, or estimates
 * a consistent tempo from its sonic profile (energy, melancholy) and genre.
 */
export function resolveTrackBpm(
  track: Pick<IndieTrack, 'bpm' | 'energy' | 'melancholy' | 'genre'> | null | undefined
): ResolvedTrackBpm {
  if (
    track &&
    typeof track.bpm === 'number' &&
    Number.isFinite(track.bpm) &&
    track.bpm >= 40 &&
    track.bpm <= 220
  ) {
    const bpm = Math.round(clamp(track.bpm, 50, 200));
    return {
      bpm,
      isEstimated: false,
      beatIntervalMs: Math.round(60000 / bpm),
    };
  }

  const profile = track ? computeSonicProfile(track) : { energy: 0.5, melancholy: 0.5 };
  const genreOffset = getGenreTempoOffset(track?.genre);
  const estimated = Math.round(
    clamp(76 + profile.energy * 56 - profile.melancholy * 14 + genreOffset, 60, 168)
  );

  return {
    bpm: estimated,
    isEstimated: true,
    beatIntervalMs: Math.round(60000 / estimated),
  };
}

/**
 * Musical kick-drum style envelope over normalized beat phase [0, 1):
 * fast attack (0 -> 0.12) followed by an exponential decay back to 0.
 */
export function computeBeatEnvelope(phase01: number): number {
  const normalized = ((phase01 % 1) + 1) % 1;
  const attackPeak = 0.12;

  if (normalized <= attackPeak) {
    return Math.sin((normalized / attackPeak) * (Math.PI / 2));
  }

  const decayProgress = (normalized - attackPeak) / (1 - attackPeak);
  return Math.pow(Math.max(0, 1 - decayProgress), 2.35);
}

/**
 * Extracts normalized [0, 1] low-end kick/bass intensity from frequency bin values (0..255).
 */
export function estimateBeatIntensityFromBins(
  data: ArrayLike<number> | null | undefined
): number {
  if (!data || data.length === 0) return 0;
  const bassCount = Math.max(1, Math.min(12, Math.floor(data.length * 0.2)));
  let sum = 0;
  for (let i = 0; i < bassCount; i++) {
    const val = Number(data[i]);
    if (Number.isFinite(val)) {
      sum += clamp(val, 0, 255);
    }
  }
  return Number(clamp(sum / (bassCount * 255), 0, 1).toFixed(3));
}

/**
 * Computes GPU-friendly scale, aura opacity, and beat-ring transforms for a single animation frame.
 */
export function computeBeatPulseFrame(input: BeatPulseInput): BeatPulseFrame {
  if (!input.enabled) {
    return {
      scale: 1,
      auraOpacity: 0.22,
      ringScale: 1,
      ringOpacity: 0,
      beatPhase: 0,
      pulseStrength: 0,
      isDownbeat: false,
    };
  }

  const safeBpm = clamp(Number.isFinite(input.bpm) ? input.bpm : 108, 50, 200);
  const energy = clamp(Number.isFinite(input.energy) ? input.energy : 0.5, 0, 1);
  const melancholy = clamp(Number.isFinite(input.melancholy) ? input.melancholy : 0.5, 0, 1);
  const bassIntensity = clamp(
    Number.isFinite(input.bassIntensity) ? input.bassIntensity : 0,
    0,
    1
  );
  const sensitivity = clamp(
    Number.isFinite(input.sensitivity) ? input.sensitivity : 1.2,
    0.5,
    2.2
  );
  const elapsedMs = Number.isFinite(input.elapsedMs) ? input.elapsedMs : 0;
  const reduced = Boolean(input.prefersReducedMotion);
  const beatPeriodMs = 60000 / safeBpm;

  if (!input.isPlaying) {
    // Subtle resting breath synced to half-tempo when paused
    const idlePeriodMs = beatPeriodMs * 2;
    const beatPhase = (((elapsedMs % idlePeriodMs) + idlePeriodMs) % idlePeriodMs) / idlePeriodMs;
    const breath = (Math.sin(beatPhase * Math.PI * 2 - Math.PI / 2) + 1) * 0.5;
    const idleDelta = reduced ? 0 : breath * (0.012 + energy * 0.012);

    return {
      scale: Number(clamp(1 + idleDelta, 1, 1.028).toFixed(4)),
      auraOpacity: Number(clamp(0.2 + breath * (reduced ? 0.02 : 0.07), 0.18, 0.3).toFixed(3)),
      ringScale: 1,
      ringOpacity: 0,
      beatPhase: Number(beatPhase.toFixed(4)),
      pulseStrength: Number((breath * 0.25).toFixed(3)),
      isDownbeat: false,
    };
  }

  const beatPhase = (((elapsedMs % beatPeriodMs) + beatPeriodMs) % beatPeriodMs) / beatPeriodMs;
  const envelope = computeBeatEnvelope(beatPhase);

  // Energy intensifies the scale punch while melancholy keeps the sway smoother
  const vibeDepth = clamp(0.032 + energy * 0.056 - melancholy * 0.012, 0.022, 0.09);
  const liveBassBoost = bassIntensity * 0.044;
  const sensFactor = sensitivity / 1.2;
  const motionFactor = reduced ? 0.22 : 1;

  const rawDelta =
    (envelope * vibeDepth + liveBassBoost * (0.35 + 0.65 * envelope)) * sensFactor * motionFactor;
  const scale = Number(clamp(1 + rawDelta, 1, 1.15).toFixed(4));

  const pulseStrength = Number(clamp(envelope * (0.62 + bassIntensity * 0.38), 0, 1).toFixed(3));
  const auraOpacity = Number(
    clamp(0.2 + pulseStrength * (0.2 + energy * 0.15) * (reduced ? 0.35 : 1), 0.18, 0.56).toFixed(
      3
    )
  );
  const ringScale = Number(clamp(0.86 + beatPhase * 0.42, 0.86, 1.28).toFixed(4));
  const ringOpacity = reduced
    ? 0
    : Number(
        clamp(
          Math.pow(1 - beatPhase, 1.45) * (0.34 + energy * 0.24) * (0.48 + 0.52 * envelope),
          0,
          0.56
        ).toFixed(3)
      );

  return {
    scale,
    auraOpacity,
    ringScale,
    ringOpacity,
    beatPhase: Number(beatPhase.toFixed(4)),
    pulseStrength,
    isDownbeat: beatPhase < 0.2,
  };
}

export interface BeatCounterState {
  beatNumber: 1 | 2 | 3 | 4;
  beatIndex: number;
  beatPhase: number;
  subBeatPhase: number;
  isDownbeat: boolean;
}

/**
 * Computes the active 4/4 beat counter position (1..4) and sub-beat phase from elapsed time and BPM.
 */
export function computeBeatCounterState(
  elapsedMs: number,
  bpm: number,
  isPlaying: boolean
): BeatCounterState {
  if (!isPlaying) {
    return {
      beatNumber: 1,
      beatIndex: 0,
      beatPhase: 0,
      subBeatPhase: 0,
      isDownbeat: false,
    };
  }

  const safeBpm = clamp(Number.isFinite(bpm) ? bpm : 108, 50, 200);
  const safeElapsed = Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs : 0);
  const beatPeriodMs = 60000 / safeBpm;
  const totalBeats = safeElapsed / beatPeriodMs;
  const beatIndex = Math.floor(totalBeats);
  const beatNumber = ((beatIndex % 4) + 1) as 1 | 2 | 3 | 4;
  const beatPhase = totalBeats - beatIndex;
  const subBeatPhase = (totalBeats * 2) % 1;

  return {
    beatNumber,
    beatIndex,
    beatPhase: Number(beatPhase.toFixed(4)),
    subBeatPhase: Number(subBeatPhase.toFixed(4)),
    isDownbeat: beatPhase < 0.22,
  };
}

export interface SpectrumBarBeatPulseInput {
  baseValue: number; // 0..255 live FFT bin value
  barIndex: number;
  totalBars: number;
  elapsedMs: number;
  bpm: number;
  energy: number;
  melancholy: number;
  sensitivity: number;
  isPlaying: boolean;
  enabled: boolean;
  prefersReducedMotion?: boolean;
}

export interface SpectrumBarBeatPulseResult {
  value: number; // 0..255 combined bar amplitude
  pulseBoost: number; // secondary BPM contribution (0..180)
  secondaryEnvelope: number; // 0..1 normalized pulse envelope at this bar
}

/**
 * Applies a secondary BPM-synchronized beat-pulse modulation across frequency spectrum bars:
 * - Low/kick bars lock tightly to the primary quarter-note beat
 * - Mid bars weave primary and syncopated eighth-note (half-beat) pulses
 * - High/air bars shimmer on eighth-note subdivisions
 */
export function applySpectrumBarBeatPulse(
  input: SpectrumBarBeatPulseInput
): SpectrumBarBeatPulseResult {
  const safeBase = clamp(Number.isFinite(input.baseValue) ? input.baseValue : 0, 0, 255);

  if (!input.enabled || !input.isPlaying) {
    return {
      value: safeBase,
      pulseBoost: 0,
      secondaryEnvelope: 0,
    };
  }

  const safeBpm = clamp(Number.isFinite(input.bpm) ? input.bpm : 108, 50, 200);
  const safeElapsed = Math.max(0, Number.isFinite(input.elapsedMs) ? input.elapsedMs : 0);
  const energy = clamp(Number.isFinite(input.energy) ? input.energy : 0.5, 0, 1);
  const melancholy = clamp(Number.isFinite(input.melancholy) ? input.melancholy : 0.5, 0, 1);
  const sensitivity = clamp(
    Number.isFinite(input.sensitivity) ? input.sensitivity : 1.2,
    0.5,
    2.2
  );
  const totalBars = Math.max(1, Math.floor(input.totalBars));
  const barIndex = clamp(Math.floor(input.barIndex), 0, totalBars - 1);
  const pos = totalBars > 1 ? barIndex / (totalBars - 1) : 0;

  const beatPeriodMs = 60000 / safeBpm;
  const totalBeats = safeElapsed / beatPeriodMs;
  const primaryPhase = totalBeats % 1;
  // Syncopated half-beat ("and" of each beat) secondary pulse
  const secondaryPhase = (totalBeats + 0.5) % 1;

  const primaryEnv = computeBeatEnvelope(primaryPhase);
  const secondaryEnv = computeBeatEnvelope(secondaryPhase);

  // Band-specific rhythmic weighting across low / mid / high spectrum bars
  let bandPulse: number;
  if (pos < 0.32) {
    const lowFocus = 1 - (pos / 0.32) * 0.28;
    bandPulse = (primaryEnv * 0.82 + secondaryEnv * 0.24) * lowFocus;
  } else if (pos < 0.72) {
    const midNorm = (pos - 0.32) / 0.4;
    const midContour = 0.68 + 0.32 * Math.sin(midNorm * Math.PI);
    bandPulse = (primaryEnv * 0.52 + secondaryEnv * 0.58) * midContour;
  } else {
    const highNorm = (pos - 0.72) / 0.28;
    const highTaper = 0.85 - highNorm * 0.35;
    bandPulse = (primaryEnv * 0.24 + secondaryEnv * 0.78) * highTaper;
  }

  // Subtle travelling harmonic wave across adjacent bars so EQ silhouette stays musical
  const spatialRipple = 0.76 + 0.24 * Math.sin(totalBeats * Math.PI * 2 - barIndex * 0.42);
  const combinedEnv = clamp(bandPulse * spatialRipple, 0, 1);

  const vibeScale = (0.48 + energy * 0.56) * (1 - melancholy * 0.16);
  const sensScale = sensitivity / 1.2;
  const motionScale = input.prefersReducedMotion ? 0.25 : 1;

  const additiveBoost = combinedEnv * 118 * vibeScale * sensScale * motionScale;
  const amplifiedBase = safeBase * (1 + combinedEnv * 0.34 * sensScale * motionScale);
  const value = Number(clamp(amplifiedBase + additiveBoost, 0, 255).toFixed(2));

  return {
    value,
    pulseBoost: Number(clamp(additiveBoost, 0, 180).toFixed(2)),
    secondaryEnvelope: Number(combinedEnv.toFixed(3)),
  };
}

