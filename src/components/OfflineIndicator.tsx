/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/usePWAInstall';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="offline-indicator"
      className="fixed bottom-24 md:bottom-24 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-500/95 px-3.5 py-2 text-xs font-semibold text-black shadow-lg backdrop-blur-sm"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>Offline Mode — Playing cached app shell</span>
    </div>
  );
};
