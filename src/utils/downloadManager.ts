/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IndieTrack } from './musicDiscovery';

export interface DownloadedTrackInfo {
  trackId: string;
  title: string;
  artist: string;
  coverUrl: string;
  duration: number;
  genre: string;
  downloadedAt: number;
  fileSizeBytes: number;
}

const STORAGE_KEY = 'indiewave_downloaded_tracks_v1';

// In-memory fallback for non-browser/test environments
let memoryStore: Record<string, string> = {};

function getStorageItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return memoryStore[key] || null;
  } catch {
    return memoryStore[key] || null;
  }
}

function setStorageItem(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
    memoryStore[key] = value;
  } catch {
    memoryStore[key] = value;
  }
}

function removeStorageItem(key: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
    delete memoryStore[key];
  } catch {
    delete memoryStore[key];
  }
}

/**
 * Format bytes into human-readable string (KB, MB, GB)
 */
export function formatBytes(bytes: number): string {
  if (bytes <= 0 || isNaN(bytes)) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * Estimate file size based on track duration (assuming 192kbps audio ~ 24 KB/s)
 */
export function estimateTrackFileSize(durationSeconds: number, bitRateKbps: number = 192): number {
  const bytesPerSecond = (bitRateKbps * 1000) / 8;
  const estimated = Math.round(durationSeconds * bytesPerSecond);
  // Ensure a realistic minimum (at least 1.5MB for normal songs)
  return Math.max(1572864, estimated);
}

/**
 * Calculate total storage used by a collection of downloaded tracks
 */
export function calculateTotalStorage(tracks: DownloadedTrackInfo[]): {
  totalBytes: number;
  formatted: string;
  count: number;
} {
  const totalBytes = tracks.reduce((acc, t) => acc + (t.fileSizeBytes || 0), 0);
  return {
    totalBytes,
    formatted: formatBytes(totalBytes),
    count: tracks.length,
  };
}

/**
 * Get all downloaded track records
 */
export function getDownloadedTracks(): DownloadedTrackInfo[] {
  const raw = getStorageItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Get IDs of all downloaded tracks
 */
export function getDownloadedTrackIds(): string[] {
  return getDownloadedTracks().map((t) => t.trackId);
}

/**
 * Check if a specific track is downloaded
 */
export function isTrackDownloaded(trackId: string): boolean {
  const downloads = getDownloadedTracks();
  return downloads.some((t) => t.trackId === trackId);
}

/**
 * Save track info to downloaded store
 */
export function recordDownload(track: IndieTrack, customSizeBytes?: number): DownloadedTrackInfo {
  const current = getDownloadedTracks();
  const existingIdx = current.findIndex((t) => t.trackId === track.id);
  const fileSizeBytes = customSizeBytes || estimateTrackFileSize(track.duration);

  const newInfo: DownloadedTrackInfo = {
    trackId: track.id,
    title: track.title,
    artist: track.artist,
    coverUrl: track.coverUrl,
    duration: track.duration,
    genre: track.genre,
    downloadedAt: Date.now(),
    fileSizeBytes,
  };

  if (existingIdx >= 0) {
    current[existingIdx] = newInfo;
  } else {
    current.unshift(newInfo);
  }

  setStorageItem(STORAGE_KEY, JSON.stringify(current));
  dispatchDownloadEvent('added', track.id);
  return newInfo;
}

/**
 * Remove a track from downloaded store
 */
export function removeDownload(trackId: string): boolean {
  const current = getDownloadedTracks();
  const filtered = current.filter((t) => t.trackId !== trackId);
  if (filtered.length === current.length) return false;

  setStorageItem(STORAGE_KEY, JSON.stringify(filtered));
  dispatchDownloadEvent('removed', trackId);
  return true;
}

/**
 * Clear all downloaded tracks from store
 */
export function clearAllDownloads(): void {
  removeStorageItem(STORAGE_KEY);
  dispatchDownloadEvent('cleared');
}

/**
 * Dispatch an event so listening UI components can immediately update
 */
function dispatchDownloadEvent(action: 'added' | 'removed' | 'cleared', trackId?: string) {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(
        new CustomEvent('indiewave:downloads-changed', {
          detail: { action, trackId, timestamp: Date.now() },
        })
      );
    } catch {
      // Ignore if CustomEvent is not available
    }
  }
}

