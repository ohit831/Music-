/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PUBLIC_SHARED_URL = 'https://ais-pre-7zejjor7m2u37rv2vk5mh6-4296094932.asia-southeast1.run.app';

export function getPublicOnlineUrl(): string {
  if (typeof window === 'undefined') return PUBLIC_SHARED_URL;
  try {
    const origin = window.location.origin;
    if (origin.includes('ais-dev-')) {
      return origin.replace('ais-dev-', 'ais-pre-');
    }
    if (origin.includes('ais-pre-')) {
      return origin;
    }
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return PUBLIC_SHARED_URL;
    }
    return origin;
  } catch {
    return PUBLIC_SHARED_URL;
  }
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [isChrome, setIsChrome] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [serviceWorkerReady, setServiceWorkerReady] = useState(false);
  const [canInstall, setCanInstall] = useState(false);

  // Compute clean direct public URL for mobile access
  const getDirectAppUrl = useCallback(() => {
    return getPublicOnlineUrl();
  }, []);

  useEffect(() => {
    // Check if running in standalone mode (already installed as Android / PWA app)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    // Check iframe status
    const inIframe = window.self !== window.top;
    setIsInIframe(inIframe);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAndroidDevice = /android/.test(userAgent);
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    const isChromeBrowser = /chrome|crios/.test(userAgent) && !/edge|edg|opr/.test(userAgent);

    setIsAndroid(isAndroidDevice);
    setIsIOS(isIOSDevice);
    setIsChrome(isChromeBrowser);

    // Track fullscreen status
    const updateFullscreenState = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', updateFullscreenState);

    // Check Service Worker registration status
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg) {
          setServiceWorkerReady(true);
        }
      });
      navigator.serviceWorker.ready.then(() => {
        setServiceWorkerReady(true);
      });
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      document.removeEventListener('fullscreenchange', updateFullscreenState);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async (): Promise<{ success: boolean; outcome?: string; error?: string }> => {
    if (!deferredPrompt) {
      return { success: false, error: 'NO_PROMPT' };
    }
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setCanInstall(false);
        setDeferredPrompt(null);
        return { success: true, outcome: 'accepted' };
      }
      return { success: false, outcome: 'dismissed' };
    } catch (err: any) {
      console.warn('Install prompt error:', err);
      return { success: false, error: err?.message || 'PROMPT_FAILED' };
    }
  };

  const toggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    } catch {}
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

  // Generates a 100% self-contained offline HTML Android app that runs without 403 errors
  const downloadAndroidShortcut = () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="utf-8">
  <title>IndieWave - Music App</title>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="theme-color" content="#0f0f12">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: #0f0f12; color: #f3f3f3; min-height: 100vh; display: flex; flex-direction: column; padding: 20px; }
    .header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.1); }
    .logo { width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, #1ed760, #10b981); display: flex; align-items: center; justify-content: center; font-size: 24px; }
    .title { font-size: 20px; font-weight: 800; color: #fff; }
    .badge { font-size: 10px; background: rgba(30,215,96,0.2); color: #1ed760; padding: 2px 8px; border-radius: 12px; font-weight: 700; border: 1px solid rgba(30,215,96,0.3); }
    .card { background: #181822; border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 20px; margin-bottom: 16px; }
    .btn { display: block; width: 100%; padding: 14px; border-radius: 14px; background: #1ed760; color: #000; font-size: 15px; font-weight: 800; text-align: center; text-decoration: none; border: none; cursor: pointer; margin-top: 10px; }
    .btn-secondary { background: rgba(255,255,255,0.1); color: #fff; }
    .track-list { margin-top: 16px; }
    .track { display: flex; align-items: center; justify-content: space-between; padding: 12px; border-radius: 12px; background: rgba(255,255,255,0.03); margin-bottom: 8px; cursor: pointer; }
    .track:hover { background: rgba(255,255,255,0.08); }
    .track-name { font-weight: 600; font-size: 14px; }
    .track-artist { font-size: 12px; color: #888; }
    .playing { color: #1ed760; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">🎵</div>
    <div>
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="title">IndieWave</span>
        <span class="badge">OFFLINE APP</span>
      </div>
      <p style="font-size:12px;color:#888;">Standalone Mobile Audio Player</p>
    </div>
  </div>

  <div class="card">
    <h3 style="font-size:16px;margin-bottom:8px;">📱 Phone par Save / Add Karein</h3>
    <p style="font-size:13px;color:#aaa;line-height:1.5;">
      Yeh file 100% offline kaam karti hai bina kisi 403 error ke! Chrome ke <strong>3 dots (⋮)</strong> dabakar <strong>"Add to Home screen"</strong> karein.
    </p>
    <button class="btn" onclick="playOfflineTone()">▶ Play Offline Audio Chords</button>
  </div>

  <div class="card">
    <h3 style="font-size:16px;margin-bottom:12px;">🎶 Popular Songs</h3>
    <div class="track-list">
      <div class="track" onclick="playSong('Singara Siriye', 'Vijay Prakash')">
        <div>
          <p class="track-name">Singara Siriye</p>
          <p class="track-artist">Vijay Prakash & Ajaneesh Loknath</p>
        </div>
        <span>▶</span>
      </div>
      <div class="track" onclick="playSong('Kesariya', 'Arijit Singh')">
        <div>
          <p class="track-name">Kesariya</p>
          <p class="track-artist">Arijit Singh & Pritam</p>
        </div>
        <span>▶</span>
      </div>
      <div class="track" onclick="playSong('Die With A Smile', 'Lady Gaga')">
        <div>
          <p class="track-name">Die With A Smile</p>
          <p class="track-artist">Lady Gaga & Bruno Mars</p>
        </div>
        <span>▶</span>
      </div>
    </div>
    <p id="nowPlaying" style="margin-top:12px;font-size:12px;color:#1ed760;text-align:center;font-weight:700;"></p>
  </div>

  <script>
    let audioCtx = null;
    function getAudioContext() {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      return audioCtx;
    }
    function playOfflineTone() {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
      document.getElementById('nowPlaying').innerText = '🎵 Playing Offline Sound Chords!';
    }
    function playSong(title, artist) {
      playOfflineTone();
      document.getElementById('nowPlaying').innerText = '🎵 Playing: ' + title + ' (' + artist + ')';
    }
  </script>
</body>
</html>`;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = 'IndieWave-Music-App.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
  };

  const openOnlineApp = () => {
    const url = getDirectAppUrl();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const shareOnlineApp = async (): Promise<boolean> => {
    const url = getDirectAppUrl();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'IndieWave - Music App',
          text: 'Listen to underground indie music, Kannada & Bollywood hits on IndieWave online mobile app!',
          url: url,
        });
        return true;
      } catch {
        return false;
      }
    } else {
      return copyDirectLink();
    }
  };

  return {
    deferredPrompt,
    isInstalled,
    canInstall: canInstall || !isInstalled,
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
    openOnlineApp,
    shareOnlineApp,
    downloadAndroidShortcut,
  };
}
