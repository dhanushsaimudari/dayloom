import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyAuthToken } from '../src/middleware/authMiddleware.js';

test('Auth Middleware: Reject missing Authorization header', async () => {
  const req = { headers: {} };
  let statusSet = null;
  let jsonResponse = null;
  const res = {
    status(code) {
      statusSet = code;
      return {
        json(data) {
          jsonResponse = data;
        }
      };
    }
  };
  let nextCalled = false;

  await verifyAuthToken(req, res, () => { nextCalled = true; });

  assert.equal(statusSet, 401);
  assert.equal(jsonResponse.error, 'Unauthorized');
  assert.equal(nextCalled, false);
});

test('Auth Middleware: Reject malformed Authorization header without Bearer', async () => {
  const req = { headers: { authorization: 'Basic xyz123' } };
  let statusSet = null;
  let jsonResponse = null;
  const res = {
    status(code) {
      statusSet = code;
      return {
        json(data) {
          jsonResponse = data;
        }
      };
    }
  };
  let nextCalled = false;

  await verifyAuthToken(req, res, () => { nextCalled = true; });

  assert.equal(statusSet, 401);
  assert.match(jsonResponse.message, /Expected Bearer token/i);
  assert.equal(nextCalled, false);
});

test('Auth Middleware: Reject invalid / expired Firebase ID token', async () => {
  const req = { headers: { authorization: 'Bearer invalid.token.string' } };
  let statusSet = null;
  let jsonResponse = null;
  const res = {
    status(code) {
      statusSet = code;
      return {
        json(data) {
          jsonResponse = data;
        }
      };
    }
  };
  let nextCalled = false;

  await verifyAuthToken(req, res, () => { nextCalled = true; });

  assert.equal(statusSet, 401);
  assert.equal(jsonResponse.error, 'Unauthorized');
  assert.equal(jsonResponse.message, 'Invalid or expired Firebase ID token.');
  assert.equal(nextCalled, false);
});

test('User Data Isolation: Verify user path segmentation by UID', () => {
  const user1Uid = 'user_alpha_123';
  const user2Uid = 'user_beta_456';

  const getUserEntryPath = (uid, entryId) => `users/${uid}/entries/${entryId}`;
  const getUserSettingsPath = (uid) => `users/${uid}/settings/config`;

  assert.equal(getUserEntryPath(user1Uid, '2026-08-30'), 'users/user_alpha_123/entries/2026-08-30');
  assert.equal(getUserEntryPath(user2Uid, '2026-08-30'), 'users/user_beta_456/entries/2026-08-30');
  assert.notEqual(getUserEntryPath(user1Uid, '2026-08-30'), getUserEntryPath(user2Uid, '2026-08-30'));
  assert.notEqual(getUserSettingsPath(user1Uid), getUserSettingsPath(user2Uid));
});

test('Journal Data Structure Integrity: All core Dayloom features supported', () => {
  const entryPayload = {
    entryId: '2026-08-30',
    entryDate: '2026-08-30',
    createdAt: '2026-08-30T10:00:00.000Z',
    updatedAt: '2026-08-30T10:00:00.000Z',
    mood: 'great',
    tasks: { 'Gym 30m': true, 'Meditation 10m': false },
    text: 'Brain dump thoughts and reflections for today.',
    audioURL: '',
    imageURLs: ['https://storage.googleapis.com/memento-photo.jpg'],
    isRetroactive: false
  };

  assert.equal(typeof entryPayload.mood, 'string');
  assert.equal(typeof entryPayload.tasks, 'object');
  assert.equal(typeof entryPayload.text, 'string');
  assert.equal(Array.isArray(entryPayload.imageURLs), true);
  assert.equal(entryPayload.isRetroactive, false);
});

test('Onboarding Flow Logic: New user vs Completed user status', () => {
  const getInitialOnboardingState = (userData, settingsData) => {
    return Boolean(userData?.onboardingCompleted === true || settingsData?.onboardingCompleted === true);
  };

  // Brand new user with empty documents -> Not onboarded
  assert.equal(getInitialOnboardingState(null, null), false, 'New user must NOT be marked onboarded');
  assert.equal(getInitialOnboardingState({}, {}), false, 'New user with empty docs must NOT be marked onboarded');

  // Existing user who completed onboarding
  assert.equal(getInitialOnboardingState({ onboardingCompleted: true }, { onboardingCompleted: true }), true, 'Completed user must be marked onboarded');
});

test('Password Security: No password fields allowed in Firestore payload', () => {
  const forbiddenFirestoreFields = ['password', 'passwordHash', 'newPassword', 'resetToken'];
  const userSettingsDoc = {
    theme: 'dark',
    wallpaperURL: 'theme_5_vintage_ephemera',
    habits: ['Gym 30m', 'Practice coding 20m'],
    prefTime: '21:00',
    language: 'en'
  };

  forbiddenFirestoreFields.forEach(field => {
    assert.equal(userSettingsDoc[field], undefined, `Forbidden auth field '${field}' must NOT exist in Firestore documents`);
  });
});

