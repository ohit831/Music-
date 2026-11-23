/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const OWNER_EMAIL = 'rohitrrathod1958@gmail.com';

export type LoginMethod = 'google' | 'email_signup' | 'email_signin' | 'quick_demo';

export interface SanitizedLoginEvent {
  id: string;
  uid?: string;
  visitorName: string;
  visitorEmail: string;
  loginMethod: LoginMethod;
  gymVibe: string;
  deviceLabel: string;
  loggedInAtIso: string;
  loggedInAtMs: number;
  syncedToCloud: boolean;
}

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'passwd',
  'pass',
  'secret',
  'token',
  'accesstoken',
  'refreshtoken',
  'idtoken',
  'credential',
]);

export function isOwnerUser(email?: string | null, emailVerified = true): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === OWNER_EMAIL && Boolean(emailVerified);
}

export function detectDeviceLabel(userAgent?: string): string {
  const ua =
    userAgent ??
    (typeof navigator !== 'undefined' && navigator.userAgent ? navigator.userAgent : '');
  if (!ua) return 'Web Browser';

  const isMobile = /android|iphone|ipad|ipod|mobile/i.test(ua);
  const platform = /android/i.test(ua)
    ? 'Android'
    : /iphone|ipad|ipod/i.test(ua)
    ? 'iOS'
    : /windows/i.test(ua)
    ? 'Windows'
    : /macintosh|mac os/i.test(ua)
    ? 'Mac'
    : /linux/i.test(ua)
    ? 'Linux'
    : isMobile
    ? 'Mobile'
    : 'Desktop';

  const browser = /edg\//i.test(ua)
    ? 'Edge'
    : /chrome|crios/i.test(ua)
    ? 'Chrome'
    : /firefox|fxios/i.test(ua)
    ? 'Firefox'
    : /safari/i.test(ua)
    ? 'Safari'
    : 'Browser';

  return `${platform} • ${browser}`.slice(0, 64);
}

/**
 * Recursively strip any sensitive keys (password, passwordHash, tokens, secrets) from an arbitrary payload.
 */
export function stripSensitiveFields<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      continue;
    }
    clean[k] = v;
  }
  return clean;
}

export interface LoginEventFields {
  id?: string;
  uid?: string;
  visitorName: string;
  visitorEmail: string;
  loginMethod: LoginMethod;
  gymVibe?: string;
  deviceLabel?: string;
  loggedInAtMs?: number;
  syncedToCloud?: boolean;
}

export type LoginEventInput =
  | SanitizedLoginEvent
  | (LoginEventFields & Record<string, unknown>);

/**
 * Create a strictly whitelisted, non-sensitive login event record for owner visibility.
 * Never accepts or retains password, passwordHash, or tokens.
 */
export function sanitizeLoginEvent(input: LoginEventInput): SanitizedLoginEvent {
  const nowMs = typeof input.loggedInAtMs === 'number' && Number.isFinite(input.loggedInAtMs)
    ? input.loggedInAtMs
    : Date.now();
  const cleanName = String(input.visitorName || 'Guest Listener')
    .trim()
    .slice(0, 80) || 'Guest Listener';
  const cleanEmail = String(input.visitorEmail || 'unknown@apnamusic.app')
    .trim()
    .toLowerCase()
    .slice(0, 120);
  const cleanVibe = String(input.gymVibe || 'Heavy Lifting')
    .trim()
    .slice(0, 48);
  const cleanDevice = String(input.deviceLabel || detectDeviceLabel())
    .trim()
    .slice(0, 64);
  const safeMethod: LoginMethod = (
    ['google', 'email_signup', 'email_signin', 'quick_demo'] as const
  ).includes(input.loginMethod)
    ? input.loginMethod
    : 'email_signin';

  const id =
    typeof input.id === 'string' && /^[a-zA-Z0-9_-]{4,80}$/.test(input.id)
      ? input.id
      : `evt_${nowMs}_${Math.random().toString(36).slice(2, 8)}`;

  const event: SanitizedLoginEvent = {
    id,
    visitorName: cleanName,
    visitorEmail: cleanEmail,
    loginMethod: safeMethod,
    gymVibe: cleanVibe,
    deviceLabel: cleanDevice,
    loggedInAtIso: new Date(nowMs).toISOString(),
    loggedInAtMs: nowMs,
    syncedToCloud: Boolean(input.syncedToCloud),
  };

  if (typeof input.uid === 'string' && input.uid.trim()) {
    event.uid = input.uid.trim().slice(0, 128);
  }

  return event;
}

export function formatLoginAuditCsv(events: SanitizedLoginEvent[]): string {
  const header = ['Name', 'Email', 'Login Method', 'Gym Vibe', 'Device', 'Time (ISO)', 'Cloud Synced'];
  const escape = (val: string) => `"${val.replace(/"/g, '""')}"`;
  const rows = events.map((e) =>
    [
      escape(e.visitorName),
      escape(e.visitorEmail),
      escape(e.loginMethod),
      escape(e.gymVibe),
      escape(e.deviceLabel),
      escape(e.loggedInAtIso),
      escape(e.syncedToCloud ? 'Yes' : 'Local Session'),
    ].join(',')
  );
  return [header.join(','), ...rows].join('\n');
}

export function buildOwnerEmailReportUrl(events: SanitizedLoginEvent[]): string {
  const recent = events.slice(0, 20);
  const lines = recent.map(
    (e, i) =>
      `${i + 1}. ${e.visitorName} <${e.visitorEmail}> | Method: ${e.loginMethod} | Device: ${e.deviceLabel} | Vibe: ${e.gymVibe} | At: ${new Date(e.loggedInAtMs).toLocaleString()}`
  );
  const subject = encodeURIComponent(`Apna Music Visitor Login Activity (${events.length} logins)`);
  const body = encodeURIComponent(
    [
      'Apna Music - Non-Sensitive Visitor Login Summary (No Passwords Included)',
      `Total Logged Events: ${events.length}`,
      '',
      ...lines,
    ].join('\n')
  );
  return `mailto:${OWNER_EMAIL}?subject=${subject}&body=${body}`;
}
