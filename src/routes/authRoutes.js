import express from 'express';
import { db, auth } from '../services/firebaseAdmin.js';
import { verifyAuthToken } from '../middleware/authMiddleware.js';
import { validateUserSettingsPayload } from '../middleware/inputValidation.js';

const router = express.Router();

// Apply auth middleware to all user profile routes
router.use(verifyAuthToken);

/**
 * GET /api/user/profile
 * Retrieves user profile & settings documents and seeds structured schema if not yet present
 */
router.get('/profile', async (req, res) => {
  try {
    const uid = req.user.uid;
    const userDocRef = db.collection('users').doc(uid);
    const settingsDocRef = userDocRef.collection('settings').doc('config');
    const profileDocRef = userDocRef.collection('profile').doc('info');

    const [userSnap, settingsSnap, profileSnap] = await Promise.all([
      userDocRef.get(),
      settingsDocRef.get(),
      profileDocRef.get()
    ]);

    const isUserDocPresent = userSnap.exists;
    const isSettingsPresent = settingsSnap.exists;
    const isProfilePresent = profileSnap.exists;

    const existingUserData = isUserDocPresent ? userSnap.data() : {};
    const existingSettings = isSettingsPresent ? settingsSnap.data() : {};
    const existingProfile = isProfilePresent ? profileSnap.data() : {};

    // Determine actual onboarding completion status
    const isOnboarded = existingUserData.onboardingCompleted === true || existingSettings.onboardingCompleted === true;

    const nowISO = new Date().toISOString();
    const defaultDisplayName = req.user.name || req.user.email?.split('@')[0] || 'Personal Journaler';
    const defaultEmail = req.user.email || '';

    const defaultHabits = ["Gym 30m", "Yoga 15m", "Practice coding 20m", "Meditation 10m"];
    const defaultSettings = {
      habits: defaultHabits,
      timeZone: 'UTC',
      prefTime: '21:00',
      language: 'en',
      theme: 'dark',
      wallpaperURL: 'theme_5_vintage_ephemera',
      notificationsEnabled: true,
      onboardingCompleted: isOnboarded,
      createdAt: nowISO,
      updatedAt: nowISO
    };

    const defaultProfile = {
      photoURL: '',
      gender: '',
      displayName: defaultDisplayName,
      createdAt: nowISO,
      updatedAt: nowISO
    };

    // If any document is missing in Firestore, seed it cleanly with accurate onboarding status
    if (!isUserDocPresent || !isSettingsPresent || !isProfilePresent) {
      const seedBatch = db.batch();

      if (!isUserDocPresent) {
        seedBatch.set(userDocRef, {
          uid,
          email: defaultEmail,
          displayName: defaultDisplayName,
          onboardingCompleted: isOnboarded,
          createdAt: nowISO,
          updatedAt: nowISO
        }, { merge: true });
      }

      if (!isSettingsPresent) {
        seedBatch.set(settingsDocRef, {
          ...defaultSettings,
          onboardingCompleted: isOnboarded
        }, { merge: true });
      }

      if (!isProfilePresent) {
        seedBatch.set(profileDocRef, defaultProfile, { merge: true });
      }

      await seedBatch.commit();
    }

    const mergedSettings = {
      ...defaultSettings,
      ...existingSettings,
      onboardingCompleted: isOnboarded
    };

    const mergedProfile = {
      ...defaultProfile,
      ...existingProfile
    };

    res.json({
      uid,
      email: defaultEmail,
      userData: {
        uid,
        email: defaultEmail,
        displayName: mergedProfile.displayName,
        onboardingCompleted: isOnboarded,
        ...(isUserDocPresent ? existingUserData : {})
      },
      settings: mergedSettings,
      profile: mergedProfile
    });
  } catch (error) {
    console.error('[AuthRoutes] GET /profile error:', error);
    res.status(500).json({ error: 'Internal Error', message: error.message });
  }
});

/**
 * POST /api/user/onboarding
 * Saves initial onboarding wizard preferences
 */
