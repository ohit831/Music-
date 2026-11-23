/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  INITIAL_TRACKS,
  INITIAL_PLAYLISTS,
  INITIAL_ARTISTS,
  INITIAL_FRIEND_ACTIVITY,
  INITIAL_REVIEWS,
} from './data/indieCatalog';
import {
  IndieTrack,
  Playlist,
  IndieArtist,
  FriendActivity,
  decodeSharePayload,
} from './utils/musicDiscovery';
import { audioEngine } from './services/audioEngine';
import { APP_BASE_URL } from './utils/appUrl';

// Components
import { Sidebar, ActiveNavTab } from './components/Sidebar';
import { FriendActivityBar } from './components/FriendActivityBar';
import { PlayerBar } from './components/PlayerBar';
import { ShareModal } from './components/ShareModal';
import { PlaylistModal } from './components/PlaylistModal';
import { LyricsDrawer } from './components/LyricsDrawer';
import { QueueDrawer } from './components/QueueDrawer';
import { FullSongPlayer } from './components/FullSongPlayer';
import { AddMusicModal } from './components/AddMusicModal';
import { SettingsModal } from './components/SettingsModal';
import { AndroidInstallModal } from './components/AndroidInstallModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { AndroidBottomNav } from './components/AndroidBottomNav';
import { AuthModal } from './components/AuthModal';
import { UserProfileModal } from './components/UserProfileModal';
import { EditMetadataModal } from './components/EditMetadataModal';
import { AnimatedFocusBackdrop } from './components/AnimatedFocusBackdrop';
import { Smartphone, Search, Sliders, Radio, Dumbbell, UserPlus, LogIn, Users, Aperture } from 'lucide-react';
import { deriveAnimatedFocusGradient } from './utils/animatedFocus';
import {
  loadPlaybackSettings,
  savePlaybackSettings,
  PlaybackSettings,
} from './utils/playbackSettings';
import { authService, UserProfile } from './services/authService';
import { isOwnerUser } from './utils/loginAudit';
import {
  buildListingPlaylists,
  getDefaultInitialTrack,
  getPlaylistListingTracks,
  loadActiveHomePlaylistId,
  loadSavedPlaylists,
  resolveActiveHomePlaylist,
  saveActiveHomePlaylistId,
  savePlaylistsToStorage,
} from './utils/playlistListings';
import {
  PLAYLIST_JSON_QUERY_PARAM,
  createPlaylistFromImport,
  decodePlaylistJsonPayload,
} from './utils/playlistJsonShare';
import {
  loadLikedSongsState,
  mergeTracksWithLikedSnapshots,
  resolveLikedTracks,
  saveLikedSongsState,
  syncLikedTrackMetadata,
  toggleLikedSong,
  type LikedSongsState,
} from './utils/likedSongsStore';

// Views
import { HomeView } from './views/HomeView';
import { DiscoverView } from './views/DiscoverView';
import { SearchView } from './views/SearchView';
import { PlaylistView } from './views/PlaylistView';
import { ArtistView } from './views/ArtistView';
import { SocialJamView } from './views/SocialJamView';
import { LibraryView } from './views/LibraryView';
import { AICuratorView } from './views/AICuratorView';
import { listeningHistoryService } from './services/listeningHistoryService';
import {
  getPersonalizedNextTracks,
  pickSmartNextTrack,
} from './utils/smartRecommendations';
import {
  getDownloadedTrackIds,
  downloadTrackWithProgress,
  removeDownload,
  clearAllDownloads,
} from './utils/downloadManager';
import { trackMetadataService } from './services/trackMetadataService';
import {
  applyTrackMetadataOverride,
  applyTrackMetadataOverrides,
  loadTrackMetadataOverrides,
  restoreOriginalTrack,
  TrackMetadataOverride,
} from './utils/trackMetadata';
import {
  classifyShortcutTarget,
  resolveGlobalMediaShortcut,
} from './utils/keyboardShortcuts';
import {
  buildVibeMatchQueue,
  computeSonicProfile,
  describeSonicVibe,
  scoreSonicSimilarity,
  VibeMatchItem,
} from './utils/vibeMatch';

