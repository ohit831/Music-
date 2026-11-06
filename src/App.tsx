/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
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

// Components
import { Sidebar, ActiveNavTab } from './components/Sidebar';
import { PlayerBar } from './components/PlayerBar';
import { FriendActivityBar } from './components/FriendActivityBar';
import { ShareModal } from './components/ShareModal';
import { PlaylistModal } from './components/PlaylistModal';
import { LyricsDrawer } from './components/LyricsDrawer';
import { QueueDrawer } from './components/QueueDrawer';
import { FullSongPlayer } from './components/FullSongPlayer';
import { AddMusicModal } from './components/AddMusicModal';
import { SettingsModal } from './components/SettingsModal';
import { AndroidInstallModal } from './components/AndroidInstallModal';
import { AndroidBottomNav } from './components/AndroidBottomNav';
import { Smartphone, Search, Sliders, Radio } from 'lucide-react';
import {
  loadPlaybackSettings,
  savePlaybackSettings,
  PlaybackSettings,
} from './utils/playbackSettings';

// Views
import { HomeView } from './views/HomeView';
import { DiscoverView } from './views/DiscoverView';
import { SearchView } from './views/SearchView';
import { PlaylistView } from './views/PlaylistView';
import { ArtistView } from './views/ArtistView';
import { SocialJamView } from './views/SocialJamView';
import { LibraryView } from './views/LibraryView';
import {
  getDownloadedTrackIds,
  downloadTrackWithProgress,
  removeDownload,
  clearAllDownloads,
} from './utils/downloadManager';

