/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'mobile' | 'desktop';
  onOpenInstallModal: () => void;
  onInstalledToast?: (message: string) => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'desktop',
  onOpenInstallModal,
  onInstalledToast,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [installing, setInstalling] = useState(false);

  // Suppress button when already running as an installed standalone PWA
  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      setInstalling(true);
      const res = await install();
      setInstalling(false);
      if (res.success) {
        onInstalledToast?.('Aura Music installed to your device.');
      } else if (res.outcome !== 'dismissed') {
        onOpenInstallModal();
      }
      return;
    }
    onOpenInstallModal();
  };

  if (variant === 'mobile') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={installing}
        data-testid="pwa-install-button-mobile"
        data-install-ready={isInstallable ? 'true' : 'false'}
        aria-label={isInstallable ? 'Install Aura Music app' : isIOS ? 'Install Aura Music on iOS' : 'Install Aura Music app'}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all active:scale-95 cursor-pointer disabled:opacity-60 ${
          isInstallable
            ? 'bg-emerald-400 text-black hover:bg-emerald-300 shadow-sm'
            : 'bg-white/[0.08] text-slate-100 border border-white/15 hover:bg-white/[0.14]'
        }`}
      >
        {installing ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Download className="w-3 h-3 stroke-[2.5]" />
        )}
        <span>{installing ? 'Installing' : 'Install'}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={installing}
      data-testid="pwa-install-button-desktop"
      data-install-ready={isInstallable ? 'true' : 'false'}
      aria-label={isInstallable ? 'Install Aura Music app' : isIOS ? 'Install Aura Music on iOS' : 'Install Aura Music app'}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 cursor-pointer disabled:opacity-60 ${
        isInstallable
          ? 'bg-emerald-400 text-black hover:bg-emerald-300 shadow-sm'
          : 'bg-white/[0.06] text-slate-200 border border-white/12 hover:bg-white/[0.12] hover:text-white'
      }`}
    >
      {installing ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Download className="w-3.5 h-3.5 stroke-[2.2]" />
      )}
      <span>{installing ? 'Installing...' : 'Install App'}</span>
    </button>
  );
};
