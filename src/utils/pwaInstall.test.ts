import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectPWAPlatform,
  evaluatePWAReadiness,
  isStandaloneDisplayMode,
  resolveInstallActionMode,
} from './pwaInstall';

test('detectPWAPlatform distinguishes Android, iOS, and Desktop user agents', () => {
  assert.equal(
    detectPWAPlatform('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/128.0.0.0 Mobile Safari/537.36'),
    'android'
  );
  assert.equal(
    detectPWAPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1'),
    'ios'
  );
  assert.equal(
    detectPWAPlatform('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/128.0.0.0 Safari/537.36'),
    'desktop'
  );
});

test('isStandaloneDisplayMode detects both CSS media query and iOS navigator.standalone', () => {
  assert.equal(isStandaloneDisplayMode(false, false), false);
  assert.equal(isStandaloneDisplayMode(true, false), true);
  assert.equal(isStandaloneDisplayMode(false, true), true);
  assert.equal(isStandaloneDisplayMode(false, undefined), false);
});

test('resolveInstallActionMode prioritizes installed -> native prompt -> iOS guide -> manual guide', () => {
  assert.equal(
    resolveInstallActionMode({ isInstalled: true, hasDeferredPrompt: true, isIOS: false }),
    'installed'
  );
  assert.equal(
    resolveInstallActionMode({ isInstalled: false, hasDeferredPrompt: true, isIOS: false }),
    'native-prompt'
  );
  assert.equal(
    resolveInstallActionMode({ isInstalled: false, hasDeferredPrompt: false, isIOS: true }),
    'ios-guide'
  );
  assert.equal(
    resolveInstallActionMode({ isInstalled: false, hasDeferredPrompt: false, isIOS: false }),
    'manual-guide'
  );
});

test('evaluatePWAReadiness requires secure context, credentialed manifest, active SW, and top-level window', () => {
  const ready = evaluatePWAReadiness({
    isSecureContext: true,
    hasManifestLink: true,
    manifestUsesCredentials: true,
    serviceWorkerReady: true,
    hasNativePrompt: true,
    isInIframe: false,
  });
  assert.equal(ready.coreReadyCount, 3);
  assert.equal(ready.coreTotalCount, 3);
  assert.equal(ready.isCoreInstallable, true);

  const missingCredentials = evaluatePWAReadiness({
    isSecureContext: true,
    hasManifestLink: true,
    manifestUsesCredentials: false,
    serviceWorkerReady: true,
    hasNativePrompt: false,
    isInIframe: false,
  });
  assert.equal(missingCredentials.coreReadyCount, 2);
  assert.equal(missingCredentials.isCoreInstallable, false);

  const inIframe = evaluatePWAReadiness({
    isSecureContext: true,
    hasManifestLink: true,
    manifestUsesCredentials: true,
    serviceWorkerReady: true,
    hasNativePrompt: false,
    isInIframe: true,
  });
  assert.equal(inIframe.coreReadyCount, 3);
  assert.equal(inIframe.isCoreInstallable, false);
});
