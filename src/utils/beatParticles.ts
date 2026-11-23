/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ParticleColorSlot = 'primary' | 'secondary' | 'tertiary' | 'core';
export type ParticleKind = 'spark' | 'flare' | 'ambient';

export interface BeatParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  baseAlpha: number;
  life: number; // seconds elapsed
  maxLife: number; // seconds total (Infinity for ambient)
  colorSlot: ParticleColorSlot;
  kind: ParticleKind;
}

export interface BurstTriggerState {
  prevBeatIndex: number;
  prevBass: number;
  lastBurstMs: number;
}

export interface BurstTriggerInput {
  elapsedMs: number;
  bpm: number;
  bassIntensity: number; // 0..1
  energy: number; // 0..1
  sensitivity: number; // 0.5..2.2
  isPlaying: boolean;
  beatPulseEnabled: boolean;
  state: BurstTriggerState;
}

export interface BurstDecision {
  shouldBurst: boolean;
  intensity: number; // 0..1
  reason: 'downbeat' | 'bass-transient' | 'none';
  nextState: BurstTriggerState;
}

export interface SpawnBurstOptions {
  width: number;
  height: number;
  intensity: number; // 0..1
  energy: number; // 0..1
  originX?: number;
  originY?: number;
  prefersReducedMotion?: boolean;
  random?: () => number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function createInitialBurstTriggerState(): BurstTriggerState {
  return {
    prevBeatIndex: -1,
    prevBass: 0,
    lastBurstMs: -1000,
  };
}

/**
 * Detects when a luminous particle burst should fire based on live audio bass transients
 * and/or synchronized BPM downbeats.
 */
export function detectBeatBurstTrigger(input: BurstTriggerInput): BurstDecision {
  const safeElapsed = Math.max(0, Number.isFinite(input.elapsedMs) ? input.elapsedMs : 0);
  const safeBass = clamp(Number.isFinite(input.bassIntensity) ? input.bassIntensity : 0, 0, 1);
  const safeEnergy = clamp(Number.isFinite(input.energy) ? input.energy : 0.5, 0, 1);
  const safeSens = clamp(Number.isFinite(input.sensitivity) ? input.sensitivity : 1.2, 0.5, 2.2);
  const safeBpm = clamp(Number.isFinite(input.bpm) ? input.bpm : 108, 50, 200);

  if (!input.isPlaying) {
    return {
      shouldBurst: false,
      intensity: 0,
      reason: 'none',
      nextState: {
        prevBeatIndex: input.state.prevBeatIndex,
        prevBass: safeBass,
        lastBurstMs: input.state.lastBurstMs,
      },
    };
  }

  const beatPeriodMs = 60000 / safeBpm;
  const beatIndex = Math.floor(safeElapsed / beatPeriodMs);
  const msSinceLastBurst = safeElapsed - input.state.lastBurstMs;
  const bassDelta = safeBass - input.state.prevBass;
  const sensScale = safeSens / 1.2;

  // 1. Live audio kick/bass transient trigger
  const bassThreshold = clamp(0.46 / sensScale, 0.24, 0.65);
  const isBassTransient =
    safeBass >= bassThreshold && bassDelta >= 0.12 && msSinceLastBurst >= 170;

  if (isBassTransient) {
    const intensity = Number(
      clamp((safeBass * 0.72 + bassDelta * 0.9 + safeEnergy * 0.2) * sensScale, 0.28, 1).toFixed(3)
    );
    return {
      shouldBurst: true,
      intensity,
      reason: 'bass-transient',
      nextState: {
        prevBeatIndex: beatIndex,
        prevBass: safeBass,
        lastBurstMs: safeElapsed,
      },
    };
  }

  // 2. BPM downbeat trigger (keeps bursts locked to track tempo even on quiet or sandboxed streams)
  const isNewBeat =
    input.beatPulseEnabled && beatIndex > input.state.prevBeatIndex && msSinceLastBurst >= 150;

  if (isNewBeat) {
    const isBarDownbeat = beatIndex % 4 === 0;
    const accent = isBarDownbeat ? 0.14 : 0;
    const rawIntensity = (0.36 + safeEnergy * 0.34 + safeBass * 0.36 + accent) * sensScale;
    const intensity = Number(clamp(rawIntensity, 0.26, 1).toFixed(3));
    return {
      shouldBurst: true,
      intensity,
      reason: 'downbeat',
      nextState: {
        prevBeatIndex: beatIndex,
        prevBass: safeBass,
        lastBurstMs: safeElapsed,
      },
    };
  }

  return {
    shouldBurst: false,
    intensity: 0,
    reason: 'none',
    nextState: {
      prevBeatIndex: Math.max(input.state.prevBeatIndex, beatIndex),
      prevBass: safeBass,
      lastBurstMs: input.state.lastBurstMs,
    },
  };
}

/**
 * Spawns a radial burst of luminous sparks + a central expanding light flare synchronized
 * to the detected beat intensity.
 */
export function spawnLightBurstParticles(options: SpawnBurstOptions): BeatParticle[] {
  const width = Math.max(100, options.width);
  const height = Math.max(100, options.height);
  const intensity = clamp(Number.isFinite(options.intensity) ? options.intensity : 0.5, 0.1, 1);
  const energy = clamp(Number.isFinite(options.energy) ? options.energy : 0.5, 0, 1);
  const rng = options.random || Math.random;
  const reduced = Boolean(options.prefersReducedMotion);

  const cx =
    options.originX !== undefined
      ? options.originX
      : width * (0.5 + (rng() - 0.5) * 0.14);
  const cy =
    options.originY !== undefined
      ? options.originY
      : height * (0.4 + (rng() - 0.5) * 0.1);

  const spawned: BeatParticle[] = [];

  // Central soft light-bloom flare on beat impact
  const flareMaxRadius = Math.min(width, height) * (0.2 + intensity * 0.24) * (reduced ? 0.6 : 1);
  spawned.push({
    x: cx,
    y: cy,
    vx: 0,
    vy: 0,
    radius: 18 + intensity * 22,
    maxRadius: flareMaxRadius,
    alpha: (0.18 + intensity * 0.22) * (reduced ? 0.5 : 1),
    baseAlpha: (0.18 + intensity * 0.22) * (reduced ? 0.5 : 1),
    life: 0,
    maxLife: 0.48 + intensity * 0.34,
    colorSlot: intensity > 0.72 ? 'core' : 'primary',
    kind: 'flare',
  });

  // Radial light sparks fanning outward
  const baseCount = Math.round(7 + intensity * 13 + energy * 4);
  const sparkCount = reduced ? Math.max(3, Math.round(baseCount * 0.35)) : baseCount;
  const colorSlots: ParticleColorSlot[] = ['primary', 'secondary', 'tertiary', 'core'];
  const baseSpeed = (85 + intensity * 210 + energy * 65) * (reduced ? 0.42 : 1);

  for (let i = 0; i < sparkCount; i++) {
    const evenAngle = (i / sparkCount) * Math.PI * 2;
    const jitterAngle = (rng() - 0.5) * ((Math.PI * 2) / sparkCount) * 0.75;
    const angle = evenAngle + jitterAngle;
    const speed = baseSpeed * (0.45 + rng() * 0.85);
    const radius = (1.6 + rng() * 2.8 + intensity * 1.4) * (reduced ? 0.85 : 1);
    const maxLife = 0.58 + rng() * 0.72 + intensity * 0.2;
    const baseAlpha = clamp((0.46 + intensity * 0.46) * (reduced ? 0.55 : 1), 0.15, 0.96);

    spawned.push({
      x: cx + Math.cos(angle) * (10 + rng() * 18),
      y: cy + Math.sin(angle) * (10 + rng() * 18),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius,
      maxRadius: radius * 1.5,
      alpha: baseAlpha,
      baseAlpha,
      life: 0,
      maxLife,
      colorSlot: colorSlots[i % colorSlots.length],
      kind: 'spark',
    });
  }

  return spawned;
}

/**
 * Seeds subtle ambient drifting light motes for background depth between beats.
 */
export function spawnAmbientParticles(
  width: number,
  height: number,
  count: number,
  random: () => number = Math.random
): BeatParticle[] {
  const safeW = Math.max(100, width);
  const safeH = Math.max(100, height);
  const safeCount = Math.max(0, Math.min(36, Math.floor(count)));
  const slots: ParticleColorSlot[] = ['primary', 'secondary', 'tertiary'];

  const list: BeatParticle[] = [];
  for (let i = 0; i < safeCount; i++) {
    const radius = 1.1 + random() * 2.1;
    const baseAlpha = 0.12 + random() * 0.18;
    list.push({
      x: random() * safeW,
      y: random() * safeH,
      vx: (random() - 0.5) * 14,
      vy: -6 - random() * 14,
      radius,
      maxRadius: radius,
      alpha: baseAlpha,
      baseAlpha,
      life: random() * 10,
      maxLife: Number.POSITIVE_INFINITY,
      colorSlot: slots[i % slots.length],
      kind: 'ambient',
    });
  }
  return list;
}

/**
 * Advances particle kinematics, drag, expansion, and lifetime fade-out for one frame.
 */
export function stepBeatParticles(
  particles: readonly BeatParticle[],
  dtSeconds: number,
  width: number,
  height: number,
  speedMultiplier = 1,
  maxParticles = 110
): BeatParticle[] {
  const dt = clamp(Number.isFinite(dtSeconds) ? dtSeconds : 0.016, 0.001, 0.1);
  const safeSpeed = clamp(Number.isFinite(speedMultiplier) ? speedMultiplier : 1, 0.4, 2.2);
  const safeW = Math.max(100, width);
  const safeH = Math.max(100, height);
  const motionDt = dt * (0.72 + safeSpeed * 0.32);
  const sparkDrag = Math.pow(0.24, motionDt);

  const next: BeatParticle[] = [];

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];

