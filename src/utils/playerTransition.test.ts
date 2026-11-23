import test from 'node:test';
import assert from 'node:assert/strict';
import { getPlayerBarAnimationClasses, getPlayerBarMotionSpec } from './playerTransition';

test('next track transition slides artwork in from right and exits left', () => {
  const spec = getPlayerBarMotionSpec('next', false);
  assert.ok(spec.artworkInitial.x > 0);
  assert.equal(spec.artworkInitial.y, 0);
  assert.equal(spec.artworkInitial.opacity, 0);
  assert.ok(spec.artworkInitial.scale < 1);

  assert.equal(spec.artworkAnimate.x, 0);
  assert.equal(spec.artworkAnimate.opacity, 1);
  assert.equal(spec.artworkAnimate.scale, 1);

  assert.ok(spec.artworkExit.x < 0);
  assert.equal(spec.artworkExit.opacity, 0);
  assert.ok(spec.durationSec > 0 && spec.durationSec <= 0.35);
});

test('previous track transition slides artwork in from left and exits right', () => {
  const spec = getPlayerBarMotionSpec('previous', false);
  assert.ok(spec.artworkInitial.x < 0);
  assert.ok(spec.artworkExit.x > 0);
  assert.ok(spec.metaInitial.x < 0);
  assert.ok(spec.metaExit.x > 0);
});

test('jump track transition uses subtle upward slide and scale-fade', () => {
  const spec = getPlayerBarMotionSpec('jump', false);
  assert.equal(spec.artworkInitial.x, 0);
  assert.ok(spec.artworkInitial.y > 0);
  assert.equal(spec.artworkAnimate.y, 0);
  assert.ok(spec.metaInitial.y > 0);
});

test('reduced motion disables spatial offsets and sets zero duration', () => {
  const spec = getPlayerBarMotionSpec('next', true);
  assert.equal(spec.durationSec, 0);
  assert.equal(spec.metaDurationSec, 0);
  assert.equal(spec.sweepDurationSec, 0);
  assert.deepEqual(spec.artworkInitial, { opacity: 1, x: 0, y: 0, scale: 1 });
  assert.deepEqual(spec.artworkExit, { opacity: 1, x: 0, y: 0, scale: 1 });
});

test('getPlayerBarAnimationClasses maps directions and suppresses initial/reduced-motion', () => {
  const initial = getPlayerBarAnimationClasses('next', false, false);
  assert.equal(initial.artworkEnterClass, '');

  const next = getPlayerBarAnimationClasses('next', true, false);
  assert.equal(next.artworkEnterClass, 'animate-playerbar-art-enter-next');
  assert.equal(next.artworkExitClass, 'animate-playerbar-art-exit-next');
  assert.equal(next.metaEnterClass, 'animate-playerbar-meta-enter-next');
  assert.equal(next.sweepClass, 'animate-playerbar-sweep');

  const prev = getPlayerBarAnimationClasses('previous', true, false);
  assert.equal(prev.artworkEnterClass, 'animate-playerbar-art-enter-prev');
  assert.equal(prev.artworkExitClass, 'animate-playerbar-art-exit-prev');

  const reduced = getPlayerBarAnimationClasses('jump', true, true);
  assert.equal(reduced.artworkEnterClass, '');
  assert.equal(reduced.sweepClass, '');
});
