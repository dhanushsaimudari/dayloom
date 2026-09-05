import { initializeApp, getApps } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const rawApiKey = import.meta.env.VITE_FIREBASE_API_KEY;

// Check if a valid non-empty API key is provided
export const isFirebaseConfigured = Boolean(
  rawApiKey &&
  typeof rawApiKey === 'string' &&
  rawApiKey.trim() !== '' &&
  rawApiKey !== 'undefined' &&
  !rawApiKey.startsWith('YOUR_')
);

export const firebaseConfig = {
  apiKey: isFirebaseConfigured ? rawApiKey : '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'dayloom-personal-journal.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'dayloom-personal-journal',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'dayloom-personal-journal.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
};

let app = null;
let auth = null;
let db = null;
let firebaseInitError = null;

if (isFirebaseConfigured) {
  try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);

    // Connect to Local Firebase Emulators if configured
    if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
      try {
        connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
        connectFirestoreEmulator(db, '127.0.0.1', 8080);
        console.log('[FirebaseClient] Connected to Firebase Emulator Suite.');
      } catch (err) {
        console.warn('[FirebaseClient] Emulator connect notice:', err.message);
      }
    }
  } catch (err) {
    console.error('[FirebaseClient] Initialization error:', err);
    firebaseInitError = err;
  }
} else {
  const missingMsg =
    'Firebase environment variables (VITE_FIREBASE_API_KEY) are missing or undefined. ' +
    'The frontend bundle was built without Firebase configuration.';
  console.warn(`[FirebaseClient] ${missingMsg}`);
  firebaseInitError = new Error(missingMsg);
}

export { app, auth, db, firebaseInitError };
export default app;
