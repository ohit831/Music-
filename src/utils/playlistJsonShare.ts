/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Playlist } from './musicDiscovery';
import { getAppBaseUrl } from './appUrl';

const DEFAULT_APP_URL = 'https://ohit831.github.io/Music-/';

export const PLAYLIST_GRADIENT_PRESETS = [
  'from-emerald-600 via-teal-900 to-black',
  'from-purple-600 via-indigo-950 to-neutral-950',
  'from-rose-600 via-pink-900 to-zinc-950',
  'from-amber-600 via-orange-950 to-stone-950',
  'from-cyan-600 via-blue-950 to-slate-950',
  'from-zinc-700 via-neutral-900 to-black',
] as const;

export const DEFAULT_PLAYLIST_EMOJI = '✨';
export const DEFAULT_PLAYLIST_DESCRIPTION = 'Custom indie collection created by you.';
export const PLAYLIST_JSON_QUERY_PARAM = 'plj';

export interface CompactPlaylistJsonPayload {
  v: 1;
  t: string;
  ids: string[];
  d?: string;
  e?: string;
  g?: number;
  c?: 1;
}

export interface PlaylistJsonExportResult {
  payload: CompactPlaylistJsonPayload;
  jsonString: string;
  prettyJsonString: string;
  encodedPayload: string;
  shareUrl: string;
  trackCount: number;
}

export interface DecodedPlaylistImport {
  title: string;
  description: string;
  coverEmoji: string;
  coverGradient: string;
  isCollaborative: boolean;
  trackIds: string[];
  matchedTrackCount: number;
  unknownTrackCount: number;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let base64: string;
  if (typeof Buffer !== 'undefined') {
    base64 = Buffer.from(bytes).toString('base64');
  } else {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    base64 = btoa(binary);
  }
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(encoded: string): Uint8Array {
  const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(padLength);

  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(padded, 'base64'));
  }

  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function normalizeTrackIds(rawIds: unknown): string[] {
  if (!Array.isArray(rawIds)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of rawIds) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed || trimmed.length > 128 || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
    if (result.length >= 250) break;
  }
  return result;
}

export function buildCompactPlaylistPayload(input: {
  title: string;
  description?: string;
  coverEmoji?: string;
  coverGradient?: string;
  isCollaborative?: boolean;
  trackIds: string[];
}): CompactPlaylistJsonPayload {
  const cleanTitle = (input.title || '').trim().slice(0, 120) || 'Untitled Playlist';
  const cleanDesc = (input.description || '').trim().slice(0, 240);
  const cleanEmoji = (input.coverEmoji || '').trim().slice(0, 8);
  const gradientIndex = input.coverGradient
    ? PLAYLIST_GRADIENT_PRESETS.indexOf(input.coverGradient as (typeof PLAYLIST_GRADIENT_PRESETS)[number])
    : -1;

  const payload: CompactPlaylistJsonPayload = {
    v: 1,
    t: cleanTitle,
    ids: normalizeTrackIds(input.trackIds),
  };

  if (cleanDesc && cleanDesc !== DEFAULT_PLAYLIST_DESCRIPTION) {
    payload.d = cleanDesc;
  }
  if (cleanEmoji && cleanEmoji !== DEFAULT_PLAYLIST_EMOJI) {
    payload.e = cleanEmoji;
  }
  if (gradientIndex > 0) {
    payload.g = gradientIndex;
  }
  if (input.isCollaborative) {
    payload.c = 1;
  }

  return payload;
}

export function encodePlaylistJsonPayload(payload: CompactPlaylistJsonPayload): string {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  return bytesToBase64Url(bytes);
}

export function buildPlaylistJsonShareLink(
  input: {
    title: string;
    description?: string;
    coverEmoji?: string;
    coverGradient?: string;
    isCollaborative?: boolean;
    trackIds: string[];
  },
  origin?: string
): PlaylistJsonExportResult {
  const payload = buildCompactPlaylistPayload(input);
  const jsonString = JSON.stringify(payload);
  const prettyJsonString = JSON.stringify(payload, null, 2);
  const encodedPayload = encodePlaylistJsonPayload(payload);

  const resolvedOrigin =
    origin ||
    (typeof window !== 'undefined' && window.location?.origin
      ? getAppBaseUrl(window.location.origin)
      : DEFAULT_APP_URL);

  const base = resolvedOrigin.replace(/\/+$/, '');
  const shareUrl = `${base}/?${PLAYLIST_JSON_QUERY_PARAM}=${encodedPayload}`;

  return {
    payload,
    jsonString,
    prettyJsonString,
    encodedPayload,
    shareUrl,
    trackCount: payload.ids.length,
  };
}

