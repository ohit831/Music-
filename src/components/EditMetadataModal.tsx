/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Tag,
  Plus,
  RotateCcw,
  Check,
  AlertCircle,
  Disc3,
  Sparkles,
} from 'lucide-react';
import { IndieTrack } from '../utils/musicDiscovery';
import {
  addTagsToList,
  GENRE_OPTIONS,
  normalizeCustomTag,
  removeTagFromList,
  SUGGESTED_ORGANIZATION_TAGS,
  TRACK_ALBUM_MAX,
  TRACK_ARTIST_MAX,
  TRACK_BPM_MAX,
  TRACK_BPM_MIN,
  TRACK_GENRE_MAX,
  TRACK_LINER_NOTES_MAX,
  TRACK_TAG_MAX_COUNT,
  TRACK_TAG_MAX_LEN,
  TRACK_TITLE_MAX,
  TRACK_YEAR_MAX,
  TRACK_YEAR_MIN,
  TrackMetadataDraft,
  TrackMetadataOverride,
  trackToMetadataDraft,
  validateAndNormalizeMetadata,
} from '../utils/trackMetadata';

interface EditMetadataModalProps {
  isOpen: boolean;
  track: IndieTrack | null;
  hasOverride: boolean;
  onClose: () => void;
  onSave: (override: TrackMetadataOverride) => Promise<void> | void;
  onResetToOriginal: (trackId: string) => Promise<void> | void;
}

