import express from 'express';
import { db } from '../services/firebaseAdmin.js';
import { verifyAuthToken } from '../middleware/authMiddleware.js';
import { validateCheckinPayload, validateEditPayload, validateRetroactivePayload } from '../middleware/inputValidation.js';

const router = express.Router();
router.use(verifyAuthToken);

/**
 * Helper to get user's entries collection reference
 */
function getEntriesRef(uid) {
  return db.collection('users').doc(uid).collection('entries');
}

/**
 * Helper to get today's YYYY-MM-DD string in user's timezone or UTC
 */
function getTodayDateString(userTimezone) {
  try {
    const options = { timeZone: userTimezone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' };
    const formatter = new Intl.DateTimeFormat('en-CA', options); // Returns YYYY-MM-DD
    return formatter.format(new Date());
  } catch (e) {
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * POST /api/journal/checkin
 * Quick Daily Check-In (~10s)
 * Enforces server-side createdAt timestamp, rejects future dates, and prevents duplicates.
 */
router.post('/checkin', validateCheckinPayload, async (req, res) => {
  try {
    const uid = req.user.uid;
    const { mood, tasks, text, entryDate, time, timezone } = req.body;

    const userTz = timezone || 'UTC';
    const serverTodayStr = getTodayDateString(userTz);
    const targetDate = entryDate || serverTodayStr;

    // Reject future dates
    if (targetDate > serverTodayStr) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Cannot create future journal entries. Normal check-in is for the current day.'
      });
    }

    // Reject entries older than 7 days
    const targetDateObj = new Date(targetDate + 'T00:00:00');
    const todayObj = new Date(serverTodayStr + 'T00:00:00');
    const diffDays = Math.floor((todayObj.getTime() - targetDateObj.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 7) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Entries can only be recorded for today or within the past 7 days.'
      });
    }

    const entryId = targetDate;
    const entryRef = getEntriesRef(uid).doc(entryId);
    const existingSnap = await entryRef.get();
    const existingData = existingSnap.exists ? existingSnap.data() : {};
    const nowISO = new Date().toISOString();

    // Append-only policy: Once journaled, existing entries are read-only and cannot be removed or overwritten.
    // Adding a new paragraph or Reflectra summary preserves the old journal and appends the new text.
    let resolvedText = '';
    const prevText = (existingData.text || '').trim();
    const incomingText = (typeof text === 'string') ? text.trim() : '';

    if (!prevText) {
      resolvedText = incomingText;
    } else if (!incomingText) {
      resolvedText = prevText;
    } else if (incomingText === prevText) {
      resolvedText = prevText;
    } else if (incomingText.startsWith(prevText) || incomingText.includes(prevText)) {
      resolvedText = incomingText;
    } else {
      // Append new reflection paragraph, strictly preserving the prior journal as read-only
      resolvedText = `${prevText}\n\n${incomingText}`;
    }

    // Preserve existing tasks or merge with incoming tasks
    let resolvedTasks = {};
    if (tasks !== undefined && typeof tasks === 'object' && Object.keys(tasks).length > 0) {
      resolvedTasks = { ...(existingData.tasks || {}), ...tasks };
    } else if (existingData.tasks) {
      resolvedTasks = existingData.tasks;
    } else {
      resolvedTasks = tasks || {};
    }

    const incomingImages = (req.body.imageURLs && Array.isArray(req.body.imageURLs)) ? req.body.imageURLs : [];
    const existingImages = (existingData.imageURLs && Array.isArray(existingData.imageURLs)) ? existingData.imageURLs : [];
    const resolvedImages = Array.from(new Set([...existingImages, ...incomingImages]));

    // Record audit edit version if entry already existed and new text is being added
    if (existingSnap.exists && incomingText && incomingText !== prevText) {
      const versionId = `v-${Date.now()}`;
      await entryRef.collection('edits').doc(versionId).set({
        versionId,
        editedAt: nowISO,
        previousState: {
          text: existingData.text || '',
          mood: existingData.mood || 'neutral',
          tasks: existingData.tasks || {},
          updatedAt: existingData.updatedAt || existingData.createdAt
        },
        action: 'append_journal'
      }).catch(() => {});
    }

    const entryData = {
      entryId,
      entryDate: targetDate,
      // Client cannot control authoritative creation timestamp
      createdAt: existingSnap.exists ? (existingData.createdAt || nowISO) : nowISO,
      updatedAt: nowISO,
      timezone: userTz,
      time: time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mood: mood || existingData.mood || 'neutral',
      tasks: resolvedTasks,
      text: resolvedText,
      audioURL: existingData.audioURL || '',
      imageURLs: resolvedImages,
      isRetroactive: false
    };

    await entryRef.set(entryData, { merge: true });

    // Invalidate cached monthly analytics report for this month so analytics dashboard updates immediately
    const targetMonthId = targetDate.slice(0, 7);
    await db.collection('users').doc(uid).collection('analytics').doc('monthly').collection('reports').doc(targetMonthId).delete().catch(() => {});

    res.json({
      success: true,
      message: 'Journal entry saved successfully.',
      entry: entryData
    });
  } catch (error) {
    console.error('[JournalRoutes] POST /checkin error:', error);
    res.status(500).json({ error: 'Internal Error', message: error.message });
  }
});

