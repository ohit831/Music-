/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  detectPWAPlatform,
  evaluatePWAReadiness,
  isStandaloneDisplayMode,
  resolveInstallActionMode,
  type PWAReadinessReport,
} from '../utils/pwaInstall';
import { APP_BASE_URL, getAppBaseUrl } from '../utils/appUrl';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
    __deferredPWAInstallPrompt?: Event | null;
  }
}

export function getPublicOnlineUrl(): string {
  if (typeof window === 'undefined') return `http://localhost:3000${APP_BASE_URL}`;
  try {
    const loc = window.location;
    if (loc && loc.origin && !loc.origin.includes('localhost') && !loc.origin.includes('127.0.0.1')) {
      return getAppBaseUrl(loc.origin);
    }
    if (document.referrer && document.referrer.startsWith('http')) {
      try {
        const refUrl = new URL(document.referrer);
        if (refUrl.origin && (refUrl.origin.includes('run.app') || refUrl.origin.includes('aistudio.google.com'))) {
          return getAppBaseUrl(refUrl.origin);
        }
      } catch {
        // Ignore invalid referrer URLs
      }
    }
    return loc && loc.origin ? getAppBaseUrl(loc.origin) : `http://localhost:3000${APP_BASE_URL}`;
  } catch {
    return typeof window !== 'undefined' ? getAppBaseUrl(window.location.origin) : `http://localhost:3000${APP_BASE_URL}`;
  }
}

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    if (typeof window !== 'undefined' && window.__deferredPWAInstallPrompt) {
      return window.__deferredPWAInstallPrompt as BeforeInstallPromptEvent;
    }
    return null;
  });
  const [isInstalled, setIsInstalled] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [isChrome, setIsChrome] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [serviceWorkerReady, setServiceWorkerReady] = useState(false);
  const [manifestCheck, setManifestCheck] = useState({
    hasManifestLink: false,
    manifestUsesCredentials: false,
  });

  const getDirectAppUrl = useCallback(() => {
    return getPublicOnlineUrl();
  }, []);

  useEffect(() => {
    const standaloneMedia = window.matchMedia('(display-mode: standalone)');
    const checkStandalone = () => {
      const navStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone;
      setIsInstalled(isStandaloneDisplayMode(standaloneMedia.matches, navStandalone));
    };
    checkStandalone();

    const handleDisplayModeChange = () => checkStandalone();
    if (standaloneMedia.addEventListener) {
      standaloneMedia.addEventListener('change', handleDisplayModeChange);
    }

    const inIframe = window.self !== window.top;
    setIsInIframe(inIframe);

    const userAgent = window.navigator.userAgent || '';
    const platform = detectPWAPlatform(userAgent);
    setIsAndroid(platform === 'android');
    setIsIOS(platform === 'ios');
    setIsChrome(/chrome|crios/i.test(userAgent) && !/edge|edg|opr/i.test(userAgent));

    // Inspect manifest link in <head>
    const inspectManifestLink = () => {
      const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
      setManifestCheck({
        hasManifestLink: Boolean(link?.getAttribute('href')),
        manifestUsesCredentials: link?.getAttribute('crossorigin') === 'use-credentials',
      });
    };
    inspectManifestLink();

    // Sync any prompt captured before hook mount
    if (window.__deferredPWAInstallPrompt) {
      setDeferredPrompt(window.__deferredPWAInstallPrompt as BeforeInstallPromptEvent);
    }

    const updateFullscreenState = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', updateFullscreenState);

    let cancelled = false;
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .getRegistration()
        .then((reg) => {
          if (!cancelled && (reg?.active || reg?.waiting || reg?.installing)) {
            setServiceWorkerReady(true);
          }
        })
        .catch(() => {});

      navigator.serviceWorker.ready
        .then((reg) => {
          if (!cancelled && reg?.active) {
            setServiceWorkerReady(true);
          }
        })
        .catch(() => {});
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      window.__deferredPWAInstallPrompt = e;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      window.__deferredPWAInstallPrompt = null;
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      cancelled = true;
      if (standaloneMedia.removeEventListener) {
        standaloneMedia.removeEventListener('change', handleDisplayModeChange);
      }
      document.removeEventListener('fullscreenchange', updateFullscreenState);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async (): Promise<{ success: boolean; outcome?: string; error?: string }> => {
    const promptEvent =
      deferredPrompt || (typeof window !== 'undefined' ? (window.__deferredPWAInstallPrompt as BeforeInstallPromptEvent | null) : null);

    if (!promptEvent) {
      return { success: false, error: 'NO_PROMPT' };
    }
    try {
      await promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === 'accepted') {
        window.__deferredPWAInstallPrompt = null;
        setIsInstalled(true);
        setDeferredPrompt(null);
        return { success: true, outcome: 'accepted' };
      }
      return { success: false, outcome: 'dismissed' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'PROMPT_FAILED';
      console.warn('Install prompt error:', err);
      return { success: false, error: message };
    }
  };

  const toggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    } catch {
      // Ignore fullscreen rejection
    }
  };

  const copyDirectLink = async (): Promise<boolean> => {
    const url = getDirectAppUrl();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        return true;
      }
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch {
      return false;
    }
  };

  const shareOnlineApp = async (): Promise<boolean> => {
    const url = getDirectAppUrl();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Aura Music - Personalized Music Discovery',
          text: 'Install Aura Music for your playlists, personalized mixes, and music discovery.',
          url,
        });
        return true;
      } catch {
        return false;
      }
    }
    return copyDirectLink();
  };

  const isSecureContext =
    typeof window !== 'undefined'
      ? Boolean(window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      : true;

  const readiness: PWAReadinessReport = useMemo(
    () =>
      evaluatePWAReadiness({
        isSecureContext,
        hasManifestLink: manifestCheck.hasManifestLink,
        manifestUsesCredentials: manifestCheck.manifestUsesCredentials,
        serviceWorkerReady,
        hasNativePrompt: Boolean(deferredPrompt),
        isInIframe,
      }),
    [
      isSecureContext,
      manifestCheck.hasManifestLink,
      manifestCheck.manifestUsesCredentials,
      serviceWorkerReady,
      deferredPrompt,
      isInIframe,
    ]
  );

  const installMode = useMemo(
    () =>
      resolveInstallActionMode({
        isInstalled,
        hasDeferredPrompt: Boolean(deferredPrompt),
        isIOS,
      }),
    [isInstalled, deferredPrompt, isIOS]
  );

  return {
    deferredPrompt,
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    canInstall: !isInstalled,
    installMode,
    readiness,
    isAndroid,
    isIOS,
    isInIframe,
    isChrome,
    isFullscreen,
    serviceWorkerReady,
    directAppUrl: getDirectAppUrl(),
    publicOnlineUrl: getDirectAppUrl(),
    install,
    toggleFullscreen,
    copyDirectLink,
    shareOnlineApp,
  };
}
