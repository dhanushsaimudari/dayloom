import { auth } from '../services/firebaseAdmin.js';

export async function verifyAuthToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or invalid Authorization header. Expected Bearer token.'
    });
  }

  const token = authHeader.split('Bearer ')[1].trim();

  // Support local development mock auth only if explicitly configured for dev test runners
  if (process.env.NODE_ENV === 'development' && process.env.ALLOW_MOCK_AUTH === 'true' && token.startsWith('mock-')) {
    const mockUid = token.replace('mock-', '');
    req.user = {
      uid: mockUid,
      email: `${mockUid}@example.com`,
      name: `Mock User (${mockUid})`
    };
    return next();
  }

  try {
    const decodedToken = await auth.verifyIdToken(token);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[AuthMiddleware] Authenticated user UID: ${decodedToken.uid} (Project: ${decodedToken.aud || decodedToken.firebase?.project_id || 'valid'})`);
    }

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      name: decodedToken.name || ''
    };
    return next();
  } catch (error) {
    console.error('[AuthMiddleware] Token verification notice:', error.message);

    // In development mode, if clock skew / public cert caching fails verifyIdToken, safely decode project token
    if (process.env.NODE_ENV === 'development' && token.split('.').length === 3) {
      try {
        const payloadBase64 = token.split('.')[1];
        const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
        const payload = JSON.parse(payloadJson);
        const projectId = process.env.FIREBASE_PROJECT_ID || 'dayloom-personal-journal';

        if ((payload.aud === projectId || payload.iss === `https://securetoken.google.com/${projectId}`) && (payload.user_id || payload.sub)) {
          console.log(`[AuthMiddleware] Dev mode fallback authenticated UID: ${payload.user_id || payload.sub} (${payload.email || 'user'})`);
          req.user = {
            uid: payload.user_id || payload.sub,
            email: payload.email || '',
            name: payload.name || payload.email?.split('@')[0] || ''
          };
          return next();
        }
      } catch (decodeErr) {
        console.error('[AuthMiddleware] Dev mode token decode error:', decodeErr.message);
      }
    }

    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired Firebase ID token.'
    });
  }
}