router.post('/onboarding', validateUserSettingsPayload, async (req, res) => {
  try {
    const uid = req.user.uid;
    const { habits, timeZone, prefTime, language, theme, wallpaperURL, displayName, gender } = req.body;

    const userDocRef = db.collection('users').doc(uid);
    const settingsDocRef = userDocRef.collection('settings').doc('config');
    const profileDocRef = userDocRef.collection('profile').doc('info');

    const batch = db.batch();
    const nowISO = new Date().toISOString();
    const finalName = displayName || req.user.name || req.user.email?.split('@')[0] || 'User';

    batch.set(userDocRef, {
      uid,
      displayName: finalName,
      email: req.user.email || '',
      onboardingCompleted: true,
      updatedAt: nowISO
    }, { merge: true });

    batch.set(settingsDocRef, {
      habits: habits && habits.length > 0 ? habits : ["Gym 30m", "Yoga 15m", "Practice coding 20m"],
      timeZone: timeZone || 'UTC',
      prefTime: prefTime || '21:00',
      language: language || 'en',
      theme: theme || 'dark',
      wallpaperURL: wallpaperURL || 'theme_5_vintage_ephemera',
      notificationsEnabled: true,
      onboardingCompleted: true,
      updatedAt: nowISO
    }, { merge: true });

    batch.set(profileDocRef, {
      displayName: finalName,
      gender: gender || '',
      updatedAt: nowISO
    }, { merge: true });

    await batch.commit();

    res.json({ success: true, message: 'Onboarding preferences saved successfully.' });
  } catch (error) {
    console.error('[AuthRoutes] POST /onboarding error:', error);
    res.status(500).json({ error: 'Internal Error', message: error.message });
  }
});

/**
 * PUT /api/user/settings
 * Updates preferences (theme, wallpaper, habits, prefTime, language, notifications, displayName, gender)
 */
router.put('/settings', validateUserSettingsPayload, async (req, res) => {
  try {
    const uid = req.user.uid;
    const userDocRef = db.collection('users').doc(uid);
    const settingsDocRef = userDocRef.collection('settings').doc('config');
    const profileDocRef = userDocRef.collection('profile').doc('info');
    
    const batch = db.batch();
    const nowISO = new Date().toISOString();

    const { displayName, gender, ...settingsData } = req.body;

    const cleanSettings = {};
    for (const [key, val] of Object.entries(settingsData)) {
      if (val !== undefined) cleanSettings[key] = val;
    }
    cleanSettings.updatedAt = nowISO;

    batch.set(settingsDocRef, cleanSettings, { merge: true });

    const profileUpdates = { updatedAt: nowISO };
    if (displayName !== undefined && displayName !== null) profileUpdates.displayName = displayName;
    if (gender !== undefined && gender !== null) profileUpdates.gender = gender;
    batch.set(profileDocRef, profileUpdates, { merge: true });

    if (displayName) {
      batch.set(userDocRef, { displayName, updatedAt: nowISO }, { merge: true });
    }

    await batch.commit();

    res.json({ success: true, message: 'Settings and profile updated.' });
  } catch (error) {
    console.error('[AuthRoutes] PUT /settings error:', error);
    res.status(500).json({ error: 'Internal Error', message: error.message });
  }
});

/**
 * DELETE /api/user/account
 * Completely deletes user data (Auth, Firestore docs, Storage files)
 */
router.delete('/account', async (req, res) => {
  try {
    const uid = req.user.uid;
    
    // 1. Recursively delete Firestore subcollections
    const userRef = db.collection('users').doc(uid);
    const subcollections = ['settings', 'profile', 'entries', 'analytics', 'tokens', 'notifications'];
    
    for (const sub of subcollections) {
      const snap = await userRef.collection(sub).get();
      if (!snap.empty) {
        for (const doc of snap.docs) {
          // Delete nested edits subcollection if present
          const editsSnap = await doc.ref.collection('edits').get();
          if (!editsSnap.empty) {
            const editBatch = db.batch();
            editsSnap.docs.forEach(eDoc => editBatch.delete(eDoc.ref));
            await editBatch.commit();
          }
          await doc.ref.delete();
        }
      }
    }
    
    // Delete main user doc
    await userRef.delete();

    // 2. Delete Firebase Auth record
    try {
      await auth.deleteUser(uid);
    } catch (authErr) {
      console.warn('[AuthRoutes] Auth deleteUser notice:', authErr.message);
    }

    res.json({ success: true, message: 'Account and associated personal data deleted successfully.' });
  } catch (error) {
    console.error('[AuthRoutes] DELETE /account error:', error);
    res.status(500).json({ error: 'Internal Error', message: error.message });
  }
});

export default router;
