/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  X,
  Smartphone,
  Download,
  CheckCircle2,
  Check,
  Maximize2,
  Minimize2,
  QrCode,
  ExternalLink,
  Copy,
  Share2,
  Globe,
  ShieldCheck,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { APP_BASE_URL } from '../utils/appUrl';

interface AndroidInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidInstallModal: React.FC<AndroidInstallModalProps> = ({ isOpen, onClose }) => {
  const {
    deferredPrompt,
    isInstallable,
    isInstalled,
    readiness,
    install,
    isIOS,
    isFullscreen,
    serviceWorkerReady,
    toggleFullscreen,
    publicOnlineUrl,
    copyDirectLink,
    shareOnlineApp,
  } = usePWAInstall();

  const [installing, setInstalling] = useState(false);
  const [activeTab, setActiveTab] = useState<'install' | 'ios' | 'share'>(() =>
    isIOS ? 'ios' : 'install'
  );
  const [copiedLink, setCopiedLink] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(isIOS ? 'ios' : 'install');
      setStatusMessage(null);
    }
  }, [isOpen, isIOS]);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      setStatusMessage(
        'Direct browser install prompt is not active yet. Use the Chrome menu (⋮) → Install app or Add to Home screen below.'
      );
      return;
    }

    setInstalling(true);
    setStatusMessage('Opening browser install dialog...');
    const res = await install();
    setInstalling(false);

    if (res.success) {
      setStatusMessage('Aura Music installed successfully!');
      setTimeout(() => onClose(), 1200);
    } else if (res.outcome === 'dismissed') {
      setStatusMessage('Install dismissed. You can install anytime from the header or browser menu.');
    } else {
      setStatusMessage('Use your browser menu (⋮) → Add to Home screen to finish installing.');
    }
  };

  const handleCopyLink = async () => {
    const ok = await copyDirectLink();
    if (ok) {
      setCopiedLink(true);
      setStatusMessage('App link copied to clipboard.');
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleShare = async () => {
    const ok = await shareOnlineApp();
    if (ok) {
      setStatusMessage('Shared Aura Music link.');
    }
  };

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    publicOnlineUrl
  )}&margin=8&color=1ed760&bgcolor=14141a`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-modal-title"
      data-testid="pwa-install-modal"
    >
      <div className="relative w-full max-w-lg bg-[#12141e] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl text-white my-auto max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-white/[0.06] hover:bg-white/[0.12] transition-colors cursor-pointer"
          aria-label="Close install dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-5 pr-8">
          <img
            src={`${APP_BASE_URL}pwa-192x192.png`}
            alt="Aura Music app icon"
            className="w-12 h-12 rounded-xl shadow-md border border-white/15 object-cover shrink-0"
          />
          <div>
            <h3 id="install-modal-title" className="text-base sm:text-lg font-bold text-white tracking-tight">
              Install Aura Music
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Standalone app with home-screen icon &amp; offline shell
            </p>
          </div>
        </div>

        {/* Status Feedback */}
        {statusMessage && (
          <div
            role="status"
            className="mb-4 px-3 py-2.5 rounded-xl bg-emerald-500/12 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Already Installed Notice */}
        {isInstalled && (
          <div className="mb-4 px-3.5 py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-200 flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Aura Music is already running as an installed standalone app.</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div
          role="tablist"
          aria-label="Installation options"
          className="grid grid-cols-3 gap-1 p-1 bg-white/[0.05] rounded-xl border border-white/[0.07] mb-4 text-xs font-semibold"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'install'}
            onClick={() => setActiveTab('install')}
            className={`py-2 px-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'install'
                ? 'bg-white text-black font-bold'
                : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install App</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'ios'}
            onClick={() => setActiveTab('ios')}
            className={`py-2 px-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'ios'
                ? 'bg-white text-black font-bold'
                : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>iOS Safari</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'share'}
            onClick={() => setActiveTab('share')}
            className={`py-2 px-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'share'
                ? 'bg-white text-black font-bold'
                : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>QR &amp; Link</span>
          </button>
        </div>

        {/* Tab 1: Android & Desktop Install */}
        {activeTab === 'install' && (
          <div className="space-y-4">
            {/* Primary 1-Tap Native Install CTA when browser prompt is ready */}
            {isInstallable ? (
              <div className="p-4 rounded-xl bg-emerald-500/12 border border-emerald-500/35 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm text-white">Ready for 1-Tap Install</span>
                  <span className="text-[11px] font-medium text-emerald-300">Browser Verified</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Your browser is ready to install Aura Music directly to your home screen with its app icon and standalone window.
                </p>
                <button
                  type="button"
                  onClick={handleInstallClick}
                  disabled={installing}
                  data-testid="pwa-native-install-cta"
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
                >
                  {installing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 stroke-[2.5]" />
                  )}
                  <span>{installing ? 'Installing...' : 'Install Aura Music Now'}</span>
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-white/[0.04] border border-white/10 space-y-3">
                <div className="flex items-center gap-2 font-semibold text-sm text-white">
                  <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Install from Android Chrome or Desktop</span>
                </div>
                <ol className="text-xs text-slate-300 space-y-2.5">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-white/10 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      1
                    </span>
                    <span>
                      Reload the page once so Chrome picks up the updated credentialed manifest and app icon.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-white/10 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      2
                    </span>
                    <span>
                      Tap Chrome&apos;s top-right menu <strong>(⋮)</strong> and choose <strong>Add to Home screen</strong> → <strong>Install</strong>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-white/10 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      3
                    </span>
                    <span>
                      If you are opening a private authenticated preview link and Chrome only allows <strong>Create shortcut</strong>, tap <strong>Create shortcut</strong> to place the Aura Music icon directly on your home screen.
                    </span>
                  </li>
                </ol>
              </div>
            )}

            {/* Live PWA Readiness Diagnostics */}
            <div
              data-testid="pwa-readiness-checklist"
              className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-2"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Installability Status
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {readiness.coreReadyCount}/{readiness.coreTotalCount} Core Checks
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                <div className="flex items-center gap-1.5 text-slate-300">
                  {readiness.hasManifestLink && readiness.manifestUsesCredentials ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  )}
                  <span>Manifest + Credentials</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  {serviceWorkerReady ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  )}
                  <span>{serviceWorkerReady ? 'Service Worker Active' : 'Activating Service Worker'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  {readiness.isSecureContext ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  )}
                  <span>Secure Context (HTTPS)</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  {!readiness.isInIframe ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  )}
                  <span>{readiness.isInIframe ? 'Open in Direct Tab' : 'Top-Level Window'}</span>
                </div>
              </div>
            </div>

            {/* Instant Fullscreen Option */}
            <button
              type="button"
              onClick={() => {
                toggleFullscreen();
                onClose();
              }}
              className="w-full py-2.5 px-3.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.11] border border-white/10 text-slate-100 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span>{isFullscreen ? 'Exit Fullscreen Mode' : 'Launch Fullscreen App View'}</span>
            </button>
          </div>
        )}

        {/* Tab 2: iOS Safari Guide */}
        {activeTab === 'ios' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white/[0.04] border border-white/10 space-y-3">
              <div className="flex items-center gap-2 font-semibold text-sm text-white">
                <Smartphone className="w-4 h-4 text-sky-400 shrink-0" />
                <span>Install on iPhone &amp; iPad (Safari)</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Safari on iOS uses the Share menu to install standalone web apps with our 180×180 Apple Touch Icon.
              </p>
              <ol className="text-xs text-slate-200 space-y-2.5">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-white/10 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    1
                  </span>
                  <span>Open Aura Music in <strong>Safari</strong> on your iPhone or iPad.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-white/10 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    2
                  </span>
                  <span>Tap the <strong>Share</strong> icon in the bottom Safari toolbar.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-white/10 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    3
                  </span>
                  <span>Scroll down, tap <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.</span>
                </li>
              </ol>
            </div>
          </div>
        )}

        {/* Tab 3: QR Code & Direct Link */}
        {activeTab === 'share' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <div className="p-2 rounded-xl bg-[#0b0d17] border border-white/10 shrink-0">
                <img
                  src={qrImageUrl}
                  alt="Scan QR code to open Aura Music on your phone"
                  className="w-32 h-32 rounded-lg object-contain"
                  loading="eager"
                />
              </div>
              <div className="space-y-2.5 flex-1">
                <div className="flex items-center justify-center sm:justify-start gap-1.5 text-emerald-400 font-semibold text-xs">
                  <QrCode className="w-4 h-4" />
                  <span>Open on Your Phone</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Scan this QR code with your phone camera or copy the direct link to open Aura Music in mobile Chrome or Safari.
                </p>
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="py-1.5 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="py-1.5 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share</span>
                  </button>
                </div>
              </div>
            </div>

            <a
              href={publicOnlineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-200 text-black font-bold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Open Direct App URL</span>
            </a>
            <p className="text-[11px] text-slate-500 text-center font-mono break-all px-2">
              {publicOnlineUrl}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-slate-400">
          <span>
            {serviceWorkerReady ? 'Offline Service Worker Active' : 'Initializing Service Worker...'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-white font-semibold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
