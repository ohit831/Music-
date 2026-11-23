import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Capture early beforeinstallprompt before React mounts so native install prompts are never missed
declare global {
  interface Window {
    __deferredPWAInstallPrompt?: Event | null;
  }
}

if (typeof window !== 'undefined') {
  window.__deferredPWAInstallPrompt = window.__deferredPWAInstallPrompt ?? null;
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    window.__deferredPWAInstallPrompt = event;
  });
  window.addEventListener('appinstalled', () => {
    window.__deferredPWAInstallPrompt = null;
  });
}

// Single authoritative Service Worker registration managed by vite-plugin-pwa
registerSW({
  immediate: true,
  onRegisterError(error) {
    console.warn('Service worker registration failed:', error);
  },
});

createRoot(document.getElementById('root')!).render(<App />);
