import { LearningActivityLog } from '../types/index.js';

/**
 * Subphase 2F: honest progress-velocity metrics.
 *
 * Only genuine, dated activity records are used. There are no invented values:
 * if the log is empty the metrics are zero and callers show an empty state.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Local calendar-day key (YYYY-MM-DD) for a timestamp. */
export function toLocalDayKey(value: string | Date): string | null {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Sum of logged hours for activities at or after `since` (inclusive). */
export function hoursLoggedSince(activities: LearningActivityLog[], since: Date): number {
  const threshold = since.getTime();
  const total = activities.reduce((sum, activity) => {
    const timestamp = new Date(activity.timestamp).getTime();
    if (Number.isNaN(timestamp) || timestamp < threshold) return sum;
    const hours = typeof activity.hoursSpent === 'number' && Number.isFinite(activity.hoursSpent) ? activity.hoursSpent : 0;
    return sum + hours;
  }, 0);
  return round1(total);
}

/**
 * Length of the current consecutive-day streak ending today or yesterday.
 *
 * A day counts when at least one activity was logged on that local calendar day.
 * If neither today nor yesterday has activity the streak is 0, so a long-dormant
 * log is never presented as an active streak.
 */
export function currentStreak(activities: LearningActivityLog[], now: Date): number {
  const activeDays = new Set<string>();
  for (const activity of activities) {
    const key = toLocalDayKey(activity.timestamp);
    if (key) activeDays.add(key);
  }
  if (activeDays.size === 0) return 0;

  const todayKey = toLocalDayKey(now);
  const yesterday = new Date(now.getTime() - DAY_MS);
  const yesterdayKey = toLocalDayKey(yesterday);
  if (!todayKey || !yesterdayKey) return 0;

  let cursor: Date;
  if (activeDays.has(todayKey)) {
    cursor = new Date(now);
  } else if (activeDays.has(yesterdayKey)) {
    cursor = yesterday;
  } else {
    return 0;
  }

  let streak = 0;
  while (true) {
    const key = toLocalDayKey(cursor);
    if (!key || !activeDays.has(key)) break;
    streak += 1;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }
  return streak;
}