/**
 * GET /api/journal/entry/:entryDate
 * Fetch entry for specific YYYY-MM-DD date
 */
router.get('/entry/:entryDate', async (req, res) => {
  try {
    const uid = req.user.uid;
    const { entryDate } = req.params;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) {
      return res.status(400).json({ error: 'Bad Request', message: 'entryDate parameter must be YYYY-MM-DD.' });
    }

    const entryRef = getEntriesRef(uid).doc(entryDate);
    const snap = await entryRef.get();

    if (!snap.exists) {
      return res.status(404).json({
        found: false,
        entryDate,
        message: 'No entry found for this date.'
      });
    }

    // Fetch audit edit history subcollection if present
    const editsSnap = await entryRef.collection('edits').orderBy('editedAt', 'desc').get();
    const edits = editsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    res.json({
      found: true,
      entry: snap.data(),
      edits
    });
  } catch (error) {
    console.error('[JournalRoutes] GET /entry error:', error);
    res.status(500).json({ error: 'Internal Error', message: error.message });
  }
});

/**
 * GET /api/journal/entries
 * Returns entries summary map for Diarium calendar view
 */
router.get('/entries', async (req, res) => {
  try {
    const uid = req.user.uid;
    const snap = await getEntriesRef(uid).get();

    const entries = snap.docs.map(doc => {
      const data = doc.data();
      const entryDate = data.entryDate || doc.id;
      return {
        entryId: doc.id,
        entryDate,
        createdAt: data.createdAt || data.updatedAt || new Date().toISOString(),
        mood: data.mood || 'neutral',
        text: data.text || '',
        tasks: data.tasks || {},
        hasText: Boolean(data.text && data.text.trim()),
        hasAudio: Boolean(data.audioURL),
        hasPhoto: Boolean(data.imageURLs && data.imageURLs.length > 0),
        imageURLs: data.imageURLs || [],
        tasksCount: data.tasks ? Object.values(data.tasks).filter(Boolean).length : 0,
        isRetroactive: Boolean(data.isRetroactive),
        missedDayReason: data.missedDayReason || ''
      };
    });

    // In-memory sort by date descending
    entries.sort((a, b) => b.entryDate.localeCompare(a.entryDate));

    res.json({ entries });
  } catch (error) {
    console.error('[JournalRoutes] GET /entries error:', error);
    res.status(500).json({ error: 'Internal Error', message: error.message });
  }
});

/**
 * PUT /api/journal/entry/:entryId
 * Edit journal entry with strict 24-hour edit window enforcement & append-only versioning.
 */