export const EditMetadataModal: React.FC<EditMetadataModalProps> = ({
  isOpen,
  track,
  hasOverride,
  onClose,
  onSave,
  onResetToOriginal,
}) => {
  const [draft, setDraft] = useState<TrackMetadataDraft>({
    title: '',
    artist: '',
    album: '',
    genre: '',
    releaseYear: 2026,
    language: 'english',
    bpm: '',
    linerNotes: '',
    tags: [],
  });
  const [tagInput, setTagInput] = useState('');
  const [tagNotice, setTagNotice] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && track) {
      setDraft(trackToMetadataDraft(track));
      setTagInput('');
      setTagNotice(null);
      setErrors({});
      setIsSaving(false);
    }
  }, [isOpen, track?.id]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !track) return null;

  const handleAddTag = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const res = addTagsToList(draft.tags, trimmed, TRACK_TAG_MAX_COUNT);
    setDraft((prev) => ({ ...prev, tags: res.tags }));
    setTagInput('');

    if (res.limitReached) {
      setTagNotice(`Maximum ${TRACK_TAG_MAX_COUNT} tags reached per track.`);
    } else if (res.added.length === 0 && res.duplicateCount > 0) {
      setTagNotice('That tag is already applied.');
    } else {
      setTagNotice(null);
    }
  };

  const handleToggleSuggestedTag = (suggested: string) => {
    const norm = normalizeCustomTag(suggested);
    if (draft.tags.includes(norm)) {
      setDraft((prev) => ({
        ...prev,
        tags: removeTagFromList(prev.tags, norm),
      }));
      setTagNotice(null);
    } else {
      handleAddTag(norm);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Include any pending typed tag before saving so nothing gets lost
    let finalDraft = draft;
    if (tagInput.trim()) {
      const merged = addTagsToList(draft.tags, tagInput, TRACK_TAG_MAX_COUNT);
      finalDraft = { ...draft, tags: merged.tags };
      setDraft(finalDraft);
      setTagInput('');
    }

    const result = validateAndNormalizeMetadata(track.id, finalDraft);
    if (!result.valid || !result.override) {
      setErrors(result.errors);
      return;
    }

    setErrors({});
    setIsSaving(true);
    try {
      await onSave(result.override);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setIsSaving(true);
    try {
      await onResetToOriginal(track.id);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-5 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-metadata-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl max-h-[90vh] flex flex-col bg-[#131521] border border-white/15 rounded-2xl shadow-2xl overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/[0.08] bg-[#10121c] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={track.coverUrl}
              alt={track.title}
              referrerPolicy="no-referrer"
              className="w-11 h-11 rounded-xl object-cover border border-white/10 shrink-0"
            />
            <div className="min-w-0">
              <h2
                id="edit-metadata-modal-title"
                className="text-base sm:text-lg font-bold text-white truncate"
              >
                Edit Track Metadata
              </h2>
              <p className="text-xs text-neutral-400 truncate">
                Update info & apply custom tags to organize "{track.title}"
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            aria-label="Close edit metadata dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {/* Core Track Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <label
                  htmlFor="meta-title-input"
                  className="block text-xs font-semibold text-neutral-300 mb-1.5"
                >
                  Track Title <span className="text-rose-400">*</span>
                </label>
                <input
                  id="meta-title-input"
                  type="text"
                  maxLength={TRACK_TITLE_MAX}
                  value={draft.title}
                  onChange={(e) => {
                    setDraft((prev) => ({ ...prev, title: e.target.value }));
                    if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
                  }}
                  placeholder="Song title"
                  className="w-full bg-white/[0.05] border border-white/10 focus:border-sky-400 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 outline-none transition-colors"
                />
                {errors.title && (
                  <p className="mt-1 text-[11px] text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.title}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="meta-artist-input"
                  className="block text-xs font-semibold text-neutral-300 mb-1.5"
                >
                  Artist <span className="text-rose-400">*</span>
                </label>
                <input
                  id="meta-artist-input"
                  type="text"
                  maxLength={TRACK_ARTIST_MAX}
                  value={draft.artist}
                  onChange={(e) => {
                    setDraft((prev) => ({ ...prev, artist: e.target.value }));
                    if (errors.artist) setErrors((prev) => ({ ...prev, artist: '' }));
                  }}
                  placeholder="Artist name"
                  className="w-full bg-white/[0.05] border border-white/10 focus:border-sky-400 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 outline-none transition-colors"
                />
                {errors.artist && (
                  <p className="mt-1 text-[11px] text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.artist}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="meta-album-input"
                  className="block text-xs font-semibold text-neutral-300 mb-1.5"
                >
                  Album / Film
                </label>
                <input
                  id="meta-album-input"
                  type="text"
                  maxLength={TRACK_ALBUM_MAX}
                  value={draft.album}
                  onChange={(e) => setDraft((prev) => ({ ...prev, album: e.target.value }))}
                  placeholder="Album or soundtrack name"
                  className="w-full bg-white/[0.05] border border-white/10 focus:border-sky-400 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 outline-none transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="meta-genre-input"
                  className="block text-xs font-semibold text-neutral-300 mb-1.5"
                >
                  Genre <span className="text-rose-400">*</span>
                </label>
                <input
                  id="meta-genre-input"
                  type="text"
                  list="track-genre-presets"
                  maxLength={TRACK_GENRE_MAX}
                  value={draft.genre}
                  onChange={(e) => {
                    setDraft((prev) => ({ ...prev, genre: e.target.value }));
                    if (errors.genre) setErrors((prev) => ({ ...prev, genre: '' }));
                  }}
                  placeholder="e.g. Dream Pop, Kannada Cinema"
                  className="w-full bg-white/[0.05] border border-white/10 focus:border-sky-400 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 outline-none transition-colors"
                />
                <datalist id="track-genre-presets">
                  {GENRE_OPTIONS.map((g) => (
                    <option key={g} value={g} />
                  ))}
                </datalist>
                {errors.genre && (
                  <p className="mt-1 text-[11px] text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.genre}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label
                    htmlFor="meta-year-input"
                    className="block text-xs font-semibold text-neutral-300 mb-1.5"
                  >
                    Year
                  </label>
                  <input
                    id="meta-year-input"
                    type="number"
                    min={TRACK_YEAR_MIN}
                    max={TRACK_YEAR_MAX}
                    value={draft.releaseYear}
                    onChange={(e) => {
                      setDraft((prev) => ({ ...prev, releaseYear: e.target.value }));
                      if (errors.releaseYear) setErrors((prev) => ({ ...prev, releaseYear: '' }));
                    }}
                    className="w-full bg-white/[0.05] border border-white/10 focus:border-sky-400 rounded-xl px-2.5 py-2.5 text-sm text-white outline-none transition-colors tabular-nums"
                  />
                </div>

                <div>
                  <label
                    htmlFor="meta-language-select"
                    className="block text-xs font-semibold text-neutral-300 mb-1.5"
                  >
                    Language
                  </label>
                  <select
                    id="meta-language-select"
                    value={draft.language || 'english'}
                    onChange={(e) => setDraft((prev) => ({ ...prev, language: e.target.value }))}
                    className="w-full bg-[#1a1d2d] border border-white/10 focus:border-sky-400 rounded-xl px-2 py-2.5 text-xs text-white outline-none cursor-pointer"
                  >
                    <option value="english">English</option>
                    <option value="kannada">Kannada</option>
                    <option value="hindi">Hindi</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="meta-bpm-input"
                    className="block text-xs font-semibold text-neutral-300 mb-1.5"
                  >
                    BPM
                  </label>
                  <input
                    id="meta-bpm-input"
                    type="number"
                    min={TRACK_BPM_MIN}
                    max={TRACK_BPM_MAX}
                    placeholder="—"
                    value={draft.bpm ?? ''}
                    onChange={(e) => {
                      setDraft((prev) => ({ ...prev, bpm: e.target.value }));
                      if (errors.bpm) setErrors((prev) => ({ ...prev, bpm: '' }));
                    }}
                    className="w-full bg-white/[0.05] border border-white/10 focus:border-sky-400 rounded-xl px-2.5 py-2.5 text-sm text-white placeholder-neutral-500 outline-none transition-colors tabular-nums"
                  />
                </div>
              </div>
              {(errors.releaseYear || errors.bpm) && (
                <p className="sm:col-span-2 text-[11px] text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {errors.releaseYear || errors.bpm}
                </p>
              )}
            </div>

            {/* Custom Organization Tags */}
            <div className="pt-3 border-t border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="meta-tag-input"
                  className="text-xs font-semibold text-white flex items-center gap-1.5"
                >
                  <Tag className="w-3.5 h-3.5 text-sky-400" />
                  <span>Custom Organization Tags</span>
                </label>
                <span className="text-[11px] font-mono tabular-nums text-neutral-400">
                  {draft.tags.length} / {TRACK_TAG_MAX_COUNT}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="meta-tag-input"
                  type="text"
                  maxLength={TRACK_TAG_MAX_LEN}
                  value={tagInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.includes(',')) {
                      handleAddTag(val);
                    } else {
                      setTagInput(val);
                      if (tagNotice) setTagNotice(null);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag(tagInput);
                    }
                  }}
                  placeholder="Type tag & press Enter (e.g. morning-cardio, boss-mode)..."
                  className="flex-1 bg-white/[0.05] border border-white/10 focus:border-sky-400 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder-neutral-500 outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => handleAddTag(tagInput)}
                  disabled={!tagInput.trim() || draft.tags.length >= TRACK_TAG_MAX_COUNT}
                  className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-40 text-xs font-semibold text-white transition-colors cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Tag</span>
                </button>
              </div>

              {tagNotice && (
                <p className="text-[11px] text-amber-300">{tagNotice}</p>
              )}

              {/* Applied Tags */}
              {draft.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5" aria-label="Applied custom tags">
                  {draft.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg bg-sky-400/15 border border-sky-400/35 text-xs font-medium text-sky-200"
                    >
                      <span>#{tag}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            tags: removeTagFromList(prev.tags, tag),
                          }))
                        }
                        className="p-0.5 rounded hover:bg-white/15 text-sky-300 hover:text-white cursor-pointer"
                        aria-label={`Remove tag ${tag}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neutral-500">
                  No custom tags yet. Add tags below to group & search tracks faster.
                </p>
              )}

              {/* Quick Organization Presets */}
              <div className="space-y-1.5">
                <p className="text-[11px] text-neutral-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-sky-400" />
                  <span>Quick organize tags:</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_ORGANIZATION_TAGS.map((suggested) => {
                    const isApplied = draft.tags.includes(suggested);
                    return (
                      <button
                        key={suggested}
                        type="button"
                        onClick={() => handleToggleSuggestedTag(suggested)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                          isApplied
                            ? 'bg-white text-black border-white font-semibold'
                            : 'bg-white/[0.04] hover:bg-white/[0.09] text-neutral-300 border-white/10'
                        }`}
                      >
                        {isApplied ? `✓ #${suggested}` : `+ #${suggested}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Liner Notes */}
            <div className="pt-3 border-t border-white/[0.08]">
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="meta-notes-input"
                  className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5"
                >
                  <Disc3 className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Notes / Liner Specs</span>
                </label>
                <span className="text-[10px] font-mono tabular-nums text-neutral-500">
                  {(draft.linerNotes || '').length} / {TRACK_LINER_NOTES_MAX}
                </span>
              </div>
              <textarea
                id="meta-notes-input"
                rows={2}
                maxLength={TRACK_LINER_NOTES_MAX}
                value={draft.linerNotes || ''}
                onChange={(e) => setDraft((prev) => ({ ...prev, linerNotes: e.target.value }))}
                placeholder="Add personal listening notes, workout cues, or album credits..."
                className="w-full bg-white/[0.05] border border-white/10 focus:border-sky-400 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder-neutral-500 outline-none transition-colors resize-none"
              />
            </div>
          </div>

          {/* Sticky Modal Footer */}
          <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-white/[0.08] bg-[#10121c] shrink-0 flex-wrap">
            <div>
              {hasOverride && (
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-neutral-300 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-40"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to Original</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-semibold text-neutral-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-bold transition-all active:scale-95 cursor-pointer disabled:opacity-50 shadow-lg"
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{isSaving ? 'Saving...' : 'Save Metadata'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
};
