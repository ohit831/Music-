/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import {
  isValidFirestoreTrackId,
  loadTrackMetadataOverrides,
  sanitizeStoredOverride,
  saveTrackMetadataOverrides,
  TrackMetadataOverride,
} from '../utils/trackMetadata';

export const trackMetadataService = {
  /**
   * Loads saved overrides from localStorage and merges any verified user's cloud overrides
   * from /users/{uid}/track_metadata/{trackId}.
   */
  subscribeUserTrackMetadata(
    onUpdate: (overrides: Record<string, TrackMetadataOverride>) => void
  ): () => void {
    const localInitial = loadTrackMetadataOverrides();
    onUpdate(localInitial);

    const fbUser = auth.currentUser;
    if (!fbUser || !fbUser.emailVerified) {
      return () => {};
    }

    const colPath = `users/${fbUser.uid}/track_metadata`;
    try {
      return onSnapshot(
        collection(db, 'users', fbUser.uid, 'track_metadata'),
        (snapshot) => {
          const merged: Record<string, TrackMetadataOverride> = {
            ...loadTrackMetadataOverrides(),
          };
          for (const docSnap of snapshot.docs) {
            const raw = docSnap.data();
            const parsed = sanitizeStoredOverride({
              ...raw,
              trackId: raw.trackId || docSnap.id,
              bpm: typeof raw.bpm === 'number' && raw.bpm > 0 ? raw.bpm : undefined,
              language: typeof raw.language === 'string' && raw.language ? raw.language : undefined,
              linerNotes:
                typeof raw.linerNotes === 'string' && raw.linerNotes ? raw.linerNotes : undefined,
            });
            if (parsed) {
              merged[parsed.trackId] = parsed;
            }
          }
          saveTrackMetadataOverrides(merged);
          onUpdate(merged);
        },
        (error) => {
          try {
            handleFirestoreError(error, OperationType.LIST, colPath);
          } catch (structuredErr) {
            console.warn('[TrackMetadataService] Cloud sync listener notice:', structuredErr);
          }
        }
      );
    } catch {
      return () => {};
    }
  },

  /**
   * Saves a validated track metadata override locally and, when authenticated via verified Firebase user,
   * persists to /users/{uid}/track_metadata/{trackId}.
   */
  async saveMetadataOverride(
    override: TrackMetadataOverride,
    currentOverrides: Record<string, TrackMetadataOverride>
  ): Promise<Record<string, TrackMetadataOverride>> {
    const nextOverrides: Record<string, TrackMetadataOverride> = {
      ...currentOverrides,
      [override.trackId]: override,
    };
    saveTrackMetadataOverrides(nextOverrides);

    const fbUser = auth.currentUser;
    if (fbUser && fbUser.emailVerified && isValidFirestoreTrackId(override.trackId)) {
      const docPath = `users/${fbUser.uid}/track_metadata/${override.trackId}`;
      try {
        await setDoc(doc(db, 'users', fbUser.uid, 'track_metadata', override.trackId), {
          uid: fbUser.uid,
          trackId: override.trackId,
          title: override.title,
          artist: override.artist,
          album: override.album,
          genre: override.genre,
          releaseYear: override.releaseYear,
          language: override.language || '',
          bpm: typeof override.bpm === 'number' ? override.bpm : 0,
          linerNotes: override.linerNotes || '',
          tags: override.tags,
          updatedAtIso: override.updatedAtIso,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        try {
          handleFirestoreError(error, OperationType.WRITE, docPath);
        } catch (structuredErr) {
          console.warn('[TrackMetadataService] Cloud save notice:', structuredErr);
        }
      }
    }

    return nextOverrides;
  },

  /**
   * Deletes an override locally and in Firestore so the track reverts to its original metadata.
   */
  async resetMetadataOverride(
    trackId: string,
    currentOverrides: Record<string, TrackMetadataOverride>
  ): Promise<Record<string, TrackMetadataOverride>> {
    const nextOverrides = { ...currentOverrides };
    delete nextOverrides[trackId];
    saveTrackMetadataOverrides(nextOverrides);

    const fbUser = auth.currentUser;
    if (fbUser && fbUser.emailVerified && isValidFirestoreTrackId(trackId)) {
      const docPath = `users/${fbUser.uid}/track_metadata/${trackId}`;
      try {
        await deleteDoc(doc(db, 'users', fbUser.uid, 'track_metadata', trackId));
      } catch (error) {
        try {
          handleFirestoreError(error, OperationType.DELETE, docPath);
        } catch (structuredErr) {
          console.warn('[TrackMetadataService] Cloud reset notice:', structuredErr);
        }
      }
    }

    return nextOverrides;
  },
};
