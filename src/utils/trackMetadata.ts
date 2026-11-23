/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IndieTrack } from './musicDiscovery';

export const TRACK_METADATA_STORAGE_KEY = 'apna_music_track_metadata_v1';

export const TRACK_TITLE_MAX = 120;
export const TRACK_ARTIST_MAX = 120;
export const TRACK_ALBUM_MAX = 120;
export const TRACK_GENRE_MAX = 60;
export const TRACK_LANGUAGE_MAX = 24;
export const TRACK_LINER_NOTES_MAX = 600;
export const TRACK_YEAR_MIN = 1900;
export const TRACK_YEAR_MAX = 2100;
export const TRACK_BPM_MIN = 30;
export const TRACK_BPM_MAX = 300;
export const TRACK_TAG_MAX_COUNT = 10;
export const TRACK_TAG_MIN_LEN = 1;
export const TRACK_TAG_MAX_LEN = 32;

export const SUGGESTED_ORGANIZATION_TAGS: readonly string[] = [
  'favorites',
  'gym-pr',
  'morning-run',
  'late-night',
  'focus',
  'bass-heavy',
  'chill',
  'roadtrip',
];

export const GENRE_OPTIONS: readonly string[] = [
  'Kannada Cinema',
  'Bollywood',
  'Pop',
  'Indie Rock',
  'Dream Pop',
  'Bedroom Lo-Fi',
  'Hip-Hop',
  'R&B',
  'Electronic',
  'Dance',
  'Neo-Folk',
  'Shoegaze',
  'Synthwave',
  'Math Rock',
  'Rock',
  'Alternative',
];

export interface TrackMetadataOverride {
  trackId: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  releaseYear: number;
  language?: string;
  bpm?: number;
  linerNotes?: string;
  tags: string[];
  updatedAtIso: string;
}

export interface TrackMetadataDraft {
  title: string;
  artist: string;
  album: string;
  genre: string;
  releaseYear: number | string;
  language?: string;
  bpm?: number | string | null;
  linerNotes?: string;
  tags: string[];
}

export interface TrackMetadataValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  override?: TrackMetadataOverride;
}

const VALID_DOC_ID_RE = /^[a-zA-Z0-9_-]{1,128}$/;

export function isValidFirestoreTrackId(trackId: string): boolean {
  return VALID_DOC_ID_RE.test(trackId);
}

/**
 * Normalizes a single custom tag for consistent search & organization:
 * trims whitespace, strips leading '#', collapses internal whitespace,
 * lowercases, and enforces max length.
 */
