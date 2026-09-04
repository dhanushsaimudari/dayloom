/**
 * Deterministic Backend Analytics Calculation Engine
 * Calculates exact statistics without relying on AI guesswork.
 */

const MOOD_SCORES = {
  very_happy: 1.0,
  happy: 0.5,
  neutral: 0.0,
  sad: -0.5,
  anxious: -0.7,
  stressed: -0.8
};

/**
 * Returns number of days in a given YYYY-MM month
 */
export function getDaysInMonth(monthId) {
  const [yearStr, monthStr] = monthId.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  return new Date(year, month, 0).getDate();
}

/**
 * Computes deterministic statistics comparing current month to previous month
 */
export function calculateMonthlyAnalytics({ monthId, currentEntries = [], prevEntries = [] }) {
  const totalDaysInCurrentMonth = getDaysInMonth(monthId);
  const entryCount = currentEntries.length;
  const previousMonthCount = prevEntries.length;

  // 1. Consistency Percentage
  const consistencyPercent = parseFloat(((entryCount / totalDaysInCurrentMonth) * 100).toFixed(1));

  // 2. Month-over-Month Change Percentage
  let monthOverMonthChange = 0;
  if (previousMonthCount > 0) {
    monthOverMonthChange = parseFloat((((entryCount - previousMonthCount) / previousMonthCount) * 100).toFixed(1));
  } else if (entryCount > 0) {
    monthOverMonthChange = 100.0;
  }

  // 3. Mood Distribution & Average Score
  let moodSum = 0;
  let moodCount = 0;
  const moodDistribution = {
    very_happy: 0,
    happy: 0,
    neutral: 0,
    sad: 0,
    anxious: 0,
    stressed: 0
  };

  currentEntries.forEach(entry => {
    if (entry.mood && moodDistribution[entry.mood] !== undefined) {
      moodDistribution[entry.mood]++;
      moodSum += (MOOD_SCORES[entry.mood] !== undefined ? MOOD_SCORES[entry.mood] : 0);
      moodCount++;
    }
  });

  const avgMoodScore = moodCount > 0 ? parseFloat((moodSum / moodCount).toFixed(2)) : 0.0;

  // 4. Habit Breakdown (Current & Previous)
  const habitBreakdown = {};
  currentEntries.forEach(entry => {
    if (entry.tasks) {
      Object.entries(entry.tasks).forEach(([habitName, isDone]) => {
        if (isDone) {
          habitBreakdown[habitName] = (habitBreakdown[habitName] || 0) + 1;
        }
      });
    }
  });

  const prevHabitBreakdown = {};
  prevEntries.forEach(entry => {
    if (entry.tasks) {
      Object.entries(entry.tasks).forEach(([habitName, isDone]) => {
        if (isDone) {
          prevHabitBreakdown[habitName] = (prevHabitBreakdown[habitName] || 0) + 1;
        }
      });
    }
  });

  // 5. Habit Growth / Comparison
  const habitComparison = {};
  const allHabitKeys = new Set([...Object.keys(habitBreakdown), ...Object.keys(prevHabitBreakdown)]);
  allHabitKeys.forEach(habit => {
    const currentVal = habitBreakdown[habit] || 0;
    const prevVal = prevHabitBreakdown[habit] || 0;
    let growth = 0;
    if (prevVal > 0) {
      growth = parseFloat((((currentVal - prevVal) / prevVal) * 100).toFixed(1));
    } else if (currentVal > 0) {
      growth = 100.0;
    }
    habitComparison[habit] = {
      current: currentVal,
      previous: prevVal,
      growthPercent: growth
    };
  });

  // 6. Weekday vs Weekend Journaling Pattern
  let weekdayCount = 0;
  let weekendCount = 0;

  currentEntries.forEach(entry => {
    const dateObj = new Date(`${entry.entryDate}T12:00:00Z`);
    const dayOfWeek = dateObj.getUTCDay(); // 0 = Sunday, 6 = Saturday
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      weekendCount++;
    } else {
      weekdayCount++;
    }
  });

  const weekdayPercent = entryCount > 0 ? parseFloat(((weekdayCount / entryCount) * 100).toFixed(1)) : 0;
  const weekendPercent = entryCount > 0 ? parseFloat(((weekendCount / entryCount) * 100).toFixed(1)) : 0;

  // 7. Time-of-Day Pattern
  const timeOfDayPattern = {
    morning: 0,   // 05:00 - 11:59
    afternoon: 0, // 12:00 - 16:59
    evening: 0,   // 17:00 - 21:59
    night: 0      // 22:00 - 04:59
  };

  currentEntries.forEach(entry => {
    let hour = 12; // default
    if (entry.createdAt) {
      hour = new Date(entry.createdAt).getUTCHours();
    } else if (entry.time) {
      const match = entry.time.match(/(\d{1,2}):(\d{2})/);
      if (match) hour = parseInt(match[1], 10);
    }

    if (hour >= 5 && hour < 12) {
      timeOfDayPattern.morning++;
    } else if (hour >= 12 && hour < 17) {
      timeOfDayPattern.afternoon++;
    } else if (hour >= 17 && hour < 22) {
      timeOfDayPattern.evening++;
    } else {
      timeOfDayPattern.night++;
    }
  });

  return {
    monthId,
    entryCount,
    previousMonthCount,
    totalDaysInMonth: totalDaysInCurrentMonth,
    consistencyPercent,
    monthOverMonthChange,
    avgMoodScore,
    moodDistribution,
    habitBreakdown,
    habitComparison,
    weekdayVsWeekend: {
      weekdayCount,
      weekendCount,
      weekdayPercent,
      weekendPercent
    },
    timeOfDayPattern
  };
}
