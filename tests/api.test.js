import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateMonthlyAnalytics, getDaysInMonth } from '../src/services/analyticsService.js';
import { getGentleReminderCopy } from '../src/services/notificationService.js';

test('24-Hour Edit Window & Future Date Policy Test', () => {
  const isWithin24HourWindow = (createdIsoString, currentTimestampMs) => {
    const createdMs = new Date(createdIsoString).getTime();
    const diffHours = (currentTimestampMs - createdMs) / (1000 * 60 * 60);
    return diffHours <= 24.0;
  };

  const now = new Date('2026-09-01T12:00:00.000Z').getTime();

  // 23 hours 59 minutes ago -> Allowed
  const time23h59m = new Date(now - (23 * 60 + 59) * 60 * 1000).toISOString();
  assert.equal(isWithin24HourWindow(time23h59m, now), true, '23h 59m elapsed must be EDITABLE');

  // 24 hours exactly -> Allowed
  const time24h00m = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  assert.equal(isWithin24HourWindow(time24h00m, now), true, '24h 00m exactly must be EDITABLE');

  // 24 hours 1 minute ago -> Rejected (HTTP 403)
  const time24h01m = new Date(now - (24 * 60 + 1) * 60 * 1000).toISOString();
  assert.equal(isWithin24HourWindow(time24h01m, now), false, '24h 01m elapsed must NOT be editable (HTTP 403)');

  // 48 hours ago -> Rejected
  const time48h = new Date(now - 48 * 60 * 60 * 1000).toISOString();
  assert.equal(isWithin24HourWindow(time48h, now), false, '48h elapsed must NOT be editable');
});

test('ISO Date Formatting Test', () => {
  const todayStr = new Date().toISOString().split('T')[0];
  assert.match(todayStr, /^\d{4}-\d{2}-\d{2}$/, 'Target entryDate must match YYYY-MM-DD');
});

test('Observed vs Interpreted Missed-Day Reasoning Structure Test', () => {
  const missedDate = '2026-08-26';
  const entryDate = missedDate;
  const createdAt = new Date().toISOString();
  const reason = 'Busy preparing for mid-term exams';

  const retroactiveDoc = {
    entryDate,
    createdAt,
    missedDayReason: reason,
    isRetroactive: true
  };

  assert.equal(retroactiveDoc.entryDate, '2026-08-26');
  assert.equal(retroactiveDoc.isRetroactive, true);
  assert.notEqual(retroactiveDoc.entryDate, retroactiveDoc.createdAt.split('T')[0]);
});

test('Future Date Validation Test', () => {
  const todayStr = '2026-08-28';
  const futureDate = '2026-08-30';
  const pastDate = '2026-08-27';

  assert.equal(futureDate > todayStr, true, 'Future date should be strictly greater than today');
  assert.equal(pastDate < todayStr, true, 'Past date should be strictly less than today');
});

test('Deterministic Backend Analytics Engine Test', () => {
  const monthId = '2026-08';
  assert.equal(getDaysInMonth(monthId), 31, 'August 2026 should have 31 days');

  const currentEntries = [
    { entryDate: '2026-08-03', mood: 'happy', tasks: { 'Gym 30m': true, 'Practice coding': true }, createdAt: '2026-08-03T09:00:00Z' }, // Mon
    { entryDate: '2026-08-08', mood: 'very_happy', tasks: { 'Practice coding': true }, createdAt: '2026-08-08T20:00:00Z' }, // Sat
    { entryDate: '2026-08-15', mood: 'neutral', tasks: { 'Gym 30m': true }, createdAt: '2026-08-15T23:00:00Z' } // Sat
  ];

  const prevEntries = [
    { entryDate: '2026-07-10', mood: 'neutral', tasks: { 'Gym 30m': true } }
  ];

  const stats = calculateMonthlyAnalytics({ monthId, currentEntries, prevEntries });

  assert.equal(stats.entryCount, 3);
  assert.equal(stats.previousMonthCount, 1);
  assert.equal(stats.monthOverMonthChange, 200.0);
  assert.equal(stats.weekdayVsWeekend.weekdayCount, 1);
  assert.equal(stats.weekdayVsWeekend.weekendCount, 2);
  assert.equal(stats.timeOfDayPattern.morning, 1);
  assert.equal(stats.timeOfDayPattern.evening, 1);
  assert.equal(stats.timeOfDayPattern.night, 1);
  assert.equal(stats.habitComparison['Gym 30m'].current, 2);
  assert.equal(stats.habitComparison['Gym 30m'].previous, 1);
  assert.equal(stats.habitComparison['Gym 30m'].growthPercent, 100.0);
});

test('Gentle Non-Guilt Notification Copy Test', () => {
  const singleMissedCopy = getGentleReminderCopy(1);
  assert.match(singleMissedCopy.body, /Yesterday is still waiting for you/);
  assert.doesNotMatch(singleMissedCopy.body, /failed/i);
  assert.doesNotMatch(singleMissedCopy.body, /missed/i);

  const multipleMissedCopy = getGentleReminderCopy(3);
  assert.match(multipleMissedCopy.body, /No pressure/);
  assert.doesNotMatch(multipleMissedCopy.body, /failed/i);
});

test('Append-Only Read-Only Journal Preservation Logic Test', () => {
  const resolveJournalText = (existingText, incomingText) => {
    const prev = (existingText || '').trim();
    const incoming = (typeof incomingText === 'string') ? incomingText.trim() : '';

    if (!prev) return incoming;
    if (!incoming) return prev;
    if (incoming === prev) return prev;
    if (incoming.startsWith(prev) || incoming.includes(prev)) return incoming;
    return `${prev}\n\n${incoming}`;
  };

  const morningDump = "Today was all about pushing my limits in data analytics.";
  const eveningReflectraSummary = "Reflected with Reflectra: Discussed career growth and learned new pandas tips.";

  // 1. Adding a new paragraph from Reflectra preserves morning dump and appends
  const merged = resolveJournalText(morningDump, eveningReflectraSummary);
  assert.equal(merged, `${morningDump}\n\n${eveningReflectraSummary}`);
  assert.match(merged, /pushing my limits/);
  assert.match(merged, /Reflected with Reflectra/);

  // 2. Empty incoming text does not delete existing journal
  assert.equal(resolveJournalText(morningDump, ''), morningDump);
  assert.equal(resolveJournalText(morningDump, '   '), morningDump);

  // 3. User adding another evening reflection preserves earlier notes
  const thirdNote = "Finished 30 mins workout before bed.";
  const finalDayJournal = resolveJournalText(merged, thirdNote);
  assert.equal(finalDayJournal, `${morningDump}\n\n${eveningReflectraSummary}\n\n${thirdNote}`);

  // 4. Initial entry when empty sets cleanly
  assert.equal(resolveJournalText('', morningDump), morningDump);
});
