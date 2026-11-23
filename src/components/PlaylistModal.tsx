/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Sparkles,
  Users,
  Music,
  Code2,
  Copy,
  Check,
  Download,
  Upload,
  Link2,
} from 'lucide-react';
import { Playlist } from '../utils/musicDiscovery';
import {
  DEFAULT_PLAYLIST_DESCRIPTION,
  DEFAULT_PLAYLIST_EMOJI,
  PLAYLIST_GRADIENT_PRESETS,
  buildPlaylistJsonShareLink,
  parsePlaylistJsonInput,
} from '../utils/playlistJsonShare';

interface PlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePlaylist: (playlist: Playlist) => void;
  existingPlaylist?: Playlist | null;
  knownTrackIds?: Set<string>;
  onShowToast?: (message: string) => void;
}

const EMOJI_PRESETS = ['✨', '📼', '☕', '🌧️', '⚡', '🌙', '🌊', '🎸', '🪐', '📻'];

async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textArea);
    return ok;
  } catch {
    return false;
  }
}

export const PlaylistModal: React.FC<PlaylistModalProps> = ({
  isOpen,
  onClose,
  onCreatePlaylist,
  existingPlaylist,
  knownTrackIds,
  onShowToast,
}) => {
  const [title, setTitle] = useState(existingPlaylist?.title || '');
  const [description, setDescription] = useState(existingPlaylist?.description || '');
  const [selectedGradient, setSelectedGradient] = useState<string>(
    existingPlaylist?.coverGradient || PLAYLIST_GRADIENT_PRESETS[0]
  );
  const [selectedEmoji, setSelectedEmoji] = useState(
    existingPlaylist?.coverEmoji || DEFAULT_PLAYLIST_EMOJI
  );
  const [isCollaborative, setIsCollaborative] = useState(
    existingPlaylist?.isCollaborative || false
  );
  const [trackIds, setTrackIds] = useState<string[]>(existingPlaylist?.trackIds || []);

  // Share as JSON & Import state
  const [showJsonShare, setShowJsonShare] = useState(false);
  const [copiedMode, setCopiedMode] = useState<'link' | 'json' | null>(null);
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [importText, setImportText] = useState('');
  const [importFeedback, setImportFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [isEntered, setIsEntered] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsEntered(false);
      return;
    }

    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setIsEntered(true);
      });
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    setTitle(existingPlaylist?.title || '');
    setDescription(existingPlaylist?.description || '');
    setSelectedGradient(existingPlaylist?.coverGradient || PLAYLIST_GRADIENT_PRESETS[0]);
    setSelectedEmoji(existingPlaylist?.coverEmoji || DEFAULT_PLAYLIST_EMOJI);
    setIsCollaborative(Boolean(existingPlaylist?.isCollaborative));
    setTrackIds(existingPlaylist?.trackIds ? [...existingPlaylist.trackIds] : []);
    setShowJsonShare(false);
    setCopiedMode(null);
    setShowImportPanel(false);
    setImportText('');
    setImportFeedback(null);
  }, [isOpen, existingPlaylist]);

  const jsonExport = useMemo(
    () =>
      buildPlaylistJsonShareLink({
        title: title.trim() || existingPlaylist?.title || 'Untitled Playlist',
        description: description.trim(),
        coverEmoji: selectedEmoji,
        coverGradient: selectedGradient,
        isCollaborative,
        trackIds,
      }),
    [title, description, selectedEmoji, selectedGradient, isCollaborative, trackIds, existingPlaylist?.title]
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newPlaylist: Playlist = {
      id: existingPlaylist ? existingPlaylist.id : `pl-user-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || DEFAULT_PLAYLIST_DESCRIPTION,
      coverGradient: selectedGradient,
      coverEmoji: selectedEmoji,
      trackIds,
      isPersonalized: existingPlaylist?.isPersonalized ?? false,
      isCollaborative,
      createdAt: existingPlaylist
        ? existingPlaylist.createdAt
        : new Date().toISOString().split('T')[0],
      owner: existingPlaylist?.owner || 'You',
    };

    onCreatePlaylist(newPlaylist);
    onClose();
  };

  const handleToggleShareJson = async () => {
    const nextOpen = !showJsonShare;
    setShowJsonShare(nextOpen);
    if (nextOpen) {
      setShowImportPanel(false);
      const copied = await copyTextToClipboard(jsonExport.shareUrl);
      if (copied) {
        setCopiedMode('link');
        onShowToast?.(
          `Copied compact JSON link (${jsonExport.trackCount} ${jsonExport.trackCount === 1 ? 'track' : 'tracks'})`
        );
        setTimeout(() => {
          setCopiedMode((prev) => (prev === 'link' ? null : prev));
        }, 2500);
      }
    }
  };

  const handleCopyLink = async () => {
    const copied = await copyTextToClipboard(jsonExport.shareUrl);
    if (copied) {
      setCopiedMode('link');
      onShowToast?.('Compact shareable playlist link copied.');
      setTimeout(() => {
        setCopiedMode((prev) => (prev === 'link' ? null : prev));
      }, 2500);
    }
  };

  const handleCopyJson = async () => {
    const copied = await copyTextToClipboard(jsonExport.prettyJsonString);
    if (copied) {
      setCopiedMode('json');
      onShowToast?.('Playlist JSON copied to clipboard.');
      setTimeout(() => {
        setCopiedMode((prev) => (prev === 'json' ? null : prev));
      }, 2500);
    }
  };

  const handleDownloadJsonFile = () => {
    const slug = (jsonExport.payload.t || 'playlist')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'playlist';
    const blob = new Blob([jsonExport.prettyJsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}-backup.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onShowToast?.(`Downloaded ${slug}-backup.json`);
  };

  const handleApplyImport = () => {
    const parsed = parsePlaylistJsonInput(importText, knownTrackIds);
    if (!parsed) {
      setImportFeedback({
        type: 'error',
        message: 'Could not read that JSON or link. Paste a valid ?plj= share URL or JSON backup.',
      });
      return;
    }

    setTitle(parsed.title);
    setDescription(parsed.description);
    setSelectedEmoji(parsed.coverEmoji);
    setSelectedGradient(parsed.coverGradient);
    setIsCollaborative(parsed.isCollaborative);
    setTrackIds(parsed.trackIds);
    setShowImportPanel(false);
    setImportText('');
    setImportFeedback({
      type: 'success',
      message:
        parsed.unknownTrackCount > 0
          ? `Loaded "${parsed.title}" with ${parsed.matchedTrackCount} tracks (${parsed.unknownTrackCount} unavailable skipped).`
          : `Loaded "${parsed.title}" with ${parsed.matchedTrackCount} tracks ready to save.`,
    });
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto transition-opacity duration-200 ease-out motion-reduce:transition-none starting:opacity-0 ${
        isEntered ? 'opacity-100' : 'opacity-0'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="playlist-modal-title"
      data-testid="playlist-modal"
      data-motion-state={isEntered ? 'entered' : 'entering'}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        data-testid="playlist-modal-card"
        className={`relative w-full max-w-md bg-[#18181c] border border-white/10 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col transform-gpu transition-all duration-200 ease-out motion-reduce:transition-none starting:opacity-0 starting:scale-95 starting:translate-y-1.5 ${
          isEntered
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-1.5'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-[#1ed760]/10 text-[#1ed760] rounded-lg shrink-0">
              <Music className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 id="playlist-modal-title" className="text-base sm:text-lg font-bold text-white truncate">
                {existingPlaylist ? 'Edit Playlist' : 'Create New Playlist'}
              </h2>
              <p className="text-[11px] text-neutral-400 font-mono">
                {trackIds.length} {trackIds.length === 1 ? 'track ID' : 'track IDs'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {/* Import Feedback Banner */}
          {importFeedback && (
            <div
              role="status"
              data-testid="playlist-import-feedback"
              className={`px-3 py-2 rounded-xl text-xs border ${
                importFeedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {importFeedback.message}
            </div>
          )}

          {/* Cover Preview */}
          <div className="flex items-center gap-4">
            <div
              className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr ${selectedGradient} flex items-center justify-center text-3xl sm:text-4xl shadow-xl border border-white/15 shrink-0`}
            >
              {selectedEmoji}
            </div>
            <div className="flex-1 space-y-2 min-w-0">
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                Cover Emoji
              </label>
              <div className="flex gap-1.5 flex-wrap">
                {EMOJI_PRESETS.map((emoji) => (
                  <button
                    type="button"
                    key={emoji}
                    onClick={() => setSelectedEmoji(emoji)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-base transition-all cursor-pointer ${
                      selectedEmoji === emoji
                        ? 'bg-white/20 ring-2 ring-[#1ed760]'
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Color Gradient presets */}
          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Cover Atmosphere Theme
            </label>
            <div className="flex gap-2.5">
              {PLAYLIST_GRADIENT_PRESETS.map((gradient, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => setSelectedGradient(gradient)}
                  className={`w-8 h-8 rounded-full bg-gradient-to-tr ${gradient} border transition-all cursor-pointer ${
                    selectedGradient === gradient
                      ? 'border-white scale-110 shadow-lg'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                  aria-label={`Select gradient style ${i + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label
              htmlFor="playlist-title-input"
              className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5"
            >
              Playlist Name *
            </label>
            <input
              id="playlist-title-input"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 3 AM Tape Whispers"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#1ed760] transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="playlist-desc-input"
              className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5"
            >
              Description
            </label>
            <textarea
              id="playlist-desc-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Give your playlist a vibe or story..."
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#1ed760] transition-colors resize-none"
            />
          </div>

          {/* Collaborative toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2.5">
              <Users className="w-5 h-5 text-[#1ed760] shrink-0" />
              <div>
                <p className="text-sm font-semibold text-white">Collaborative Playlist</p>
                <p className="text-xs text-neutral-400">Allow friends to add tracks to this playlist</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsCollaborative(!isCollaborative)}
              className={`w-11 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                isCollaborative ? 'bg-[#1ed760]' : 'bg-neutral-700'
              }`}
              role="switch"
              aria-checked={isCollaborative}
              aria-label="Toggle collaborative playlist"
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform absolute top-0.5 left-0.5 ${
                  isCollaborative ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Backup & Portability Bar: Share as JSON + Import from JSON */}
          <div className="space-y-3 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleToggleShareJson}
                data-testid="share-as-json-button"
                aria-expanded={showJsonShare}
                className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  showJsonShare
                    ? 'bg-[#1ed760]/15 text-[#1ed760] border-[#1ed760]/40'
                    : 'bg-white/[0.06] hover:bg-white/[0.11] text-white border-white/12'
                }`}
              >
                <Code2 className="w-4 h-4 shrink-0" />
                <span>Share as JSON</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowImportPanel((prev) => !prev);
                  setShowJsonShare(false);
                  setImportFeedback(null);
                }}
                data-testid="import-json-toggle"
                aria-expanded={showImportPanel}
                className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  showImportPanel
                    ? 'bg-sky-500/15 text-sky-300 border-sky-400/40'
                    : 'bg-white/[0.04] hover:bg-white/[0.09] text-neutral-300 hover:text-white border-white/10'
                }`}
              >
                <Upload className="w-3.5 h-3.5 shrink-0" />
                <span>Import Link / JSON</span>
              </button>
            </div>

            {/* Expanded Compact JSON Share Panel */}
            {showJsonShare && (
              <div
                data-testid="playlist-json-share-panel"
                className="p-3.5 rounded-xl bg-black/45 border border-white/10 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                    <Link2 className="w-3.5 h-3.5 text-[#1ed760]" />
                    <span>Compact Shareable Link</span>
                  </div>
                  <span className="text-[11px] font-mono text-neutral-400">
                    {jsonExport.trackCount} {jsonExport.trackCount === 1 ? 'track' : 'tracks'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={jsonExport.shareUrl}
                    onFocus={(e) => e.currentTarget.select()}
                    aria-label="Compact shareable playlist JSON link"
                    data-testid="playlist-json-share-url"
                    className="flex-1 min-w-0 bg-white/[0.05] border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-neutral-200 focus:outline-none focus:border-[#1ed760]"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    data-testid="copy-json-link-button"
                    className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1ed760] hover:bg-[#1db954] text-black font-bold text-xs transition-colors cursor-pointer"
                  >
                    {copiedMode === 'link' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                      Track IDs JSON
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={handleCopyJson}
                        data-testid="copy-raw-json-button"
                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.12] text-[11px] text-neutral-200 font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                      >
                        {copiedMode === 'json' ? (
                          <>
                            <Check className="w-3 h-3 text-[#1ed760] shrink-0" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 shrink-0" />
                            <span>Copy JSON</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadJsonFile}
                        data-testid="download-json-backup-button"
                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.12] text-[11px] text-neutral-200 font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                      >
                        <Download className="w-3 h-3 shrink-0" />
                        <span>.json</span>
                      </button>
                    </div>
                  </div>
                  <pre
                    data-testid="playlist-json-preview"
                    className="max-h-28 overflow-auto rounded-lg bg-[#0d0e14] border border-white/[0.08] p-2.5 text-[11px] font-mono text-emerald-300/95 whitespace-pre-wrap break-all"
                  >
                    {jsonExport.jsonString}
                  </pre>
                </div>
              </div>
            )}

            {/* Expanded Import Panel */}
            {showImportPanel && (
              <div
                data-testid="playlist-json-import-panel"
                className="p-3.5 rounded-xl bg-black/45 border border-white/10 space-y-2.5"
              >
                <label
                  htmlFor="playlist-json-import-input"
                  className="block text-xs font-semibold text-neutral-200"
                >
                  Paste a compact <code className="text-sky-300">?plj=</code> link or JSON backup
                </label>
                <textarea
                  id="playlist-json-import-input"
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  rows={2}
                  placeholder='https://.../?plj=eyJ2IjoxLCJ0Ijoi... or {"v":1,"t":"My Mix","ids":["kn-1"]}'
                  className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-sky-400 resize-none"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleApplyImport}
                    data-testid="apply-json-import-button"
                    className="px-3.5 py-1.5 rounded-lg bg-sky-400 hover:bg-sky-300 text-black font-bold text-xs transition-colors cursor-pointer"
                  >
                    Load Backup into Form
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#1ed760] hover:bg-[#1db954] text-black transition-all shadow-lg shadow-[#1ed760]/20 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              {existingPlaylist ? 'Save Changes' : 'Create Playlist'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
