/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyShortcutTarget,
  resolveGlobalMediaShortcut,
} from './keyboardShortcuts';

test('Space toggles play/pause on non-interactive elements and prevents repeat flicker', () => {
  assert.equal(
    resolveGlobalMediaShortcut({ key: ' ', code: 'Space' }),
    'toggle_play_pause'
  );
  assert.equal(
    resolveGlobalMediaShortcut({ key: 'Spacebar', code: 'Space' }),
    'toggle_play_pause'
  );
  assert.equal(
    resolveGlobalMediaShortcut({ key: ' ', code: 'Space', repeat: true }),
    null
  );
});

test('Space does not double-trigger when focus is on a button or link', () => {
  assert.equal(
    resolveGlobalMediaShortcut({
      key: ' ',
      code: 'Space',
      isButtonLikeTarget: true,
    }),
    null
  );
});

test('ArrowRight and ArrowLeft trigger next and previous track', () => {
  assert.equal(
    resolveGlobalMediaShortcut({ key: 'ArrowRight', code: 'ArrowRight' }),
    'next_track'
  );
  assert.equal(
    resolveGlobalMediaShortcut({ key: 'ArrowLeft', code: 'ArrowLeft' }),
    'previous_track'
  );
});

test('L key (uppercase or lowercase) toggles like without repeat flicker', () => {
  assert.equal(resolveGlobalMediaShortcut({ key: 'l', code: 'KeyL' }), 'toggle_like');
  assert.equal(resolveGlobalMediaShortcut({ key: 'L', code: 'KeyL' }), 'toggle_like');
  assert.equal(
    resolveGlobalMediaShortcut({ key: 'l', code: 'KeyL', repeat: true }),
    null
  );
});

test('hardware media keys resolve regardless of focus or blocking modals', () => {
  assert.equal(
    resolveGlobalMediaShortcut({
      key: 'MediaPlayPause',
      isEditableTarget: true,
      hasBlockingModalOpen: true,
    }),
    'toggle_play_pause'
  );
  assert.equal(
    resolveGlobalMediaShortcut({ key: 'MediaPlay', hasBlockingModalOpen: true }),
    'play'
  );
  assert.equal(
    resolveGlobalMediaShortcut({ key: 'MediaPause', hasBlockingModalOpen: true }),
    'pause'
  );
  assert.equal(
    resolveGlobalMediaShortcut({ key: 'MediaTrackNext', isEditableTarget: true }),
    'next_track'
  );
  assert.equal(
    resolveGlobalMediaShortcut({ key: 'MediaTrackPrevious', isEditableTarget: true }),
    'previous_track'
  );
});

test('ignores shortcuts when typing, using sliders, pressing modifiers, or inside blocking modals', () => {
  assert.equal(
    resolveGlobalMediaShortcut({ key: ' ', code: 'Space', isEditableTarget: true }),
    null
  );
  assert.equal(
    resolveGlobalMediaShortcut({ key: 'l', code: 'KeyL', isEditableTarget: true }),
    null
  );
  assert.equal(
    resolveGlobalMediaShortcut({ key: 'ArrowRight', isSliderLikeTarget: true }),
    null
  );
  assert.equal(
    resolveGlobalMediaShortcut({ key: 'l', ctrlKey: true }),
    null
  );
  assert.equal(
    resolveGlobalMediaShortcut({ key: 'l', metaKey: true }),
    null
  );
  assert.equal(
    resolveGlobalMediaShortcut({ key: 'ArrowLeft', altKey: true }),
    null
  );
  assert.equal(
    resolveGlobalMediaShortcut({ key: ' ', hasBlockingModalOpen: true }),
    null
  );
  assert.equal(
    resolveGlobalMediaShortcut({ key: 'ArrowRight', defaultPrevented: true }),
    null
  );
});

test('classifyShortcutTarget distinguishes inputs, sliders, buttons, and plain containers', () => {
  assert.deepEqual(
    classifyShortcutTarget({ tagName: 'input', getAttribute: () => 'text' }),
    { isEditableTarget: true, isButtonLikeTarget: false, isSliderLikeTarget: false }
  );
  assert.deepEqual(
    classifyShortcutTarget({ tagName: 'INPUT', getAttribute: (a: string) => (a === 'type' ? 'range' : null) }),
    { isEditableTarget: true, isButtonLikeTarget: false, isSliderLikeTarget: true }
  );
  assert.deepEqual(
    classifyShortcutTarget({ tagName: 'BUTTON', getAttribute: () => null }),
    { isEditableTarget: false, isButtonLikeTarget: true, isSliderLikeTarget: false }
  );
  assert.deepEqual(
    classifyShortcutTarget({ tagName: 'DIV', isContentEditable: true, getAttribute: () => null }),
    { isEditableTarget: true, isButtonLikeTarget: false, isSliderLikeTarget: false }
  );
  assert.deepEqual(
    classifyShortcutTarget({ tagName: 'BODY', getAttribute: () => null }),
    { isEditableTarget: false, isButtonLikeTarget: false, isSliderLikeTarget: false }
  );
});
