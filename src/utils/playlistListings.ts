/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IndieTrack, Playlist } from './musicDiscovery';

export const ACTIVE_HOME_PLAYLIST_STORAGE_KEY = 'apna_music_active_home_playlist_v1';
export const USER_PLAYLISTS_STORAGE_KEY = 'apna_music_user_playlists_v1';

const DISALLOWED_DEFAULT_PLAYLIST_IDS = new Set(['pl-kannada-hits']);
const DISALLOWED_DEFAULT_TRACK_ID = 'kn-trk-1'; // Never force Singara Siriye as main default

export function loadActiveHomePlaylistId(): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    return localStorage.getItem(ACTIVE_HOME_PLAYLIST_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveActiveHomePlaylistId(playlistId: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(ACTIVE_HOME_PLAYLIST_STORAGE_KEY, playlistId);
  } catch {
    // Ignore storage error
  }
}

export function loadSavedPlaylists(fallbackPlaylists: Playlist[]): Playlist[] {
  if (typeof localStorage === 'undefined') return fallbackPlaylists;
  try {
    const raw = localStorage.getItem(USER_PLAYLISTS_STORAGE_KEY);
    if (!raw) return fallbackPlaylists;
    const saved = JSON.parse(raw);
    if (!Array.isArray(saved) || saved.length === 0) return fallbackPlaylists;
    return saved;
  } catch {
    return fallbackPlaylists;
  }
}

export function savePlaylistsToStorage(playlists: Playlist[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(USER_PLAYLISTS_STORAGE_KEY, JSON.stringify(playlists));
  } catch {
    // Ignore storage error
  }
}

/**
 * Build virtual + curated playlists ordered with the user's own playlists first.
 */
export function buildListingPlaylists(
  playlists: Playlist[],
  likedTrackIds: Set<string>,
  downloadedTrackIds?: Set<string>
): Playlist[] {
  const userOwned = playlists.filter(
    (p) => p.owner === 'You' || p.owner === 'Apna Music AI' || p.id.startsWith('ai-pl-')
  );

  const likedVirtual: Playlist = {
    id: 'pl-liked',
    title: 'Liked Songs',
    description: 'Your personal collection of saved tracks.',
    coverGradient: 'from-indigo-600 via-purple-700 to-rose-600',
    coverEmoji: '❤️',
    trackIds: Array.from(likedTrackIds),
    isPersonalized: true,
    createdAt: '2026',
    owner: 'You',
  };

  const downloadedIds = downloadedTrackIds ? Array.from(downloadedTrackIds) : [];
  const downloadedVirtual: Playlist | null =
    downloadedIds.length > 0
      ? {
          id: 'pl-downloaded',
          title: 'Downloaded Songs',
          description: 'Offline-ready tracks saved on your device.',
          coverGradient: 'from-blue-600 via-cyan-600 to-teal-500',
          coverEmoji: '⬇️',
          trackIds: downloadedIds,
          isPersonalized: true,
          createdAt: '2026',
          owner: 'You',
        }
      : null;

  const others = playlists.filter(
    (p) => !userOwned.some((u) => u.id === p.id)
  );

  // Move curated playlists that do NOT spotlight Singara Siriye ahead of pl-kannada-hits
  const preferredOthers = [
    ...others.filter((p) => !DISALLOWED_DEFAULT_PLAYLIST_IDS.has(p.id)),
    ...others.filter((p) => DISALLOWED_DEFAULT_PLAYLIST_IDS.has(p.id)),
  ];

  return [
    ...userOwned,
    ...(likedVirtual.trackIds.length > 0 ? [likedVirtual] : []),
    ...(downloadedVirtual ? [downloadedVirtual] : []),
    ...preferredOthers,
  ];
}

/**
 * Resolve which playlist drives the main Home track listing.
 */
export function resolveActiveHomePlaylist(
  listingPlaylists: Playlist[],
  preferredPlaylistId: string | null
): Playlist | null {
  if (listingPlaylists.length === 0) return null;

  if (preferredPlaylistId) {
    const preferred = listingPlaylists.find((p) => p.id === preferredPlaylistId);
    if (preferred && preferred.trackIds.length > 0) {
      return preferred;
    }
  }

  // Prefer user-owned playlists with tracks first
  const userOwnedWithTracks = listingPlaylists.find(
    (p) =>
      (p.owner === 'You' || p.owner === 'Apna Music AI' || p.id === 'pl-liked') &&
      p.trackIds.length > 0
  );
  if (userOwnedWithTracks) {
    return userOwnedWithTracks;
  }

  // Fallback to Today's Top Hits or first non-Singara-Siriye-spotlight playlist with tracks
  const todaysTopHits = listingPlaylists.find(
    (p) => p.id === 'pl-todays-top-hits' && p.trackIds.length > 0
  );
  if (todaysTopHits) {
    return todaysTopHits;
  }

  return (
    listingPlaylists.find(
      (p) => p.trackIds.length > 0 && !DISALLOWED_DEFAULT_PLAYLIST_IDS.has(p.id)
    ) ||
    listingPlaylists.find((p) => p.trackIds.length > 0) ||
    listingPlaylists[0]
  );
}

/**
 * Resolve IndieTrack objects belonging to the given playlist, preserving order.
 */
export function getPlaylistListingTracks(
  playlist: Playlist | null,
  allTracks: IndieTrack[]
): IndieTrack[] {
  if (!playlist) return [];
  const byId = new Map(allTracks.map((t) => [t.id, t]));
  return playlist.trackIds
    .map((id) => byId.get(id))
    .filter((t): t is IndieTrack => Boolean(t));
}

/**
 * Choose initial track from our active playlist listing instead of hardcoding Singara Siriye.
 */
export function getDefaultInitialTrack(
  playlists: Playlist[],
  allTracks: IndieTrack[],
  likedTrackIds: Set<string>,
  preferredPlaylistId: string | null = null
): IndieTrack | null {
  const listingPlaylists = buildListingPlaylists(playlists, likedTrackIds);
  const active = resolveActiveHomePlaylist(listingPlaylists, preferredPlaylistId);
  const activeTracks = getPlaylistListingTracks(active, allTracks);

  if (activeTracks.length > 0) {
    const nonSingara = activeTracks.find((t) => t.id !== DISALLOWED_DEFAULT_TRACK_ID);
    return nonSingara || activeTracks[0];
  }

  return allTracks.find((t) => t.id !== DISALLOWED_DEFAULT_TRACK_ID) || allTracks[0] || null;
}
