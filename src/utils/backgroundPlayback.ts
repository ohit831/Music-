/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IndieTrack } from './musicDiscovery';

export interface ResolvedAudioStream {
  audioUrl: string;
  isFullLength: boolean;
  duration?: number;
  source: 'saavn' | 'itunes' | 'track';
}

export interface MediaMetadataArtwork {
  src: string;
  sizes: string;
  type: string;
}

export interface MediaMetadataPayload {
  title: string;
  artist: string;
  album: string;
  artwork: MediaMetadataArtwork[];
}

const DISALLOWED_VERSION_PATTERN = /\b(karaoke|instrumental|sped up|nightcore|slowed|reverb|lofi|8d audio|tribute|ringtone|karaoke version)\b/i;

/**
 * Generate a tiny, 100% valid 0.5-second silent PCM WAV data URI.
 * Playing this silently in a looping <audio> element unlocks the mobile browser's
 * background MediaSession and prevents the OS from suspending the tab when locked.
 */
export function createSilentWavDataUri(): string {
  const sampleRate = 8000;
  const numSamples = 4000; // 0.5 seconds
  const dataByteLength = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataByteLength);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataByteLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, 'data');
  view.setUint32(40, dataByteLength, true);

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  if (typeof btoa === 'function') {
    return `data:audio/wav;base64,${btoa(binary)}`;
  }
  return `data:audio/wav;base64,${Buffer.from(buffer).toString('base64')}`;
}

export const SILENT_KEEPALIVE_WAV_DATA_URI = createSilentWavDataUri();

/**
 * Validate whether an external audio search candidate is an authentic original vocal track
 * rather than a karaoke, instrumental, nightcore, or sped-up cover.
 */
