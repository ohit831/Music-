/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Play,
  Pause,
  Heart,
  Plus,
  RefreshCw,
  ThumbsDown,
  Compass,
  Radio,
  Sliders,
  Check,
  Flame,
  Globe2,
  Headphones,
  Music,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Info,
  Calendar,
  Layers,
  Zap,
} from 'lucide-react';
import { IndieTrack, IndieArtist, Playlist, formatDuration, formatListenersCount } from '../utils/musicDiscovery';
import {
  listeningHistoryService,
  PlayHistoryItem,
  SkippedTrackItem,
  UserTasteProfile,
} from '../services/listeningHistoryService';
import {
  generateAICuration,
  AICurationResult,
  AICuratedTrackRecommendation,
  EmergingArtistRecommendation,
  RecommendedMicroGenre,
} from '../services/aiCuratorService';

interface AICuratorViewProps {
  tracks: IndieTrack[];
  artists: IndieArtist[];
  currentTrack: IndieTrack | null;
  isPlaying: boolean;
  likedTrackIds: Set<string>;
  onPlayTrack: (track: IndieTrack) => void;
  onPauseTrack: () => void;
  onToggleLike: (trackId: string) => void;
  onSelectArtist: (artistId: string) => void;
  onSaveCuratedPlaylist: (title: string, description: string, trackIds: string[]) => void;
  onAddToQueue: (track: IndieTrack) => void;
  onShowToast: (msg: string) => void;
}

