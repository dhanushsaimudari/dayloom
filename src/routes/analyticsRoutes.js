import express from 'express';
import { db } from '../services/firebaseAdmin.js';
import { verifyAuthToken } from '../middleware/authMiddleware.js';
import { validateMonthParam } from '../middleware/inputValidation.js';
import { calculateMonthlyAnalytics } from '../services/analyticsService.js';
import { generateMonthlyReportNarrative } from '../services/geminiService.js';

const router = express.Router();
router.use(verifyAuthToken);

/**
 * GET /api/analytics/monthly/:monthId
 * Returns deterministic backend analytics & grounded Reflectra summary
 * Month format: YYYY-MM (e.g. 2026-08)
 */
router.get('/monthly/:monthId', validateMonthParam, async (req, res) => {
  try {
    const uid = req.user.uid;
    const { monthId } = req.params;

    const reportRef = db.collection('users').doc(uid).collection('analytics').doc('monthly').collection('reports').doc(monthId);
    const existingSnap = await reportRef.get();

    // Determine previous month string YYYY-MM
    const [yearStr, monthStr] = monthId.split('-');
    let prevYear = parseInt(yearStr, 10);
    let prevMonth = parseInt(monthStr, 10) - 1;
    if (prevMonth < 1) {
      prevMonth = 12;
      prevYear -= 1;
    }
    const prevMonthId = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

    // Query entries for current and previous month
    const entriesRef = db.collection('users').doc(uid).collection('entries');
    const [currentSnap, prevSnap] = await Promise.all([
      entriesRef.where('entryDate', '>=', `${monthId}-01`).where('entryDate', '<=', `${monthId}-31`).get(),
      entriesRef.where('entryDate', '>=', `${prevMonthId}-01`).where('entryDate', '<=', `${prevMonthId}-31`).get()
    ]);

    const currentEntries = currentSnap.docs.map(d => d.data());
    const prevEntries = prevSnap.docs.map(d => d.data());

    // Deterministic Backend Analytics Calculation
    const statsData = calculateMonthlyAnalytics({
      monthId,
      currentEntries,
      prevEntries
    });

    // Verify if existing cached report is genuinely fresh and matching all current entries
    if (existingSnap.exists && req.query.force !== 'true') {
      const existingData = existingSnap.data();
      const latestEntryTimestamp = currentEntries.reduce((max, e) => {
        const t = e.updatedAt || e.createdAt || '';
        return t > max ? t : max;
      }, '');

      const isCacheFresh = existingData &&
        existingData.entryCount === statsData.entryCount &&
        existingData.generatedAt &&
        (!latestEntryTimestamp || existingData.generatedAt >= latestEntryTimestamp);

      if (isCacheFresh) {
        return res.json({ report: existingData });
      }
    }

    // Generate Gemini narrative grounded purely on aggregated stats
    const narrative = await generateMonthlyReportNarrative({ statsData });

    const reportDoc = {
      ...statsData,
      summaryText: narrative.summaryText || `In ${statsData.monthId}, you completed ${statsData.entryCount} reflections. Keep building your daily momentum!`,
      positiveHighlights: narrative.positiveHighlights || [],
      areasForGrowth: narrative.areasForGrowth || [],
      generatedAt: new Date().toISOString()
    };

    await reportRef.set(reportDoc);

    res.json({ report: reportDoc });
  } catch (error) {
    console.error('[AnalyticsRoutes] GET /monthly error:', error);
    res.status(500).json({ error: 'Internal Error', message: error.message });
  }
});

export default router;
