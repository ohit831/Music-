/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OWNER_EMAIL,
  isOwnerUser,
  sanitizeLoginEvent,
  stripSensitiveFields,
  formatLoginAuditCsv,
  buildOwnerEmailReportUrl,
} from './loginAudit.ts';

test('sanitizeLoginEvent strips passwords, hashes, and tokens unconditionally', () => {
  const dirtyInput = {
    visitorName: 'Rohan Kumar',
    visitorEmail: 'Rohan@Example.com',
    loginMethod: 'email_signup' as const,
    gymVibe: 'Cardio Beast',
    password: 'MySuperSecretPassword123!',
    passwordHash: 'apna_pwd_999111',
    accessToken: 'ya29.secret-token',
    secret: 'top-secret',
  };

  const clean = sanitizeLoginEvent(dirtyInput);
  const serialized = JSON.stringify(clean);

  assert.equal(clean.visitorName, 'Rohan Kumar');
  assert.equal(clean.visitorEmail, 'rohan@example.com');
  assert.equal(clean.loginMethod, 'email_signup');
  assert.equal(clean.gymVibe, 'Cardio Beast');
  assert.equal((clean as unknown as Record<string, unknown>).password, undefined);
  assert.equal((clean as unknown as Record<string, unknown>).passwordHash, undefined);
  assert.equal((clean as unknown as Record<string, unknown>).accessToken, undefined);
  assert.ok(!serialized.includes('MySuperSecretPassword123'));
  assert.ok(!serialized.includes('apna_pwd_999111'));
  assert.ok(!serialized.includes('ya29.secret-token'));
});

test('stripSensitiveFields drops all credential keys case-insensitively', () => {
  const cleaned = stripSensitiveFields({
    name: 'Test',
    Password: '123',
    passwordHash: 'abc',
    idToken: 'xyz',
    email: 'a@b.com',
  });
  assert.deepEqual(cleaned, { name: 'Test', email: 'a@b.com' });
});

test('isOwnerUser only authorizes rohitrrathod1958@gmail.com when verified', () => {
  assert.equal(isOwnerUser(OWNER_EMAIL, true), true);
  assert.equal(isOwnerUser('ROHITRRATHOD1958@GMAIL.COM', true), true);
  assert.equal(isOwnerUser(OWNER_EMAIL, false), false);
  assert.equal(isOwnerUser('other@gmail.com', true), false);
  assert.equal(isOwnerUser(null, true), false);
});

test('CSV and email report exclude passwords and target owner email', () => {
  const evt = sanitizeLoginEvent({
    visitorName: 'Ananya',
    visitorEmail: 'ananya@example.com',
    loginMethod: 'google',
    deviceLabel: 'Android • Chrome',
    gymVibe: 'Mass Energy',
    loggedInAtMs: 1700000000000,
    syncedToCloud: true,
  });

  const csv = formatLoginAuditCsv([evt]);
  assert.ok(csv.includes('Ananya'));
  assert.ok(csv.includes('ananya@example.com'));
  assert.ok(!csv.toLowerCase().includes('password'));

  const mailto = buildOwnerEmailReportUrl([evt]);
  assert.ok(mailto.startsWith(`mailto:${OWNER_EMAIL}?`));
  assert.ok(mailto.includes('ananya%40example.com'));
});