export default function App() {
  // App data state
  const [metadataOverrides, setMetadataOverrides] = useState<Record<string, TrackMetadataOverride>>(
    () => loadTrackMetadataOverrides()
  );
  const [tracks, setTracks] = useState<IndieTrack[]>(() =>
    applyTrackMetadataOverrides(INITIAL_TRACKS, loadTrackMetadataOverrides())
  );
  const [playlists, setPlaylists] = useState<Playlist[]>(() => loadSavedPlaylists(INITIAL_PLAYLISTS));
  const [artists] = useState<IndieArtist[]>(INITIAL_ARTISTS);
  const [friendActivities, setFriendActivities] = useState<FriendActivity[]>(INITIAL_FRIEND_ACTIVITY);
  const [reviews] = useState(INITIAL_REVIEWS);

  // Single source of truth for Liked Songs (persisted immediately to localStorage)
  const [likedSongsState, setLikedSongsState] = useState<LikedSongsState>(() => {
    const initialList = applyTrackMetadataOverrides(INITIAL_TRACKS, loadTrackMetadataOverrides());
    return loadLikedSongsState(initialList);
  });
  const likedSongsStateRef = useRef<LikedSongsState>(likedSongsState);
  likedSongsStateRef.current = likedSongsState;

  const likedTrackIds = useMemo(() => new Set(likedSongsState.ids), [likedSongsState.ids]);
  const allKnownTracks = useMemo(
    () => mergeTracksWithLikedSnapshots(tracks, likedSongsState),
    [tracks, likedSongsState]
  );
  const likedTracks = useMemo(
    () => resolveLikedTracks(likedSongsState, tracks),
    [likedSongsState, tracks]
  );

  const [activeHomePlaylistId, setActiveHomePlaylistId] = useState<string | null>(() =>
    loadActiveHomePlaylistId()
  );
  const initialDefaultTrack = useMemo(() => {
    const initialList = applyTrackMetadataOverrides(INITIAL_TRACKS, loadTrackMetadataOverrides());
    const initialLiked = loadLikedSongsState(initialList);
    const mergedInitial = mergeTracksWithLikedSnapshots(initialList, initialLiked);
    return getDefaultInitialTrack(
      loadSavedPlaylists(INITIAL_PLAYLISTS),
      mergedInitial,
      new Set(initialLiked.ids),
      loadActiveHomePlaylistId()
    );
  }, []);
  const [currentTrack, setCurrentTrack] = useState<IndieTrack | null>(initialDefaultTrack);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDefaultTrack?.duration || 210);
  const [volume, setVolume] = useState(0.75);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [queue, setQueue] = useState<IndieTrack[]>([]);

  // Downloaded tracks state & synchronization
  const [downloadedTrackIds, setDownloadedTrackIds] = useState<Set<string>>(() => new Set(getDownloadedTrackIds()));
  const [downloadingTrackIds, setDownloadingTrackIds] = useState<Set<string>>(new Set());

  // Listen for changes from downloadManager
  useEffect(() => {
    const handleDownloadsChanged = () => {
      setDownloadedTrackIds(new Set(getDownloadedTrackIds()));
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('indiewave:downloads-changed', handleDownloadsChanged);
      return () => {
        window.removeEventListener('indiewave:downloads-changed', handleDownloadsChanged);
      };
    }
  }, []);

  // Navigation & View state
  const [activeTab, setActiveTab] = useState<ActiveNavTab>('home');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null);

  // Drawers & Modals
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareTrack, setShareTrack] = useState<IndieTrack | null>(null);
  const [sharePlaylist, setSharePlaylist] = useState<Playlist | null>(null);
  const [createPlaylistModalOpen, setCreatePlaylistModalOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [lyricsDrawerOpen, setLyricsDrawerOpen] = useState(false);
  const [queueDrawerOpen, setQueueDrawerOpen] = useState(false);
  const [friendActivityOpen, setFriendActivityOpen] = useState(true);
  const [isVideoVisible, setIsVideoVisible] = useState(false);
  const [seekRequest, setSeekRequest] = useState<number | null>(null);
  const [addMusicModalOpen, setAddMusicModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [androidModalOpen, setAndroidModalOpen] = useState(false);
  const [visualizerModalOpen, setVisualizerModalOpen] = useState(false);
  const [playbackSettings, setPlaybackSettings] = useState<PlaybackSettings>(loadPlaybackSettings);

  // User authentication state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => authService.getCurrentUser());
  const [authModalMode, setAuthModalMode] = useState<'signup' | 'signin' | null>(null);
  const [userProfileModalOpen, setUserProfileModalOpen] = useState(false);
  const [profileInitialSection, setProfileInitialSection] = useState<'overview' | 'owner_logins'>('overview');
  const [editingTrackMetadata, setEditingTrackMetadata] = useState<IndieTrack | null>(null);

  useEffect(() => {
    const unsub = authService.subscribe((user) => {
      setCurrentUser(user);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsubscribe = trackMetadataService.subscribeUserTrackMetadata((overrides) => {
      setMetadataOverrides(overrides);
      setTracks((prev) => applyTrackMetadataOverrides(prev, overrides));
      setCurrentTrack((prev) =>
        prev && overrides[prev.id] ? applyTrackMetadataOverride(prev, overrides[prev.id]) : prev
      );
      setQueue((prev) => applyTrackMetadataOverrides(prev, overrides));
    });
    return unsubscribe;
  }, [currentUser?.id]);

  useEffect(() => {
    savePlaylistsToStorage(playlists);
  }, [playlists]);

  const listingPlaylists = useMemo(
    () => buildListingPlaylists(playlists, likedTrackIds, downloadedTrackIds),
    [playlists, likedTrackIds, downloadedTrackIds]
  );

  const activeHomePlaylist = useMemo(
    () => resolveActiveHomePlaylist(listingPlaylists, activeHomePlaylistId),
    [listingPlaylists, activeHomePlaylistId]
  );

  const activeHomePlaylistTracks = useMemo(
    () => getPlaylistListingTracks(activeHomePlaylist, tracks),
    [activeHomePlaylist, tracks]
  );

  const handleSelectActiveHomePlaylist = (playlistId: string) => {
    setActiveHomePlaylistId(playlistId);
    saveActiveHomePlaylistId(playlistId);
    const chosen = listingPlaylists.find((p) => p.id === playlistId);
    if (chosen) {
      showToast(`Home main listing switched to "${chosen.title}"`);
    }
  };

  // Sync crossfade duration to audio engine on load & change
  useEffect(() => {
    audioEngine.setCrossfadeDuration(playbackSettings.crossfadeDuration);
  }, [playbackSettings.crossfadeDuration]);

  const handleUpdateSettings = (newSettings: PlaybackSettings) => {
    const prev = playbackSettings;
    setPlaybackSettings(newSettings);
    savePlaybackSettings(newSettings);
    audioEngine.setCrossfadeDuration(newSettings.crossfadeDuration);
    if (newSettings.lockScreenPlayback !== prev.lockScreenPlayback) {
      showToast(
        newSettings.lockScreenPlayback
          ? 'Lock-Screen & Background Play enabled 🔒🎵'
          : 'Lock-Screen Play disabled'
      );
    } else if (newSettings.crossfadeDuration !== prev.crossfadeDuration) {
      showToast(
        newSettings.crossfadeDuration === 0
          ? 'Crossfade disabled'
          : `Crossfade set to ${newSettings.crossfadeDuration}s smooth transition 🎧`
      );
    } else {
      showToast('Playback settings updated 🎧');
    }
  };

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Smart recommendation & listening session state
  const [historyRevision, setHistoryRevision] = useState(0);
  const [sessionPlayedIds, setSessionPlayedIds] = useState<Set<string>>(() =>
    initialDefaultTrack ? new Set([initialDefaultTrack.id]) : new Set()
  );
  const playHistoryStackRef = useRef<IndieTrack[]>([]);
  const isNavigatingBackRef = useRef(false);

  useEffect(() => {
    return listeningHistoryService.subscribe(() => {
      setHistoryRevision((prev) => prev + 1);
    });
  }, []);

  // Keep references for callbacks
  const queueRef = useRef(queue);
  queueRef.current = queue;
  const currentTrackRef = useRef(currentTrack);
  currentTrackRef.current = currentTrack;
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;
  const durationRef = useRef(duration);
  durationRef.current = duration;
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;
  const repeatModeRef = useRef(repeatMode);
  repeatModeRef.current = repeatMode;
  const isShuffleRef = useRef(isShuffle);
  isShuffleRef.current = isShuffle;
  const likedTrackIdsRef = useRef(likedTrackIds);
  likedTrackIdsRef.current = likedTrackIds;
  const sessionPlayedIdsRef = useRef(sessionPlayedIds);
  sessionPlayedIdsRef.current = sessionPlayedIds;
  const playbackSettingsRef = useRef(playbackSettings);
  playbackSettingsRef.current = playbackSettings;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  // Dynamic Vibe Match mode (energy + melancholy sonic queue)
  const [isVibeMatchActive, setIsVibeMatchActive] = useState(false);
  const isVibeMatchActiveRef = useRef(isVibeMatchActive);
  isVibeMatchActiveRef.current = isVibeMatchActive;
  const vibeSessionHistoryRef = useRef<Set<string>>(new Set());

  const syncVibeMatchQueueForTrack = (
    anchorTrack: IndieTrack,
    catalogList: IndieTrack[],
    source: 'toggle' | 'dynamic_switch' = 'dynamic_switch'
  ) => {
    const dislikedIds = new Set(
      listeningHistoryService
        .getSkipped()
        .filter((s) => s.reason === 'disliked')
        .map((s) => s.trackId)
    );

    if (vibeSessionHistoryRef.current.size >= Math.max(12, catalogList.length - 6)) {
      vibeSessionHistoryRef.current = new Set([anchorTrack.id]);
    } else {
      vibeSessionHistoryRef.current.add(anchorTrack.id);
    }

    let result = buildVibeMatchQueue(anchorTrack, catalogList, {
      limit: 12,
      excludeIds: vibeSessionHistoryRef.current,
      dismissedIds: dislikedIds,
    });

    if (result.tracks.length < 4 && catalogList.length > 5) {
      vibeSessionHistoryRef.current = new Set([anchorTrack.id]);
      result = buildVibeMatchQueue(anchorTrack, catalogList, {
        limit: 12,
        excludeIds: vibeSessionHistoryRef.current,
        dismissedIds: dislikedIds,
      });
    }

    setQueue(result.tracks);
    listeningHistoryService.recordVibeMatchUsage(
      anchorTrack,
      result.vibeLabel,
      result.tracks.length,
      source
    );
    return result;
  };

  const vibeAnchorProfile = useMemo(
    () => (isVibeMatchActive && currentTrack ? computeSonicProfile(currentTrack) : null),
    [isVibeMatchActive, currentTrack]
  );

  const vibeLabel = useMemo(
    () => (vibeAnchorProfile ? describeSonicVibe(vibeAnchorProfile) : undefined),
    [vibeAnchorProfile]
  );

  const vibeMatchByTrackId = useMemo(() => {
    if (!isVibeMatchActive || !currentTrack) return {};
    const map: Record<string, VibeMatchItem> = {};
    for (const qTrack of queue) {
      map[qTrack.id] = scoreSonicSimilarity(currentTrack, qTrack);
    }
    return map;
  }, [isVibeMatchActive, currentTrack, queue]);

  const handleToggleVibeMatch = () => {
    const anchor = currentTrackRef.current;
    if (!anchor) {
      showToast('Play a track first to match its sonic vibe');
      return;
    }

    if (isVibeMatchActiveRef.current) {
      isVibeMatchActiveRef.current = false;
      setIsVibeMatchActive(false);
      vibeSessionHistoryRef.current.clear();
      showToast('Vibe Match paused');
      return;
    }

    vibeSessionHistoryRef.current = new Set([anchor.id]);
    isVibeMatchActiveRef.current = true;
    setIsVibeMatchActive(true);
    const result = syncVibeMatchQueueForTrack(anchor, tracksRef.current, 'toggle');
    const ePct = Math.round(result.anchorProfile.energy * 100);
    const mPct = Math.round(result.anchorProfile.melancholy * 100);
    showToast(`Vibe Match ON · E ${ePct}% · M ${mPct}% (${result.vibeLabel})`);
  };

  const smartRecommendations = useMemo(() => {
    const excludeIds = new Set(queue.map((q) => q.id));
    return getPersonalizedNextTracks({
      currentTrack,
      catalog: tracks,
      likedTrackIds,
      recentHistory: listeningHistoryService.getHistory(),
      skippedTracks: listeningHistoryService.getSkipped(),
      sessionPlayedIds,
      preferredLanguages: playbackSettings.preferredLanguages,
      excludeTrackIds: excludeIds,
      limit: 12,
    });
  }, [
    currentTrack?.id,
    tracks,
    likedTrackIds,
    historyRevision,
    sessionPlayedIds,
    playbackSettings.preferredLanguages,
    queue,
  ]);

  // Initialize AudioEngine callbacks
  useEffect(() => {
    audioEngine.onTimeUpdate((curr, dur) => {
      // Only take audioEngine time if not playing full song via YouTube
      if (!currentTrackRef.current?.youtubeId) {
        setCurrentTime(curr);
        setDuration(dur);
      }
    });

    audioEngine.onTrackEnded(() => {
      if (!currentTrackRef.current?.youtubeId) {
        handleNextTrack();
      }
    });

    // Check URL parameters for shared links (?track=... or ?playlist=... or ?plj=... or ?autostart=1)
    const params = new URLSearchParams(window.location.search);
    const sharedTrackId = params.get('track');
    const sharedPlaylistId = params.get('playlist');
    const sharedPlaylistJson = params.get(PLAYLIST_JSON_QUERY_PARAM);
    const sharedPayloadStr = params.get('s');

    if (sharedPayloadStr) {
      const decoded = decodeSharePayload(sharedPayloadStr);
      if (decoded) {
        showToast(`Opened shared indie gem: "${decoded.title}" by ${decoded.artist}`);
      }
    }

    if (sharedPlaylistJson) {
      const catalogIds = new Set(INITIAL_TRACKS.map((t) => t.id));
      const imported = decodePlaylistJsonPayload(sharedPlaylistJson, catalogIds);
      if (imported) {
        const importedPlaylist = createPlaylistFromImport(imported);
        setPlaylists((prev) => {
          const existingMatch = prev.find(
            (p) =>
              p.title === importedPlaylist.title &&
              p.trackIds.length === importedPlaylist.trackIds.length &&
              p.trackIds.every((id, idx) => id === importedPlaylist.trackIds[idx])
          );
          if (existingMatch) {
            setSelectedPlaylistId(existingMatch.id);
            return prev;
          }
          setSelectedPlaylistId(importedPlaylist.id);
          return [importedPlaylist, ...prev];
        });
        showToast(
          `Imported playlist "${imported.title}" (${imported.matchedTrackCount} ${imported.matchedTrackCount === 1 ? 'track' : 'tracks'}) from JSON link`
        );
        // Strip ?plj= from URL cleanly so reloads don't re-import
        params.delete(PLAYLIST_JSON_QUERY_PARAM);
        const cleanQuery = params.toString();
        const nextUrl = `${window.location.pathname}${cleanQuery ? `?${cleanQuery}` : ''}${window.location.hash}`;
        window.history.replaceState({}, '', nextUrl);
      }
    }

    if (sharedTrackId) {
      const found = INITIAL_TRACKS.find((t) => t.id === sharedTrackId);
      if (found) {
        setCurrentTrack(found);
        setDuration(found.duration);
      }
    } else if (sharedPlaylistId && !sharedPlaylistJson) {
      const foundPl = INITIAL_PLAYLISTS.find((p) => p.id === sharedPlaylistId);
      if (foundPl) {
        setSelectedPlaylistId(foundPl.id);
      }
    }

    const tabParam = params.get('tab');
    if (tabParam === 'discover') {
      setActiveTab('discover');
    } else if (tabParam === 'curator') {
      setActiveTab('curator');
    } else if (tabParam === 'search') {
      setActiveTab('search');
    } else if (tabParam === 'jam') {
      setActiveTab('jam');
    } else if (tabParam === 'library') {
      setActiveTab('library');
    }

    const actionParam = params.get('action');
    if (actionParam === 'visualizer') {
      setVisualizerModalOpen(true);
    }
  }, []);

  // Playback control handlers
  const handlePlayTrack = (track: IndieTrack) => {
    // Push previous track onto back-stack unless we are stepping backward
    if (!isNavigatingBackRef.current && currentTrackRef.current && currentTrackRef.current.id !== track.id) {
      playHistoryStackRef.current = [currentTrackRef.current, ...playHistoryStackRef.current.slice(0, 29)];
    }
    isNavigatingBackRef.current = false;

    // If track is from online search or external, ensure it is added to track catalog without duplicates
    setTracks((prev) => {
      const exists = prev.some((t) => t.id === track.id || (track.youtubeId && t.youtubeId === track.youtubeId));
      if (!exists) {
        return [track, ...prev];
      }
      return prev;
    });
    setSessionPlayedIds((prev) => {
      const next = new Set(prev);
      next.add(track.id);
      if (next.size >= Math.max(8, tracksRef.current.length - 2)) {
        return new Set([track.id]);
      }
      return next;
    });
    setCurrentTrack(track);
    setDuration(track.duration);
    setCurrentTime(0);
    setIsPlaying(true);
    setSeekRequest(null);

    if (isVibeMatchActiveRef.current) {
      const nextCatalog = tracksRef.current.some(
        (t) => t.id === track.id || (track.youtubeId && t.youtubeId === track.youtubeId)
      )
        ? tracksRef.current
        : [track, ...tracksRef.current];
      syncVibeMatchQueueForTrack(track, nextCatalog);
    }

    // FullSongPlayer acts as the master playback coordinator:
    // It plays the high-fidelity video/audio stream, auto-resolves un-indexed songs,
    // and continuously heals without falling back to synthetic chiptune beeps
    audioEngine.stop();
    listeningHistoryService.recordPlay(track, 0, false);
    showToast(`Now playing: "${track.title}" 🎵`);
  };

  const handleAddTrackToLibrary = (track: IndieTrack) => {
    setTracks((prev) => {
      if (prev.some((t) => t.id === track.id || (track.youtubeId && t.youtubeId === track.youtubeId))) return prev;
      return [track, ...prev];
    });
    showToast(`Added "${track.title}" by ${track.artist} to your Library! 🎵`);
  };

  const handleAddTrackFromAnywhere = (track: IndieTrack, autoPlay = false) => {
    setTracks((prev) => {
      if (prev.some((t) => t.id === track.id || (track.youtubeId && t.youtubeId === track.youtubeId))) return prev;
      return [track, ...prev];
    });
    showToast(`Added "${track.title}" by ${track.artist} to Library! 🎵`);
    if (autoPlay) {
      handlePlayTrack(track);
    }
  };

  const handlePause = () => {
    setIsPlaying(false);
    audioEngine.pause();
  };

  const handleResume = () => {
    if (currentTrack) {
      setIsPlaying(true);
    }
  };

  const handleSeek = (seconds: number) => {
    setCurrentTime(seconds);
    setSeekRequest(seconds);
    if (!currentTrackRef.current?.youtubeId) {
      audioEngine.seek(seconds);
    }
    setTimeout(() => setSeekRequest(null), 300);
  };

  const handleVolumeChange = (vol: number) => {
    setVolume(vol);
    setIsMuted(false);
    audioEngine.setVolume(vol);
  };

  const handleToggleMute = () => {
    const muted = audioEngine.toggleMute();
    setIsMuted(muted);
  };

  const handleToggleShuffle = () => {
    setIsShuffle((prev) => !prev);
  };

  const handleToggleRepeat = () => {
    setRepeatMode((prev) => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  };

  const handleNextTrack = () => {
    // Record skip or play in listeningHistoryService
    if (currentTrackRef.current) {
      const elapsed = currentTimeRef.current;
      const totalDur = durationRef.current;
      if (elapsed > 0 && elapsed < 25) {
        listeningHistoryService.recordSkip(currentTrackRef.current, Math.round(elapsed), 'early_skip');
      } else if (elapsed >= 25) {
        listeningHistoryService.recordPlay(
          currentTrackRef.current,
          Math.round(elapsed),
          elapsed >= (totalDur - 15)
        );
      }
    }

    if (repeatModeRef.current === 'one' && currentTrackRef.current) {
      handlePlayTrack(currentTrackRef.current);
      return;
    }

    // Check manual queue first
    if (queueRef.current.length > 0) {
      const nextTrack = queueRef.current[0];
      setQueue((prev) => prev.slice(1));
      handlePlayTrack(nextTrack);
      return;
    }

    const currentList = tracksRef.current;
    if (currentList.length === 0) return;

    // Smart Auto-Next picks the next song tailored to what the listener played & liked
    if (playbackSettingsRef.current.smartAutoNext) {
      const smartPick = pickSmartNextTrack(
        {
          currentTrack: currentTrackRef.current,
          catalog: currentList,
          likedTrackIds: likedTrackIdsRef.current,
          recentHistory: listeningHistoryService.getHistory(),
          skippedTracks: listeningHistoryService.getSkipped(),
          sessionPlayedIds: sessionPlayedIdsRef.current,
          preferredLanguages: playbackSettingsRef.current.preferredLanguages,
        },
        isShuffleRef.current
      );
      if (smartPick) {
        handlePlayTrack(smartPick);
        return;
      }
    }

    if (isShuffleRef.current) {
      const randomIdx = Math.floor(Math.random() * currentList.length);
      handlePlayTrack(currentList[randomIdx]);
      return;
    }

    const currentIdx = currentList.findIndex((t) => t.id === currentTrackRef.current?.id);
    const nextIdx = (currentIdx + 1) % currentList.length;
    handlePlayTrack(currentList[nextIdx]);
  };

  const handleDismissRecommendation = (track: IndieTrack) => {
    listeningHistoryService.recordSkip(track, 0, 'disliked');
    showToast(`Got it — tuning next suggestions away from "${track.title}"`);
  };

  const handlePreviousTrack = () => {
    if (currentTimeRef.current > 4 && currentTrackRef.current) {
      handleSeek(0);
      return;
    }
    if (playHistoryStackRef.current.length > 0) {
      const prevTrack = playHistoryStackRef.current[0];
      playHistoryStackRef.current = playHistoryStackRef.current.slice(1);
      isNavigatingBackRef.current = true;
      handlePlayTrack(prevTrack);
      return;
    }
    const currentList = tracksRef.current;
    const currentIdx = currentList.findIndex((t) => t.id === currentTrackRef.current?.id);
    const prevIdx = (currentIdx - 1 + currentList.length) % currentList.length;
    handlePlayTrack(currentList[prevIdx]);
  };

  const handleToggleLike = (trackId: string, trackSnapshot?: IndieTrack) => {
    const resolvedInput: string | IndieTrack =
      trackSnapshot ||
      (currentTrackRef.current?.id === trackId ? currentTrackRef.current : trackId);
    const catalog = mergeTracksWithLikedSnapshots(tracksRef.current, likedSongsStateRef.current);
    const result = toggleLikedSong(likedSongsStateRef.current, resolvedInput, catalog);

    likedSongsStateRef.current = result.state;
    setLikedSongsState(result.state);
    saveLikedSongsState(result.state);

    if (result.isLiked) {
      if (result.track) {
        const likedTrack = result.track;
        setTracks((prev) =>
          prev.some((t) => t.id === likedTrack.id) ? prev : [likedTrack, ...prev]
        );
        listeningHistoryService.recordPlay(likedTrack, 60, true);
      }
      showToast('Saved to Liked Songs');
    } else {
      showToast('Removed from Liked Songs');
    }
  };

  // Global keyboard & hardware media-key shortcuts (Space, Left/Right Arrows, L, Media*)
  const hasBlockingModalOpen =
    shareModalOpen ||
    createPlaylistModalOpen ||
    addMusicModalOpen ||
    settingsModalOpen ||
    androidModalOpen ||
    authModalMode !== null ||
    userProfileModalOpen ||
    editingTrackMetadata !== null;

  const keyboardHandlersRef = useRef({
    hasBlockingModalOpen: false,
    onPlay: () => {},
    onPause: () => {},
    onNext: () => {},
    onPrevious: () => {},
    onToggleLike: (_trackId: string, _track?: IndieTrack) => {},
  });
  keyboardHandlersRef.current = {
    hasBlockingModalOpen,
    onPlay: handleResume,
    onPause: handlePause,
    onNext: handleNextTrack,
    onPrevious: handlePreviousTrack,
    onToggleLike: handleToggleLike,
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const targetInfo = classifyShortcutTarget(e.target);
      const action = resolveGlobalMediaShortcut({
        key: e.key,
        code: e.code,
        repeat: e.repeat,
        defaultPrevented: e.defaultPrevented,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        altKey: e.altKey,
        ...targetInfo,
        hasBlockingModalOpen: keyboardHandlersRef.current.hasBlockingModalOpen,
      });

      if (!action) return;

      e.preventDefault();

      switch (action) {
        case 'toggle_play_pause':
          if (isPlayingRef.current) {
            keyboardHandlersRef.current.onPause();
          } else {
            keyboardHandlersRef.current.onPlay();
          }
          break;
        case 'play':
          keyboardHandlersRef.current.onPlay();
          break;
        case 'pause':
          keyboardHandlersRef.current.onPause();
          break;
        case 'next_track':
          keyboardHandlersRef.current.onNext();
          break;
        case 'previous_track':
          keyboardHandlersRef.current.onPrevious();
          break;
        case 'toggle_like':
          if (currentTrackRef.current) {
            keyboardHandlersRef.current.onToggleLike(currentTrackRef.current.id);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  const handleAddToQueue = (track: IndieTrack) => {
    setQueue((prev) => [...prev, track]);
    showToast(`Added "${track.title}" to play queue`);
  };

  const handlePlayPlaylist = (playlist: Playlist, shuffle = false) => {
    const plTracks = playlist.trackIds
      .map((id) => allKnownTracks.find((t) => t.id === id))
      .filter((t): t is IndieTrack => !!t);

    if (plTracks.length === 0) return;

    const listToPlay = shuffle ? [...plTracks].sort(() => Math.random() - 0.5) : plTracks;
    const firstTrack = listToPlay[0];
    const rest = listToPlay.slice(1);

    if (isVibeMatchActiveRef.current) {
      isVibeMatchActiveRef.current = false;
      setIsVibeMatchActive(false);
      vibeSessionHistoryRef.current.clear();
    }

    setQueue(rest);
    handlePlayTrack(firstTrack);
    showToast(`Playing "${playlist.title}"`);
  };

  // Playlist mutations
  const handleCreatePlaylist = (newPl: Playlist) => {
    setPlaylists((prev) => [newPl, ...prev]);
    setSelectedPlaylistId(newPl.id);
    setSelectedArtistId(null);
    setActiveHomePlaylistId(newPl.id);
    saveActiveHomePlaylistId(newPl.id);
    showToast(`Created playlist "${newPl.title}" & set as Home listing`);
  };

  const handleSaveCuratedPlaylist = (title: string, description: string, trackIds: string[]) => {
    const newPl: Playlist = {
      id: `ai-pl-${Date.now()}`,
      title,
      description,
      coverGradient: 'from-purple-600 via-indigo-600 to-emerald-500',
      coverEmoji: '✨',
      trackIds,
      isPersonalized: true,
      createdAt: 'Just now',
      owner: 'Aura Music AI',
    };
    setPlaylists((prev) => [newPl, ...prev]);
    setActiveHomePlaylistId(newPl.id);
    saveActiveHomePlaylistId(newPl.id);
    showToast(`Added "${title}" to your Library & Home listing! 📚`);
  };

  const handleAddTrackToPlaylist = (playlistId: string, trackId: string) => {
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id === playlistId) {
          if (pl.trackIds.includes(trackId)) {
            showToast('Track is already in this playlist');
            return pl;
          }
          showToast(`Added to "${pl.title}"`);
          return {
            ...pl,
            trackIds: [...pl.trackIds, trackId],
          };
        }
        return pl;
      })
    );
  };

  const handleDeletePlaylist = (playlistId: string) => {
    setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
    if (selectedPlaylistId === playlistId) {
      setSelectedPlaylistId(null);
      setActiveTab('home');
    }
    showToast('Playlist deleted');
  };

  // Social interactions
  const handleListenAlong = (trackId: string) => {
    const track = tracks.find((t) => t.id === trackId);
    if (track) {
      handlePlayTrack(track);
      showToast(`Now listening along to "${track.title}"!`);
    }
  };

  const handleSendRecommendationToFriend = (friendName: string, itemTitle: string, note: string) => {
    showToast(`Sent "${itemTitle}" to ${friendName} with note!`);
  };

  const handleOpenShareTrack = (track: IndieTrack) => {
    setShareTrack(track);
    setSharePlaylist(null);
    setShareModalOpen(true);
  };

  const handleOpenSharePlaylist = (pl: Playlist) => {
    setShareTrack(null);
    setSharePlaylist(pl);
    setShareModalOpen(true);
  };

  // Track metadata & custom tag editing
  const handleOpenEditMetadata = (track: IndieTrack) => {
    setEditingTrackMetadata(track);
  };

  const handleSaveTrackMetadata = async (override: TrackMetadataOverride) => {
    const updatedOverrides = await trackMetadataService.saveMetadataOverride(
      override,
      metadataOverrides
    );
    setMetadataOverrides(updatedOverrides);
    setTracks((prev) =>
      prev.map((t) =>
        t.id === override.trackId ? applyTrackMetadataOverride(t, override) : t
      )
    );
    setCurrentTrack((prev) =>
      prev && prev.id === override.trackId ? applyTrackMetadataOverride(prev, override) : prev
    );
    setQueue((prev) =>
      prev.map((t) =>
        t.id === override.trackId ? applyTrackMetadataOverride(t, override) : t
      )
    );
    const existingLiked = likedSongsStateRef.current.tracksById[override.trackId];
    if (existingLiked) {
      const nextLiked = syncLikedTrackMetadata(
        likedSongsStateRef.current,
        applyTrackMetadataOverride(existingLiked, override)
      );
      likedSongsStateRef.current = nextLiked;
      setLikedSongsState(nextLiked);
      saveLikedSongsState(nextLiked);
    }
    showToast(`Saved metadata & tags for "${override.title}"`);
  };

  const handleResetTrackMetadata = async (trackId: string) => {
    const updatedOverrides = await trackMetadataService.resetMetadataOverride(
      trackId,
      metadataOverrides
    );
    setMetadataOverrides(updatedOverrides);
    setTracks((prev) =>
      prev.map((t) =>
        t.id === trackId ? restoreOriginalTrack(trackId, INITIAL_TRACKS, t) || t : t
      )
    );
    setCurrentTrack((prev) =>
      prev && prev.id === trackId ? restoreOriginalTrack(trackId, INITIAL_TRACKS, prev) : prev
    );
    setQueue((prev) =>
      prev.map((t) =>
        t.id === trackId ? restoreOriginalTrack(trackId, INITIAL_TRACKS, t) || t : t
      )
    );
    const existingLiked = likedSongsStateRef.current.tracksById[trackId];
    if (existingLiked) {
      const restored = restoreOriginalTrack(trackId, INITIAL_TRACKS, existingLiked) || existingLiked;
      const nextLiked = syncLikedTrackMetadata(likedSongsStateRef.current, restored);
      likedSongsStateRef.current = nextLiked;
      setLikedSongsState(nextLiked);
      saveLikedSongsState(nextLiked);
    }
    showToast('Restored original track metadata');
  };

  // Download actions
  const handleDownloadTrack = async (track: IndieTrack) => {
    if (downloadingTrackIds.has(track.id)) return;
    setDownloadingTrackIds((prev) => new Set(prev).add(track.id));
    showToast(`Downloading "${track.title}" (.wav) to device... ⬇️`);
    try {
      await downloadTrackWithProgress(track);
      setDownloadedTrackIds((prev) => new Set(prev).add(track.id));
      showToast(`Downloaded "${track.title}"! Saved offline & to device 📥`);
    } catch (err) {
      console.error('Download failed:', err);
      showToast(`Could not complete download for "${track.title}".`);
    } finally {
      setDownloadingTrackIds((prev) => {
        const next = new Set(prev);
        next.delete(track.id);
        return next;
      });
    }
  };

  const handleRemoveDownload = (trackId: string) => {
    removeDownload(trackId);
    setDownloadedTrackIds((prev) => {
      const next = new Set(prev);
      next.delete(trackId);
      return next;
    });
    showToast('Removed song from offline storage');
  };

  const handleClearAllDownloads = () => {
    clearAllDownloads();
    setDownloadedTrackIds(new Set());
    showToast('Cleared all offline downloaded songs');
  };

  const handleDownloadPlaylist = async (playlistTracks: IndieTrack[]) => {
    const unDownloaded = playlistTracks.filter((t) => !downloadedTrackIds.has(t.id));
    if (unDownloaded.length === 0) {
      showToast('All tracks in this playlist are already downloaded!');
      return;
    }
    showToast(`Downloading ${unDownloaded.length} playlist tracks... ⬇️`);
    for (let i = 0; i < unDownloaded.length; i++) {
      const t = unDownloaded[i];
      setDownloadingTrackIds((prev) => new Set(prev).add(t.id));
      try {
        await downloadTrackWithProgress(t);
        setDownloadedTrackIds((prev) => new Set(prev).add(t.id));
      } catch (err) {
        console.error('Batch download item failed:', err);
      } finally {
        setDownloadingTrackIds((prev) => {
          const next = new Set(prev);
          next.delete(t.id);
          return next;
        });
      }
    }
    showToast(`Saved all ${unDownloaded.length} tracks to offline library & device! 🎵`);
  };

  // Nav actions
  const handleSelectNavTab = (tab: ActiveNavTab) => {
    setActiveTab(tab);
    setSelectedPlaylistId(null);
    setSelectedArtistId(null);
  };

  const handleSelectPlaylist = (id: string) => {
    setSelectedPlaylistId(id);
    setSelectedArtistId(null);
  };

  const handleSelectArtist = (id: string) => {
    setSelectedArtistId(id);
    setSelectedPlaylistId(null);
  };

  // Selected entities
  const activePlaylist = playlists.find((p) => p.id === selectedPlaylistId);
  const activeArtist = artists.find((a) => a.id === selectedArtistId);

  // Liked tracks virtual playlist (derived directly from single source of truth)
  const likedPlaylist: Playlist = {
    id: 'pl-liked',
    title: 'Liked Songs',
    description: 'Your saved collection of favorite tracks across Aura Music.',
    coverGradient: 'from-indigo-600 via-purple-700 to-rose-600',
    coverEmoji: '❤️',
    trackIds: likedTracks.map((t) => t.id),
    createdAt: '2026-10-26',
    owner: 'You',
  };

  // Downloaded tracks virtual playlist
  const downloadedPlaylist: Playlist = {
    id: 'pl-downloaded',
    title: 'Downloaded Songs',
    description: 'Offline-ready tracks saved directly to your device storage.',
    coverGradient: 'from-blue-600 via-cyan-600 to-teal-500',
    coverEmoji: '⬇️',
    trackIds: Array.from(downloadedTrackIds),
    createdAt: '2026-10-26',
    owner: 'You',
  };

  const isAnimatedFocusActive = playbackSettings.animatedFocusMode;
  const animatedFocusConfig = useMemo(
    () => deriveAnimatedFocusGradient(currentTrack, playbackSettings.theme),
    [currentTrack?.energy, currentTrack?.melancholy, currentTrack?.bpm, playbackSettings.theme]
  );

  const handleToggleAnimatedFocus = () => {
    const nextEnabled = !playbackSettings.animatedFocusMode;
    const nextSettings: PlaybackSettings = {
      ...playbackSettings,
      animatedFocusMode: nextEnabled,
    };
    setPlaybackSettings(nextSettings);
    savePlaybackSettings(nextSettings);
    showToast(
      nextEnabled
        ? `Animated Focus on · ${animatedFocusConfig.vibeLabel} (${Math.round(
            animatedFocusConfig.energy * 100
          )}% Energy · ${Math.round(animatedFocusConfig.melancholy * 100)}% Melancholy)`
        : 'Animated Focus off'
    );
  };

  const themeBgClass =
    playbackSettings.theme === 'amoled-black'
      ? 'bg-black'
      : playbackSettings.theme === 'gym-neon'
      ? 'bg-[#080d0a]'
      : 'bg-[#0b0d17]';

  return (
    <div
      data-app-shell
      data-theme={playbackSettings.theme}
      data-animated-focus={isAnimatedFocusActive ? 'on' : 'off'}
      className={`relative isolate flex flex-col h-screen w-screen overflow-hidden bg-black text-[#f3f3f3] transition-colors duration-500 ${themeBgClass}`}
    >
      {/* Subtle track-reactive Animated Focus CSS gradient background */}
      <AnimatedFocusBackdrop
        enabled={isAnimatedFocusActive}
        currentTrack={currentTrack}
        theme={playbackSettings.theme}
      />

      {/* Toast alert */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-16 md:top-5 left-1/2 -translate-x-1/2 z-50 bg-white text-black font-bold text-xs md:text-sm px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-2 max-w-[calc(100vw-2rem)] text-center"
        >
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Mobile Top App Bar */}
      <header
        className={`music-app-mobile-header md:hidden relative flex items-center justify-between gap-1.5 px-2.5 py-2 backdrop-blur-xl border-b border-white/[0.08] shrink-0 select-none z-30 transition-colors duration-500 ${
          isAnimatedFocusActive ? 'bg-[#0b0d17]/75' : 'bg-[#0b0d17]/95'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <img
            src={`${APP_BASE_URL}icon.svg`}
            alt="Aura Music logo"
            className="w-7 h-7 rounded-lg object-cover border border-white/15 shadow-sm shrink-0"
          />
          <span className="font-bold text-[13px] tracking-tight text-white whitespace-nowrap truncate">
            Aura Music
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <PWAInstallButton
            variant="mobile"
            onOpenInstallModal={() => setAndroidModalOpen(true)}
            onInstalledToast={showToast}
          />
          <button
            type="button"
            onClick={handleToggleAnimatedFocus}
            aria-pressed={isAnimatedFocusActive}
            aria-label="Toggle Animated Focus mode"
            data-testid="animated-focus-toggle-mobile"
            title={`Animated Focus (${isAnimatedFocusActive ? 'On' : 'Off'}) · ${animatedFocusConfig.vibeLabel}`}
            className={`p-1.5 rounded-full border active:scale-95 transition-all cursor-pointer shrink-0 ${
              isAnimatedFocusActive
                ? 'bg-white/15 text-white border-white/30 shadow-sm'
                : 'text-slate-300 hover:text-white bg-white/[0.06] border-transparent'
            }`}
          >
            <Aperture
              className="w-3.5 h-3.5"
              style={isAnimatedFocusActive ? { color: animatedFocusConfig.accentPrimary } : undefined}
            />
          </button>
          {currentUser ? (
            <button
              onClick={() => {
                setProfileInitialSection(
                  isOwnerUser(currentUser.email, currentUser.isEmailVerified ?? true)
                    ? 'owner_logins'
                    : 'overview'
                );
                setUserProfileModalOpen(true);
              }}
              className="flex items-center gap-1.5 p-1 pr-2 rounded-full bg-white/[0.06] border border-white/10 active:scale-95 transition-all shrink-0"
            >
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-5 h-5 rounded-full object-cover border border-white/25 shrink-0"
              />
              <span className="text-[11px] font-semibold text-white max-w-[56px] truncate">
                {currentUser.name.split(' ')[0]}
              </span>
            </button>
          ) : (
            <button
              onClick={() => setAuthModalMode('signup')}
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-white text-black font-bold text-[11px] whitespace-nowrap shrink-0 shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <UserPlus className="w-3 h-3 stroke-[2.5] shrink-0" />
              <span>Sign Up</span>
            </button>
          )}

          <button
            onClick={() => handleSelectNavTab('search')}
            className="p-1.5 text-slate-300 hover:text-white rounded-full bg-white/[0.06] active:scale-95 transition-all shrink-0"
            aria-label="Search tracks and artists"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setSettingsModalOpen(true)}
            className="p-1.5 text-slate-300 hover:text-white rounded-full bg-white/[0.06] active:scale-95 transition-all shrink-0"
            aria-label="Playback Settings"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main App Workspace */}
      <div className="music-app-workspace relative z-10 flex flex-1 min-h-0 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={handleSelectNavTab}
          selectedPlaylistId={selectedPlaylistId}
          onSelectPlaylist={handleSelectPlaylist}
          playlists={playlists}
          likedTrackCount={likedTrackIds.size}
          downloadedTrackCount={downloadedTrackIds.size}
          onOpenCreatePlaylist={() => {
            setEditingPlaylist(null);
            setCreatePlaylistModalOpen(true);
          }}
          onOpenAddMusic={() => setAddMusicModalOpen(true)}
          onOpenSettings={() => setSettingsModalOpen(true)}
          onOpenAndroidApp={() => setAndroidModalOpen(true)}
          crossfadeDuration={playbackSettings.crossfadeDuration}
          user={currentUser}
          onOpenAuth={(mode) => setAuthModalMode(mode)}
          onOpenProfile={() => {
            setProfileInitialSection('overview');
            setUserProfileModalOpen(true);
          }}
          isAnimatedFocusActive={isAnimatedFocusActive}
        />

        {/* Central Content Area */}
        <main className="music-app-main flex-1 overflow-y-auto overflow-x-hidden px-3 py-2 sm:px-4 md:px-8 sm:py-5 relative pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-8">
          {/* Top Desktop Action Bar */}
          <div className="music-app-desktop-header hidden md:flex items-center justify-between pb-4 mb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="font-semibold text-white">Aura Music</span>
              <span>·</span>
              <span>Hi-Fi Streaming & Discovery</span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleToggleAnimatedFocus}
                aria-pressed={isAnimatedFocusActive}
                data-testid="animated-focus-toggle"
                title={`Animated Focus (${isAnimatedFocusActive ? 'Active' : 'Off'}) · ${animatedFocusConfig.vibeLabel} · Energy ${Math.round(
                  animatedFocusConfig.energy * 100
                )}% · Melancholy ${Math.round(animatedFocusConfig.melancholy * 100)}%`}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap ${
                  isAnimatedFocusActive
                    ? 'bg-white/[0.12] text-white border-white/25 shadow-sm'
                    : 'bg-white/[0.04] hover:bg-white/[0.09] text-slate-300 hover:text-white border-white/10'
                }`}
              >
                <Aperture
                  className="w-3.5 h-3.5 shrink-0"
                  style={isAnimatedFocusActive ? { color: animatedFocusConfig.accentPrimary } : undefined}
                />
                <span>Animated Focus</span>
                {isAnimatedFocusActive && (
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: animatedFocusConfig.accentPrimary }}
                  />
                )}
              </button>
              <PWAInstallButton
                variant="desktop"
                onOpenInstallModal={() => setAndroidModalOpen(true)}
                onInstalledToast={showToast}
              />
              {currentUser ? (
                <div className="flex items-center gap-2">
                  {isOwnerUser(currentUser.email, currentUser.isEmailVerified ?? true) && (
                    <button
                      onClick={() => {
                        setProfileInitialSection('owner_logins');
                        setUserProfileModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-sky-400 text-xs font-semibold transition-all cursor-pointer"
                      title="View visitor logins (zero passwords)"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Visitor Logins</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setProfileInitialSection('overview');
                      setUserProfileModalOpen(true);
                    }}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 transition-all cursor-pointer group"
                  >
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.name}
                      className="w-6 h-6 rounded-full object-cover border border-white/20"
                    />
                    <span className="text-xs font-semibold text-white group-hover:text-sky-400 transition-colors">
                      {currentUser.name}
                    </span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAuthModalMode('signin')}
                    className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => setAuthModalMode('signup')}
                    className="px-4 py-1.5 rounded-full bg-white hover:bg-slate-200 text-black text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Sign Up Free</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          {/* View Routing */}
          {selectedArtistId && activeArtist ? (
            <ArtistView
              artist={activeArtist}
              allTracks={tracks}
              allArtists={artists}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              likedTrackIds={likedTrackIds}
              onPlayTrack={handlePlayTrack}
              onPauseTrack={handlePause}
              onToggleLike={handleToggleLike}
              onShareTrack={handleOpenShareTrack}
              onAddToQueue={handleAddToQueue}
              onSelectArtist={handleSelectArtist}
              userPlaylists={playlists}
              onAddToPlaylist={handleAddTrackToPlaylist}
              downloadedTrackIds={downloadedTrackIds}
              downloadingTrackIds={downloadingTrackIds}
              onDownloadTrack={handleDownloadTrack}
              onEditMetadata={handleOpenEditMetadata}
            />
          ) : activeTab === 'liked' ? (
            <PlaylistView
              playlist={likedPlaylist}
              allTracks={allKnownTracks}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              likedTrackIds={likedTrackIds}
              downloadedTrackIds={downloadedTrackIds}
              downloadingTrackIds={downloadingTrackIds}
              onDownloadTrack={handleDownloadTrack}
              onDownloadPlaylist={handleDownloadPlaylist}
              onPlayPlaylist={handlePlayPlaylist}
              onPlayTrack={handlePlayTrack}
              onPauseTrack={handlePause}
              onToggleLike={handleToggleLike}
              onSharePlaylist={handleOpenSharePlaylist}
              onShareTrack={handleOpenShareTrack}
              onAddToQueue={handleAddToQueue}
              onSelectArtist={handleSelectArtist}
              onAddTrackToPlaylist={handleAddTrackToPlaylist}
              userPlaylists={playlists}
              onEditMetadata={handleOpenEditMetadata}
            />
          ) : activeTab === 'downloads' ? (
            <PlaylistView
              playlist={downloadedPlaylist}
              allTracks={allKnownTracks}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              likedTrackIds={likedTrackIds}
              downloadedTrackIds={downloadedTrackIds}
              downloadingTrackIds={downloadingTrackIds}
              onDownloadTrack={handleDownloadTrack}
              onDownloadPlaylist={handleDownloadPlaylist}
              onPlayPlaylist={handlePlayPlaylist}
              onPlayTrack={handlePlayTrack}
              onPauseTrack={handlePause}
              onToggleLike={handleToggleLike}
              onSharePlaylist={handleOpenSharePlaylist}
              onShareTrack={handleOpenShareTrack}
              onAddToQueue={handleAddToQueue}
              onSelectArtist={handleSelectArtist}
              onAddTrackToPlaylist={handleAddTrackToPlaylist}
              userPlaylists={playlists}
              onEditMetadata={handleOpenEditMetadata}
            />
          ) : activeTab === 'library' ? (
            <LibraryView
              playlists={playlists}
              allTracks={allKnownTracks}
              artists={artists}
              likedTrackIds={likedTrackIds}
              downloadedTrackIds={downloadedTrackIds}
              downloadingTrackIds={downloadingTrackIds}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              onSelectPlaylist={handleSelectPlaylist}
              onSelectArtist={handleSelectArtist}
              onPlayPlaylist={handlePlayPlaylist}
              onPlayTrack={handlePlayTrack}
              onPauseTrack={handlePause}
              onToggleLike={handleToggleLike}
              onSharePlaylist={handleOpenSharePlaylist}
              onDownloadTrack={handleDownloadTrack}
              onRemoveDownload={handleRemoveDownload}
              onClearAllDownloads={handleClearAllDownloads}
              onGoToDownloads={() => handleSelectNavTab('downloads')}
              onOpenCreatePlaylist={() => {
                setEditingPlaylist(null);
                setCreatePlaylistModalOpen(true);
              }}
              onOpenAddMusic={() => setAddMusicModalOpen(true)}
              onGoToLikedSongs={() => handleSelectNavTab('liked')}
              onShareTrack={handleOpenShareTrack}
              onAddToQueue={handleAddToQueue}
              onAddToPlaylist={handleAddTrackToPlaylist}
              onEditMetadata={handleOpenEditMetadata}
            />
          ) : selectedPlaylistId && activePlaylist ? (
            <PlaylistView
              playlist={activePlaylist}
              allTracks={allKnownTracks}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              likedTrackIds={likedTrackIds}
              downloadedTrackIds={downloadedTrackIds}
              downloadingTrackIds={downloadingTrackIds}
              onDownloadTrack={handleDownloadTrack}
              onDownloadPlaylist={handleDownloadPlaylist}
              onPlayPlaylist={handlePlayPlaylist}
              onPlayTrack={handlePlayTrack}
              onPauseTrack={handlePause}
              onToggleLike={handleToggleLike}
              onSharePlaylist={handleOpenSharePlaylist}
              onShareTrack={handleOpenShareTrack}
              onAddToQueue={handleAddToQueue}
              onSelectArtist={handleSelectArtist}
              onAddTrackToPlaylist={handleAddTrackToPlaylist}
              onDeletePlaylist={handleDeletePlaylist}
              userPlaylists={playlists}
              isHomeMainListing={activeHomePlaylist?.id === activePlaylist.id}
              onSetAsHomeListing={handleSelectActiveHomePlaylist}
              onEditMetadata={handleOpenEditMetadata}
              onEditPlaylist={(pl) => {
                setEditingPlaylist(pl);
                setCreatePlaylistModalOpen(true);
              }}
            />
          ) : activeTab === 'discover' ? (
            <DiscoverView
              tracks={allKnownTracks}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              likedTrackIds={likedTrackIds}
              onPlayTrack={handlePlayTrack}
              onPauseTrack={handlePause}
              onToggleLike={handleToggleLike}
              onShareTrack={handleOpenShareTrack}
              onAddToQueue={handleAddToQueue}
              onSelectArtist={handleSelectArtist}
              userPlaylists={playlists}
              onAddToPlaylist={handleAddTrackToPlaylist}
              onSavePersonalizedPlaylist={handleCreatePlaylist}
              onGoToCurator={() => handleSelectNavTab('curator')}
              onEditMetadata={handleOpenEditMetadata}
            />
          ) : activeTab === 'curator' ? (
            <AICuratorView
              tracks={allKnownTracks}
              artists={artists}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              likedTrackIds={likedTrackIds}
              onPlayTrack={handlePlayTrack}
              onPauseTrack={handlePause}
              onToggleLike={handleToggleLike}
              onSelectArtist={handleSelectArtist}
              onSaveCuratedPlaylist={handleSaveCuratedPlaylist}
              onAddToQueue={handleAddToQueue}
              onShowToast={showToast}
            />
          ) : activeTab === 'search' ? (
            <SearchView
              tracks={allKnownTracks}
              artists={artists}
              playlists={playlists}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              likedTrackIds={likedTrackIds}
              onPlayTrack={handlePlayTrack}
              onPauseTrack={handlePause}
              onToggleLike={handleToggleLike}
              onShareTrack={handleOpenShareTrack}
              onAddToQueue={handleAddToQueue}
              onSelectArtist={handleSelectArtist}
              onSelectPlaylist={handleSelectPlaylist}
              userPlaylists={playlists}
              onAddToPlaylist={handleAddTrackToPlaylist}
              onAddTrackToLibrary={handleAddTrackToLibrary}
              onOpenAddMusic={() => setAddMusicModalOpen(true)}
              downloadedTrackIds={downloadedTrackIds}
              downloadingTrackIds={downloadingTrackIds}
              onDownloadTrack={handleDownloadTrack}
              onEditMetadata={handleOpenEditMetadata}
            />
          ) : activeTab === 'jam' ? (
            <SocialJamView
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              onPlayTrack={handlePlayTrack}
              availableTracks={allKnownTracks}
              onShareTrack={handleOpenShareTrack}
            />
          ) : (
            <HomeView
              tracks={allKnownTracks}
              likedTracks={likedTracks}
              likedTrackIds={likedTrackIds}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              isLiked={currentTrack ? likedTrackIds.has(currentTrack.id) : false}
              isVideoVisible={isVideoVisible}
              onPlayTrack={handlePlayTrack}
              onPauseTrack={handlePause}
              onResumeTrack={handleResume}
              onNextTrack={handleNextTrack}
              onPreviousTrack={handlePreviousTrack}
              onSeek={handleSeek}
              onToggleLike={handleToggleLike}
              onToggleVideo={() => setIsVideoVisible((prev) => !prev)}
              onPlayYouTubeTrack={(ytTrack) => handleAddTrackFromAnywhere(ytTrack, true)}
              onPlayLikedAll={() => handlePlayPlaylist(likedPlaylist, false)}
              onGoToDiscover={() => handleSelectNavTab('discover')}
            />
          )}
        </main>

        <FriendActivityBar
          friendActivities={friendActivities}
          isOpen={friendActivityOpen}
          onToggle={() => setFriendActivityOpen((open) => !open)}
          onListenAlong={(trackId) => {
            const track = allKnownTracks.find((item) => item.id === trackId);
            if (track) {
              handlePlayTrack(track);
            } else {
              showToast('That track is not available in your library.');
            }
          }}
          onShareWithFriend={(friendName) => {
            const friend = friendActivities.find((item) => item.friendName === friendName);
            const track = friend
              ? allKnownTracks.find((item) => item.id === friend.trackId)
              : undefined;
            if (track) {
              handleOpenShareTrack(track);
            } else {
              showToast(`Could not find ${friendName}'s current track to share.`);
            }
          }}
        />

      </div>

      {/* Persistent Bottom Player Bar */}
      <PlayerBar
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        isMuted={isMuted}
        isShuffle={isShuffle}
        repeatMode={repeatMode}
        isLiked={currentTrack ? likedTrackIds.has(currentTrack.id) : false}
        isDownloaded={currentTrack ? downloadedTrackIds.has(currentTrack.id) : false}
        isDownloading={currentTrack ? downloadingTrackIds.has(currentTrack.id) : false}
        onDownloadTrack={handleDownloadTrack}
        onPlay={handleResume}
        onPause={handlePause}
        onNext={handleNextTrack}
        onPrevious={handlePreviousTrack}
        onSeek={handleSeek}
        onVolumeChange={handleVolumeChange}
        onToggleMute={handleToggleMute}
        onToggleShuffle={handleToggleShuffle}
        onToggleRepeat={handleToggleRepeat}
        onToggleLike={handleToggleLike}
        onShare={handleOpenShareTrack}
        onToggleLyrics={() => setLyricsDrawerOpen(!lyricsDrawerOpen)}
        onToggleQueue={() => setQueueDrawerOpen(!queueDrawerOpen)}
        onSelectArtist={handleSelectArtist}
        isVideoVisible={isVideoVisible}
        onToggleVideo={() => setIsVideoVisible((v) => !v)}
        onOpenSettings={() => setSettingsModalOpen(true)}
        crossfadeDuration={playbackSettings.crossfadeDuration}
        isVisualizerOpen={visualizerModalOpen}
        onToggleVisualizer={setVisualizerModalOpen}
        lockScreenPlayback={playbackSettings.lockScreenPlayback}
        onEditMetadata={handleOpenEditMetadata}
        isVibeMatchActive={isVibeMatchActive}
        onToggleVibeMatch={handleToggleVibeMatch}
        queueCount={queue.length}
      />

      {/* Persistent Native Android Bottom Navigation Bar */}
      <AndroidBottomNav
        activeTab={
          activeTab === 'curator'
            ? 'curator'
            : activeTab === 'search'
            ? 'search'
            : activeTab === 'library' || selectedPlaylistId || activeTab === 'liked'
            ? 'library'
            : 'home'
        }
        onSelectTab={(tab) => {
          if (tab === 'home') handleSelectNavTab('home');
          else if (tab === 'search') handleSelectNavTab('search');
          else if (tab === 'curator') handleSelectNavTab('curator');
          else if (tab === 'library') {
            handleSelectNavTab('library');
          }
        }}
        onOpenVisualizer={() => setVisualizerModalOpen(true)}
        onOpenAndroidModal={() => setAndroidModalOpen(true)}
        onOpenSettings={() => setSettingsModalOpen(true)}
        isVisualizerActive={visualizerModalOpen}
      />

      {/* Full Song Master Audio & Video Player */}
      <FullSongPlayer
        currentTrack={currentTrack}
        nextTrack={
          queue[0] ||
          (playbackSettings.smartAutoNext ? smartRecommendations[0]?.track : null) ||
          (tracks.length > 0
            ? tracks[(tracks.findIndex((t) => t.id === currentTrack?.id) + 1) % tracks.length]
            : null)
        }
        isPlaying={isPlaying}
        volume={volume}
        isMuted={isMuted}
        seekTime={seekRequest}
        crossfadeDuration={playbackSettings.crossfadeDuration}
        lockScreenPlayback={playbackSettings.lockScreenPlayback}
        onTrackResolved={(trackId, ytId) => {
          setTracks((prev) =>
            prev.map((t) => (t.id === trackId ? { ...t, youtubeId: ytId, fullSongAvailable: true } : t))
          );
          if (currentTrack?.id === trackId) {
            setCurrentTrack((prev) => (prev ? { ...prev, youtubeId: ytId, fullSongAvailable: true } : null));
          }
          const existingLiked = likedSongsStateRef.current.tracksById[trackId];
          if (existingLiked) {
            const nextLiked = syncLikedTrackMetadata(likedSongsStateRef.current, {
              ...existingLiked,
              youtubeId: ytId,
              fullSongAvailable: true,
            });
            likedSongsStateRef.current = nextLiked;
            setLikedSongsState(nextLiked);
            saveLikedSongsState(nextLiked);
          }
        }}
        onPlaybackFallback={(track) => {
          showToast(`Playing resilient audio stream for "${track.title}" 🎧`);
        }}
        onTimeUpdate={(curr, dur) => {
          setCurrentTime(curr);
          if (dur > 0) setDuration(dur);
        }}
        onTrackEnded={handleNextTrack}
        onPlayRequest={handleResume}
        onPauseRequest={handlePause}
        onPreviousTrack={handlePreviousTrack}
        onSeekRequest={handleSeek}
        isVideoVisible={isVideoVisible}
        onToggleVideo={() => setIsVideoVisible((v) => !v)}
      />

      {/* Add Music from Anywhere Modal */}
      <AddMusicModal
        isOpen={addMusicModalOpen}
        onClose={() => setAddMusicModalOpen(false)}
        onAddTrack={(track, autoPlay) => {
          handleAddTrackFromAnywhere(track, autoPlay);
        }}
        playlists={playlists}
        onAddToPlaylist={handleAddTrackToPlaylist}
      />

      {/* Modals & Drawers */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        track={shareTrack}
        playlist={sharePlaylist}
        onSendToFriend={handleSendRecommendationToFriend}
      />

      <PlaylistModal
        isOpen={createPlaylistModalOpen}
        onClose={() => setCreatePlaylistModalOpen(false)}
        onCreatePlaylist={handleCreatePlaylist}
        existingPlaylist={editingPlaylist}
        knownTrackIds={new Set(tracks.map((t) => t.id))}
        onShowToast={showToast}
      />

      <LyricsDrawer
        isOpen={lyricsDrawerOpen}
        onClose={() => setLyricsDrawerOpen(false)}
        track={currentTrack}
        isLiked={currentTrack ? likedTrackIds.has(currentTrack.id) : false}
        onToggleLike={handleToggleLike}
        currentTime={currentTime}
        duration={duration}
        isPlaying={isPlaying}
        onSeek={handleSeek}
      />

      <QueueDrawer
        isOpen={queueDrawerOpen}
        onClose={() => setQueueDrawerOpen(false)}
        currentTrack={currentTrack}
        queue={queue}
        recommendedNextTracks={smartRecommendations}
        onPlayTrack={handlePlayTrack}
        onRemoveFromQueue={(idx) => setQueue((prev) => prev.filter((_, i) => i !== idx))}
        onClearQueue={() => {
          setQueue([]);
          if (isVibeMatchActive) {
            isVibeMatchActiveRef.current = false;
            setIsVibeMatchActive(false);
            vibeSessionHistoryRef.current.clear();
            showToast('Queue cleared · Vibe Match off');
          }
        }}
        onAddToQueue={handleAddToQueue}
        onDismissRecommendation={handleDismissRecommendation}
        isVibeMatchActive={isVibeMatchActive}
        vibeLabel={vibeLabel}
        vibeAnchorProfile={vibeAnchorProfile}
        vibeMatchByTrackId={vibeMatchByTrackId}
        onToggleVibeMatch={handleToggleVibeMatch}
        likedTrackIds={likedTrackIds}
        onToggleLike={handleToggleLike}
      />

      {/* Playback & Audio Settings Modal */}
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        settings={playbackSettings}
        onUpdateSettings={handleUpdateSettings}
        currentUser={currentUser}
        onShowToast={showToast}
      />

      {/* Android App Install & WebAPK Modal */}
      <AndroidInstallModal
        isOpen={androidModalOpen}
        onClose={() => setAndroidModalOpen(false)}
      />

      {/* Offline Connectivity Indicator */}
      <OfflineIndicator />

      {/* Aura Music User Authentication Modal (Sign Up / Sign In) */}
      <AuthModal
        isOpen={authModalMode !== null}
        initialMode={authModalMode || 'signup'}
        onClose={() => setAuthModalMode(null)}
        onSuccess={(user) => {
          showToast(`Welcome to Aura Music, ${user.name}! 🎧`);
        }}
      />

      {/* Aura Music User Profile Modal */}
      {currentUser && (
        <UserProfileModal
          isOpen={userProfileModalOpen}
          user={currentUser}
          likedTrackCount={likedTrackIds.size}
          downloadedTrackCount={downloadedTrackIds.size}
          initialSection={profileInitialSection}
          onClose={() => setUserProfileModalOpen(false)}
          onSignOut={() => {
            authService.signOut();
            showToast('Signed out of Aura Music');
          }}
          onUpdateUser={(updated) => {
            setCurrentUser(updated);
            showToast(`Workout vibe updated to ${updated.gymVibe}! 🔥`);
          }}
        />
      )}
      {/* Track Metadata & Custom Tags Editor Modal */}
      <EditMetadataModal
        isOpen={editingTrackMetadata !== null}
        track={editingTrackMetadata}
        hasOverride={Boolean(editingTrackMetadata && metadataOverrides[editingTrackMetadata.id])}
        onClose={() => setEditingTrackMetadata(null)}
        onSave={handleSaveTrackMetadata}
        onResetToOriginal={handleResetTrackMetadata}
      />
    </div>
  );
}
