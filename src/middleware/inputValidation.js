/**
 * Centralized Input Validation & Mass Assignment Prevention Middleware
 */

const ALLOWED_MOODS = ['very_happy', 'happy', 'neutral', 'sad', 'anxious', 'stressed'];
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_REGEX = /^\d{4}-\d{2}$/;

/**
 * Validates check-in payload
 */
export function validateCheckinPayload(req, res, next) {
  const { mood, tasks, text, entryDate, time, timezone } = req.body;

  if (entryDate && (!DATE_REGEX.test(entryDate) || isNaN(Date.parse(entryDate)))) {
    return res.status(400).json({ error: 'Bad Request', message: 'entryDate must be a valid YYYY-MM-DD string.' });
  }

  if (mood && !ALLOWED_MOODS.includes(mood)) {
    return res.status(400).json({ error: 'Bad Request', message: `mood must be one of: ${ALLOWED_MOODS.join(', ')}.` });
  }

  if (text && typeof text === 'string' && text.length > 10000) {
    return res.status(400).json({ error: 'Bad Request', message: 'Reflection text exceeds maximum allowed length (10,000 characters).' });
  }

  if (timezone && (typeof timezone !== 'string' || timezone.length > 100)) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid timezone string.' });
  }

  if (tasks && (typeof tasks !== 'object' || Array.isArray(tasks))) {
    return res.status(400).json({ error: 'Bad Request', message: 'tasks must be an object of habit booleans.' });
  }

  // Prevent mass assignment of immutable/system fields
  delete req.body.createdAt;
  delete req.body.userId;
  delete req.body.uid;

  next();
}

/**
 * Validates entry edit payload
 */
export function validateEditPayload(req, res, next) {
  const { mood, text, missedDayReason, tasks } = req.body;

  if (mood && !ALLOWED_MOODS.includes(mood)) {
    return res.status(400).json({ error: 'Bad Request', message: `mood must be one of: ${ALLOWED_MOODS.join(', ')}.` });
  }

  if (text && typeof text === 'string' && text.length > 10000) {
    return res.status(400).json({ error: 'Bad Request', message: 'Reflection text exceeds maximum allowed length (10,000 characters).' });
  }

  if (missedDayReason && typeof missedDayReason === 'string' && missedDayReason.length > 1000) {
    return res.status(400).json({ error: 'Bad Request', message: 'Reason string exceeds maximum length (1,000 characters).' });
  }

  if (tasks && (typeof tasks !== 'object' || Array.isArray(tasks))) {
    return res.status(400).json({ error: 'Bad Request', message: 'tasks must be an object of habit booleans.' });
  }

  // Reject attempts to alter immutable fields
  delete req.body.entryDate;
  delete req.body.createdAt;
  delete req.body.userId;
  delete req.body.uid;
  delete req.body.entryId;

  next();
}

/**
 * Validates retroactive entry payload
 */
export function validateRetroactivePayload(req, res, next) {
  const { missedDate, reason, mood, text } = req.body;

  if (!missedDate || !DATE_REGEX.test(missedDate) || isNaN(Date.parse(missedDate))) {
    return res.status(400).json({ error: 'Bad Request', message: 'missedDate is required and must be a valid YYYY-MM-DD string.' });
  }

  if (mood && !ALLOWED_MOODS.includes(mood)) {
    return res.status(400).json({ error: 'Bad Request', message: `mood must be one of: ${ALLOWED_MOODS.join(', ')}.` });
  }

  if (text && typeof text === 'string' && text.length > 10000) {
    return res.status(400).json({ error: 'Bad Request', message: 'Reflection text exceeds maximum allowed length (10,000 characters).' });
  }

  if (reason && typeof reason === 'string' && reason.length > 1000) {
    return res.status(400).json({ error: 'Bad Request', message: 'Reason string exceeds maximum length (1,000 characters).' });
  }

  delete req.body.createdAt;
  delete req.body.userId;

  next();
}

/**
 * Validates user profile & settings payload
 */
export function validateUserSettingsPayload(req, res, next) {
  const { displayName, gender, language, theme, wallpaperURL, prefTime, habits } = req.body;

  if (displayName && (typeof displayName !== 'string' || displayName.length > 100)) {
    return res.status(400).json({ error: 'Bad Request', message: 'displayName must be a string up to 100 characters.' });
  }

  if (gender && (typeof gender !== 'string' || gender.length > 50)) {
    return res.status(400).json({ error: 'Bad Request', message: 'gender must be a string up to 50 characters.' });
  }

  if (language && (typeof language !== 'string' || language.length > 10)) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid language code.' });
  }

  if (theme && !['dark', 'light', 'system'].includes(theme)) {
    return res.status(400).json({ error: 'Bad Request', message: 'theme must be dark, light, or system.' });
  }

  if (wallpaperURL && (typeof wallpaperURL !== 'string' || wallpaperURL.length > 200)) {
    return res.status(400).json({ error: 'Bad Request', message: 'wallpaperURL must be a valid preset or string identifier.' });
  }

  if (prefTime && !/^\d{2}:\d{2}$/.test(prefTime)) {
    return res.status(400).json({ error: 'Bad Request', message: 'prefTime must be formatted as HH:mm.' });
  }

  if (habits && !Array.isArray(habits)) {
    return res.status(400).json({ error: 'Bad Request', message: 'habits must be an array of strings.' });
  }

  delete req.body.uid;
  delete req.body.email;
  delete req.body.createdAt;

  next();
}

/**
 * Validates Gemini chat payload
 */
export function validateChatPayload(req, res, next) {
  const { prompt, previousMessages } = req.body;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'Bad Request', message: 'prompt string is required.' });
  }

  if (prompt.length > 5000) {
    return res.status(400).json({ error: 'Bad Request', message: 'Prompt exceeds maximum length of 5,000 characters.' });
  }

  if (previousMessages && !Array.isArray(previousMessages)) {
    return res.status(400).json({ error: 'Bad Request', message: 'previousMessages must be an array.' });
  }

  next();
}

/**
 * Validates monthly analytics format YYYY-MM
 */
export function validateMonthParam(req, res, next) {
  const { monthId } = req.params;
  if (!monthId || !MONTH_REGEX.test(monthId)) {
    return res.status(400).json({ error: 'Bad Request', message: 'monthId must be formatted as YYYY-MM.' });
  }
  next();
}