export const AICuratorView: React.FC<AICuratorViewProps> = ({
  tracks,
  artists,
  currentTrack,
  isPlaying,
  likedTrackIds,
  onPlayTrack,
  onPauseTrack,
  onToggleLike,
  onSelectArtist,
  onSaveCuratedPlaylist,
  onAddToQueue,
  onShowToast,
}) => {
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly'>('daily');
  const [selectedVibe, setSelectedVibe] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [curation, setCuration] = useState<AICurationResult | null>(null);
  const [tasteProfile, setTasteProfile] = useState<UserTasteProfile | null>(null);
  const [showLearningPanel, setShowLearningPanel] = useState<boolean>(false);
  const [savedPlaylistSuccess, setSavedPlaylistSuccess] = useState<boolean>(false);

  // Filter full liked track objects
  const likedTracks = tracks.filter((t) => likedTrackIds.has(t.id));

  // Compute profile and generate initial curation on mount
  useEffect(() => {
    const profile = listeningHistoryService.getTasteProfile(likedTracks);
    setTasteProfile(profile);

    handleGenerateCuration(timeframe, selectedVibe);

    const unsubscribe = listeningHistoryService.subscribe(() => {
      const updatedProfile = listeningHistoryService.getTasteProfile(likedTracks);
      setTasteProfile(updatedProfile);
    });

    return unsubscribe;
  }, [likedTrackIds]);

  const handleGenerateCuration = async (tf: 'daily' | 'weekly', vibe: string) => {
    setIsLoading(true);
    try {
      const result = await generateAICuration({
        timeframe: tf,
        vibe,
        allTracks: tracks,
        allArtists: artists,
        likedTracks,
      });
      setCuration(result);
    } catch (err) {
      console.error('Failed to generate AI curation', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayAll = () => {
    if (!curation || curation.recommendedTracks.length === 0) return;
    const first = curation.recommendedTracks[0].track;
    if (first) {
      onPlayTrack(first);
      // Queue up the rest
      curation.recommendedTracks.slice(1).forEach((item) => {
        if (item.track) onAddToQueue(item.track);
      });
      onShowToast(`Playing "${curation.playlistTitle}" 🎵 (10 tracks queued)`);
    }
  };

  const handleSaveToLibrary = () => {
    if (!curation) return;
    const trackIds = curation.recommendedTracks.map((item) => item.track?.id || item.id);
    onSaveCuratedPlaylist(curation.playlistTitle, curation.playlistDescription, trackIds);
    setSavedPlaylistSuccess(true);
    onShowToast(`Saved "${curation.playlistTitle}" to Your Library! 📚`);
    setTimeout(() => setSavedPlaylistSuccess(false), 3000);
  };

  const handleTeachSkip = (rec: AICuratedTrackRecommendation) => {
    if (!rec.track) return;
    listeningHistoryService.recordSkip(rec.track, 5, 'disliked');
    onShowToast(`AI Learned: Will avoid tracks like "${rec.title}" by ${rec.artist} in future curations! 🧠`);

    // Remove this track from active view
    if (curation) {
      setCuration({
        ...curation,
        recommendedTracks: curation.recommendedTracks.filter((t) => t.id !== rec.id),
      });
    }
  };

  const handleUndoSkip = (trackId: string) => {
    listeningHistoryService.removeSkip(trackId);
    onShowToast('Removed from skipped list.');
  };

  const handleClearAllSkips = () => {
    listeningHistoryService.clearSkipped();
    onShowToast('Cleared all recorded skips.');
  };

  const skippedItems = listeningHistoryService.getSkipped();

  return (
    <div className="space-y-8 pb-16 animate-fade-in text-white">
      {/* Hero AI Curator Header */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-purple-950/70 via-[#12121c] to-emerald-950/50 border border-purple-500/30 p-6 md:p-8 shadow-2xl">
        {/* Ambient glow effects */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-[#1ed760]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/20 to-[#1ed760]/20 border border-purple-500/40 text-purple-200 text-xs font-bold tracking-wide">
              <Sparkles className="w-4 h-4 text-[#1ed760] animate-pulse" />
              <span>AI-POWERED MUSIC CURATOR • GEMINI 3.8</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#1ed760]" />
              <span className="text-[10px] text-emerald-300 font-mono">ACTIVE LEARNING</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
              Personalized Indie Dispatch
            </h1>

            <p className="text-neutral-300 text-sm md:text-base leading-relaxed">
              Analyzes your listening history, completed songs, liked tracks, and{' '}
              <strong className="text-white">skipped styles</strong> to scout emerging underground artists before the mainstream finds them.
            </p>

            {/* User Taste Profile Badges */}
            {tasteProfile && (
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <span className="px-3 py-1 rounded-full bg-white/10 text-white font-bold border border-white/10 flex items-center gap-1.5">
                  <Headphones className="w-3.5 h-3.5 text-[#1ed760]" />
                  <span>{tasteProfile.personaTitle}</span>
                </span>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-[#1ed760] border border-emerald-500/30 font-mono text-[11px]">
                  {Math.round(tasteProfile.obscurityAffinity * 100)}% Obscurity Affinity
                </span>
                <span className="px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30 font-mono text-[11px]">
                  {tasteProfile.topGenres[0]?.genre || 'Dream Pop'}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-mono text-[11px]">
                  {tasteProfile.totalSkips} Negative Filters
                </span>
              </div>
            )}
          </div>

          {/* Quick Refresh / Action Box */}
          <div className="w-full md:w-auto flex flex-col gap-2.5 shrink-0">
            <button
              onClick={() => handleGenerateCuration(timeframe, selectedVibe)}
              disabled={isLoading}
              className="w-full md:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#1ed760] via-emerald-400 to-[#1db954] hover:opacity-95 text-black font-black text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-[#1ed760]/20 active:scale-95 transition-all cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'AI Analyzing Taste...' : 'Generate Fresh AI Mix'}</span>
            </button>

            <button
              onClick={() => setShowLearningPanel(!showLearningPanel)}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/10 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Info className="w-3.5 h-3.5 text-purple-400" />
              <span>{showLearningPanel ? 'Hide AI Learning Insights' : 'View AI Learning Insights'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Control Switcher: Daily vs. Weekly + Vibe Chips */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-2 bg-[#121217] border border-white/10 rounded-2xl">
        {/* Daily vs Weekly Toggle */}
        <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/5">
          <button
            onClick={() => {
              setTimeframe('daily');
              handleGenerateCuration('daily', selectedVibe);
            }}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              timeframe === 'daily'
                ? 'bg-[#1ed760] text-black shadow-md'
                : 'text-neutral-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Daily Radar (Today's Gems)</span>
          </button>
          <button
            onClick={() => {
              setTimeframe('weekly');
              handleGenerateCuration('weekly', selectedVibe);
            }}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              timeframe === 'weekly'
                ? 'bg-[#1ed760] text-black shadow-md'
                : 'text-neutral-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Weekly Deep Dive (Broad Mix)</span>
          </button>
        </div>

        {/* Vibe Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {[
            { id: 'all', label: 'All Indie Vibes' },
            { id: 'emerging_obscure', label: 'Hyper-Obscure (<5k plays) 📡' },
            { id: 'chill_bedroom', label: 'Bedroom & Dream Pop 🌙' },
            { id: 'kannada_fusion', label: 'Kannada Indie & Folk 🐘' },
            { id: 'indie_rock', label: 'Raw Alt & Math Rock ⚡' },
          ].map((vibe) => (
            <button
              key={vibe.id}
              onClick={() => {
                setSelectedVibe(vibe.id);
                handleGenerateCuration(timeframe, vibe.id);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedVibe === vibe.id
                  ? 'bg-purple-600 text-white font-bold border border-purple-400 shadow-sm'
                  : 'bg-white/5 text-neutral-300 hover:text-white hover:bg-white/10 border border-white/5'
              }`}
            >
              {vibe.label}
            </button>
          ))}
        </div>
      </div>

      {/* AI Learning & Transparency Panel (Expandable) */}
      {showLearningPanel && tasteProfile && (
        <div className="p-5 rounded-2xl bg-[#14141e] border border-purple-500/30 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#1ed760]" />
              <h3 className="font-bold text-white text-sm">How the AI Music Curator Learns Your Taste</h3>
            </div>
            <span className="text-[11px] text-neutral-400 font-mono">
              {tasteProfile.totalPlays} plays • {tasteProfile.totalLikes} likes • {tasteProfile.totalSkips} skips
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {/* Analyzed Top Genres */}
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
              <p className="font-bold text-emerald-300 uppercase tracking-wider text-[10px]">
                Top Affinities (+ Weight)
              </p>
              <div className="space-y-1.5">
                {tasteProfile.topGenres.map((g, idx) => (
                  <div key={idx} className="flex items-center justify-between text-neutral-300">
                    <span>{g.genre}</span>
                    <span className="font-mono text-[10px] text-neutral-400">{g.percentage}% match</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sonic Parameters */}
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
              <p className="font-bold text-purple-300 uppercase tracking-wider text-[10px]">
                Sonic Persona Parameters
              </p>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-neutral-400">Obscurity vs Hit</span>
                    <span className="text-[#1ed760] font-mono">
                      {Math.round(tasteProfile.obscurityAffinity * 100)}% Underground
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-[#1ed760] rounded-full"
                      style={{ width: `${tasteProfile.obscurityAffinity * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-neutral-400">Acoustic & Melancholy</span>
                    <span className="text-purple-300 font-mono">
                      {Math.round(tasteProfile.averageMelancholy * 100)}% Twilight
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full"
                      style={{ width: `${tasteProfile.averageMelancholy * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Skipped Negative Filters */}
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-bold text-rose-300 uppercase tracking-wider text-[10px]">
                  Negative Filters (Skipped)
                </p>
                {skippedItems.length > 0 && (
                  <button
                    onClick={handleClearAllSkips}
                    className="text-[10px] text-neutral-400 hover:text-white underline cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {skippedItems.length === 0 ? (
                <p className="text-neutral-400 text-[11px] italic">
                  No skips recorded. Songs you skip early will automatically appear here as negative signals.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                  {skippedItems.slice(0, 5).map((s, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-1.5 rounded bg-rose-500/10 border border-rose-500/20 text-[11px]"
                    >
                      <span className="truncate pr-2 text-rose-200">
                        {s.title} ({s.genre})
                      </span>
                      <button
                        onClick={() => handleUndoSkip(s.trackId)}
                        className="text-[10px] text-neutral-400 hover:text-white shrink-0 cursor-pointer"
                        title="Remove skip"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Curated Playlist Showcase */}
      {curation && (
        <div className="space-y-6">
          {/* Playlist Card Header */}
          <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-emerald-950/40 via-[#151520] to-purple-950/30 border border-white/10 shadow-xl space-y-5">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#1ed760] text-black font-mono">
                    {curation.timeframe === 'daily' ? 'DAILY RADAR' : 'WEEKLY DISPATCH'}
                  </span>
                  <span className="text-xs text-neutral-400">Generated {curation.generatedAt}</span>
                  {curation.isAIPowered && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
                      Gemini 3.8 Flash
                    </span>
                  )}
                </div>

                <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                  {curation.playlistTitle}
                </h2>
                <p className="text-sm text-neutral-300 max-w-3xl leading-relaxed">
                  {curation.playlistDescription}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 w-full md:w-auto pt-2 md:pt-0">
                <button
                  onClick={handlePlayAll}
                  className="flex-1 md:flex-none px-6 py-3 rounded-full bg-[#1ed760] hover:bg-[#1db954] text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#1ed760]/20 active:scale-95 transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-black" />
                  <span>Play AI Mix ({curation.recommendedTracks.length})</span>
                </button>

                <button
                  onClick={handleSaveToLibrary}
                  disabled={savedPlaylistSuccess}
                  className={`px-4 py-3 rounded-full font-bold text-xs flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                    savedPlaylistSuccess
                      ? 'bg-emerald-500 text-black border-emerald-400 font-extrabold'
                      : 'bg-white/10 hover:bg-white/15 text-white border-white/10'
                  }`}
                >
                  {savedPlaylistSuccess ? <Check className="w-4 h-4 stroke-[3]" /> : <Plus className="w-4 h-4" />}
                  <span>{savedPlaylistSuccess ? 'Saved to Library!' : 'Save Playlist'}</span>
                </button>
              </div>
            </div>

            {/* AI Curator Note / Editorial Reasoning */}
            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/5 flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0 mt-0.5 border border-purple-500/30">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-purple-200 uppercase tracking-wider">
                  Curator Note & Negative Filter Reasoning:
                </p>
                <p className="text-xs md:text-sm text-neutral-300 italic leading-relaxed">
                  "{curation.curatorNote}"
                </p>
                {curation.tasteAnalysis?.skippedPatternSummary && (
                  <p className="text-[11px] text-[#1ed760] pt-1">
                    🛡️ <strong>Exclusion Rule Applied:</strong> {curation.tasteAnalysis.skippedPatternSummary}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Curated Track List */}
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white flex items-center justify-between">
              <span>Curated Tracks for You</span>
              <span className="text-xs text-neutral-400 font-normal">
                Featuring emerging artists with low listener counts
              </span>
            </h3>

            <div className="bg-[#121217] rounded-2xl border border-white/10 divide-y divide-white/5 overflow-hidden">
              {curation.recommendedTracks.map((rec, index) => {
                const track = rec.track;
                const isCurrentPlaying = currentTrack?.id === track?.id && isPlaying;
                const isLiked = track ? likedTrackIds.has(track.id) : false;

                return (
                  <div
                    key={rec.id || index}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:px-4 sm:py-3 hover:bg-white/[0.04] transition-colors gap-3 ${
                      isCurrentPlaying ? 'bg-[#1ed760]/10 border-l-4 border-l-[#1ed760]' : ''
                    }`}
                  >
                    {/* Track info & Play */}
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <span className="w-5 text-center text-xs font-mono text-neutral-500 shrink-0">
                        {index + 1}
                      </span>

                      {/* Cover & Play button overlay */}
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 group shadow-md border border-white/5">
                        <img
                          src={track?.coverUrl || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300'}
                          alt={rec.title}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => {
                            if (track) {
                              if (isCurrentPlaying) onPauseTrack();
                              else onPlayTrack(track);
                            }
                          }}
                          className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          aria-label={`Play ${rec.title}`}
                        >
                          {isCurrentPlaying ? (
                            <Pause className="w-5 h-5 fill-white text-white" />
                          ) : (
                            <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                          )}
                        </button>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p
                            onClick={() => track && onPlayTrack(track)}
                            className={`font-bold text-sm truncate cursor-pointer hover:underline ${
                              isCurrentPlaying ? 'text-[#1ed760]' : 'text-white'
                            }`}
                          >
                            {rec.title}
                          </p>
                          {rec.monthlyListeners < 5000 && (
                            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-emerald-500/20 text-[#1ed760] border border-[#1ed760]/30 font-mono">
                              Underground Gem
                            </span>
                          )}
                        </div>

                        <p
                          onClick={() => track?.artistId && onSelectArtist(track.artistId)}
                          className="text-xs text-neutral-400 hover:text-white truncate cursor-pointer transition-colors"
                        >
                          {rec.artist}
                        </p>

                        {/* Why recommended rationale badge */}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[11px] text-purple-300 font-medium">
                            💡 {rec.whyRecommended}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Metadata & Actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-white/5">
                      <div className="text-left sm:text-right">
                        <span className="text-xs font-mono text-neutral-400 block">
                          {formatListenersCount(rec.monthlyListeners)} listeners
                        </span>
                        <span className="text-[10px] text-neutral-500 font-mono">
                          {track ? formatDuration(track.duration) : '3:20'}
                        </span>
                      </div>

                      {/* Quick action buttons */}
                      <div className="flex items-center gap-1">
                        {/* Like Button */}
                        <button
                          onClick={() => track && onToggleLike(track.id)}
                          className={`p-2 rounded-lg transition-colors cursor-pointer ${
                            isLiked ? 'text-[#1ed760] bg-[#1ed760]/10' : 'text-neutral-400 hover:text-white hover:bg-white/10'
                          }`}
                          title={isLiked ? 'Unlike track' : 'Like track (Feeds AI)'}
                        >
                          <Heart className={`w-4 h-4 ${isLiked ? 'fill-[#1ed760]' : ''}`} />
                        </button>

                        {/* Teach AI: Skip / Dislike */}
                        <button
                          onClick={() => handleTeachSkip(rec)}
                          className="p-2 text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Teach AI: Skip this style next time"
                        >
                          <ThumbsDown className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Similar Emerging Artists Section */}
          {curation.similarArtists && curation.similarArtists.length > 0 && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">Emerging Indie Artists Radar</h3>
                  <p className="text-xs text-neutral-400">
                    Handpicked rising artists that share sonic DNA with your liked songs
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {curation.similarArtists.map((artist) => {
                  const catalogArtist = artists.find((a) => a.id === artist.id || a.name === artist.name);
                  const matchedTrack = tracks.find((t) => t.artist.toLowerCase() === artist.name.toLowerCase());

                  return (
                    <div
                      key={artist.id}
                      className="p-4 rounded-2xl bg-[#14141c] border border-white/10 hover:border-purple-500/40 transition-all space-y-3 group shadow-md"
                    >
                      <div className="relative aspect-square rounded-xl overflow-hidden bg-white/5">
                        <img
                          src={
                            artist.coverUrl ||
                            catalogArtist?.coverUrl ||
                            'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400'
                          }
                          alt={artist.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute top-2 right-2 bg-black/75 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-mono text-[#1ed760] font-bold border border-white/10">
                          {formatListenersCount(artist.monthlyListeners)}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <h4 className="font-extrabold text-sm text-white truncate">{artist.name}</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono inline-block">
                          {artist.genre}
                        </span>
                        <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed pt-1">
                          {artist.bio}
                        </p>
                        <p className="text-[10px] text-emerald-400 font-medium pt-0.5">
                          ✨ Similar to: {artist.similarTo}
                        </p>
                      </div>

                      <div className="pt-1 flex items-center gap-2">
                        {matchedTrack && (
                          <button
                            onClick={() => onPlayTrack(matchedTrack)}
                            className="flex-1 py-1.5 px-2.5 rounded-xl bg-white/10 hover:bg-[#1ed760] hover:text-black font-extrabold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Play Track</span>
                          </button>
                        )}
                        {catalogArtist && (
                          <button
                            onClick={() => onSelectArtist(catalogArtist.id)}
                            className="py-1.5 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-semibold transition-colors cursor-pointer"
                            title="View Artist Discography"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Micro-Genres Exploration Section */}
          {curation.recommendedGenres && curation.recommendedGenres.length > 0 && (
            <div className="space-y-4 pt-4">
              <div>
                <h3 className="text-xl font-bold text-white">Emerging Micro-Genres to Explore</h3>
                <p className="text-xs text-neutral-400">
                  Sub-genres tailored to your emotional acoustic and energy profile
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {curation.recommendedGenres.map((mg, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-gradient-to-br from-white/[0.04] to-transparent border border-white/10 space-y-2 hover:border-[#1ed760]/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-[#1ed760] uppercase tracking-wide">
                        {mg.genre}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-neutral-300 font-mono">
                        {mg.moodTag}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-300 leading-relaxed">{mg.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