    if (p.kind === 'ambient') {
      let nx = p.x + p.vx * motionDt;
      let ny = p.y + p.vy * motionDt;
      if (nx < -12) nx = safeW + 12;
      if (nx > safeW + 12) nx = -12;
      if (ny < -12) ny = safeH + 12;
      if (ny > safeH + 12) ny = -12;

      const nextLife = p.life + dt;
      const shimmer = 0.72 + 0.28 * Math.sin(nextLife * 1.8 + i);
      next.push({
        ...p,
        x: nx,
        y: ny,
        life: nextLife,
        alpha: Number(clamp(p.baseAlpha * shimmer, 0.05, 0.38).toFixed(3)),
      });
      continue;
    }

    const nextLife = p.life + dt;
    if (nextLife >= p.maxLife) continue;

    const progress = clamp(nextLife / p.maxLife, 0, 1);

    if (p.kind === 'flare') {
      const easedRadius = p.radius + (p.maxRadius - p.radius) * (1 - Math.pow(1 - progress, 2.6)) * 0.28;
      const fadeAlpha = p.baseAlpha * Math.pow(1 - progress, 1.9);
      next.push({
        ...p,
        radius: Number(easedRadius.toFixed(2)),
        life: nextLife,
        alpha: Number(clamp(fadeAlpha, 0, 1).toFixed(3)),
      });
      continue;
    }

