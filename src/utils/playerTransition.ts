/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TrackTransitionDirection = 'next' | 'previous' | 'jump';

export type MotionKeyframeState = {
  opacity: number;
  x: number;
  y: number;
  scale: number;
};

export interface PlayerBarMotionSpec {
  artworkInitial: MotionKeyframeState;
  artworkAnimate: MotionKeyframeState;
  artworkExit: MotionKeyframeState;
  metaInitial: MotionKeyframeState;
  metaAnimate: MotionKeyframeState;
  metaExit: MotionKeyframeState;
  durationSec: number;
  metaDurationSec: number;
  sweepDurationSec: number;
  ease: [number, number, number, number];
}

export interface PlayerBarAnimationClasses {
  artworkEnterClass: string;
  artworkExitClass: string;
  metaEnterClass: string;
  sweepClass: string;
  glowClass: string;
}

export const SMOOTH_PLAYER_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function getPlayerBarMotionSpec(
  direction: TrackTransitionDirection,
  prefersReducedMotion: boolean
): PlayerBarMotionSpec {
  if (prefersReducedMotion) {
    const rest: MotionKeyframeState = { opacity: 1, x: 0, y: 0, scale: 1 };
    return {
      artworkInitial: rest,
      artworkAnimate: rest,
      artworkExit: rest,
      metaInitial: rest,
      metaAnimate: rest,
      metaExit: rest,
      durationSec: 0,
      metaDurationSec: 0,
      sweepDurationSec: 0,
      ease: SMOOTH_PLAYER_EASE,
    };
  }

  const horizontalOffset = direction === 'next' ? 18 : direction === 'previous' ? -18 : 0;
  const verticalOffset = direction === 'jump' ? 10 : 0;
  const metaOffset = direction === 'next' ? 12 : direction === 'previous' ? -12 : 0;
  const metaVertical = direction === 'jump' ? 6 : 0;

  return {
    artworkInitial: {
      opacity: 0,
      x: horizontalOffset,
      y: verticalOffset,
      scale: 0.92,
    },
    artworkAnimate: {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
    },
    artworkExit: {
      opacity: 0,
      x: -horizontalOffset,
      y: -verticalOffset * 0.6,
      scale: 0.92,
    },
    metaInitial: {
      opacity: 0,
      x: metaOffset,
      y: metaVertical,
      scale: 1,
    },
    metaAnimate: {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
    },
    metaExit: {
      opacity: 0,
      x: -metaOffset,
      y: -metaVertical * 0.5,
      scale: 1,
    },
    durationSec: 0.28,
    metaDurationSec: 0.24,
    sweepDurationSec: 0.55,
    ease: SMOOTH_PLAYER_EASE,
  };
}

/**
 * Returns pure CSS compositor animation class names for PlayerBar track switches.
 */
export function getPlayerBarAnimationClasses(
  direction: TrackTransitionDirection,
  hasTransitioned: boolean,
  prefersReducedMotion: boolean
): PlayerBarAnimationClasses {
  if (!hasTransitioned || prefersReducedMotion) {
    return {
      artworkEnterClass: '',
      artworkExitClass: '',
      metaEnterClass: '',
      sweepClass: '',
      glowClass: '',
    };
  }

  const suffix = direction === 'previous' ? 'prev' : direction;
  return {
    artworkEnterClass: `animate-playerbar-art-enter-${suffix}`,
    artworkExitClass: `animate-playerbar-art-exit-${suffix}`,
    metaEnterClass: `animate-playerbar-meta-enter-${suffix}`,
    sweepClass: 'animate-playerbar-sweep',
    glowClass: 'animate-playerbar-glow',
  };
}
