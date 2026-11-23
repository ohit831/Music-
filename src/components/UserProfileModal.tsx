/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Dumbbell,
  Flame,
  Clock,
  LogOut,
  Check,
  ShieldCheck,
  Users,
  Download,
  Mail,
  Trash2,
  MonitorSmartphone,
  Cloud,
  Sparkles,
  Activity,
} from 'lucide-react';
import {
  UserProfile,
  GYM_VIBES,
  authService,
} from '../services/authService';
import {
  buildOwnerEmailReportUrl,
  formatLoginAuditCsv,
  isOwnerUser,
  OWNER_EMAIL,
  SanitizedLoginEvent,
} from '../utils/loginAudit';
import { listeningHistoryService } from '../services/listeningHistoryService';
import { buildVibeHistorySummary } from '../utils/vibeHistory';

interface UserProfileModalProps {
  isOpen: boolean;
  user: UserProfile;
  likedTrackCount: number;
  downloadedTrackCount: number;
  initialSection?: 'overview' | 'owner_logins';
  onClose: () => void;
  onSignOut: () => void;
  onUpdateUser: (updated: UserProfile) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  user,
  likedTrackCount,
  downloadedTrackCount,
  initialSection = 'overview',
  onClose,
  onSignOut,
  onUpdateUser,
}) => {
  const [isEditingVibe, setIsEditingVibe] = useState(false);
  const [section, setSection] = useState<'overview' | 'owner_logins'>(initialSection);
  const [loginEvents, setLoginEvents] = useState<SanitizedLoginEvent[]>([]);
  const [cloudConnected, setCloudConnected] = useState(false);
  const [historyTick, setHistoryTick] = useState(0);

  const canViewOwnerLogins = isOwnerUser(user.email, user.isEmailVerified ?? true);

  useEffect(() => {
    if (isOpen) {
      setSection(canViewOwnerLogins ? initialSection : 'overview');
      setHistoryTick((t) => t + 1);
    }
  }, [isOpen, initialSection, canViewOwnerLogins]);

  useEffect(() => {
    if (!isOpen) return;
    return listeningHistoryService.subscribe(() => {
      setHistoryTick((t) => t + 1);
    });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !canViewOwnerLogins) return;
    const unsub = authService.subscribeOwnerLoginEvents((events, isCloud) => {
      setLoginEvents(events);
      setCloudConnected(isCloud);
    });
    return unsub;
  }, [isOpen, canViewOwnerLogins, user.email]);

  const vibeHistory = useMemo(() => {
    if (!isOpen) {
      return buildVibeHistorySummary([], []);
    }
    return buildVibeHistorySummary(
      listeningHistoryService.getHistory(),
      listeningHistoryService.getVibeMatchHistory()
    );
  }, [isOpen, historyTick]);

  if (!isOpen) return null;

  const handleSelectVibe = (vibe: UserProfile['gymVibe']) => {
    const updated = authService.updateProfile({ gymVibe: vibe });
    if (updated) {
      onUpdateUser(updated);
    }
    setIsEditingVibe(false);
  };

  const handleDownloadCsv = () => {
    const csv = formatLoginAuditCsv(loginEvents);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `apna-music-logins-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg bg-[#121217] border border-white/10 rounded-3xl shadow-2xl shadow-emerald-950/60 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Header Card */}
        <div className="relative p-6 bg-gradient-to-b from-emerald-950/70 via-[#181822] to-[#121217] border-b border-white/5">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-[#1ed760] shadow-lg shadow-[#1ed760]/30"
              />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#1ed760] rounded-full flex items-center justify-center text-black shadow-md">
                <Dumbbell className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-extrabold text-white tracking-tight truncate">{user.name}</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#1ed760] text-black px-2 py-0.5 rounded-full font-mono">
                  PRO
                </span>
                {canViewOwnerLogins && (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30 font-mono">
                    SITE OWNER
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400 mt-0.5 truncate">{user.email}</p>
              <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px] text-emerald-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Apna Music Member since {user.joinedDate}</span>
              </div>
            </div>
          </div>

          {/* Owner Section Switcher */}
          {canViewOwnerLogins && (
            <div className="grid grid-cols-2 p-1 bg-black/40 rounded-xl mt-4 border border-white/5">
              <button
                type="button"
                onClick={() => setSection('overview')}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  section === 'overview'
                    ? 'bg-white text-black shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                My Profile & Stats
              </button>
              <button
                type="button"
                onClick={() => setSection('owner_logins')}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  section === 'owner_logins'
                    ? 'bg-[#1ed760] text-black shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Visitor Logins ({loginEvents.length})</span>
              </button>
            </div>
          )}
        </div>

        {/* Body Content */}
        {section === 'owner_logins' && canViewOwnerLogins ? (
          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            {/* Privacy Guarantee Banner */}
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-[#1ed760]/30 space-y-1.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-extrabold text-[#1ed760] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Zero Passwords Stored • Privacy Safe
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/40 text-neutral-300 border border-white/10 flex items-center gap-1">
                  <Cloud className={`w-3 h-3 ${cloudConnected ? 'text-[#1ed760]' : 'text-amber-400'}`} />
                  {cloudConnected ? 'Live Cloud Sync' : 'Local Session Log'}
                </span>
              </div>
              <p className="text-[11px] text-neutral-300 leading-relaxed">
                Showing non-sensitive website logins for owner <strong className="text-white">{OWNER_EMAIL}</strong>.
                Passwords, hashes, and credentials are strictly excluded.
                {!cloudConnected && ' Sign in with Google to receive live cloud logins across all visitor devices.'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href={buildOwnerEmailReportUrl(loginEvents)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1ed760] hover:bg-[#1db954] text-black font-extrabold text-xs transition-all shadow-sm"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email Summary to Owner</span>
              </a>

              <button
                type="button"
                onClick={handleDownloadCsv}
                disabled={loginEvents.length === 0}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs border border-white/10 transition-colors cursor-pointer disabled:opacity-40"
              >
                <Download className="w-3.5 h-3.5 text-[#1ed760]" />
                <span>Export CSV</span>
              </button>

              {loginEvents.length > 0 && (
                <button
                  type="button"
                  onClick={() => authService.clearLocalAuditLogs()}
                  className="ml-auto flex items-center gap-1 px-2.5 py-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-neutral-400 hover:text-rose-300 text-xs transition-colors cursor-pointer"
                  title="Clear local browser login cache"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Local</span>
                </button>
              )}
            </div>

            {/* Visitor Logins List */}
            {loginEvents.length === 0 ? (
              <div className="py-10 text-center rounded-2xl bg-white/5 border border-dashed border-white/10 text-neutral-400 space-y-1">
                <Users className="w-8 h-8 mx-auto opacity-40 text-[#1ed760]" />
                <p className="text-sm font-semibold text-white">No visitor logins recorded yet</p>
                <p className="text-xs text-neutral-400">
                  When visitors sign in to Apna Music, their name, email, device & timestamp appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {loginEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{evt.visitorName}</p>
                        <p className="text-xs text-[#1ed760] font-mono truncate">{evt.visitorEmail}</p>
                      </div>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-white/10 text-neutral-200 border border-white/10 shrink-0">
                        {evt.loginMethod.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1 border-t border-white/5 flex-wrap gap-1.5">
                      <span className="flex items-center gap-1">
                        <MonitorSmartphone className="w-3 h-3 text-neutral-400" />
                        {evt.deviceLabel} • {evt.gymVibe}
                      </span>
                      <span className="font-mono text-[10px]">
                        {new Date(evt.loggedInAtMs).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Workout Stats Grid */
          <div className="p-6 space-y-5 overflow-y-auto flex-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold mb-1">
                  <Flame className="w-4 h-4 fill-amber-400" />
                  <span>Workout Streak</span>
                </div>
                <p className="text-2xl font-black text-white">{user.workoutStreak} Days</p>
                <p className="text-[10px] text-neutral-400 mt-0.5">Active daily gym listener</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20">
                <div className="flex items-center gap-2 text-[#1ed760] text-xs font-bold mb-1">
                  <Clock className="w-4 h-4" />
                  <span>Listening Time</span>
                </div>
                <p className="text-2xl font-black text-white">{user.listeningHours} hrs</p>
                <p className="text-[10px] text-neutral-400 mt-0.5">High-energy workout audio</p>
              </div>
            </div>

            {/* Current Workout Music Vibe */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-neutral-300">Workout Music Vibe</span>
                <button
                  onClick={() => setIsEditingVibe(!isEditingVibe)}
                  className="text-xs text-[#1ed760] hover:underline font-bold"
                >
                  {isEditingVibe ? 'Done' : 'Change'}
                </button>
              </div>

              {isEditingVibe ? (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {GYM_VIBES.map((vibe) => (
                    <button
                      key={vibe}
                      onClick={() => handleSelectVibe(vibe)}
                      className={`p-2 rounded-xl text-left text-xs font-medium border flex items-center justify-between transition-all ${
                        user.gymVibe === vibe
                          ? 'bg-[#1ed760]/20 border-[#1ed760] text-white'
                          : 'bg-black/30 border-white/10 text-neutral-400 hover:text-white'
                      }`}
                    >
                      <span>{vibe}</span>
                      {user.gymVibe === vibe && <Check className="w-3.5 h-3.5 text-[#1ed760]" />}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Dumbbell className="w-4 h-4 text-[#1ed760]" />
                  <span>{user.gymVibe}</span>
                </div>
              )}
            </div>

            {/* Vibe History — Average Sonic Preferences (Energy / Melancholy) */}
            <section
              aria-labelledby="vibe-history-heading"
              data-testid="vibe-history-section"
              className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#1ed760] shrink-0" />
                    <h3 id="vibe-history-heading" className="text-sm font-bold text-white">
                      Vibe History
                    </h3>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    {vibeHistory.recentSessionCount} recent plays · {vibeHistory.vibeMatchUseCount}{' '}
                    {vibeHistory.vibeMatchUseCount === 1 ? 'Vibe Match' : 'Vibe Matches'}
                  </p>
                </div>
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#1ed760]/15 text-[#1ed760] border border-[#1ed760]/30 shrink-0">
                  {vibeHistory.dominantVibeLabel}
                </span>
              </div>

              {vibeHistory.hasData ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_116px] gap-4 items-center">
                    {/* Energy & Melancholy Preference Bars */}
                    <div className="space-y-3.5">
                      {/* Energy */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-neutral-200 flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5 text-[#1ed760]" />
                            Average Energy
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-medium text-neutral-400 capitalize">
                              {vibeHistory.energyTrend}
                            </span>
                            <span
                              data-testid="vibe-history-energy"
                              className="font-mono font-bold text-white tabular-nums"
                            >
                              {Math.round(vibeHistory.averageEnergy * 100)}%
                            </span>
                          </div>
                        </div>
                        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-sky-400 to-[#1ed760] transition-all duration-500"
                            style={{ width: `${Math.round(vibeHistory.averageEnergy * 100)}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-neutral-400 tabular-nums">
                          Sessions{' '}
                          {vibeHistory.listeningAverageEnergy !== null
                            ? `${Math.round(vibeHistory.listeningAverageEnergy * 100)}%`
                            : '—'}
                          {' · '}
                          Vibe Match{' '}
                          {vibeHistory.vibeMatchAverageEnergy !== null
                            ? `${Math.round(vibeHistory.vibeMatchAverageEnergy * 100)}%`
                            : 'Not used yet'}
                        </p>
                      </div>

                      {/* Melancholy */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-neutral-200">
                            Average Melancholy
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-medium text-neutral-400 capitalize">
                              {vibeHistory.melancholyTrend}
                            </span>
                            <span
                              data-testid="vibe-history-melancholy"
                              className="font-mono font-bold text-white tabular-nums"
                            >
                              {Math.round(vibeHistory.averageMelancholy * 100)}%
                            </span>
                          </div>
                        </div>
                        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-indigo-400 transition-all duration-500"
                            style={{ width: `${Math.round(vibeHistory.averageMelancholy * 100)}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-neutral-400 tabular-nums">
                          Sessions{' '}
                          {vibeHistory.listeningAverageMelancholy !== null
                            ? `${Math.round(vibeHistory.listeningAverageMelancholy * 100)}%`
                            : '—'}
                          {' · '}
                          Vibe Match{' '}
                          {vibeHistory.vibeMatchAverageMelancholy !== null
                            ? `${Math.round(vibeHistory.vibeMatchAverageMelancholy * 100)}%`
                            : 'Not used yet'}
                        </p>
                      </div>
                    </div>

                    {/* Compact 2D Sonic Quadrant Map (X = Melancholy, Y = Energy) */}
                    <div className="flex flex-col items-center">
                      <svg
                        viewBox="0 0 100 100"
                        className="w-28 h-28 rounded-xl bg-black/40 border border-white/10"
                        role="img"
                        aria-label={`Sonic map showing average Energy ${Math.round(
                          vibeHistory.averageEnergy * 100
                        )}% and Melancholy ${Math.round(vibeHistory.averageMelancholy * 100)}%`}
                      >
                        <line x1="50" y1="8" x2="50" y2="92" stroke="rgba(255,255,255,0.1)" strokeDasharray="2 2" />
                        <line x1="8" y1="50" x2="92" y2="50" stroke="rgba(255,255,255,0.1)" strokeDasharray="2 2" />
                        {vibeHistory.recentEntries.map((entry) => {
                          const cx = 10 + entry.melancholy * 80;
                          const cy = 90 - entry.energy * 80;
                          return (
                            <circle
                              key={entry.id}
                              cx={cx}
                              cy={cy}
                              r={entry.source === 'vibe_match' ? 3.5 : 2.5}
                              fill={entry.source === 'vibe_match' ? '#1ed760' : '#38bdf8'}
                              opacity={entry.source === 'vibe_match' ? 0.9 : 0.55}
                            />
                          );
                        })}
                        <circle
                          cx={10 + vibeHistory.averageMelancholy * 80}
                          cy={90 - vibeHistory.averageEnergy * 80}
                          r={6}
                          fill="rgba(30, 215, 96, 0.2)"
                          stroke="#1ed760"
                          strokeWidth="1.75"
                        />
                        <circle
                          cx={10 + vibeHistory.averageMelancholy * 80}
                          cy={90 - vibeHistory.averageEnergy * 80}
                          r={2.5}
                          fill="#ffffff"
                        />
                      </svg>
                      <div className="flex items-center justify-between w-28 text-[9px] text-neutral-500 mt-1 px-0.5">
                        <span>Euphoric</span>
                        <span>Melancholic</span>
                      </div>
                    </div>
                  </div>

                  {/* Recent Sonic Activity Feed */}
                  {vibeHistory.recentEntries.length > 0 && (
                    <div className="pt-3 border-t border-white/[0.08] space-y-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                        Recent Sonic Activity
                      </p>
                      <div className="space-y-1.5">
                        {vibeHistory.recentEntries.slice(0, 4).map((entry) => (
                          <div
                            key={entry.id}
                            className="flex items-center justify-between gap-2 text-xs py-1 px-2 rounded-lg bg-black/25"
                          >
                            <div className="min-w-0 flex items-center gap-2">
                              <span
                                className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0 ${
                                  entry.source === 'vibe_match'
                                    ? 'bg-[#1ed760]/20 text-[#1ed760]'
                                    : 'bg-white/10 text-neutral-300'
                                }`}
                              >
                                {entry.source === 'vibe_match' ? 'Vibe Match' : 'Played'}
                              </span>
                              <span className="text-neutral-200 font-medium truncate">
                                {entry.title}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-neutral-400 tabular-nums shrink-0">
                              E {Math.round(entry.energy * 100)}% · M {Math.round(entry.melancholy * 100)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-neutral-400 py-2">
                  Play tracks or toggle Vibe Match in the PlayerBar to build your sonic profile.
                </p>
              )}
            </section>

            {/* Library Summary */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-around text-center">
              <div>
                <p className="text-lg font-bold text-white">{likedTrackCount}</p>
                <p className="text-[11px] text-neutral-400">Liked Songs</p>
              </div>
              <div className="w-[1px] h-8 bg-white/10" />
              <div>
                <p className="text-lg font-bold text-white">{downloadedTrackCount}</p>
                <p className="text-[11px] text-neutral-400">Offline Downloads</p>
              </div>
              <div className="w-[1px] h-8 bg-white/10" />
              <div>
                <p className="text-lg font-bold text-[#1ed760]">Pro</p>
                <p className="text-[11px] text-neutral-400">Audio Bitrate</p>
              </div>
            </div>
          </div>
        )}

        {/* Sign Out Button */}
        <div className="p-4 bg-black/40 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src="/assets/apna_music_logo.jpg"
              alt="Apna Music Logo"
              className="w-7 h-7 rounded-lg object-cover"
            />
            <span className="text-xs font-semibold text-neutral-400">Apna Music</span>
          </div>

          <button
            onClick={() => {
              onSignOut();
              onClose();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