    // Spark particle: radial burst decelerating smoothly with gentle upward warm drift
    const nextVx = p.vx * sparkDrag;
    const nextVy = p.vy * sparkDrag - 12 * motionDt;
    const nx = p.x + nextVx * motionDt;
    const ny = p.y + nextVy * motionDt;

    // Quick peak then quadratic fade-out
    const fadeFactor = progress < 0.14 ? progress / 0.14 : Math.pow(1 - (progress - 0.14) / 0.86, 1.75);
    const nextRadius = Math.max(0.6, p.radius * (1 - progress * 0.35));

    next.push({
      ...p,
      x: nx,
      y: ny,
      vx: nextVx,
      vy: nextVy,
      radius: Number(nextRadius.toFixed(2)),
      life: nextLife,
      alpha: Number(clamp(p.baseAlpha * fadeFactor, 0, 1).toFixed(3)),
    });
  }

  // Enforce bounded particle count (preserving ambient motes and newest burst particles)
  if (next.length <= maxParticles) {
    return next;
  }

  const ambient = next.filter((p) => p.kind === 'ambient');
  const dynamic = next.filter((p) => p.kind !== 'ambient');
  const keepDynamicCount = Math.max(0, maxParticles - ambient.length);
  return [...ambient, ...dynamic.slice(dynamic.length - keepDynamicCount)];
}
