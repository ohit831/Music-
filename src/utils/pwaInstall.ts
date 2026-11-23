/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PWAPlatform = 'android' | 'ios' | 'desktop';
export type PWAInstallMode = 'installed' | 'native-prompt' | 'ios-guide' | 'manual-guide';

export interface PWAReadinessInput {
  isSecureContext: boolean;
  hasManifestLink: boolean;
  manifestUsesCredentials: boolean;
  serviceWorkerReady: boolean;
  hasNativePrompt: boolean;
  isInIframe: boolean;
}

export interface PWAReadinessReport {
  isSecureContext: boolean;
  hasManifestLink: boolean;
  manifestUsesCredentials: boolean;
  serviceWorkerReady: boolean;
  hasNativePrompt: boolean;
  isInIframe: boolean;
  coreReadyCount: number;
  coreTotalCount: number;
  isCoreInstallable: boolean;
}

export function detectPWAPlatform(userAgent: string): PWAPlatform {
  const ua = (userAgent || '').toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) {
    return 'ios';
  }
  if (/android/.test(ua)) {
    return 'android';
  }
  return 'desktop';
}

export function isStandaloneDisplayMode(
  matchMediaStandalone: boolean,
  navigatorStandalone?: boolean
): boolean {
  return Boolean(matchMediaStandalone || navigatorStandalone === true);
}

export function resolveInstallActionMode(params: {
  isInstalled: boolean;
  hasDeferredPrompt: boolean;
  isIOS: boolean;
}): PWAInstallMode {
  if (params.isInstalled) {
    return 'installed';
  }
  if (params.hasDeferredPrompt) {
    return 'native-prompt';
  }
  if (params.isIOS) {
    return 'ios-guide';
  }
  return 'manual-guide';
}

export function evaluatePWAReadiness(input: PWAReadinessInput): PWAReadinessReport {
  const coreChecks = [
    input.isSecureContext,
    input.hasManifestLink && input.manifestUsesCredentials,
    input.serviceWorkerReady,
  ];
  const coreReadyCount = coreChecks.filter(Boolean).length;
  const coreTotalCount = coreChecks.length;

  return {
    ...input,
    coreReadyCount,
    coreTotalCount,
    isCoreInstallable: coreReadyCount === coreTotalCount && !input.isInIframe,
  };
}
