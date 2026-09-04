import { storage } from './firebaseAdmin.js';

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/jpg',
  'audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/ogg'
];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * Validates uploaded media file metadata
 */
export function validateMediaFile(file) {
  if (!file || !file.buffer) {
    throw new Error('Media buffer is required.');
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File size exceeds maximum limit of 10MB (${(file.size / (1024 * 1024)).toFixed(2)}MB).`);
  }

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new Error(`Unsupported MIME type '${file.mimetype}'.`);
  }

  return true;
}

/**
 * Securely uploads media file to user-isolated GCS / Firebase Storage path
 */
export async function uploadUserMedia({ uid, entryDate, file, category = 'memento' }) {
  validateMediaFile(file);

  const cleanUid = uid.replace(/[^a-zA-Z0-9_-]/g, '');
  const cleanDate = entryDate.replace(/[^0-9-]/g, '');
  const fileExt = file.mimetype.split('/')[1] || 'bin';
  const filename = `${category}-${Date.now()}.${fileExt}`;

  // User-isolated storage path
  const storagePath = `users/${cleanUid}/media/journal/${cleanDate}/${filename}`;
  const bucket = storage.bucket();
  const fileRef = bucket.file(storagePath);

  await fileRef.save(file.buffer, {
    metadata: {
      contentType: file.mimetype,
      metadata: {
        ownerUid: cleanUid,
        entryDate: cleanDate,
        uploadedAt: new Date().toISOString()
      }
    }
  });

  return {
    storagePath,
    filename,
    mimeType: file.mimetype,
    size: file.size
  };
}

/**
 * Securely deletes media file if it belongs to the authenticated user
 */
export async function deleteUserMedia({ uid, storagePath }) {
  const cleanUid = uid.replace(/[^a-zA-Z0-9_-]/g, '');
  const expectedPrefix = `users/${cleanUid}/media/`;

  if (!storagePath || !storagePath.startsWith(expectedPrefix)) {
    throw new Error('Unauthorized or invalid storage path.');
  }

  const bucket = storage.bucket();
  const fileRef = bucket.file(storagePath);
  const [exists] = await fileRef.exists();

  if (exists) {
    await fileRef.delete();
  }

  return { success: true, message: 'Media file deleted.' };
}
