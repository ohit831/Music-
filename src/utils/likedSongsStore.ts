/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IndieTrack } from './musicDiscovery';

export const LIKED_SONGS_STORAGE_KEY = 'apna_music_liked_songs_v1';
export const DEFAULT_LIKED_TRACK_IDS = ['trk-1', 'trk-2', 'trk-4'];

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface LikedSongsState {
  ids: string[];
  tracksById: Record<string, IndieTrack>;
}

interface PersistedLikedSongsPayload {
  version?: number;
  ids?: unknown;
  tracksById?: unknown;
}

function getDefaultStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isValidTrackSnapshot(candidate: unknown): candidate is IndieTrack {
  if (!candidate || typeof candidate !== 'object') return false;
  const t = candidate as Partial<IndieTrack>;
  return (
    typeof t.id === 'string' &&
    t.id.trim().length > 0 &&
    typeof t.title === 'string' &&
    t.title.trim().length > 0 &&
    typeof t.artist === 'string'
  );
}

function normalizeUniqueIds(rawIds: unknown): string[] {
  if (!Array.isArray(rawIds)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of rawIds) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

function buildDefaultLikedState(catalog: IndieTrack[]): LikedSongsState {
  const catalogById = new Map(catalog.map((t) => [t.id, t]));
  const ids: string[] = [];
  const tracksById: Record<string, IndieTrack> = {};

  for (const id of DEFAULT_LIKED_TRACK_IDS) {
    const track = catalogById.get(id);
    if (track && !tracksById[id]) {
      ids.push(id);
      tracksById[id] = track;
    }
  }

  return { ids, tracksById };
}

/**
 * Loads the persisted Liked Songs state from localStorage (or custom storage).
 * Falls back to DEFAULT_LIKED_TRACK_IDS ONLY when no saved entry exists yet.
 * Preserves an intentional empty list if the user unliked all songs.
 */
export function loadLikedSongsState(
  catalog: IndieTrack[],
  storage: StorageLike | null = getDefaultStorage()
): LikedSongsState {
  if (!storage) {
    return buildDefaultLikedState(catalog);
  }

  try {
    const raw = storage.getItem(LIKED_SONGS_STORAGE_KEY);
    if (raw === null) {
      return buildDefaultLikedState(catalog);
    }

    const parsed: unknown = JSON.parse(raw);
    const catalogById = new Map(catalog.map((t) => [t.id, t]));

    // Support legacy plain array of IDs if ever stored
    if (Array.isArray(parsed)) {
      const ids = normalizeUniqueIds(parsed);
      const tracksById: Record<string, IndieTrack> = {};
      const validIds: string[] = [];
      for (const id of ids) {
        const track = catalogById.get(id);
        if (track) {
          validIds.push(id);
          tracksById[id] = track;
        }
      }
      return { ids: validIds, tracksById };
    }

    if (parsed && typeof parsed === 'object') {
      const payload = parsed as PersistedLikedSongsPayload;
      const ids = normalizeUniqueIds(payload.ids);
      const rawMap =
        payload.tracksById && typeof payload.tracksById === 'object'
          ? (payload.tracksById as Record<string, unknown>)
          : {};

      const tracksById: Record<string, IndieTrack> = {};
      const resolvedIds: string[] = [];

      for (const id of ids) {
        const catalogTrack = catalogById.get(id);
        const persistedSnapshot = isValidTrackSnapshot(rawMap[id]) ? rawMap[id] : undefined;

        if (catalogTrack && persistedSnapshot) {
          // Prefer up-to-date catalog fields while retaining resolved YouTube/audio metadata
          tracksById[id] = {
            ...persistedSnapshot,
            ...catalogTrack,
            youtubeId: catalogTrack.youtubeId || persistedSnapshot.youtubeId,
            fullSongAvailable: Boolean(
              catalogTrack.fullSongAvailable || persistedSnapshot.fullSongAvailable
            ),
          };
          resolvedIds.push(id);
        } else if (catalogTrack) {
          tracksById[id] = catalogTrack;
          resolvedIds.push(id);
        } else if (persistedSnapshot) {
          tracksById[id] = persistedSnapshot;
          resolvedIds.push(id);
        }
      }

      return { ids: resolvedIds, tracksById };
    }
  } catch {
    // Corrupted storage falls back safely to defaults
  }

  return buildDefaultLikedState(catalog);
}

/**
 * Immediately persists deduplicated Liked Songs IDs and full track snapshots to storage.
 */
export function saveLikedSongsState(
  state: LikedSongsState,
  storage: StorageLike | null = getDefaultStorage()
): void {
  if (!storage) return;

  const uniqueIds = normalizeUniqueIds(state.ids);
  const compactTracksById: Record<string, IndieTrack> = {};
  for (const id of uniqueIds) {
    const snapshot = state.tracksById[id];
    if (snapshot) {
      compactTracksById[id] = snapshot;
    }
  }

  try {
    storage.setItem(
      LIKED_SONGS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        ids: uniqueIds,
        tracksById: compactTracksById,
      })
    );
  } catch {
    // Ignore storage quota / private mode errors gracefully
  }
}

