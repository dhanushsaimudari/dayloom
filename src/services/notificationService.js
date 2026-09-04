import { db } from './firebaseAdmin.js';

/**
 * Generates gentle, non-guilt-based reminder copy
 */
export function getGentleReminderCopy(missedDaysCount = 1) {
  if (missedDaysCount === 1) {
    return {
      title: "Gentle Dayloom Reminder",
      body: "Yesterday is still waiting for you. Want to remember anything?"
    };
  }
  return {
    title: "Gentle Dayloom Reminder",
    body: "It's been a few days. No pressure — want to add anything you remember?"
  };
}

/**
 * Checks missed days and returns gentle non-guilt prompts
 */
export async function calculateMissedDaysPrompt(uid) {
  const userRef = db.collection('users').doc(uid);
  const settingsSnap = await userRef.collection('settings').doc('config').get();
  
  const settings = settingsSnap.exists ? settingsSnap.data() : {};
  const notificationsEnabled = settings.notificationsEnabled !== false; // Default true

  if (!notificationsEnabled) {
    return {
      notificationsEnabled: false,
      missedYesterday: false,
      missedDaysCount: 0,
      prompt: null
    };
  }

  const entriesRef = userRef.collection('entries');
  const now = new Date();
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayISO = yesterday.toISOString().split('T')[0];

  const twoDaysAgo = new Date(now);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const twoDaysAgoISO = twoDaysAgo.toISOString().split('T')[0];

  const todayISO = now.toISOString().split('T')[0];

  const [yesterdaySnap, twoDaysAgoSnap, todaySnap] = await Promise.all([
    entriesRef.doc(yesterdayISO).get(),
    entriesRef.doc(twoDaysAgoISO).get(),
    entriesRef.doc(todayISO).get()
  ]);

  const missedYesterday = !yesterdaySnap.exists;
  const missedTwoDaysAgo = !twoDaysAgoSnap.exists;
  const checkedInToday = todaySnap.exists;

  let missedDaysCount = 0;
  if (missedYesterday) missedDaysCount++;
  if (missedYesterday && missedTwoDaysAgo) missedDaysCount++;

  let prompt = null;
  if (missedDaysCount > 0) {
    const copy = getGentleReminderCopy(missedDaysCount);
    prompt = copy.body;
  }

  return {
    notificationsEnabled: true,
    yesterdayISO,
    todayISO,
    missedYesterday,
    missedDaysCount,
    checkedInToday,
    preferredTime: settings.prefTime || '21:00',
    prompt
  };
}

/**
 * Registers FCM Push Notification Token
 */
export async function registerFcmToken(uid, fcmToken) {
  if (!fcmToken || typeof fcmToken !== 'string') {
    throw new Error('Valid fcmToken string is required.');
  }

  const docId = fcmToken.slice(0, 40).replace(/[^a-zA-Z0-9_-]/g, '_');
  const tokenRef = db.collection('users').doc(uid).collection('tokens').doc(docId);

  await tokenRef.set({
    fcmToken,
    updatedAt: new Date().toISOString()
  }, { merge: true });

  return { success: true, message: 'FCM token registered successfully.' };
}
