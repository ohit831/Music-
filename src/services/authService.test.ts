/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test, { describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidEmail,
  isValidPassword,
  hashPassword,
  authService,
} from './authService.js';

// Simple in-memory localStorage polyfill for Node.js test environment
const mockStorage: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, val: string) => {
    mockStorage[key] = String(val);
  },
  removeItem: (key: string) => {
    delete mockStorage[key];
  },
  clear: () => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  },
};

describe('Auth Validation & Utilities', () => {
  test('isValidEmail accepts valid email formats and rejects invalid ones', () => {
    assert.equal(isValidEmail('rohit@gmail.com'), true);
    assert.equal(isValidEmail('user.name+tag@sub.domain.co'), true);
    assert.equal(isValidEmail('invalid-email'), false);
    assert.equal(isValidEmail('missing@domain'), false);
    assert.equal(isValidEmail('   '), false);
  });

  test('isValidPassword requires at least 6 characters', () => {
    assert.equal(isValidPassword('123456'), true);
    assert.equal(isValidPassword('gymStrong2026'), true);
    assert.equal(isValidPassword('12345'), false);
    assert.equal(isValidPassword(''), false);
  });

  test('hashPassword produces deterministic non-empty hashes', () => {
    const hash1 = hashPassword('myPassword123');
    const hash2 = hashPassword('myPassword123');
    const hash3 = hashPassword('differentPassword');

    assert.equal(hash1, hash2);
    assert.notEqual(hash1, hash3);
    assert.equal(hash1.startsWith('apna_pwd_'), true);
  });
});

describe('AuthService Lifecycle', () => {
  beforeEach(() => {
    (globalThis as any).localStorage.clear();
    authService.signOut();
  });

  test('signUp validates minimum name length and email', () => {
    const res1 = authService.signUp({ name: 'A', email: 'valid@test.com', password: 'password123' });
    assert.equal(res1.success, false);
    assert.match(res1.error || '', /valid name/i);

    const res2 = authService.signUp({ name: 'Rohit', email: 'notanemail', password: 'password123' });
    assert.equal(res2.success, false);
    assert.match(res2.error || '', /email address/i);

    const res3 = authService.signUp({ name: 'Rohit', email: 'rohit@test.com', password: '123' });
    assert.equal(res3.success, false);
    assert.match(res3.error || '', /at least 6 characters/i);
  });

  test('signUp registers new user and prevents duplicate email registration', () => {
    const res = authService.signUp({
      name: 'Rohit Rathod',
      email: 'rohit@gym.com',
      password: 'beastMode2026',
      gymVibe: 'Heavy Lifting',
    });

    assert.equal(res.success, true);
    assert.ok(res.user);
    assert.equal(res.user.name, 'Rohit Rathod');
    assert.equal(res.user.gymVibe, 'Heavy Lifting');
    assert.equal(res.user.isPro, true);

    // Duplicate registration should fail gracefully
    const dupRes = authService.signUp({
      name: 'Rohit Another',
      email: 'rohit@gym.com',
      password: 'anotherPassword',
    });
    assert.equal(dupRes.success, false);
    assert.match(dupRes.error || '', /already exists/i);
  });

  test('signIn validates credentials correctly', () => {
    authService.signUp({
      name: 'Priya Workout',
      email: 'priya@fitness.com',
      password: 'powerQueen99',
      gymVibe: 'Cardio Beast',
    });

    authService.signOut();
    assert.equal(authService.getCurrentUser(), null);

    // Wrong password
    const failRes = authService.signIn({
      email: 'priya@fitness.com',
      password: 'wrongPassword',
    });
    assert.equal(failRes.success, false);
    assert.match(failRes.error || '', /incorrect password/i);

    // Correct password
    const okRes = authService.signIn({
      email: 'priya@fitness.com',
      password: 'powerQueen99',
    });
    assert.equal(okRes.success, true);
    assert.equal(okRes.user?.name, 'Priya Workout');
    assert.equal(authService.getCurrentUser()?.email, 'priya@fitness.com');
  });

  test('quickSignIn provides instant warrior profile', () => {
    const user = authService.quickSignIn('warrior');
    assert.equal(user.name, 'Rohit Gym Beast');
    assert.equal(user.gymVibe, 'Heavy Lifting');
    assert.equal(authService.getCurrentUser()?.id, 'usr_gym_warrior');
  });
});