export interface ToggleLikedResult {
  state: LikedSongsState;
  isLiked: boolean;
  track?: IndieTrack;
}

/**
 * Pure toggle for adding/removing a track in Liked Songs.
 * Deduplicates by track ID and preserves full track metadata (including custom/YouTube tracks).
 */
export function toggleLikedSong(
  state: LikedSongsState,
  trackOrId: string | IndieTrack,
  catalog: IndieTrack[]
): ToggleLikedResult {
  const passedTrack = typeof trackOrId === 'string' ? undefined : trackOrId;
  const trackId = (typeof trackOrId === 'string' ? trackOrId : trackOrId.id).trim();

  if (!trackId) {
    return { state, isLiked: false };
  }

  const alreadyLiked = state.ids.includes(trackId);
  const catalogTrack = catalog.find((t) => t.id === trackId);
  const existingSnapshot = state.tracksById[trackId];
  const resolvedTrack = passedTrack || catalogTrack || existingSnapshot;

  if (alreadyLiked) {
    const nextIds = state.ids.filter((id) => id !== trackId);
    const nextTracksById = { ...state.tracksById };
    delete nextTracksById[trackId];
    return {
      state: {
        ids: nextIds,
        tracksById: nextTracksById,
      },
      isLiked: false,
      track: resolvedTrack,
    };
  }

  const nextIds = [trackId, ...state.ids.filter((id) => id !== trackId)];
  const nextTracksById = { ...state.tracksById };
  if (resolvedTrack) {
    nextTracksById[trackId] = resolvedTrack;
  }

  return {
    state: {
      ids: nextIds,
      tracksById: nextTracksById,
    },
    isLiked: true,
    track: resolvedTrack,
  };
}

/**
 * Resolves the ordered, deduplicated list of Liked Songs using live catalog updates
 * while preserving persisted metadata for custom/searched/YouTube tracks.
 */
export function resolveLikedTracks(
  state: LikedSongsState,
  catalog: IndieTrack[]
): IndieTrack[] {
  const catalogById = new Map(catalog.map((t) => [t.id, t]));
  const seen = new Set<string>();
  const resolved: IndieTrack[] = [];

  for (const id of state.ids) {
    if (seen.has(id)) continue;
    seen.add(id);

    const catalogTrack = catalogById.get(id);
    const snapshot = state.tracksById[id];

    if (catalogTrack && snapshot) {
      resolved.push({
        ...snapshot,
        ...catalogTrack,
        youtubeId: catalogTrack.youtubeId || snapshot.youtubeId,
        fullSongAvailable: Boolean(catalogTrack.fullSongAvailable || snapshot.fullSongAvailable),
      });
    } else if (catalogTrack) {
      resolved.push(catalogTrack);
    } else if (snapshot) {
      resolved.push(snapshot);
    }
  }

  return resolved;
}

/**
 * Merges custom/YouTube liked track snapshots into a track list so every view
 * (Playlists, Library, Search, Discover) can resolve and play persisted liked songs.
 */
export function mergeTracksWithLikedSnapshots(
  catalog: IndieTrack[],
  state: LikedSongsState
): IndieTrack[] {
  const existingIds = new Set(catalog.map((t) => t.id));
  const extraLiked: IndieTrack[] = [];

  for (const id of state.ids) {
    if (existingIds.has(id)) continue;
    const snapshot = state.tracksById[id];
    if (snapshot) {
      existingIds.add(id);
      extraLiked.push(snapshot);
    }
  }

  return extraLiked.length > 0 ? [...extraLiked, ...catalog] : catalog;
}

/**
 * Updates stored snapshot metadata when a liked track is edited or resolves a YouTube ID.
 */
export function syncLikedTrackMetadata(
  state: LikedSongsState,
  updatedTrack: IndieTrack
): LikedSongsState {
  if (!state.ids.includes(updatedTrack.id)) {
    return state;
  }

  return {
    ids: state.ids,
    tracksById: {
      ...state.tracksById,
      [updatedTrack.id]: {
        ...(state.tracksById[updatedTrack.id] || updatedTrack),
        ...updatedTrack,
      },
    },
  };
}
