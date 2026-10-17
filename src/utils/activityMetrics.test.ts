import { describe, it, expect } from 'vitest';
import { currentStreak, hoursLoggedSince, toLocalDayKey } from './activityMetrics.js';
import { LearningActivityLog } from '../types/index.js';

function activity(timestamp: string, hoursSpent = 1): LearningActivityLog {
  return {
    id: `act_${timestamp}`,
    userId: 'u1',
    activityType: 'roadmap_task',
    title: 't',
    details: 'd',
    hoursSpent,
    timestamp
  };
}

describe('activityMetrics', () => {
  describe('toLocalDayKey', () => {
    it('formats local calendar days with zero padding', () => {
      expect(toLocalDayKey(new Date('2026-03-05T00:00:00'))).toBe('2026-03-05');
      expect(toLocalDayKey('2026-11-09T23:00:00')).toBe('2026-11-09');
    });

    it('returns null for invalid input', () => {
      expect(toLocalDayKey('not-a-date')).toBeNull();
    });
  });

  describe('hoursLoggedSince', () => {
    it('sums only activities inside the window', () => {
      const activities = [
        activity('2026-03-10T09:00:00', 1),
        activity('2026-03-09T09:00:00', 2),
        activity('2026-03-08T09:00:00', 1.5),
        activity('2026-03-06T09:00:00', 4)
      ];
      expect(hoursLoggedSince(activities, new Date('2026-03-08T00:00:00'))).toBe(4.5);
      expect(hoursLoggedSince(activities, new Date('2026-03-01T00:00:00'))).toBe(8.5);
    });

    it('is zero for an empty log', () => {
      expect(hoursLoggedSince([], new Date())).toBe(0);
    });

    it('ignores malformed timestamps and non-finite hours', () => {
      const activities = [
        activity('broken', 5),
        { ...activity('2026-03-10T09:00:00'), hoursSpent: Number.NaN }
      ];
      expect(hoursLoggedSince(activities, new Date('2026-03-01T00:00:00'))).toBe(0);
    });
  });

  describe('currentStreak', () => {
    const now = new Date('2026-03-10T18:00:00');

    it('counts consecutive days ending today', () => {
      const activities = [
        activity('2026-03-10T09:00:00'),
        activity('2026-03-09T09:00:00'),
        activity('2026-03-08T09:00:00'),
        activity('2026-03-06T09:00:00')
      ];
      expect(currentStreak(activities, now)).toBe(3);
    });

    it('counts a streak ending yesterday when today is inactive', () => {
      const activities = [
        activity('2026-03-09T09:00:00'),
        activity('2026-03-08T09:00:00')
      ];
      expect(currentStreak(activities, now)).toBe(2);
    });

    it('returns 0 when the last activity is older than yesterday', () => {
      const activities = [activity('2026-03-06T09:00:00')];
      expect(currentStreak(activities, now)).toBe(0);
    });

    it('returns 0 for an empty log', () => {
      expect(currentStreak([], now)).toBe(0);
    });

    it('collapses multiple activities on the same day to one streak day', () => {
      const activities = [
        activity('2026-03-10T09:00:00'),
        activity('2026-03-10T15:00:00'),
        activity('2026-03-09T09:00:00')
      ];
      expect(currentStreak(activities, now)).toBe(2);
    });
  });
});