function hydrateDecodedObject(
  raw: Record<string, unknown>,
  knownTrackIds?: Set<string>
): DecodedPlaylistImport | null {
  const rawTitle =
    typeof raw.t === 'string'
      ? raw.t
      : typeof raw.title === 'string'
      ? raw.title
      : '';
  const cleanTitle = rawTitle.trim().slice(0, 120);

  const rawIds = Array.isArray(raw.ids)
    ? raw.ids
    : Array.isArray(raw.trackIds)
    ? raw.trackIds
    : null;

  if (!cleanTitle && (!rawIds || rawIds.length === 0)) {
    return null;
  }

  const normalizedIds = normalizeTrackIds(rawIds || []);
  const rawDesc =
    typeof raw.d === 'string'
      ? raw.d
      : typeof raw.description === 'string'
      ? raw.description
      : '';
  const rawEmoji =
    typeof raw.e === 'string'
      ? raw.e
      : typeof raw.coverEmoji === 'string'
      ? raw.coverEmoji
      : DEFAULT_PLAYLIST_EMOJI;

  let coverGradient: string = PLAYLIST_GRADIENT_PRESETS[0];
  if (typeof raw.g === 'number' && Number.isInteger(raw.g) && raw.g >= 0 && raw.g < PLAYLIST_GRADIENT_PRESETS.length) {
    coverGradient = PLAYLIST_GRADIENT_PRESETS[raw.g];
  } else if (typeof raw.coverGradient === 'string' && raw.coverGradient.trim()) {
    coverGradient = raw.coverGradient.trim();
  }

  const isCollaborative = raw.c === 1 || raw.c === true || raw.isCollaborative === true;

  let matchedTrackCount = normalizedIds.length;
  let unknownTrackCount = 0;
  let finalTrackIds = normalizedIds;

  if (knownTrackIds) {
    const matched = normalizedIds.filter((id) => knownTrackIds.has(id));
    matchedTrackCount = matched.length;
    unknownTrackCount = normalizedIds.length - matched.length;
    finalTrackIds = matched;
  }

  return {
    title: cleanTitle || 'Imported Playlist',
    description: rawDesc.trim().slice(0, 240) || 'Imported from JSON backup link.',
    coverEmoji: rawEmoji.trim().slice(0, 8) || DEFAULT_PLAYLIST_EMOJI,
    coverGradient,
    isCollaborative,
    trackIds: finalTrackIds,
    matchedTrackCount,
    unknownTrackCount,
  };
}

export function decodePlaylistJsonPayload(
  encoded: string,
  knownTrackIds?: Set<string>
): DecodedPlaylistImport | null {
  const clean = (encoded || '').trim();
  if (!clean || clean.length > 16000) return null;

  try {
    const bytes = base64UrlToBytes(clean);
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    return hydrateDecodedObject(parsed as Record<string, unknown>, knownTrackIds);
  } catch {
    return null;
  }
}

export function parsePlaylistJsonInput(
  rawInput: string,
  knownTrackIds?: Set<string>
): DecodedPlaylistImport | null {
  const clean = (rawInput || '').trim();
  if (!clean || clean.length > 32000) return null;

  // 1. Raw JSON object
  if (clean.startsWith('{')) {
    try {
      const parsed = JSON.parse(clean);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return null;
      }
      return hydrateDecodedObject(parsed as Record<string, unknown>, knownTrackIds);
    } catch {
      return null;
    }
  }

  // 2. Full URL or query string containing ?plj=...
  if (clean.includes(`${PLAYLIST_JSON_QUERY_PARAM}=`)) {
    try {
      const url = clean.startsWith('http://') || clean.startsWith('https://')
        ? new URL(clean)
        : new URL(clean.startsWith('?') ? `${DEFAULT_APP_URL}${clean}` : `${DEFAULT_APP_URL}?${clean}`);
      const param = url.searchParams.get(PLAYLIST_JSON_QUERY_PARAM);
      if (param) {
        return decodePlaylistJsonPayload(param, knownTrackIds);
      }
    } catch {
      const match = clean.match(/[?&]plj=([^&#\s]+)/);
      if (match?.[1]) {
        return decodePlaylistJsonPayload(decodeURIComponent(match[1]), knownTrackIds);
      }
    }
  }

  // 3. Raw compact base64url code
  return decodePlaylistJsonPayload(clean, knownTrackIds);
}

export function createPlaylistFromImport(
  imported: DecodedPlaylistImport,
  idPrefix = 'pl-import'
): Playlist {
  return {
    id: `${idPrefix}-${Date.now()}`,
    title: imported.title,
    description: imported.description,
    coverGradient: imported.coverGradient,
    coverEmoji: imported.coverEmoji,
    trackIds: imported.trackIds,
    isPersonalized: false,
    isCollaborative: imported.isCollaborative,
    createdAt: new Date().toISOString().split('T')[0],
    owner: 'You',
  };
}
