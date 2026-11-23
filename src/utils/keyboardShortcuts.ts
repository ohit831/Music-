/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GlobalMediaShortcutAction =
  | 'toggle_play_pause'
  | 'play'
  | 'pause'
  | 'next_track'
  | 'previous_track'
  | 'toggle_like';

export interface KeyboardShortcutInput {
  key: string;
  code?: string;
  repeat?: boolean;
  defaultPrevented?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  isEditableTarget?: boolean;
  isButtonLikeTarget?: boolean;
  isSliderLikeTarget?: boolean;
  hasBlockingModalOpen?: boolean;
}

export interface TargetClassification {
  isEditableTarget: boolean;
  isButtonLikeTarget: boolean;
  isSliderLikeTarget: boolean;
}

interface DuckTypedTarget {
  tagName?: string;
  isContentEditable?: boolean;
  getAttribute?: (name: string) => string | null;
  closest?: (selector: string) => unknown;
}

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'OPTION']);
const BUTTON_LIKE_TAGS = new Set(['BUTTON', 'A', 'SUMMARY']);
const BUTTON_LIKE_ROLES = new Set([
  'button',
  'link',
  'menuitem',
  'switch',
  'tab',
  'checkbox',
  'radio',
  'option',
]);

export function classifyShortcutTarget(target: unknown): TargetClassification {
  if (!target || typeof target !== 'object') {
    return {
      isEditableTarget: false,
      isButtonLikeTarget: false,
      isSliderLikeTarget: false,
    };
  }

  const el = target as DuckTypedTarget;
  const tag = typeof el.tagName === 'string' ? el.tagName.toUpperCase() : '';
  const role = el.getAttribute?.('role')?.toLowerCase() ?? '';
  const inputType = el.getAttribute?.('type')?.toLowerCase() ?? '';
  const contentEditableAttr = el.getAttribute?.('contenteditable');

  const hasEditableClosest = Boolean(
    el.closest?.('input, textarea, select, [contenteditable="true"], [contenteditable=""]')
  );
  const isEditableTarget =
    EDITABLE_TAGS.has(tag) ||
    el.isContentEditable === true ||
    contentEditableAttr === 'true' ||
    contentEditableAttr === '' ||
    hasEditableClosest;

  const isSliderLikeTarget =
    role === 'slider' ||
    (tag === 'INPUT' && inputType === 'range') ||
    Boolean(el.closest?.('input[type="range"], [role="slider"]'));

  const isButtonLikeTarget =
    BUTTON_LIKE_TAGS.has(tag) ||
    BUTTON_LIKE_ROLES.has(role) ||
    Boolean(
      el.closest?.(
        'button, a[href], summary, [role="button"], [role="menuitem"], [role="switch"], [role="tab"]'
      )
    );

  return {
    isEditableTarget,
    isButtonLikeTarget,
    isSliderLikeTarget,
  };
}

export function resolveGlobalMediaShortcut(
  input: KeyboardShortcutInput
): GlobalMediaShortcutAction | null {
  if (input.defaultPrevented) {
    return null;
  }

  const key = input.key || '';
  const code = input.code || '';

  // Dedicated hardware/OS media keys work globally regardless of focused control
  if (key === 'MediaPlayPause' || code === 'MediaPlayPause') {
    return input.repeat ? null : 'toggle_play_pause';
  }
  if (key === 'MediaPlay' || code === 'MediaPlay') {
    return input.repeat ? null : 'play';
  }
  if (key === 'MediaPause' || code === 'MediaPause') {
    return input.repeat ? null : 'pause';
  }
  if (key === 'MediaTrackNext' || code === 'MediaTrackNext') {
    return 'next_track';
  }
  if (key === 'MediaTrackPrevious' || code === 'MediaTrackPrevious') {
    return 'previous_track';
  }

  // Never intercept browser/system modifier combinations (e.g. Cmd+L, Ctrl+Left, Alt+Arrow)
  if (input.ctrlKey || input.metaKey || input.altKey) {
    return null;
  }

  // Do not hijack keys while form/settings modals or text/slider inputs are active
  if (input.hasBlockingModalOpen || input.isEditableTarget || input.isSliderLikeTarget) {
    return null;
  }

  if (key === ' ' || key === 'Spacebar' || code === 'Space') {
    if (input.repeat || input.isButtonLikeTarget) {
      return null;
    }
    return 'toggle_play_pause';
  }

  if (key === 'ArrowRight' || code === 'ArrowRight') {
    return 'next_track';
  }

  if (key === 'ArrowLeft' || code === 'ArrowLeft') {
    return 'previous_track';
  }

  if (key.toLowerCase() === 'l') {
    return input.repeat ? null : 'toggle_like';
  }

  return null;
}
