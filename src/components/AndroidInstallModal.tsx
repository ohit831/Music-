/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Smartphone,
  Download,
  CheckCircle2,
  Sparkles,
  Zap,
  Check,
  HelpCircle,
  ShieldCheck,
  FileCode,
  Maximize2,
  Minimize2,
  CheckCircle,
  QrCode,
  ExternalLink,
  Copy,
  Share2,
  Globe,
  Wifi,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface AndroidInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidInstallModal: React.FC<AndroidInstallModalProps> = ({ isOpen, onClose }) => {
  const {
    deferredPrompt,
    isInstalled,
    install,
    isAndroid,
    isFullscreen,
    serviceWorkerReady,
    toggleFullscreen,
    publicOnlineUrl,
    copyDirectLink,
    openOnlineApp,
    shareOnlineApp,
    downloadAndroidShortcut,
  } = usePWAInstall();

  const [installing, setInstalling] = useState(false);
  const [activeTab, setActiveTab] = useState<'online' | 'install' | 'guide' | 'offline'>('online');
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [installStatusMessage, setInstallStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      setInstalling(true);
      setInstallStatusMessage('Browser install prompt khul raha hai...');
      const res = await install();
      setInstalling(false);
      if (res.success) {
        setInstallStatusMessage('App successfully install ho gayi! 🎉');
        setTimeout(() => onClose(), 1500);
      } else if (res.outcome === 'dismissed') {
        setInstallStatusMessage('Install prompt dismiss ho gaya. Chrome menu se add karein.');
      } else {
        setInstallStatusMessage('Install prompt nahi mila. Chrome menu (⋮) -> "Add to Home screen" karein.');
      }
    } else {
      setActiveTab('guide');
    }
  };

  const handleCopyLink = async () => {
    const ok = await copyDirectLink();
    if (ok) {
      setCopiedLink(true);
      setInstallStatusMessage('Online link copy ho gaya! Phone ke browser me paste karein. 📋');
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  const handleDownloadOfflineApp = () => {
    downloadAndroidShortcut();
    setDownloadSuccess(true);
    setInstallStatusMessage('IndieWave-Music-App.html phone ke Downloads folder me save ho gayi! 📥');
    setTimeout(() => setDownloadSuccess(false), 4000);
  };

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    publicOnlineUrl
  )}&margin=8&color=1ed760&bgcolor=14141a`;

  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    `IndieWave Online Music App: ${publicOnlineUrl}`
  )}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="android-modal-title"
    >
      <div className="relative w-full max-w-lg bg-[#14141a] border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl text-white overflow-hidden my-auto max-h-[92vh] overflow-y-auto">
        {/* Glow accent */}
        <div className="absolute -top-24 -right-24 w-52 h-52 bg-[#1ed760]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-52 h-52 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white rounded-full bg-white/5 active:scale-95 transition-all z-10 cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-4 pr-8">
          <div className="relative shrink-0">
            <img
              src="/pwa-192x192.png"
              alt="IndieWave App Icon"
              className="w-13 h-13 rounded-2xl shadow-lg border border-white/10 object-cover"
            />
            <div className="absolute -bottom-1 -right-1 bg-[#1ed760] text-black p-0.5 rounded-full shadow-md">
              <Smartphone className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 id="android-modal-title" className="text-lg font-bold text-white tracking-tight">
                IndieWave Online & Mobile App
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1ed760]/20 text-[#1ed760] border border-[#1ed760]/30 flex items-center gap-1 font-mono">
                <Wifi className="w-3 h-3" /> Live Online
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Online Music Streaming & Mobile App Installation (Zero 403 Error)
            </p>
          </div>
        </div>

        {/* Notification banner if action was performed */}
        {installStatusMessage && (
          <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-[#1ed760] flex items-center gap-2 mb-3 animate-fade-in">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span className="flex-1 font-medium">{installStatusMessage}</span>
          </div>
        )}

        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-1 p-1 bg-white/5 rounded-2xl border border-white/5 mb-4 text-xs font-semibold overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('online')}
            className={`flex-1 min-w-[90px] py-2 px-2.5 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'online'
                ? 'bg-[#1ed760] text-black font-extrabold shadow-md'
                : 'text-neutral-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>1. Online Link & QR</span>
          </button>
          <button
            onClick={() => setActiveTab('install')}
            className={`flex-1 min-w-[90px] py-2 px-2.5 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'install'
                ? 'bg-[#1ed760] text-black font-extrabold shadow-md'
                : 'text-neutral-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>2. Install App</span>
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`flex-1 min-w-[80px] py-2 px-2.5 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'guide'
                ? 'bg-[#1ed760] text-black font-extrabold shadow-md'
                : 'text-neutral-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Guide</span>
          </button>
          <button
            onClick={() => setActiveTab('offline')}
            className={`flex-1 min-w-[80px] py-2 px-2.5 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'offline'
                ? 'bg-[#1ed760] text-black font-extrabold shadow-md'
                : 'text-neutral-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Offline Backup</span>
          </button>
        </div>

        {/* Tab 1: Online Mobile Access with QR Code & Direct Link */}
        {activeTab === 'online' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-[#1ed760]">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>Zero 403 Error - Public Online Link</span>
              </div>
              <p className="text-[11px] text-neutral-300 leading-relaxed">
                Yeh Google Cloud ka verified public link hai. Ise phone par open karne par <strong>kisi login ya 403 error ki jarurat nahi hoti</strong> — direct open hoga aur online music chalega!
              </p>
            </div>

            {/* QR Code Card */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <div className="p-2 rounded-2xl bg-[#0f0f12] border border-[#1ed760]/30 shadow-lg shrink-0">
                <img
                  src={qrImageUrl}
                  alt="Scan QR code for IndieWave Online App"
                  className="w-36 h-36 rounded-xl object-contain"
                  loading="eager"
                />
              </div>
              <div className="space-y-2 flex-1">
                <div className="flex items-center justify-center sm:justify-start gap-1.5 text-[#1ed760] font-bold text-xs uppercase tracking-wide">
                  <QrCode className="w-4 h-4" />
                  <span>Phone Camera se Scan Karein</span>
                </div>
                <p className="text-xs text-neutral-200">
                  Apne phone ka Camera kholiye aur QR code par point karein — 1 tap me <strong>IndieWave Online App</strong> khul jayegi!
                </p>
                <div className="pt-1 flex flex-wrap gap-2 justify-center sm:justify-start">
                  <button
                    onClick={handleCopyLink}
                    className="py-1.5 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-[#1ed760]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Link Copied!' : 'Copy Mobile Link'}</span>
                  </button>
                  <a
                    href={whatsappShareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-1.5 px-3 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center gap-1.5 transition-all"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Send to WhatsApp</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Direct Open Button */}
            <div className="space-y-2">
              <button
                onClick={openOnlineApp}
                className="w-full py-3 px-4 rounded-xl bg-[#1ed760] hover:bg-[#1db954] text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#1ed760]/20 active:scale-98 transition-all cursor-pointer"
              >
                <ExternalLink className="w-4 h-4 stroke-[2.5]" />
                <span>🌐 Open Online App in New Tab (No 403)</span>
              </button>
              <p className="text-[10px] text-neutral-400 text-center font-mono break-all px-2">
                {publicOnlineUrl}
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Install App directly to Mobile Home Screen */}
        {activeTab === 'install' && (
          <div className="space-y-3.5">
            {/* 1-Tap PWA Install if deferredPrompt is ready */}
            {deferredPrompt ? (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-500/20 to-transparent border border-purple-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-white text-sm flex items-center gap-2">
                    <Zap className="w-4 h-4 text-purple-400" />
                    1-Tap Browser WebAPK Install Ready
                  </span>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200">
                    Auto-Detected
                  </span>
                </div>
                <p className="text-xs text-neutral-300">
                  Browser ne IndieWave PWA ko install karne ke liye ready kar liya hai.
                </p>
                <button
                  onClick={handleInstallClick}
                  disabled={installing}
                  className="w-full py-2.5 px-3 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{installing ? 'Installing App...' : '📱 Install IndieWave to Phone Screen'}</span>
                </button>
              </div>
            ) : null}

            {/* Native Fullscreen Mode */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/15 to-transparent border border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#1ed760] text-black flex items-center justify-center font-extrabold text-xs">
                    📱
                  </div>
                  <span className="font-extrabold text-white text-sm">
                    Fullscreen Native App Experience
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1ed760]/20 text-[#1ed760] border border-[#1ed760]/30 font-mono">
                  Instant
                </span>
              </div>
              <p className="text-[11px] text-neutral-300">
                Browser ka address bar aur navigation chup jayega aur phone me pure real app ki tarah look aayega!
              </p>
              <button
                onClick={() => {
                  toggleFullscreen();
                  onClose();
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-[#1ed760] hover:bg-[#1db954] text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-[#1ed760]/20 active:scale-98 transition-all cursor-pointer"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4 stroke-[2.5]" />}
                <span>{isFullscreen ? 'Exit Fullscreen' : '📱 Launch Fullscreen Mobile App'}</span>
              </button>
            </div>

            {/* Browser Add to Home Screen Step */}
            <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-sm text-white">
                <Smartphone className="w-4 h-4 text-[#1ed760]" />
                <span>Phone ke Home Screen par App Icon Kaise Lagayein:</span>
              </div>
              <ol className="text-xs text-neutral-300 space-y-2 pl-1">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-white/10 text-[#1ed760] font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    1
                  </span>
                  <span>Mobile browser ke top right kone me <strong>3 dots (⋮)</strong> dabayein.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-white/10 text-[#1ed760] font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    2
                  </span>
                  <span>Menu me <strong>"Add to Home screen"</strong> ya <strong>"Install app"</strong> select karein.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-white/10 text-[#1ed760] font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    3
                  </span>
                  <span>Phone ke desktop par IndieWave ka green app icon add ho jayega!</span>
                </li>
              </ol>
            </div>

            <button
              onClick={() => setActiveTab('guide')}
              className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Illustrated 3-Step Guide Dekhein</span>
            </button>
          </div>
        )}

        {/* Tab 3: 3-Step Illustrated Guide */}
        {activeTab === 'guide' && (
          <div className="space-y-3.5">
            <div className="p-3.5 bg-white/[0.04] rounded-2xl border border-white/10 space-y-3 text-xs text-neutral-300">
              <p className="font-bold text-white text-sm">
                Android Chrome me Install Karne ka Tarika:
              </p>

              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#1ed760] text-black font-extrabold flex items-center justify-center text-xs shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <p className="font-bold text-white">Chrome ke Top Right Me 3 Dots (⋮) Dabayein</p>
                  <p className="text-neutral-400 text-[11px] mt-0.5">
                    Apne phone screen ke upar daayein kone me Chrome browser ke teen dots <strong>(⋮)</strong> par click karein.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#1ed760] text-black font-extrabold flex items-center justify-center text-xs shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <p className="font-bold text-white">"Add to Home screen" / "Install app" Chunein</p>
                  <p className="text-neutral-400 text-[11px] mt-0.5">
                    Menu list me se <strong>"Add to Home screen"</strong> (Home screen me jodein) par tap karein.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#1ed760] text-black font-extrabold flex items-center justify-center text-xs shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <p className="font-bold text-white">IndieWave App Launch Karein</p>
                  <p className="text-neutral-400 text-[11px] mt-0.5">
                    Aapke phone ke application drawer aur home screen me IndieWave ka icon ban jayega. Uspe click karke jab chahein tab gaane sunein!
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-white/[0.02] rounded-xl border border-white/5 text-[11px] text-neutral-400">
              💡 <strong>Tip for iPhone / Safari Users:</strong> Safari me bottom me Share icon (square with arrow ↑) dabayein aur <em>"Add to Home Screen"</em> chunein.
            </div>
          </div>
        )}

        {/* Tab 4: Offline HTML App File */}
        {activeTab === 'offline' && (
          <div className="space-y-3.5">
            <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-white text-sm flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-cyan-400" />
                  Standalone Offline App File (.html)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                  100% Offline
                </span>
              </div>
              <p className="text-xs text-neutral-300">
                IndieWave ki offline app file seedha aapke phone ke Downloads folder me save ho jayegi. Isme audio player aur offline tracks shaamil hain!
              </p>
              <button
                onClick={handleDownloadOfflineApp}
                className="w-full py-2.5 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all cursor-pointer"
              >
                {downloadSuccess ? <Check className="w-4 h-4 stroke-[2.5]" /> : <Download className="w-4 h-4 stroke-[2.5]" />}
                <span>{downloadSuccess ? 'File Downloaded! 📥' : '📥 Download Mobile App File (.html)'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer details */}
        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-neutral-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#1ed760]" />
            <span>PWA v2.0 Ready • Service Worker Active</span>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white font-medium cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