router.put('/entry/:entryId', validateEditPayload, async (req, res) => {
  try {
    const uid = req.user.uid;
    const { entryId } = req.params;
    const { mood, tasks, text, audioURL, imageURLs, missedDayReason } = req.body;

    const entryRef = getEntriesRef(uid).doc(entryId);
    const snap = await entryRef.get();

    if (!snap.exists) {
      return res.status(404).json({ error: 'Not Found', message: 'Entry does not exist.' });
    }

    const currentData = snap.data();
    const serverTodayStr = getTodayDateString(currentData.timezone || 'UTC');

    // Reject future dates
    if (entryId > serverTodayStr) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Cannot modify future dates.'
      });
    }

    // Enforce 7-day edit window from creation timestamp
    const createdTimestamp = currentData.createdAt ? new Date(currentData.createdAt).getTime() : new Date(entryId + 'T00:00:00Z').getTime();
    const nowTimestamp = Date.now();
    const diffHours = (nowTimestamp - createdTimestamp) / (1000 * 60 * 60);

    if (diffHours > 7 * 24) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Edit window expired. Entries can only be modified within 7 days of creation (${(diffHours / 24).toFixed(1)} days elapsed).`
      });
    }

    // Record audit edit version in /edits subcollection
    const versionId = `v-${Date.now()}`;
    await entryRef.collection('edits').doc(versionId).set({
      versionId,
      editedAt: new Date().toISOString(),
      previousState: {
        text: currentData.text || '',
        mood: currentData.mood || 'neutral',
        tasks: currentData.tasks || {},
        updatedAt: currentData.updatedAt || currentData.createdAt
      },
      hoursElapsed: parseFloat(diffHours.toFixed(2))
    });

    // Apply updates (entryDate, createdAt, userId cannot be modified)
    // Append-only policy: Once journaled, existing entries are read-only and cannot be removed or overwritten.
    // Adding a new paragraph preserves the old journal and appends the new text.
    const updatedFields = {
      updatedAt: new Date().toISOString()
    };
    if (mood !== undefined) updatedFields.mood = mood;
    if (tasks !== undefined && typeof tasks === 'object') {
      updatedFields.tasks = { ...(currentData.tasks || {}), ...tasks };
    }
    if (text !== undefined) {
      const prevText = (currentData.text || '').trim();
      const incomingText = (typeof text === 'string') ? text.trim() : '';

      if (!prevText) {
        updatedFields.text = incomingText;
      } else if (!incomingText) {
        updatedFields.text = prevText;
      } else if (incomingText === prevText) {
        updatedFields.text = prevText;
      } else if (incomingText.startsWith(prevText) || incomingText.includes(prevText)) {
        updatedFields.text = incomingText;
      } else {
        // Incoming text is a new addition; append as new paragraph to protect existing journal as read-only
        updatedFields.text = `${prevText}\n\n${incomingText}`;
      }
    }
    if (audioURL !== undefined) updatedFields.audioURL = audioURL;
    if (imageURLs !== undefined && Array.isArray(imageURLs)) {
      const existingImgs = Array.isArray(currentData.imageURLs) ? currentData.imageURLs : [];
      updatedFields.imageURLs = Array.from(new Set([...existingImgs, ...imageURLs]));
    }
    if (missedDayReason !== undefined) updatedFields.missedDayReason = missedDayReason;

    await entryRef.update(updatedFields);

    // Invalidate cached monthly analytics report for this month so analytics dashboard updates immediately
    const targetMonthId = entryId.slice(0, 7);
    await db.collection('users').doc(uid).collection('analytics').doc('monthly').collection('reports').doc(targetMonthId).delete().catch(() => {});

    res.json({
      success: true,
      versionCreated: versionId,
      message: 'Entry updated successfully within the 7-day editing window.'
    });
  } catch (error) {
    console.error('[JournalRoutes] PUT /entry error:', error);
    res.status(500).json({ error: 'Internal Error', message: error.message });
  }
});

/**
 * POST /api/journal/retroactive
 * Retroactive entry for a past missed day
 */
router.post('/retroactive', validateRetroactivePayload, async (req, res) => {
  try {
    const uid = req.user.uid;
    const { missedDate, reason, mood, text, timezone } = req.body;

    const userTz = timezone || 'UTC';
    const todayStr = getTodayDateString(userTz);

    // Reject retroactive entries for today or future dates
    if (missedDate >= todayStr) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Retroactive entries must be for a past missed date (prior to ${todayStr}).`
      });
    }

    // Reject dates older than 7 days
    const missedDateObj = new Date(missedDate + 'T00:00:00');
    const todayObj = new Date(todayStr + 'T00:00:00');
    const diffDays = Math.floor((todayObj.getTime() - missedDateObj.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 7) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Retroactive entries can only be recorded within 7 days of the missed date.'
      });
    }

    const entryId = missedDate;
    const entryRef = getEntriesRef(uid).doc(entryId);
    const existingSnap = await entryRef.get();

    // If retroactive entry already exists and was created > 24h ago, reject edit
    if (existingSnap.exists) {
      const createdAtTime = new Date(existingSnap.data().createdAt || Date.now()).getTime();
      const hoursElapsed = (Date.now() - createdAtTime) / (1000 * 60 * 60);
      if (hoursElapsed > 24) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Retroactive entry for this date was already created over 24 hours ago and can no longer be modified.'
        });
      }
    }

    const nowISO = new Date().toISOString();
    const prevText = (existingSnap.exists && existingSnap.data().text) ? existingSnap.data().text.trim() : '';
    let resolvedRetroText = '';
    const incomingRetroText = (text || (reason ? `Retroactive Reflection: ${reason}` : '')).trim();

    if (!prevText) {
      resolvedRetroText = incomingRetroText;
    } else if (!incomingRetroText || incomingRetroText === prevText) {
      resolvedRetroText = prevText;
    } else if (incomingRetroText.startsWith(prevText) || incomingRetroText.includes(prevText)) {
      resolvedRetroText = incomingRetroText;
    } else {
      resolvedRetroText = `${prevText}\n\n${incomingRetroText}`;
    }

    const retroactiveEntry = {
      entryId,
      entryDate: missedDate,
      createdAt: existingSnap.exists ? existingSnap.data().createdAt : nowISO,
      updatedAt: nowISO,
      timezone: userTz,
      mood: mood || 'neutral',
      text: resolvedRetroText,
      missedDayReason: reason || '',
      isRetroactive: true,
      tasks: {}
    };

    await entryRef.set(retroactiveEntry, { merge: true });

    // Invalidate cached monthly analytics report for this month so analytics dashboard updates immediately
    const targetMonthId = missedDate.slice(0, 7);
    await db.collection('users').doc(uid).collection('analytics').doc('monthly').collection('reports').doc(targetMonthId).delete().catch(() => {});

    res.json({
      success: true,
      message: `Retroactive reflection recorded for missed date ${missedDate}.`,
      entry: retroactiveEntry
    });
  } catch (error) {
    console.error('[JournalRoutes] POST /retroactive error:', error);
    res.status(500).json({ error: 'Internal Error', message: error.message });
  }
});

export default router;
