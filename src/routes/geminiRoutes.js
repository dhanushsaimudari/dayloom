import express from 'express';
import multer from 'multer';
import { verifyAuthToken } from '../middleware/authMiddleware.js';
import { validateChatPayload } from '../middleware/inputValidation.js';
import { chatTurn, transcribeAudio, captionImageMemory, summarizeReflectraSession } from '../services/geminiService.js';

const router = express.Router();
router.use(verifyAuthToken);

// Configure in-memory storage for audio/image processing (max 10MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const ALLOWED_AUDIO_TYPES = ['audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/ogg'];

/**
 * POST /api/gemini/summarize-session
 * Synthesize chat session into first-person journal entry
 */
router.post('/summarize-session', async (req, res) => {
  try {
    const { messages, userContext } = req.body;
    const result = await summarizeReflectraSession({
      messages: messages || [],
      userContext: userContext || {}
    });
    res.json(result);
  } catch (error) {
    console.error('[GeminiRoutes] POST /summarize-session error:', error);
    res.status(500).json({ error: 'Internal Error', message: error.message });
  }
});

/**
 * POST /api/gemini/chat
 * Multi-turn Reflectra Chat Turn
 */
router.post('/chat', validateChatPayload, async (req, res) => {
  try {
    const { prompt, previousMessages, userContext } = req.body;

    const result = await chatTurn({
      prompt,
      previousMessages: previousMessages || [],
      userContext: userContext || {}
    });

    res.json(result);
  } catch (error) {
    console.error('[GeminiRoutes] POST /chat error:', error);
    res.status(500).json({ error: 'Internal Error', message: error.message });
  }
});

/**
 * POST /api/gemini/transcribe
 * Audio upload to Gemini transcription
 */
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Bad Request', message: 'No audio file uploaded.' });
    }

    if (!ALLOWED_AUDIO_TYPES.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Bad Request', message: `Invalid audio type ${req.file.mimetype}. Allowed: WEBM, MP3, WAV, M4A, OGG.` });
    }

    const result = await transcribeAudio({
      audioBuffer: req.file.buffer,
      mimeType: req.file.mimetype
    });

    res.json(result);
  } catch (error) {
    console.error('[GeminiRoutes] POST /transcribe error:', error);
    res.status(500).json({ error: 'Internal Error', message: error.message });
  }
});

/**
 * POST /api/gemini/caption
 * Memento Photo analysis & reflection
 */
router.post('/caption', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Bad Request', message: 'No image file uploaded.' });
    }

    if (!ALLOWED_IMAGE_TYPES.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Bad Request', message: `Invalid image type ${req.file.mimetype}. Allowed: JPEG, PNG, WEBP.` });
    }

    const userPrompt = req.body.userPrompt || '';
    const result = await captionImageMemory({
      imageBuffer: req.file.buffer,
      mimeType: req.file.mimetype,
      userPrompt
    });

    res.json(result);
  } catch (error) {
    console.error('[GeminiRoutes] POST /caption error:', error);
    res.status(500).json({ error: 'Internal Error', message: error.message });
  }
});

export default router;

