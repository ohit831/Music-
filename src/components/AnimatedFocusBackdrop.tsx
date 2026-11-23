/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import type { IndieTrack } from '../utils/musicDiscovery';
import type { AppTheme } from '../utils/playbackSettings';
import { deriveAnimatedFocusGradient } from '../utils/animatedFocus';

interface AnimatedFocusBackdropProps {
  enabled: boolean;
  currentTrack: IndieTrack | null;
  theme: AppTheme;
}

/**
 * Full-viewport subtle, slow-moving CSS gradient backdrop driven by the current
 * track's energy and melancholy metadata. Renders behind all interactive surfaces
 * and respects prefers-reduced-motion automatically via CSS.
 */
export const AnimatedFocusBackdrop: React.FC<AnimatedFocusBackdropProps> = ({
  enabled,
  currentTrack,
  theme,
}) => {
  const config = useMemo(
    () => deriveAnimatedFocusGradient(currentTrack, theme),
    [currentTrack?.energy, currentTrack?.melancholy, currentTrack?.bpm, theme]
  );

  return (
    <div
      aria-hidden="true"
      data-testid="animated-focus-backdrop"
      data-active={enabled ? 'true' : 'false'}
      data-vibe={config.vibeLabel}
      data-palette={config.paletteName}
      data-duration={`${config.animationDurationSec}s`}
      data-energy={Math.round(config.energy * 100)}
      data-melancholy={Math.round(config.melancholy * 100)}
      style={config.cssVariables as React.CSSProperties}
      className={`pointer-events-none fixed inset-0 z-0 overflow-hidden transition-opacity duration-700 ease-out ${
        enabled ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Base slow-drifting CSS linear gradient */}
      <div
        className={`absolute inset-0 animated-focus-surface transition-[background,opacity] duration-1000 ease-out ${
          enabled ? 'animated-focus-surface--active' : ''
        }`}
        style={{
          backgroundImage: config.surfaceGradientCss,
          opacity: enabled ? config.ambientOpacity : 0,
        }}
      />

      {/* Soft upper-left atmospheric wash */}
      <div
        className={`absolute -top-[22%] -left-[16%] w-[64vw] h-[64vw] max-w-[780px] max-h-[780px] rounded-full blur-3xl animated-focus-orb-a transition-opacity duration-1000 ${
          enabled ? 'opacity-90' : 'opacity-0'
        }`}
        style={{
          backgroundImage: config.orbPrimaryCss,
        }}
      />

      {/* Soft lower-right harmonic counter-wash */}
      <div
        className={`absolute -bottom-[24%] -right-[14%] w-[62vw] h-[62vw] max-w-[760px] max-h-[760px] rounded-full blur-3xl animated-focus-orb-b transition-opacity duration-1000 ${
          enabled ? 'opacity-85' : 'opacity-0'
        }`}
        style={{
          backgroundImage: config.orbSecondaryCss,
        }}
      />

      {/* Subtle dark vignette to keep UI text and cards high-contrast */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 38%, rgba(7, 9, 18, 0.08) 0%, rgba(7, 9, 18, 0.56) 100%)',
        }}
      />
    </div>
  );
};