/**
 * Pure binary 16-bit 44.1kHz Stereo PCM WAV generator.
 * Creates a playable, non-corrupted audio file containing a pleasant musical loop
 * tuned to the song's energy and harmonic key.
 */
export function createPlayableWavBlob(
  trackTitle: string,
  durationSeconds: number = 8,
  sampleRate: number = 44100
): Blob {
  const numChannels = 2;
  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const totalSamples = Math.floor(sampleRate * durationSeconds);
  const dataByteLength = totalSamples * blockAlign;
  const headerByteLength = 44;
  const totalLength = headerByteLength + dataByteLength;

  const buffer = new ArrayBuffer(totalLength);
  const view = new DataView(buffer);

  // Helper to write ASCII strings
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // 1. RIFF chunk descriptor
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataByteLength, true); // ChunkSize
  writeString(8, 'WAVE');

  // 2. "fmt " sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, byteRate, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample

  // 3. "data" sub-chunk
  writeString(36, 'data');
  view.setUint32(40, dataByteLength, true); // Subchunk2Size

  // Generate musical chord progression & melody based on track title hash
  let hash = 0;
  for (let i = 0; i < trackTitle.length; i++) {
    hash = (hash << 5) - hash + trackTitle.charCodeAt(i);
    hash |= 0;
  }
  const baseFreq = 220 + (Math.abs(hash) % 220); // 220Hz to 440Hz base (A3 - A4)
  const chordIntervals = [1, 1.25, 1.5, 1.875]; // Root, Major 3rd, 5th, Major 7th

  let offset = 44;
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    // Envelope: fade in and fade out
    const fadeIn = Math.min(1, t / 0.5);
    const fadeOut = Math.min(1, (durationSeconds - t) / 0.5);
    const env = fadeIn * fadeOut;

    // Harmonic chords
    let sampleL = 0;
    let sampleR = 0;
    for (let c = 0; c < chordIntervals.length; c++) {
      const freq = baseFreq * chordIntervals[c];
      const weight = 0.25 / (c + 1);
      sampleL += Math.sin(2 * Math.PI * freq * t) * weight;
      sampleR += Math.sin(2 * Math.PI * (freq * 1.005) * t) * weight;
    }

    // Add rhythmic pulse
    const pulse = 0.5 + 0.5 * Math.sin(2 * Math.PI * 2 * t);
    sampleL *= env * pulse;
    sampleR *= env * pulse;

    // Clamp to 16-bit range (-32768 to 32767)
    const intL = Math.max(-32768, Math.min(32767, Math.floor(sampleL * 26000)));
    const intR = Math.max(-32768, Math.min(32767, Math.floor(sampleR * 26000)));

    view.setInt16(offset, intL, true);
    view.setInt16(offset + 2, intR, true);
    offset += 4;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Triggers a browser file save dialog for the user to download the song file.
 */
export function triggerBrowserFileDownload(blob: Blob, filename: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const safeFilename = filename.replace(/[\\/:*?"<>|]/g, '_');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeFilename.endsWith('.wav') ? safeFilename : `${safeFilename}.wav`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();

  // Clean up
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 2000);
}

/**
 * Download a track with smooth simulated progress callback, trigger disk download, and save to offline registry.
 */
export async function downloadTrackWithProgress(
  track: IndieTrack,
  onProgress?: (percent: number) => void
): Promise<{ info: DownloadedTrackInfo; blob: Blob }> {
  // Simulated network/processing stages
  const steps = [15, 35, 65, 88, 100];
  for (const p of steps) {
    if (onProgress) onProgress(p);
    await new Promise((r) => setTimeout(r, 120));
  }

  // Create real audio blob
  const previewDuration = Math.min(10, Math.max(5, Math.floor(track.duration / 30)));
  const blob = createPlayableWavBlob(track.title, previewDuration);

  // Trigger real browser file download
  const filename = `${track.artist} - ${track.title}.wav`;
  triggerBrowserFileDownload(blob, filename);

  // Record in downloaded registry with full song size estimate
  const estimatedBytes = estimateTrackFileSize(track.duration);
  const info = recordDownload(track, estimatedBytes);

  return { info, blob };
}
