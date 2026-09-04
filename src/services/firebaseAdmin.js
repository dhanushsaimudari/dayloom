import admin from 'firebase-admin';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

// Determine if running in Firebase Emulator or Live Cloud Environment
const isEmulator = process.env.USE_FIREBASE_EMULATOR === '1' || process.env.USE_FIREBASE_EMULATOR === 'true';

if (isEmulator) {
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
  process.env.FIREBASE_STORAGE_EMULATOR_HOST = process.env.FIREBASE_STORAGE_EMULATOR_HOST || '127.0.0.1:9199';
} else {
  delete process.env.FIRESTORE_EMULATOR_HOST;
  delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
  delete process.env.FIREBASE_STORAGE_EMULATOR_HOST;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!admin.apps.length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID || 'dayloom-personal-journal';
    const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`;

    // 1. Check for local service account key file
    const serviceAccountFilePath = process.env.GOOGLE_APPLICATION_CREDENTIALS 
      ? path.resolve(process.cwd(), process.env.GOOGLE_APPLICATION_CREDENTIALS)
      : path.resolve(__dirname, '../../service-account-key.json');

    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (fs.existsSync(serviceAccountFilePath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountFilePath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || projectId,
        storageBucket,
      });
      console.log(`[FirebaseAdmin] Initialized successfully with Service Account Key file for project: ${serviceAccount.project_id || projectId}`);
    } else if (privateKey && clientEmail) {
      if (typeof privateKey === 'string') {
        privateKey = privateKey.replace(/\\n/g, '\n').trim();
      }
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        storageBucket,
      });
      console.log(`[FirebaseAdmin] Initialized successfully with environment Service Account for project: ${projectId}`);
    } else {
      // Default Application Credentials (GCP / Cloud Run auto-authentication or Emulator)
      admin.initializeApp({
        projectId,
        storageBucket,
      });
      console.log(`[FirebaseAdmin] Initialized with Application Default Credentials (ADC) for project: ${projectId}`);
    }
  } catch (error) {
    console.warn(`[FirebaseAdmin] Fallback initialization notice: ${error.message}`);
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'dayloom-personal-journal',
    });
  }
}

export const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });
export const auth = admin.auth();
export const storage = admin.storage();
export default admin;
