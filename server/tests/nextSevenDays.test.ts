import { describe, it, expect } from 'vitest';
import { buildNextSevenDaysPlan } from '../services/nextSevenDaysService.js';
import { ProjectRecommendation, SkillGapItem } from '../../src/types/index.js';

/**
 * Subphase 2G: the "Next Seven Days" plan must be derived only from real data
 * (declared weekly hours, prioritized gaps, incomplete milestones), must never
 * exceed the stated availability, and must explain itself when empty.
 */

function gap(skillId: string, name: string, estimatedLearningHours: number): SkillGapItem {
  return {
    skillId,
    name,
    category: 'Testing',
    currentLevel: 0,
    requiredLevel: 3,
    gap: 3,
    normalizedGap: 0.6,
    importance: 0.8,
    status: 'unverified',
    priorityScore: 80,
    priorityBadge: 'High',
    missingPrerequisites: [],
    estimatedLearningHours,
    reason: `Reason for ${name}`,
    nextRecommendedAction: `Next action for ${name}`
  };
}

function project(
  id: string,
  title: string,
  milestones: Array<{ id: string; title: string; completed: boolean }>,
  userStatus?: ProjectRecommendation['userStatus']
): ProjectRecommendation {
  return {
    id,
    title,
    difficulty: 'Intermediate',
    skillsDemonstrated: ['x'],
    whyItMatters: 'why',
    coreFeatures: ['a'],
    suggestedTechStack: ['b'],
    milestones: milestones.map(m => ({ ...m, description: m.title })),
    estimatedEffortHours: 10,
    evaluationCriteria: ['crit'],
    requiredEvidence: 'repo',
    userStatus
  };
}

describe('Subphase 2G: next seven days planner', () => {
  it('returns an explanatory empty plan when no weekly availability is set', () => {
    const plan = buildNextSevenDaysPlan(0, [gap('a', 'Alpha', 10)], []);
    expect(plan.availableHours).toBe(0);
    expect(plan.focusItems).toEqual([]);
    expect(plan.totalPlannedHours).toBe(0);
    expect(plan.note.toLowerCase()).toContain('availability');
  });

  it('never plans more hours than the student has available', () => {
    const gaps = [gap('a', 'Alpha', 20), gap('b', 'Beta', 20), gap('c', 'Gamma', 20), gap('d', 'Delta', 20)];
    const plan = buildNextSevenDaysPlan(5, gaps, []);
    const sum = plan.focusItems.reduce((total, item) => total + item.hours, 0);
    expect(sum).toBe(5);
    expect(plan.totalPlannedHours).toBe(5);
    expect(sum).toBeLessThanOrEqual(plan.availableHours);
  });

  it('interleaves gap work with incomplete project milestones', () => {
    const gaps = [gap('a', 'Alpha', 3), gap('b', 'Beta', 3)];
    const projects = [
      project('p1', 'Pipeline', [{ id: 'm1', title: 'Serve model', completed: false }], 'in_progress'),
      project('p2', 'Done', [{ id: 'm2', title: 'Ignore me', completed: false }], 'completed')
    ];
    const plan = buildNextSevenDaysPlan(14, gaps, projects);
    const kinds = plan.focusItems.map(i => i.kind);
    expect(kinds).toContain('skill-gap');
    expect(kinds).toContain('project-milestone');
    // Completed projects must not contribute a milestone action.
    expect(plan.focusItems.some(i => i.title.includes('Done'))).toBe(false);
    expect(plan.focusItems.some(i => i.title.includes('Pipeline'))).toBe(true);
  });

  it('reports a real unallocated buffer when the budget exceeds the work', () => {
    const plan = buildNextSevenDaysPlan(40, [gap('a', 'Alpha', 2)], []);
    expect(plan.focusItems.length).toBeGreaterThan(0);
    expect(plan.unallocatedHours).toBe(plan.availableHours - plan.totalPlannedHours);
    expect(plan.unallocatedHours).toBeGreaterThan(0);
    expect(plan.note).toContain('unallocated');
  });

  it('explains why no plan is produced when there is nothing outstanding', () => {
    const plan = buildNextSevenDaysPlan(10, [], [project('p1', 'Done', [{ id: 'm1', title: 'Done', completed: true }], 'completed')]);
    expect(plan.focusItems).toEqual([]);
    expect(plan.totalPlannedHours).toBe(0);
    expect(plan.note.toLowerCase()).toContain('no outstanding');
  });

  it('is deterministic for identical inputs', () => {
    const gaps = [gap('a', 'Alpha', 4), gap('b', 'Beta', 4)];
    const projects = [project('p1', 'Pipeline', [{ id: 'm1', title: 'Serve', completed: false }], 'in_progress')];
    const first = buildNextSevenDaysPlan(9, gaps, projects);
    const second = buildNextSevenDaysPlan(9, gaps, projects);
    expect(second).toEqual(first);
  });
});