export function normalizeCustomTag(raw: string): string {
  if (typeof raw !== 'string') return '';
  const cleaned = raw
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
    .replace(/^#+/, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();

  if (!cleaned) return '';
  return cleaned.slice(0, TRACK_TAG_MAX_LEN).trim();
}

/**
 * Parses raw comma-separated tag text into deduplicated normalized tags.
 */
export function parseTagInput(raw: string): string[] {
  if (typeof raw !== 'string') return [];
  const parts = raw.split(',');
  const result: string[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    const tag = normalizeCustomTag(part);
    if (tag.length >= TRACK_TAG_MIN_LEN && !seen.has(tag)) {
      seen.add(tag);
      result.push(tag);
    }
  }
  return result;
}

export interface AddTagsResult {
  tags: string[];
  added: string[];
  limitReached: boolean;
  duplicateCount: number;
}

/**
 * Adds one or more comma-separated tags onto an existing tag list,
 * preserving order, deduplicating case-insensitively, and capping at maxTags.
 */
export function addTagsToList(
  existing: readonly string[],
  rawInput: string,
  maxTags: number = TRACK_TAG_MAX_COUNT
): AddTagsResult {
  const base: string[] = [];
  const seen = new Set<string>();

  for (const item of existing) {
    const norm = normalizeCustomTag(item);
    if (norm && !seen.has(norm) && base.length < maxTags) {
      seen.add(norm);
      base.push(norm);
    }
  }

  const incoming = parseTagInput(rawInput);
  const added: string[] = [];
  let duplicateCount = 0;
  let limitReached = false;

  for (const tag of incoming) {
    if (seen.has(tag)) {
      duplicateCount += 1;
      continue;
    }
    if (base.length >= maxTags) {
      limitReached = true;
      break;
    }
    seen.add(tag);
    base.push(tag);
    added.push(tag);
  }

  return {
    tags: base,
    added,
    limitReached,
    duplicateCount,
  };
}

export function removeTagFromList(existing: readonly string[], tagToRemove: string): string[] {
  const target = normalizeCustomTag(tagToRemove);
  return existing.filter((tag) => normalizeCustomTag(tag) !== target);
}

export function sanitizeTagArray(rawTags: unknown): string[] {
  if (!Array.isArray(rawTags)) return [];
  const result: string[] = [];
  const seen = new Set<string>();
  for (const item of rawTags) {
    if (typeof item !== 'string') continue;
    const norm = normalizeCustomTag(item);
    if (norm.length >= TRACK_TAG_MIN_LEN && !seen.has(norm)) {
      seen.add(norm);
      result.push(norm);
      if (result.length >= TRACK_TAG_MAX_COUNT) break;
    }
  }
  return result;
}

export function trackToMetadataDraft(track: IndieTrack): TrackMetadataDraft {
  return {
    title: track.title || '',
    artist: track.artist || '',
    album: track.album || '',
    genre: track.genre || '',
    releaseYear: track.releaseYear || new Date().getFullYear(),
    language: track.language || 'english',
    bpm: typeof track.bpm === 'number' && track.bpm > 0 ? track.bpm : '',
    linerNotes: track.linerNotes || '',
    tags: sanitizeTagArray(track.tags || []),
  };
}

/**
 * Validates and normalizes user-edited track metadata & custom tags
 * using the exact bounds enforced in firestore.rules.
 */
export function validateAndNormalizeMetadata(
  trackId: string,
  draft: TrackMetadataDraft,
  nowIso: string = new Date().toISOString()
): TrackMetadataValidationResult {
  const errors: Record<string, string> = {};

  if (!trackId || !trackId.trim()) {
    errors.trackId = 'Track identifier is missing.';
  }

  const title = (draft.title || '').trim().slice(0, TRACK_TITLE_MAX);
  if (!title) {
    errors.title = 'Track title is required.';
  }

  const artist = (draft.artist || '').trim().slice(0, TRACK_ARTIST_MAX);
  if (!artist) {
    errors.artist = 'Artist name is required.';
  }

  const album = (draft.album || '').trim().slice(0, TRACK_ALBUM_MAX);
  const genre = (draft.genre || '').trim().slice(0, TRACK_GENRE_MAX);
  if (!genre) {
    errors.genre = 'Genre is required.';
  }

  const parsedYear =
    typeof draft.releaseYear === 'number'
      ? Math.round(draft.releaseYear)
      : Number.parseInt(String(draft.releaseYear || '').trim(), 10);
  if (!Number.isFinite(parsedYear) || parsedYear < TRACK_YEAR_MIN || parsedYear > TRACK_YEAR_MAX) {
    errors.releaseYear = `Release year must be between ${TRACK_YEAR_MIN} and ${TRACK_YEAR_MAX}.`;
  }

  let normalizedBpm: number | undefined = undefined;
  const rawBpmStr = draft.bpm === null || draft.bpm === undefined ? '' : String(draft.bpm).trim();
  if (rawBpmStr !== '') {
    const parsedBpm = Number.parseInt(rawBpmStr, 10);
    if (!Number.isFinite(parsedBpm) || parsedBpm < TRACK_BPM_MIN || parsedBpm > TRACK_BPM_MAX) {
      errors.bpm = `BPM must be between ${TRACK_BPM_MIN} and ${TRACK_BPM_MAX}.`;
    } else {
      normalizedBpm = parsedBpm;
    }
  }

  const language = (draft.language || '').trim().toLowerCase().slice(0, TRACK_LANGUAGE_MAX);
  const linerNotes = (draft.linerNotes || '').trim().slice(0, TRACK_LINER_NOTES_MAX);
  const tags = sanitizeTagArray(draft.tags);

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  const override: TrackMetadataOverride = {
    trackId: trackId.trim(),
    title,
    artist,
    album,
    genre,
    releaseYear: parsedYear,
    language: language || undefined,
    bpm: normalizedBpm,
    linerNotes: linerNotes || undefined,
    tags,
    updatedAtIso: nowIso.slice(0, 40),
  };

  return {
    valid: true,
    errors: {},
    override,
  };
}

export function applyTrackMetadataOverride(
  track: IndieTrack,
  override: TrackMetadataOverride | undefined
): IndieTrack {
  if (!override || override.trackId !== track.id) return track;

  return {
    ...track,
    title: override.title || track.title,
    artist: override.artist || track.artist,
    album: override.album !== undefined ? override.album : track.album,
    genre: override.genre || track.genre,
    releaseYear: Number.isFinite(override.releaseYear) ? override.releaseYear : track.releaseYear,
    language: override.language || track.language,
    bpm: override.bpm !== undefined ? override.bpm : track.bpm,
    linerNotes: override.linerNotes !== undefined ? override.linerNotes : track.linerNotes,
    tags: Array.isArray(override.tags) ? [...override.tags] : track.tags,
  };
}

export function applyTrackMetadataOverrides(
  tracks: readonly IndieTrack[],
  overrides: Record<string, TrackMetadataOverride>
): IndieTrack[] {
  if (!overrides || Object.keys(overrides).length === 0) {
    return [...tracks];
  }
  return tracks.map((track) => applyTrackMetadataOverride(track, overrides[track.id]));
}

/**
 * Restores a single track to its original catalog metadata using baseCatalog.
 */
export function restoreOriginalTrack(
  trackId: string,
  baseCatalog: readonly IndieTrack[],
  currentTrack: IndieTrack | null
): IndieTrack | null {
  const original = baseCatalog.find((t) => t.id === trackId);
  if (original) return { ...original, tags: [...(original.tags || [])] };
  return currentTrack;
}

/**
 * Aggregates tags across tracks sorted by frequency desc then alphabetically.
 */
export function collectCatalogTags(
  tracks: readonly IndieTrack[],
  limit: number = 20
): Array<{ tag: string; count: number }> {
  const counts = new Map<string, number>();
  for (const track of tracks) {
    const uniquePerTrack = new Set(sanitizeTagArray(track.tags || []));
    for (const tag of uniquePerTrack) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, limit);
}

export function filterTracksByTag(
  tracks: readonly IndieTrack[],
  selectedTag: string | null
): IndieTrack[] {
  if (!selectedTag) return [...tracks];
  const target = normalizeCustomTag(selectedTag);
  if (!target) return [...tracks];
  return tracks.filter((t) =>
    (t.tags || []).some((tag) => normalizeCustomTag(tag) === target)
  );
}

export function sanitizeStoredOverride(raw: unknown): TrackMetadataOverride | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const trackId = typeof obj.trackId === 'string' ? obj.trackId.trim() : '';
  if (!trackId) return null;

  const validated = validateAndNormalizeMetadata(
    trackId,
    {
      title: typeof obj.title === 'string' ? obj.title : '',
      artist: typeof obj.artist === 'string' ? obj.artist : '',
      album: typeof obj.album === 'string' ? obj.album : '',
      genre: typeof obj.genre === 'string' ? obj.genre : '',
      releaseYear:
        typeof obj.releaseYear === 'number' || typeof obj.releaseYear === 'string'
          ? obj.releaseYear
          : new Date().getFullYear(),
      language: typeof obj.language === 'string' ? obj.language : undefined,
      bpm:
        typeof obj.bpm === 'number' && obj.bpm >= TRACK_BPM_MIN && obj.bpm <= TRACK_BPM_MAX
          ? obj.bpm
          : undefined,
      linerNotes: typeof obj.linerNotes === 'string' ? obj.linerNotes : undefined,
      tags: Array.isArray(obj.tags) ? (obj.tags as string[]) : [],
    },
    typeof obj.updatedAtIso === 'string' && obj.updatedAtIso.length >= 10
      ? obj.updatedAtIso
      : new Date().toISOString()
  );

  return validated.valid && validated.override ? validated.override : null;
}

export function loadTrackMetadataOverrides(): Record<string, TrackMetadataOverride> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(TRACK_METADATA_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};

    const cleaned: Record<string, TrackMetadataOverride> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      const sanitized = sanitizeStoredOverride(value);
      if (sanitized && sanitized.trackId === key) {
        cleaned[key] = sanitized;
      }
    }
    return cleaned;
  } catch {
    return {};
  }
}

export function saveTrackMetadataOverrides(
  overrides: Record<string, TrackMetadataOverride>
): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(TRACK_METADATA_STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // Ignore storage quota or serialization failure
  }
}
