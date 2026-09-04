import express from 'express';
import { verifyAuthToken } from '../middleware/authMiddleware.js';
import { calculateMissedDaysPrompt, registerFcmToken } from '../services/notificationService.js';

const router = express.Router();
router.use(verifyAuthToken);

/**
 * GET /api/notifications/check-missed
 * Checks for missed days and returns gentle non-guilt prompts if enabled
 */
router.get('/check-missed', async (req, res) => {
  try {
    const uid = req.user.uid;
    const result = await calculateMissedDaysPrompt(uid);
    res.json(result);
  } catch (error) {
    console.error('[NotificationRoutes] GET /check-missed error:', error);
    res.status(500).json({ error: 'Internal Error', message: error.message });
  }
});

/**
 * POST /api/notifications/register-token
 * Registers FCM Push Notification token
 */
router.post('/register-token', async (req, res) => {
  try {
    const uid = req.user.uid;
    const { fcmToken } = req.body;

    if (!fcmToken) {
      return res.status(400).json({ error: 'Bad Request', message: 'fcmToken string is required.' });
    }

    const result = await registerFcmToken(uid, fcmToken);
    res.json(result);
  } catch (error) {
    console.error('[NotificationRoutes] POST /register-token error:', error);
    res.status(500).json({ error: 'Internal Error', message: error.message });
  }
});

export default router;