export default function App() {
  // App data state
  const [tracks, setTracks] = useState<IndieTrack[]>(INITIAL_TRACKS);
  const [playlists, setPlaylists] = useState<Playlist[]>(INITIAL_PLAYLISTS);
  const [artists] = useState<IndieArtist[]>(INITIAL_ARTISTS);
  const [friendActivities, setFriendActivities] = useState<FriendActivity[]>(INITIAL_FRIEND_ACTIVITY);
  const [reviews] = useState(INITIAL_REVIEWS);

  // Playback state
  const [currentTrack, setCurrentTrack] = useState<IndieTrack | null>(INITIAL_TRACKS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(INITIAL_TRACKS[0].duration);
  const [volume, setVolume] = useState(0.75);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [queue, setQueue] = useState<IndieTrack[]>([]);
  const [likedTrackIds, setLikedTrackIds] = useState<Set<string>>(
    new Set(['trk-1', 'trk-2', 'trk-4'])
  );

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

  // Sync crossfade duration to audio engine on load & change
  useEffect(() => {
    audioEngine.setCrossfadeDuration(playbackSettings.crossfadeDuration);
  }, [playbackSettings.crossfadeDuration]);

  const handleUpdateSettings = (newSettings: PlaybackSettings) => {
    setPlaybackSettings(newSettings);
    savePlaybackSettings(newSettings);
    audioEngine.setCrossfadeDuration(newSettings.crossfadeDuration);
    showToast(
      newSettings.crossfadeDuration === 0
        ? 'Crossfade disabled'
        : `Crossfade set to ${newSettings.crossfadeDuration}s smooth transition 🎧`
    );
  };

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Keep references for callbacks
  const queueRef = useRef(queue);
  queueRef.current = queue;
  const currentTrackRef = useRef(currentTrack);
  currentTrackRef.current = currentTrack;
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;
  const repeatModeRef = useRef(repeatMode);
  repeatModeRef.current = repeatMode;
  const isShuffleRef = useRef(isShuffle);
  isShuffleRef.current = isShuffle;

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

    // Check URL parameters for shared links (?track=... or ?playlist=... or ?autostart=1)
    const params = new URLSearchParams(window.location.search);
    const sharedTrackId = params.get('track');
    const sharedPlaylistId = params.get('playlist');
    const sharedPayloadStr = params.get('s');

    if (sharedPayloadStr) {
      const decoded = decodeSharePayload(sharedPayloadStr);
      if (decoded) {
        showToast(`Opened shared indie gem: "${decoded.title}" by ${decoded.artist}`);
      }
    }

    if (sharedTrackId) {
      const found = INITIAL_TRACKS.find((t) => t.id === sharedTrackId);
      if (found) {
        setCurrentTrack(found);
        setDuration(found.duration);
      }
    } else if (sharedPlaylistId) {
      const foundPl = INITIAL_PLAYLISTS.find((p) => p.id === sharedPlaylistId);
      if (foundPl) {
        setSelectedPlaylistId(foundPl.id);
      }
    }

    const tabParam = params.get('tab');
    if (tabParam === 'discover') {
      setActiveTab('discover');
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
    // If track is from online search or external, ensure it is added to track catalog
    setTracks((prev) => {
      if (!prev.some((t) => t.id === track.id)) {
        return [track, ...prev];
      }
      return prev;
    });
    setCurrentTrack(track);
    setDuration(track.duration);
    setCurrentTime(0);
    setIsPlaying(true);
    setSeekRequest(null);

    // FullSongPlayer acts as the master playback coordinator:
    // It plays the high-fidelity video/audio stream, auto-resolves un-indexed songs,
    // and immediately falls back to Web Audio / preview if YouTube embed is unavailable
    audioEngine.stop();
    showToast(`Now playing: "${track.title}" 🎵`);
  };

  const handleAddTrackToLibrary = (track: IndieTrack) => {
    setTracks((prev) => {
      if (prev.some((t) => t.id === track.id)) return prev;
      return [track, ...prev];
    });
    showToast(`Added "${track.title}" by ${track.artist} to your Library! 🎵`);
  };

  const handleAddTrackFromAnywhere = (track: IndieTrack, autoPlay = false) => {
    setTracks((prev) => {
      if (prev.some((t) => t.id === track.id)) return prev;
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
      if (!currentTrack.youtubeId) {
        audioEngine.resume();
      }
    }
  };

  const handleSeek = (seconds: number) => {
    setCurrentTime(seconds);
    if (currentTrack?.youtubeId) {
      setSeekRequest(seconds);
      setTimeout(() => setSeekRequest(null), 300);
    } else {
      audioEngine.seek(seconds);
    }
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
    if (repeatModeRef.current === 'one' && currentTrackRef.current) {
      handlePlayTrack(currentTrackRef.current);
      return;
    }

    // Check queue first
    if (queueRef.current.length > 0) {
      const nextTrack = queueRef.current[0];
      setQueue((prev) => prev.slice(1));
      handlePlayTrack(nextTrack);
      return;
    }

    // Otherwise next in current track list
    const currentList = tracksRef.current;
    if (currentList.length === 0) return;

    if (isShuffleRef.current) {
      const randomIdx = Math.floor(Math.random() * currentList.length);
      handlePlayTrack(currentList[randomIdx]);
      return;
    }

    const currentIdx = currentList.findIndex((t) => t.id === currentTrackRef.current?.id);
    const nextIdx = (currentIdx + 1) % currentList.length;
    handlePlayTrack(currentList[nextIdx]);
  };

  const handlePreviousTrack = () => {
    if (currentTime > 4 && currentTrack) {
      handleSeek(0);
      return;
    }
    const currentList = tracks;
    const currentIdx = currentList.findIndex((t) => t.id === currentTrack?.id);
    const prevIdx = (currentIdx - 1 + currentList.length) % currentList.length;
    handlePlayTrack(currentList[prevIdx]);
  };

  const handleToggleLike = (trackId: string) => {
    setLikedTrackIds((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) {
        next.delete(trackId);
        showToast('Removed from Liked Songs');
      } else {
        next.add(trackId);
        showToast('Saved to your Liked Songs ❤️');
      }
      return next;
    });
  };

  const handleAddToQueue = (track: IndieTrack) => {
    setQueue((prev) => [...prev, track]);
    showToast(`Added "${track.title}" to play queue`);
  };

  const handlePlayPlaylist = (playlist: Playlist, shuffle = false) => {
    const plTracks = playlist.trackIds
      .map((id) => tracks.find((t) => t.id === id))
      .filter((t): t is IndieTrack => !!t);

    if (plTracks.length === 0) return;

    const listToPlay = shuffle ? [...plTracks].sort(() => Math.random() - 0.5) : plTracks;
    const firstTrack = listToPlay[0];
    const rest = listToPlay.slice(1);

    setQueue(rest);
    handlePlayTrack(firstTrack);
    showToast(`Playing "${playlist.title}"`);
  };

  // Playlist mutations
  const handleCreatePlaylist = (newPl: Playlist) => {
    setPlaylists((prev) => [newPl, ...prev]);
    setSelectedPlaylistId(newPl.id);
    setSelectedArtistId(null);
    showToast(`Created playlist "${newPl.title}"`);
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

  // Liked tracks virtual playlist
  const likedPlaylist: Playlist = {
    id: 'pl-liked',
    title: 'Liked Songs',
    description: 'Your private collection of discovered underground treasures.',
    coverGradient: 'from-indigo-600 via-purple-700 to-rose-600',
    coverEmoji: '❤️',
    trackIds: Array.from(likedTrackIds),
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

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0d0d11] text-[#f3f3f3]">
      {/* Toast alert */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#1ed760] text-black font-bold text-xs md:text-sm px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2 animate-bounce"
        >
          <span>✨</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Android Mobile Top App Bar (Native Android feel on phone) */}
      <header className="md:hidden flex items-center justify-between px-3.5 py-2.5 bg-[#0a0a0d] border-b border-white/10 shrink-0 select-none z-30">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#1ed760] to-emerald-400 flex items-center justify-center text-black font-extrabold shadow-sm">
            <Radio className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-sm tracking-tight text-white">IndieWave</span>
          <span className="text-[9px] font-bold uppercase tracking-wider bg-[#1ed760]/20 text-[#1ed760] px-1.5 py-0.2 rounded-full border border-[#1ed760]/30 font-mono">
            Android
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setAndroidModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-[#1ed760] to-emerald-400 text-black font-extrabold text-[11px] shadow-sm active:scale-95 transition-all"
            title="Install Android App"
          >
            <Smartphone className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Install</span>
          </button>

          <button
            onClick={() => handleSelectNavTab('search')}
            className="p-1.5 text-neutral-300 hover:text-white rounded-full bg-white/5 active:scale-95 transition-all"
            aria-label="Search tracks and artists"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            onClick={() => setSettingsModalOpen(true)}
            className="p-1.5 text-neutral-300 hover:text-white rounded-full bg-white/5 active:scale-95 transition-all"
            aria-label="Playback Settings"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main App Workspace */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
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
        />

        {/* Central Content Area */}
        <main className="flex-1 overflow-y-auto px-3 sm:px-4 md:px-8 py-4 sm:py-6 relative pb-16 md:pb-6">
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
            />
          ) : activeTab === 'liked' ? (
            <PlaylistView
              playlist={likedPlaylist}
              allTracks={tracks}
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
            />
          ) : activeTab === 'downloads' ? (
            <PlaylistView
              playlist={downloadedPlaylist}
              allTracks={tracks}
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
            />
          ) : activeTab === 'library' ? (
            <LibraryView
              playlists={playlists}
              allTracks={tracks}
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
            />
          ) : selectedPlaylistId && activePlaylist ? (
            <PlaylistView
              playlist={activePlaylist}
              allTracks={tracks}
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
            />
          ) : activeTab === 'discover' ? (
            <DiscoverView
              tracks={tracks}
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
            />
          ) : activeTab === 'search' ? (
            <SearchView
              tracks={tracks}
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
            />
          ) : activeTab === 'jam' ? (
            <SocialJamView
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              onPlayTrack={handlePlayTrack}
              availableTracks={tracks}
              onShareTrack={handleOpenShareTrack}
            />
          ) : (
            <HomeView
              tracks={tracks}
              playlists={playlists}
              artists={artists}
              reviews={reviews}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              onPlayTrack={handlePlayTrack}
              onSelectPlaylist={handleSelectPlaylist}
              onSelectArtist={handleSelectArtist}
              onGoToDiscover={() => handleSelectNavTab('discover')}
              onOpenAndroidApp={() => setAndroidModalOpen(true)}
            />
          )}
        </main>

        {/* Right Sidebar: Social Friend Activity */}
        <FriendActivityBar
          friendActivities={friendActivities}
          isOpen={friendActivityOpen}
          onToggle={() => setFriendActivityOpen(!friendActivityOpen)}
          onListenAlong={handleListenAlong}
          onShareWithFriend={(friendName) => {
            if (currentTrack) {
              handleOpenShareTrack(currentTrack);
            } else {
              showToast(`Select a track to share with ${friendName}`);
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
      />

      {/* Persistent Native Android Bottom Navigation Bar */}
      <AndroidBottomNav
        activeTab={
          activeTab === 'discover'
            ? 'discover'
            : activeTab === 'library' || selectedPlaylistId || activeTab === 'liked'
            ? 'playlists'
            : 'home'
        }
        onSelectTab={(tab) => {
          if (tab === 'home') handleSelectNavTab('home');
          else if (tab === 'discover') handleSelectNavTab('discover');
          else if (tab === 'playlists') {
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
        isPlaying={isPlaying}
        volume={volume}
        isMuted={isMuted}
        seekTime={seekRequest}
        crossfadeDuration={playbackSettings.crossfadeDuration}
        onTrackResolved={(trackId, ytId) => {
          setTracks((prev) =>
            prev.map((t) => (t.id === trackId ? { ...t, youtubeId: ytId, fullSongAvailable: true } : t))
          );
          if (currentTrack?.id === trackId) {
            setCurrentTrack((prev) => (prev ? { ...prev, youtubeId: ytId, fullSongAvailable: true } : null));
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
      />

      <LyricsDrawer
        isOpen={lyricsDrawerOpen}
        onClose={() => setLyricsDrawerOpen(false)}
        track={currentTrack}
        isLiked={currentTrack ? likedTrackIds.has(currentTrack.id) : false}
        onToggleLike={handleToggleLike}
      />

      <QueueDrawer
        isOpen={queueDrawerOpen}
        onClose={() => setQueueDrawerOpen(false)}
        currentTrack={currentTrack}
        queue={queue}
        onPlayTrack={handlePlayTrack}
        onRemoveFromQueue={(idx) => setQueue((prev) => prev.filter((_, i) => i !== idx))}
        onClearQueue={() => setQueue([])}
      />

      {/* Playback & Audio Settings Modal */}
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        settings={playbackSettings}
        onUpdateSettings={handleUpdateSettings}
      />

      {/* Android App Install & WebAPK Modal */}
      <AndroidInstallModal
        isOpen={androidModalOpen}
        onClose={() => setAndroidModalOpen(false)}
      />
    </div>
  );
}