export function isAuthenticAudioCandidate(
  candidate: {
    title?: string;
    language?: string;
    artists?: string;
    hasEncryptedUrl?: boolean;
  },
  expectedTitle: string,
  expectedArtist: string
): boolean {
  if (!candidate.hasEncryptedUrl) return false;

  const lang = (candidate.language || '').toLowerCase().trim();
  if (lang === 'instrumental') return false;

  const candTitle = (candidate.title || '').toLowerCase();
  const expTitle = (expectedTitle || '').toLowerCase();

  // Reject karaoke/cover/remix tags unless the user explicitly asked for them
  if (DISALLOWED_VERSION_PATTERN.test(candTitle) && !DISALLOWED_VERSION_PATTERN.test(expTitle)) {
    return false;
  }

  // Ensure meaningful artist overlap when expectedArtist is provided
  const cleanExpArtist = (expectedArtist || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .trim();
  const cleanCandArtists = (candidate.artists || '').toLowerCase();

  if (cleanExpArtist && cleanCandArtists) {
    const artistTokens = cleanExpArtist
      .split(/\s+/)
      .filter((tok) => tok.length >= 3 && !['and', 'the', 'feat', 'ft', 'music', 'official'].includes(tok));

    if (artistTokens.length > 0) {
      const hasArtistMatch = artistTokens.some((tok) => cleanCandArtists.includes(tok));
      if (!hasArtistMatch) {
        return false;
      }
    }
  }

  // Ensure meaningful title overlap
  const cleanExpTitle = expTitle
    .replace(/\(.*?\)|\[.*?\]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .trim();
  const titleTokens = cleanExpTitle.split(/\s+/).filter((tok) => tok.length >= 2);
  if (titleTokens.length > 0) {
    const matchedTokens = titleTokens.filter((tok) => candTitle.includes(tok));
    if (matchedTokens.length === 0) {
      return false;
    }
  }

  return true;
}

/**
 * Build ordered search query variants for resolving full-length streams.
 * Multi-artist strings like "Vijay Prakash, Ananya Bhat & B. Ajaneesh Loknath"
 * often fail strict AND search, so we include a clean primary-artist query too.
 */
export function buildAudioSearchQueries(title: string, artist: string): string[] {
  const cleanTitle = (title || '')
    .replace(/\(.*?official.*?\)|\[.*?official.*?\]|\(from.*?\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  const cleanArtist = (artist || '').replace(/\s+/g, ' ').trim();
  const primaryArtist = cleanArtist
    .split(/,|&|\bfeat\.?\b|\bft\.?\b|\band\b/i)[0]
    .trim();

  const queries: string[] = [];
  const pushUnique = (q: string) => {
    const trimmed = q.replace(/\s+/g, ' ').trim();
    if (trimmed && !queries.some((existing) => existing.toLowerCase() === trimmed.toLowerCase())) {
      queries.push(trimmed);
    }
  };

  if (cleanTitle && primaryArtist) {
    pushUnique(`${cleanTitle} ${primaryArtist}`);
  }
  if (cleanTitle && cleanArtist) {
    pushUnique(`${cleanTitle} ${cleanArtist}`);
  }
  if (cleanTitle) {
    pushUnique(cleanTitle);
  }
  return queries;
}

/**
 * Compute a safe seek offset when handing playback over from foreground YouTube
 * to the HTML5 <audio> lock-screen carrier.
 */
export function computeSafeSeekTarget(
  currentTime: number,
  audioDuration: number,
  isFullLength: boolean
): number {
  const safeCurrent = Number.isFinite(currentTime) && currentTime > 0 ? currentTime : 0;
  if (!Number.isFinite(audioDuration) || audioDuration <= 0) {
    return safeCurrent;
  }

  if (isFullLength || safeCurrent < audioDuration - 1.5) {
    return Math.min(safeCurrent, Math.max(0, audioDuration - 0.5));
  }

  // For shorter preview streams (e.g. 30s iTunes AAC), wrap cleanly so playback stays active
  const usableWindow = Math.max(1, audioDuration - 2);
  return safeCurrent % usableWindow;
}

/**
 * Build lock-screen MediaSession metadata payload with multiple artwork resolutions.
 */
export function buildMediaMetadataInit(track: IndieTrack): MediaMetadataPayload {
  const cover =
    track.coverUrl ||
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';

  return {
    title: track.title || 'Unknown Track',
    artist: track.artist || 'Apna Music',
    album: track.album || 'Apna Music • Background Play',
    artwork: [
      { src: cover, sizes: '96x96', type: 'image/jpeg' },
      { src: cover, sizes: '192x192', type: 'image/jpeg' },
      { src: cover, sizes: '512x512', type: 'image/jpeg' },
    ],
  };
}

const resolvedAudioCache = new Map<string, ResolvedAudioStream | null>();

/**
 * Resolve the best direct HTML5 <audio> stream URL for a track so playback
 * survives screen locks and background execution on mobile devices.
 */
export async function resolveTrackAudioStream(track: IndieTrack): Promise<ResolvedAudioStream | null> {
  const cacheKey = `${track.id}::${track.title}::${track.artist}`.toLowerCase();
  if (resolvedAudioCache.has(cacheKey)) {
    return resolvedAudioCache.get(cacheKey) ?? null;
  }

  // 1. Try server full-length / official AAC stream resolver
  try {
    const params = new URLSearchParams({
      title: track.title || '',
      artist: track.artist || '',
    });
    const res = await fetch(`/api/resolve-audio?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.audioUrl && data.isFullLength) {
        const result: ResolvedAudioStream = {
          audioUrl: data.audioUrl,
          isFullLength: true,
          duration: typeof data.duration === 'number' ? data.duration : track.duration,
          source: 'saavn',
        };
        resolvedAudioCache.set(cacheKey, result);
        return result;
      }
      // If track itself doesn't have an audioUrl, accept iTunes preview from server
      if (!track.audioUrl && data && data.audioUrl) {
        const result: ResolvedAudioStream = {
          audioUrl: data.audioUrl,
          isFullLength: Boolean(data.isFullLength),
          duration: typeof data.duration === 'number' ? data.duration : 30,
          source: data.source === 'saavn' ? 'saavn' : 'itunes',
        };
        resolvedAudioCache.set(cacheKey, result);
        return result;
      }
    }
  } catch {
    // Fall back gracefully to track.audioUrl
  }

  // 2. Use track's existing official audioUrl (e.g., iTunes AAC or custom MP3/M4A URL)
  if (track.audioUrl) {
    const isDirectFullStream =
      !track.audioUrl.includes('itunes.apple.com') && !track.audioUrl.includes('AudioPreview');
    const result: ResolvedAudioStream = {
      audioUrl: track.audioUrl,
      isFullLength: isDirectFullStream,
      duration: isDirectFullStream ? track.duration : 30,
      source: 'track',
    };
    resolvedAudioCache.set(cacheKey, result);
    return result;
  }

  resolvedAudioCache.set(cacheKey, null);
  return null;
}
